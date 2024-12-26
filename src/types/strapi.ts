// Base Strapi types for v5
export interface StrapiMeta {
  pagination?: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
}

export interface StrapiListResponse<T> {
  data: T[];
  meta: StrapiMeta;
}

export interface StrapiSingleResponse<T> {
  data: T;
  meta: StrapiMeta;
}

// Base attributes that all content types have
export interface StrapiBaseFields {
  id: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale?: string;
}


// Author specific types
export interface StrapiAuthor extends StrapiBaseFields {
  name: string;
  email?: string;
  avatar?: string;
}

interface ArticleCover {
   url: string;
   width: number;
   height: number;
   alternativeText: string;
}
// Article specific types
export interface StrapiArticle extends StrapiBaseFields {
  title: string;
  content: string;
  description: string;
  slug: string;
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks: any[];
  author?: StrapiAuthor;
  cover?: ArticleCover;
  category?: StrapiCategory;
}

export type StrapiArticleResponse = StrapiListResponse<StrapiArticle> | StrapiSingleResponse<StrapiArticle>;



// Category specific types

export interface StrapiCategory extends StrapiBaseFields {
  name: string;
  slug: string;
  description: string;
}

