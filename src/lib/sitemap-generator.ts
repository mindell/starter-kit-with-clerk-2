import { fetchAllArticles, fetchAllCategories } from './strapi'
import { sitemapConfig } from '@/config/sitemap'

export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

export interface SitemapConfig {
  baseUrl: string
  revalidate?: number
  excludeSlugs?: string[]
}

export class SitemapGenerator {
  private config: SitemapConfig
  private articlesCache: { timestamp: number; entries: string | null } | null = null
  private blogLastModCache: { timestamp: number; lastmod: string | null } | null = null
  private categoryEntriesCache: { timestamp: number; entries: string | null } | null = null

  constructor(config: SitemapConfig) {
    this.config = {
      revalidate: 3600,
      ...config
    }
  }

  private async getBlogLastMod(): Promise<string | null> {
    // Check cache first
    const now = Date.now()
    if (this.blogLastModCache && 
        (now - this.blogLastModCache.timestamp) < sitemapConfig.cacheDuration.blogLastMod) {
      return this.blogLastModCache.lastmod
    }

    try {
      // Get only the latest article's updatedAt
      const articles = await fetchAllArticles({
        fields: ['updatedAt'],
        pageSize: 1,
        page: 1,
        sort: ['updatedAt:desc']
      })

      if (!articles.length) {
        this.blogLastModCache = {
          timestamp: now,
          lastmod: null
        }
        return null
      }

      const lastmod = articles[0].updatedAt

      // Update cache
      this.blogLastModCache = {
        timestamp: now,
        lastmod
      }

      return lastmod
    } catch (error) {
      console.error('Error fetching blog lastmod:', error)
      // In case of error, return cached value if available
      return this.blogLastModCache?.lastmod || null
    }
  }



  private async getCategoryLastMod(categorySlug: string): Promise<string | null> {
    try {
      // Get the latest article in this category
      const articles = await fetchAllArticles({
        fields: ['updatedAt'],
        pageSize: 1,
        page: 1,
        sort: ['updatedAt:desc'],
        populate: {category: {fields: ['slug']}},
      })

      if (!articles.length) return null
      return articles[0].updatedAt
    } catch (error) {
      console.error(`Error fetching lastmod for category ${categorySlug}:`, error)
      return null
    }
  }

  private async generateStaticPagesEntries(): Promise<string> {
    const entries: string[] = []
    
    // Add home page
    const home = sitemapConfig.staticPages.home
    entries.push(this.generateUrlEntry({
      loc: `${this.config.baseUrl}${home.path}`,
      lastmod: home.lastmod,
      changefreq: home.changefreq,
      priority: home.priority
    }))

    
    
    // Add blog page
    const blog = sitemapConfig.staticPages.blog
    const blogLastMod = await this.getBlogLastMod()
    entries.push(this.generateUrlEntry({
      loc: `${this.config.baseUrl}${blog.path}`,
      lastmod: blogLastMod || undefined,
      changefreq: blog.changefreq,
      priority: blog.priority
    }))
    return entries.join('\n')
  }

  private async generateArticleEntries(): Promise<string> {
    // Check cache first
    const now = Date.now()
    if (this.articlesCache && 
        (now - this.articlesCache.timestamp) < sitemapConfig.cacheDuration.articles) {
      return this.articlesCache.entries || ''
    }

    try {
      const pageSize = 100
      let page = 1
      let hasMore = true
      const articles: string[] = []

      while (hasMore) {
        const batch = await fetchAllArticles({
          fields: ['slug', 'updatedAt', 'publishedAt'],
          pageSize,
          page,
          populate: {category: {fields: ['slug']}}
        })

        if (batch.length === 0) {
          hasMore = false
          continue
        }

        const entries = batch.map(article => {
          return this.generateUrlEntry({
            loc: `${this.config.baseUrl}/blog/${article.category?.slug || 'uncategorized'}/${article.slug}`,
            lastmod: article.updatedAt || article.publishedAt,
            changefreq: sitemapConfig.articleConfig.changefreq,
            priority: sitemapConfig.articleConfig.priority
          })
        })

        articles.push(...entries)
        
        if (batch.length < pageSize) {
          hasMore = false
        } else {
          page++
        }
      }

      const entriesString = articles.join('\n')
      
      // Update cache
      this.articlesCache = {
        timestamp: now,
        entries: entriesString
      }

      return entriesString
    } catch (error) {
      console.error('Error generating article entries:', error)
      return ''
    }
  }

  private async generateCategoryEntries(): Promise<string> {
    // Check cache first
    const now = Date.now()
    if (this.categoryEntriesCache && 
        (now - this.categoryEntriesCache.timestamp) < sitemapConfig.cacheDuration.categoryEntries) {
      return this.categoryEntriesCache.entries || ''
    }

    try {
      const categories = await fetchAllCategories({
        fields: ['slug'],
        pageSize: 100,
      })

      

      // Process categories in parallel for better performance
      const entriesPromises = categories.map(async (category) => {
        const lastmod = await this.getCategoryLastMod(category.slug)
        
        // Skip categories without articles
        if (!lastmod) return null

        return this.generateUrlEntry({
          loc: `${this.config.baseUrl}/blog/${category.slug}`,
          lastmod,
          changefreq: sitemapConfig.categoryConfig.changefreq,
          priority: sitemapConfig.categoryConfig.priority
        })
      })

      const resolvedEntries = await Promise.all(entriesPromises)
      
      // Filter out null entries (categories without articles)
      const validEntries = resolvedEntries.filter((entry): entry is string => entry !== null)
      const entriesString = validEntries.join('\n')

      // Update cache
      this.categoryEntriesCache = {
        timestamp: now,
        entries: entriesString
      }

      return entriesString
    } catch (error) {
      console.error('Error generating category entries:', error)
      return this.categoryEntriesCache?.entries || ''
    }
  }

  private generateUrlEntry({
    loc,
    lastmod,
    changefreq,
    priority
  }: {
    loc: string
    lastmod?: string
    changefreq: ChangeFreq
    priority: number
  }): string {
    return `
      <url>
        <loc>${loc}</loc>
        ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
        <changefreq>${changefreq}</changefreq>
        <priority>${priority.toFixed(1)}</priority>
      </url>
    `
  }

  async generateSitemapXml(): Promise<string> {
    // Fetch all entries in parallel
    const [staticEntries,  articleEntries, categoryEntries] = await Promise.all([
      this.generateStaticPagesEntries(),
      this.generateArticleEntries(),
      this.generateCategoryEntries()
    ])

  

    return `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${staticEntries}
        ${articleEntries}
        ${categoryEntries}
      </urlset>`
  }
}
