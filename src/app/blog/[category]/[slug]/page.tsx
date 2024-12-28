import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { fetchArticle } from '@/lib/strapi'
import { formatDate } from '@/lib/utils'
import { serialize } from 'next-mdx-remote/serialize'
import { MDXContent } from '@/components/blog/mdx-content'
import HeaderWrapper from '@/components/header-wrapper'
import { Breadcrumb } from '@/components/blog/breadcrumb'
import { CalendarIcon, UserIcon } from 'lucide-react'

interface PageProps {
  params: Promise<{
    category: string
    slug: string
  }>
}

export const revalidate = 3600 // revalidate every hour

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const article = await fetchArticle(params.slug)
  if (!article) {
    return {
      title: 'Article Not Found',
    }
  }
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL as string),
    title: article.title,
    description: article.description,
    openGraph: article.cover
      ? {
          images: [
            {
              url: article.cover.url,
              width: article.cover.width,
              height: article.cover.height,
              alt: article.cover.alternativeText || article.title,
            },
          ],
        }
      : undefined,
  }
}

export default async function ArticlePage(props: PageProps) {
  const params = await props.params
  const article = await fetchArticle(params.slug)
  let content = null;

  if (!article || article.category?.slug !== params.category) {
    notFound()
  }

  article.blocks?.forEach(itm => {
    if(itm.__component === 'shared.rich-text') {
      content = itm.body;
    }
  });

  if (!content) {
    console.error('No content found in article')
    return <div>No content available</div>
  }

  const serializedContent = await serialize(content, {
    mdxOptions: {
      development: process.env.NODE_ENV === 'development'
    }
  })

  const breadcrumbItems = [
    { label: 'Blog', href: '/blog' },
    { label: article.category?.name || 'Uncategorized', href: `/blog/${article.category?.slug || 'uncategorized'}` },
    { label: article.title, href: '#', active: true },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <HeaderWrapper />
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <div className="container max-w-4xl py-8 md:py-12 space-y-8 md:space-y-12 px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={breadcrumbItems} />
          
          <article className="space-y-8 md:space-y-12">
            <header className="space-y-6 text-center">
              {article.category && (
                <Link
                  href={`/blog/${article.category.slug}`}
                  className="inline-block px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors"
                >
                  {article.category.name}
                </Link>
              )}
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                {article.title}
              </h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                {article.description}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
                {article.author && (
                  <div className="flex items-center gap-x-2">
                    {article.author.avatar ? (
                      <Image
                        src={article.author.avatar}
                        alt={article.author.name}
                        width={32}
                        height={32}
                        className="rounded-full ring-2 ring-white"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <span className="font-medium">{article.author.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-x-2">
                  <CalendarIcon className="w-4 h-4" />
                  <time>{formatDate(article.publishedAt)}</time>
                </div>
              </div>
            </header>

            {article.cover && (
              <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg">
                <Image
                  src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${article.cover.url}`}
                  alt={article.cover.alternativeText || article.title}
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
            )}

            <div className="prose prose-lg md:prose-xl mx-auto prose-headings:font-bold prose-a:text-indigo-600 hover:prose-a:text-indigo-800 prose-img:rounded-xl prose-img:shadow-lg">
              <MDXContent serializedContent={serializedContent} />
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
