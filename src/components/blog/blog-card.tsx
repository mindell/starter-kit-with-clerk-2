import Image from 'next/image'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { StrapiArticle } from '@/types/strapi'
import { formatDate } from '@/lib/utils'

interface BlogCardProps {
  article: StrapiArticle
  isFeature?: boolean
}

export function BlogCard({ article, isFeature = false }: BlogCardProps) {
  const href = `/blog/${article.category?.slug || 'uncategorized'}/${article.slug}`
  // console.log(article);
  return (
    <Card className={`overflow-hidden group ${isFeature ? 'lg:flex bg-white/50 backdrop-blur-sm' : 'bg-white/50 backdrop-blur-sm'}`}>
      <div className={`relative ${isFeature ? 'lg:w-2/5' : 'aspect-video'}`}>
        {article.cover ? (
          <Image
            src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${article.cover.url}`}
            alt={article.cover.alternativeText || article.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
        )}
      </div>
      <div className={`p-6 ${isFeature ? 'lg:w-3/5' : ''}`}>
        {article.category && (
          <Link
            href={`/blog/${article.category.slug}`}
            className="inline-block px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors"
          >
            {article.category.name}
          </Link>
        )}
        <Link href={href} className="block group-hover:opacity-75 transition-opacity">
          <h3 className={`mt-3 ${isFeature ? 'text-2xl' : 'text-xl'} font-bold text-gray-900`}>
            {article.title}
          </h3>
        </Link>
        <p className="mt-3 text-gray-600 line-clamp-2">
          {article.description}
        </p>
        <div className="mt-6 flex items-center gap-x-4">
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-medium">
                  {article.author.name.charAt(0)}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700">{article.author.name}</span>
            </div>
          )}
          <time className="text-sm text-gray-500">
            {formatDate(article.publishedAt)}
          </time>
        </div>
      </div>
    </Card>
  )
}
