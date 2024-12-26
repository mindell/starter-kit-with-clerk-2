import { NextResponse } from 'next/server'
import { RSSFeedGenerator } from '@/lib/rss/feed-generator'
import { rssFeedConfig } from '@/config/rss'
import { fetchAllArticles } from '@/lib/strapi'

export async function GET() {
  try {
    const feed = new RSSFeedGenerator(rssFeedConfig)
   
    const articles = await fetchAllArticles({})

    articles.forEach(article => {
      feed.addArticle(article)
    })

    
    return new NextResponse(feed.generateAtom(), {
       headers: {
         'Content-Type': 'application/atom+xml',
         'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
       },
    })

   
  } catch (error) {
    console.error('Feed generation error:', error)
    return new NextResponse('Error generating feed', { status: 500 })
  }
}
