import { NextResponse } from 'next/server'
import { BlogSearchService } from '@/lib/blog/search-service'

const searchService = new BlogSearchService()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    // console.log('query',query);
    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    const suggestions = await searchService.getSuggestions(query)
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Suggestions API error:', error)
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    )
  }
}
