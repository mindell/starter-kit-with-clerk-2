import { SitemapGenerator } from '@/lib/sitemap-generator'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 hour

export async function GET() {
  try {
    const generator = new SitemapGenerator({
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      revalidate: revalidate,
      excludeSlugs: [], // Add slugs to exclude here
    })

    const xml = await generator.generateSitemapXml()

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': `public, s-maxage=${revalidate}, stale-while-revalidate`,
      },
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}
