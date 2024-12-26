import { Feed } from 'feed'
import {StrapiArticle} from '@/types/strapi'

interface FeedConfig {
  title: string
  description: string
  id: string
  link: string
  language: string
  image: string
  favicon: string
  copyright: string
  updated: Date
  generator: string
  feedLinks: {
    rss2?: string
    json?: string
    atom?: string
  }
  author: {
    name: string
    email: string
    link: string
  }
}

export class RSSFeedGenerator {
  private feed: Feed

  constructor(config: FeedConfig) {
    this.feed = new Feed({
      title: config.title,
      description: config.description,
      id: config.id,
      link: config.link,
      language: config.language,
      image: config.image,
      favicon: config.favicon,
      copyright: config.copyright,
      updated: config.updated,
      generator: config.generator,
      feedLinks: config.feedLinks,
      author: config.author
    })
  }

  addArticle(article: StrapiArticle) {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/blog/${article.category?.slug || 'uncategorized'}/${article.slug}`
    
    this.feed.addItem({
      title: article.title,
      id: article.id.toString(),
      link: url,
      description: article.description,
      content: this.getArticleContent(article),
      author: [
        {
          name: article.author?.name || 'Unknown Author',
          email: article.author?.email || '',
          link: url
        }
      ],
      date: new Date(article.publishedAt),
      image: this.getArticleImage(article)
    })
  }

  private getArticleContent(article: StrapiArticle): string {
    // Convert blocks to HTML content
    // This is a simple implementation - enhance based on your needs
    return article.blocks?.map(block => {
      switch (block.type) {
        case 'rich-text':
          return block.content
        case 'media':
          return `<img src="${block.file?.url}" alt="${block.file?.alternativeText || ''}" />`
        case 'quote':
          return `<blockquote>${block.quote}</blockquote>`
        default:
          return ''
      }
    }).join('\n') || article.content || ''
  }

  private getArticleImage(article: StrapiArticle): string {
    return article.cover?.url || ''
  }

  generateRSS2(): string {
    return this.feed.rss2()
  }

  generateAtom(): string {
    return this.feed.atom1()
  }

  generateJSON(): string {
    return this.feed.json1()
  }
}