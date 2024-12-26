import axios, { AxiosError } from 'axios';
import { notFound } from 'next/navigation';
import {
  StrapiSingleResponse,
  StrapiListResponse,
  StrapiArticle,
  StrapiBaseFields,
  StrapiCategory,
} from '@/types/strapi';

// Configuration
const CONFIG = {
  apiUrl: process.env.NEXT_PUBLIC_STRAPI_URL,
  apiToken: process.env.STRAPI_API_TOKEN,
  cacheDuration: 5 * 60 * 1000, // 5 minutes in milliseconds
} as const;

// Custom error class
class StrapiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public details?: any
  ) {
    super(message);
    this.name = 'StrapiError';
  }
}


interface Pagination {
  page?: number;
  pageSize: number;
  withCount?: boolean;
}
type PopulateValue = string | string[];

export type PopulateObject = {
  [key: string]: PopulateValue | PopulateObject;
};

type PopulateParams = 
  | '*'
  | PopulateValue 
  | PopulateObject
  | (string | PopulateObject)[]
  | null;

interface FetchOptions {
  endpoint: string;
  slug?: string;
  populate?: PopulateParams;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additionalFilters?: Record<string, any>;
  sort?: string[];
  status?: 'published' | 'draft';
  pagination?: Pagination;    
  fields?: string[];
}



// API client
class StrapiClient {
  private static instance: StrapiClient;
  private headers: { Authorization: string };

  private constructor() {
    this.headers = {
      Authorization: `Bearer ${CONFIG.apiToken}`,
    };
  }

  static getInstance(): StrapiClient {
    if (!StrapiClient.instance) {
      StrapiClient.instance = new StrapiClient();
    }
    return StrapiClient.instance;
  }

  private async fetchFromAPI<T>({ 
    endpoint, 
    slug, 
    populate = '*',
    additionalFilters = {},
    sort,
    status,
    fields,
    pagination,
  }: FetchOptions): Promise<StrapiListResponse<T> | StrapiSingleResponse<T>> {
    try {
      const filters = slug ? { slug: { $eq: slug } } : {};
      const response = await axios.get(`${CONFIG.apiUrl}/api/${endpoint}`, {
        params: {
          filters: { ...filters, ...additionalFilters },
          populate: populate ? populate : undefined,
          sort,
          status,
          fields,
          pagination,
        },
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        notFound();
      }
      throw new StrapiError(
        'Failed to fetch from Strapi',
        error instanceof AxiosError ? error.response?.status : undefined,
        error
      );
    }
  }

  private async fetchSingle<T extends StrapiBaseFields>(options: FetchOptions): Promise<T> {
    const response = await this.fetchFromAPI<T>(options);

    if ('data' in response) {
      if (Array.isArray(response.data)) {
        const [item] = response.data;
        if (!item) {
          throw new StrapiError('Item not found');
        }
        return item;
      }
      return response.data;
    }
    
    throw new StrapiError('Invalid response format');
  }

  async fetchArticle(slug: string): Promise<StrapiArticle> {
    const article = await this.fetchSingle<StrapiArticle>({
      endpoint: 'articles',
      slug,
    });
    return article;
  }

  async fetchCollection<T>(options: FetchOptions): Promise<T[]> {
    const response = await this.fetchFromAPI<T>(options);

    if ('data' in response && Array.isArray(response.data)) {
      return response.data;
    }

    throw new StrapiError('No items found');
  }

  async fetchBlogCategoryArticles<T>(categorySlug: string): Promise<T[]> {
    const options = {
      endpoint: 'articles',
      additionalFilters: {
        category: {
          slug: {
            $eq: categorySlug
          }
        }
      },
      pagination: {
        pageSize: 10,
        page:1,
        withCount: true
      },
      sort: ['updatedAt:desc'],
    }

    const response = await this.fetchFromAPI<T>(options);

    if ('data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    
    throw new StrapiError('No items found');
  }

  async fetchCategory<T>(categorySlug: string): Promise<T> {
    const options = {
      endpoint: 'categories',
      slug: categorySlug
    }
    const response = await this.fetchFromAPI<T>(options);

    if ('data' in response) {
      if (Array.isArray(response.data)) {
        const [item] = response.data;
        if (!item) {
          throw new StrapiError('Item not found');
        }
        return item;
      }
      return response.data;
    }
    
    throw new StrapiError('Invalid response format');
  }
}

// Export singleton instance methods
const strapiClient = StrapiClient.getInstance();


export const fetchArticle = (slug: string): Promise<StrapiArticle> => strapiClient.fetchArticle(slug);
export const fetchBlogCategoryArticles = (categorySlug: string):Promise<StrapiArticle[]> => strapiClient.fetchBlogCategoryArticles(categorySlug);
export async function fetchAllArticles(options: {
  pageSize?: number,
  page?: number,
  fields?: string[],
  populate?: PopulateParams,
  sort?: string[],
}): Promise<StrapiArticle[]> {
  const {
    fields = ['updatedAt', 'publishedAt', 'slug'],
    pageSize = 10,
    page = 1,
    sort = ['publishedAt:desc'],
  } = options;
  let populate = options.populate;
  if(!populate) {
    populate = fields.length > 0 ? null : '*';
  }
  
  return strapiClient.fetchCollection<StrapiArticle>({
    endpoint: 'articles',
    populate,
    fields,
    pagination: {
      pageSize,
      page,
      withCount: true
    },
    sort: sort,
    status: 'published'
  })
}
export const fetchCategory = (categorySlug: string):Promise<StrapiCategory> => strapiClient.fetchCategory(categorySlug);

export async function fetchAllCategories(options: {
  pageSize?: number,
  page?: number,
  fields?: string[],
  sort?: string[],
}): Promise<StrapiCategory[]> {
  const {
    fields = ['name', 'slug'],
    pageSize = 100,
    page = 1,
    sort = ['name:asc'],
  } = options;

  return strapiClient.fetchCollection<StrapiCategory>({
    endpoint: 'categories',
    fields,
    pagination: {
      pageSize,
      page,
      withCount: true
    },
    sort,
    status: 'published'
  })
}
