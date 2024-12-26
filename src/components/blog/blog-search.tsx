'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import "@/styles/datepicker.css"
import { useBlogSearch } from '@/hooks/use-blog-search'
import { BlogCard } from './blog-card'
import { Skeleton } from '@/components/ui/skeleton'
import { StrapiArticle } from '@/types/strapi'
import { CalendarIcon } from 'lucide-react'


export function BlogSearch() {
  const [dateRange, setDateRange] = useState<[Date | undefined, Date | undefined]>([undefined, undefined])
  const [startDate, endDate] = dateRange

  const searchResult = useBlogSearch()
  const {
    query,
    setQuery,
    items,
    isLoading,
    error,
    suggestions,
    updateFilters,
  } = searchResult

  const handleDateChange = (update: [Date | null, Date | null]) => {
    setDateRange(update as [Date | undefined, Date | undefined])
    updateFilters({
      startDate: update[0] ?? undefined,
      endDate: update[1] ?? undefined,
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="relative">
          <Input
            type="search"
            placeholder="Search articles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full"
          />
          {suggestions.length > 0 && query && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
              {suggestions.map((suggestion: string, index: number) => (
                <div
                  key={index}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => setQuery(suggestion)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setQuery(suggestion)
                    }
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="relative flex-grow sm:flex-grow-0">
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateChange}
              customInput={
                <Button variant="outline" className="w-full sm:w-auto">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {startDate ? (
                    endDate ? (
                      `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
                    ) : (
                      startDate.toLocaleDateString()
                    )
                  ) : (
                    'Select date range'
                  )}
                </Button>
              }
              isClearable={true}
              className="!w-full"
              wrapperClassName="w-full sm:w-auto"
              calendarClassName="!bg-white !border !rounded-lg !shadow-lg !font-sans"
              dateFormat="MMM d, yyyy"
              showPopperArrow={false}
              popperPlacement="bottom-start"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 text-red-600 bg-red-50 rounded-md">
          {error.message}
        </div>
      )}

      <div className="space-y-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[300px]" />
          ))
        ) : items.length > 0 ? (
          items.map((article: StrapiArticle) => (
            <BlogCard key={article.slug} article={article} />
          ))
        ) : (
          <p className="text-center text-gray-500">No articles found</p>
        )}
      </div>
    </div>
  )
}
