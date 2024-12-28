import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogCard } from '@/components/blog/blog-card'
import { fetchCategory, fetchBlogCategoryArticles } from '@/lib/strapi'
import HeaderWrapper from '@/components/header-wrapper'
import Link from 'next/link'
import { Breadcrumb } from '@/components/blog/breadcrumb'
interface Props {
  params: Promise<{
    category: string
  }>
}

export const revalidate = 3600 // revalidate every hour

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const category = await fetchCategory(params.category)

  if (!category) {
    return {
      title: 'Category Not Found',
    }
  }

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL as string),
    title: `${category.name} - Blog`,
    description: category.description,
  }
}

async function getCategoryArticles(categorySlug: string) {
  const articles = await fetchBlogCategoryArticles(categorySlug);
  return articles
}

export default async function CategoryPage(props: Props) {
  const params = await props.params;
  const category = await fetchCategory(params.category)

  if (!category) {
    notFound()
  }

  const articles = await getCategoryArticles(params.category)
  const breadcrumbItems = [
    { label: 'Blog', href: '/blog' },
    { label: params.category, href: `#`, active: true },
  ]
  return (
    <div className="flex flex-col min-h-screen">
      <HeaderWrapper />
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <div className="container py-8 md:py-12 space-y-8 md:space-y-12 px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
          <Breadcrumb items={breadcrumbItems} />
            
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                {category.name}
              </h1>
              {category.description && (
                <p className="mt-4 text-lg md:text-xl text-gray-600">
                  {category.description}
                </p>
              )}
            </div>
          </div>

          {articles.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <div key={article.id} className="transform transition-all hover:scale-[1.02] duration-300">
                  <BlogCard article={article} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No articles found in this category
              </p>
              <Link 
                href="/blog" 
                className="inline-block mt-4 text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View all articles
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
