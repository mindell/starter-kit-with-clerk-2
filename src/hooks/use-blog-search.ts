import { useState, useCallback, useEffect } from 'react'
import { useDebounce } from './use-debounce'
import { StrapiArticle } from '@/types/strapi'

interface SearchState {
  items: StrapiArticle[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  isLoading: boolean
  error: Error | null
}

interface SearchFilters {
  category?: string
  startDate?: Date
  endDate?: Date
  author?: string
}

const initialState: SearchState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  isLoading: false,
  error: null,
}

export function useBlogSearch(initialFilters?: SearchFilters) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>(initialFilters || {})
  const [state, setState] = useState<SearchState>(initialState)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const debouncedQuery = useDebounce(query, 300)

  const search = useCallback(async (page = 1) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const params = new URLSearchParams({
        q: debouncedQuery,
        page: page.toString(),
        pageSize: state.pageSize.toString(),
        ...(filters.category && { category: filters.category }),
        ...(filters.author && { author: filters.author }),
        ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
        ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
      })

      const response = await fetch(`/api/blog/search?${params}`)
      if (!response.ok) throw new Error('Search failed')

      const data = await response.json()
      setState(prev => ({
        ...prev,
        items: data.items,
        total: data.total,
        page: data.page,
        totalPages: data.totalPages,
        isLoading: false,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoading: false,
      }))
    }
  }, [debouncedQuery, filters, state.pageSize])

  const fetchSuggestions = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions([])
      return
    }

    try {
      const response = await fetch(
        `/api/blog/search/suggestions?q=${encodeURIComponent(debouncedQuery)}`
      )
      if (!response.ok) throw new Error('Failed to fetch suggestions')

      const data = await response.json()
      setSuggestions(data.suggestions)
    } catch (error) {
      console.error('Suggestions error:', error)
      setSuggestions([])
    }
  }, [debouncedQuery])

  useEffect(() => {
    search()
  }, [search])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  return {
    query,
    setQuery,
    filters,
    updateFilters,
    clearFilters,
    suggestions,
    ...state,
    search,
  }
}
