import Link from 'next/link'
import { ChevronRightIcon, HomeIcon } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
  active?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm text-gray-500">
      <Link 
        href="/"
        className="flex items-center hover:text-gray-900 transition-colors"
      >
        <HomeIcon className="w-4 h-4" />
        <span className="sr-only">Home</span>
      </Link>
      <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />
      {items.map((item, index) => (
        <div key={item.href} className="flex items-center">
          {item.active ? (
            <span className="text-gray-900 font-medium" aria-current="page">
              {item.label}
            </span>
          ) : (
            <>
              <Link
                href={item.href}
                className="hover:text-gray-900 transition-colors"
              >
                {item.label}
              </Link>
              {index < items.length - 1 && (
                <ChevronRightIcon className="w-4 h-4 flex-shrink-0 ml-1" />
              )}
            </>
          )}
        </div>
      ))}
    </nav>
  )
}
