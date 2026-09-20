import type { MetadataRoute } from 'next';
import { wcApi } from '@/lib/woocommerce';
import { getPosts } from '@/lib/wordpress';
import { getBaseUrl } from '@/lib/seo';

// Next conserva el XML generado y lo revalida cada hora. Así los rastreadores no
// esperan a que WooCommerce recorra todo el catálogo en cada petición.
// IMPORTANTE: no usar `dynamic = 'force-dynamic'` ni llamar a `headers()`/`cookies()`
// aquí dentro: ambas cosas fuerzan renderizado dinámico y anulan este `revalidate`,
// provocando que cada visita recorra el catálogo completo (~29k productos, ~100s).
export const revalidate = 3600;

const PAGE_SIZE = 100;
const WOO_PAGE_CONCURRENCY = 24;
const SITEMAP_FETCH_TIMEOUT_MS = 180_000;

interface SitemapProduct {
  id: number;
  slug: string;
  date_modified?: string;
  date_modified_gmt?: string;
}

interface SitemapCategory {
  id: number;
  slug: string;
  parent?: number;
}

async function fetchAllPages<T>(fetchPage: (page: number) => Promise<T[]>): Promise<T[]> {
  const items: T[] = [];

  for (let page = 1; ; page += 1) {
    const batch = await fetchPage(page);
    if (!batch.length) break;
    items.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return items;
}

async function fetchAllWooPages<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
): Promise<T[]> {
  const requestPage = (page: number) => wcApi.get<T[]>(endpoint, {
    params: { ...params, per_page: PAGE_SIZE, page },
  });

  const firstResponse = await requestPage(1);
  const items = [...firstResponse.data];
  const totalPages = Math.max(1, Number(firstResponse.headers['x-wp-totalpages']) || 1);

  for (let firstPage = 2; firstPage <= totalPages; firstPage += WOO_PAGE_CONCURRENCY) {
    const pages = Array.from(
      { length: Math.min(WOO_PAGE_CONCURRENCY, totalPages - firstPage + 1) },
      (_, index) => firstPage + index,
    );
    const responses = await Promise.all(pages.map(requestPage));
    responses.forEach((response) => items.push(...response.data));
  }

  return items;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Sitemap data fetch exceeded ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/tienda`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/ofertas`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/reacondicionados`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/servicios-pymes-empresas-cordoba`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/reparacion-informatica-cordoba`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/reparacion-consolas-cordoba`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/reparacion-moviles-cordoba`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/portatiles-reacondicionados-cordoba`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/sistema-de-puntos`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.55,
    },
    {
      url: `${baseUrl}/aviso-legal`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/politica-privacidad`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/politica-cookies`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/condiciones-generales`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/desistimiento`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  try {
    const [categories, products, posts] = await withTimeout(Promise.all([
      fetchAllWooPages<SitemapCategory>('/products/categories', {
        _fields: 'id,slug,parent',
      }),
      fetchAllWooPages<SitemapProduct>('/products', {
        status: 'publish',
        _fields: 'id,slug,date_modified,date_modified_gmt',
      }),
      fetchAllPages((page) => getPosts({ per_page: PAGE_SIZE, page })),
    ]), SITEMAP_FETCH_TIMEOUT_MS);

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${baseUrl}/categoria/${category.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: category.parent ? 0.65 : 0.8,
    }));

    const productRoutes: MetadataRoute.Sitemap = products.map((product) => {
      const modifiedValue = product.date_modified_gmt
        ? `${product.date_modified_gmt}Z`
        : product.date_modified;
      const modifiedDate = modifiedValue ? new Date(modifiedValue) : now;

      return {
        url: `${baseUrl}/producto/${product.slug}`,
        lastModified: Number.isNaN(modifiedDate.getTime()) ? now : modifiedDate,
        changeFrequency: 'weekly',
        priority: 0.7,
      };
    });

    const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: 'monthly',
      priority: 0.6,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...blogRoutes];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    throw error;
  }
}
