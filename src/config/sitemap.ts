import { ChangeFreq } from '@/lib/sitemap-generator'

export interface StaticPageConfig {
  path: string
  priority: number
  changefreq: ChangeFreq
  lastmod?: string
}

export interface SitemapPageConfig {
  priority?: number
  changefreq?: ChangeFreq
}

// Centralized configuration for all pages
export const sitemapConfig = {
  // Cache durations
  cacheDuration: {
    plans: 7 * 24 * 60 * 60 * 1000, // 1 week in milliseconds
    articles: 7 * 24 * 60 * 60 * 1000, // 1 week in milliseconds
    blogLastMod: 24 * 60 * 60 * 1000, // 1 day in milliseconds
    categoryEntries: 24 * 60 * 60 * 1000, // 1 day in milliseconds
  },
  
  // Static pages configuration
  staticPages: {
    home: {
      path: '/',
      priority: 1.0,
      changefreq: 'monthly' as const,
      lastmod: new Date().toISOString(), // Static lastmod
    } satisfies StaticPageConfig,
    
    blog: {
      path: '/blog',
      priority: 0.6,
      changefreq: 'daily' as const
    } satisfies StaticPageConfig,
    
  },
  
  // Default values for dynamic pages (required values)
  defaults: {
    priority: 0.8,
    changefreq: 'monthly' as const,
  } satisfies Required<SitemapPageConfig>,
  
  // Article configuration
  articleConfig: {
    priority: 0.5,
    changefreq: 'weekly' as const
  },
  
  // Category configuration
  categoryConfig: {
    priority: 0.6,
    changefreq: 'weekly' as const
  },
  
  // Special page configurations (optional, for future use)
  pageConfigs: {
    'faq': {
      priority: 0.7,
      changefreq: 'weekly' as const,
    },
  } as Record<string, SitemapPageConfig>,
} as const
