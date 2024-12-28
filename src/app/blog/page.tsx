import { Metadata } from 'next'
import { fetchAllArticles } from '@/lib/strapi'
import { BlogCard } from '@/components/blog/blog-card'
import { BlogSearch } from '@/components/blog/blog-search'
import HeaderWrapper from '@/components/header-wrapper'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL as string),
  title: 'Blog',
  description: 'Read our latest articles and updates',
}

export const revalidate = 3600 // revalidate every hour



export default async function BlogPage() {
  const articles = await fetchAllArticles({fields:[]})

  return (
    <div className="flex flex-col min-h-screen">
      <HeaderWrapper />
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <div className="container py-8 md:py-12 space-y-8 md:space-y-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              Blog
            </h1>
            <p className="mt-4 text-lg md:text-xl text-gray-600">
              Read our latest articles and updates
            </p>
          </div>

          {articles.length > 0 && (
            <section className="relative">
              <h2 className="sr-only">Featured Article</h2>
              <div className="transform transition-all hover:scale-[1.01] duration-300">
                <BlogCard article={articles[0]} isFeature />
              </div>
            </section>
          )}

          <section className="space-y-6 max-w-3xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Search Articles</h2>
            <BlogSearch />
          </section>

          {articles.length > 1 && (
            <section className="space-y-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Latest Articles</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {articles.slice(1).map((article) => (
                  <div key={article.id} className="transform transition-all hover:scale-[1.02] duration-300">
                    <BlogCard article={article} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
