'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { MDXRemote } from 'next-mdx-remote'
import Image from 'next/image'
const components = {
  h1: (props: any) => (
    <h1 {...props} className="text-3xl font-bold mt-8 mb-4" />
  ),
  h2: (props: any) => (
    <h2 {...props} className="text-2xl font-bold mt-8 mb-4" />
  ),
  h3: (props: any) => (
    <h3 {...props} className="text-xl font-bold mt-6 mb-3" />
  ),
  p: (props: any) => (
    <p {...props} className="my-4 leading-relaxed" />
  ),
  a: (props: any) => (
    <a {...props} className="text-indigo-600 hover:text-indigo-800 transition-colors" />
  ),
  ul: (props: any) => (
    <ul {...props} className="list-disc list-inside my-4 space-y-2" />
  ),
  ol: (props: any) => (
    <ol {...props} className="list-decimal list-inside my-4 space-y-2" />
  ),
  li: (props: any) => (
    <li {...props} className="leading-relaxed" />
  ),
  blockquote: (props: any) => (
    <blockquote {...props} className="border-l-4 border-indigo-200 pl-4 my-4 italic" />
  ),
  code: (props: any) => (
    <code {...props} className="bg-gray-100 rounded px-1 py-0.5 text-sm [pre_&]:bg-transparent [pre_&]:text-inherit" />
  ),
  pre: (props: any) => (
    <pre {...props} className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto my-4" />
  ),
  img: (props: any) => (
    <Image 
      {...props} 
      alt={props.alt || "Blog post image"} 
      className="rounded-lg shadow-lg my-6" 
    />
  ),
  table: (props: any) => (
    <div className="overflow-x-auto my-6">
      <table {...props} className="min-w-full divide-y divide-gray-200" />
    </div>
  ),
  th: (props: any) => (
    <th {...props} className="px-4 py-2 bg-gray-50 text-left text-sm font-medium text-gray-700" />
  ),
  td: (props: any) => (
    <td {...props} className="px-4 py-2 text-sm text-gray-700 border-t" />
  ),
}

interface MDXContentProps {
  serializedContent: any
}

export function MDXContent({ serializedContent }: MDXContentProps) {
  if (!serializedContent) {
    return <div>No content available</div>
  }

  return (
    <div className="prose prose-lg mx-auto">
      <MDXRemote {...serializedContent} components={components} />
    </div>
  )
}
