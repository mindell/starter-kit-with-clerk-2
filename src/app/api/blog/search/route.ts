import { NextResponse } from 'next/server'
import { BlogSearchService } from '@/lib/blog/search-service'

const searchService = new BlogSearchService()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const category = searchParams.get('category') || undefined
    const author = searchParams.get('author') || undefined
    
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const results = await searchService.search({
      query,
      page,
      pageSize,
      category,
      author,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const results = await searchService.search(body)
    return NextResponse.json(results)
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
