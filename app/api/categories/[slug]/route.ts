import { NextRequest, NextResponse } from 'next/server';
import { wcApi, scoreProductSearch } from '@/lib/woocommerce';
import { isDisplayableProduct } from '@/lib/productVisibility';
import { getCanonicalSpecifications, specificationTerm } from '@/lib/productSpecifications';

interface ParsedAttributeFilter {
  slug: string;
  terms: string[];
}

interface CategoryNode {
  id: number;
  parent?: number;
}

let categoriesCache: { expiresAt: number; data: CategoryNode[] } | null = null;
let attributeIdBySlugCache: { expiresAt: number; data: Record<string, number> } | null = null;
const attributeTermIdCache = new Map<number, { expiresAt: number; data: Record<string, number> }>();
const categoryProductsCache = new Map<string, { expiresAt: number; data: any[] }>();

function normalizeTerm(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function parseAttributeFilters(searchParams: URLSearchParams): ParsedAttributeFilter[] {
  const serialized = searchParams.getAll('attributes');
  if (serialized.length > 0) {
    return serialized
      .map((entry) => {
        const [slugPart, termsPart = ''] = entry.split(':');
        const slug = slugPart?.trim();
        const terms = termsPart
          .split(',')
          .map(normalizeTerm)
          .filter(Boolean);

        if (!slug || terms.length === 0) {
          return null;
        }

        return { slug, terms };
      })
      .filter((value): value is ParsedAttributeFilter => value !== null);
  }

  const attrSlug = searchParams.get('attribute');
  const attrTerms = searchParams.get('attribute_term');

  if (!attrSlug || !attrTerms) {
    return [];
  }

  return [{
    slug: attrSlug,
    terms: attrTerms.split(',').map(normalizeTerm).filter(Boolean),
  }];
}

async function fetchAllCategoryProducts(categoryId: number, search = '') {
  const normalizedSearch = search.trim().toLocaleLowerCase('es');
  const cacheKey = `${categoryId}:${normalizedSearch}`;
  const cached = categoryProductsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const categories = await getAllCategoriesCached();
  const categoryIds = collectCategoryAndChildrenIds(categories, categoryId);

  const perPage = 100;
  const requestParams = {
    category: Array.from(categoryIds).join(','),
    per_page: perPage,
    status: 'publish',
    search: search || undefined,
  };
  const firstResponse = await wcApi.get('/products', { params: { ...requestParams, page: 1 } });
  const totalPages = parseInt(firstResponse.headers['x-wp-totalpages'] ?? '1');
  const remainingResponses = totalPages > 1
    ? await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        wcApi.get('/products', { params: { ...requestParams, page: index + 2 } })
      )
    )
    : [];
  const products = [firstResponse, ...remainingResponses]
    .flatMap((response) => Array.isArray(response.data) ? response.data : [])
    .filter(isDisplayableProduct);
  categoryProductsCache.set(cacheKey, { data: products, expiresAt: Date.now() + 3 * 60 * 1000 });
  return products;
}

async function getAllCategoriesCached(): Promise<CategoryNode[]> {
  const now = Date.now();
  if (categoriesCache && categoriesCache.expiresAt > now) {
    return categoriesCache.data;
  }

  const firstResponse = await wcApi.get('/products/categories', {
    params: { per_page: 100, page: 1 },
  });
  const totalPages = Math.max(parseInt(firstResponse.headers['x-wp-totalpages'] ?? '1', 10) || 1, 1);
  const remainingResponses = totalPages > 1
    ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) =>
      wcApi.get('/products/categories', { params: { per_page: 100, page: index + 2 } })
    ))
    : [];
  const categories: CategoryNode[] = [firstResponse, ...remainingResponses]
    .flatMap((response) => Array.isArray(response.data) ? response.data : []);
  categoriesCache = {
    data: categories,
    expiresAt: now + 5 * 60 * 1000,
  };

  return categories;
}

async function getAttributeIdBySlugCached(slug: string): Promise<number | null> {
  const now = Date.now();
  if (!attributeIdBySlugCache || attributeIdBySlugCache.expiresAt <= now) {
    const response = await wcApi.get('/products/attributes', {
      params: { per_page: 100 },
    });
    const data = Array.isArray(response.data) ? response.data : [];
    const map: Record<string, number> = {};
    for (const attribute of data) {
      const key = String(attribute?.slug ?? '').trim();
      const id = Number(attribute?.id ?? 0);
      if (key && id > 0) {
        map[key] = id;
      }
    }
    attributeIdBySlugCache = {
      data: map,
      expiresAt: now + 10 * 60 * 1000,
    };
  }

  return attributeIdBySlugCache.data[slug] ?? null;
}

async function getAttributeTermIdBySlugCached(attributeId: number, termSlug: string): Promise<number | null> {
  const now = Date.now();
  const cached = attributeTermIdCache.get(attributeId);
  if (!cached || cached.expiresAt <= now) {
    const response = await wcApi.get(`/products/attributes/${attributeId}/terms`, {
      params: { per_page: 100 },
    });
    const data = Array.isArray(response.data) ? response.data : [];
    const map: Record<string, number> = {};
    for (const term of data) {
      const key = String(term?.slug ?? '').trim();
      const id = Number(term?.id ?? 0);
      if (key && id > 0) {
        map[key] = id;
      }
    }
    attributeTermIdCache.set(attributeId, {
      data: map,
      expiresAt: now + 10 * 60 * 1000,
    });
  }

  const refreshed = attributeTermIdCache.get(attributeId);
  return refreshed?.data[termSlug] ?? null;
}

function collectCategoryAndChildrenIds(categories: CategoryNode[], categoryId: number): Set<number> {
  const categoryIds = new Set<number>([categoryId]);
  const queue = [categoryId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = categories.filter((category) => (category.parent ?? 0) === currentId);

    for (const child of children) {
      if (!categoryIds.has(child.id)) {
        categoryIds.add(child.id);
        queue.push(child.id);
      }
    }
  }

  return categoryIds;
}

function buildAttributeMap(products: any[]) {
  const attributeMap: Record<string, { id: number; name: string; slug: string; terms: Record<string, { id: number; name: string; slug: string }> }> = {};
  for (const product of products) {
    for (const specification of getCanonicalSpecifications(product)) {
      if (!attributeMap[specification.slug]) {
        attributeMap[specification.slug] = { id: 0, name: specification.name, slug: specification.slug, terms: {} };
      }
      for (const option of specification.options) {
        const key = specificationTerm(option);
        attributeMap[specification.slug].terms[key] = { id: 0, name: option, slug: key };
      }
    }
  }

  for (const attribute of Object.values(attributeMap)) {
    attribute.terms = Object.fromEntries(
      Object.values(attribute.terms)
        .sort((a, b) => {
          if (attribute.slug === 'spec-ram') return (parseInt(a.name, 10) || 9999) - (parseInt(b.name, 10) || 9999);
          return a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' });
        })
        .map((term) => [term.slug, term])
    );
  }
  return Object.values(attributeMap);
}

function buildPriceRange(products: any[]) {
  const prices = products.map((p: any) => parseFloat(p.price)).filter(Boolean);
  return {
    min: prices.length ? Math.floor(Math.min(...prices)) : 0,
    max: prices.length ? Math.ceil(Math.max(...prices)) : 9999,
  };
}

function withCacheHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  return response;
}

function sortProducts(products: any[], orderby: string, order: string) {
  const direction = order === 'desc' ? -1 : 1;
  const sorted = [...products];

  sorted.sort((a, b) => {
    if (orderby === 'price') {
      return (parseFloat(a.price ?? '0') - parseFloat(b.price ?? '0')) * direction;
    }

    if (orderby === 'date') {
      return ((new Date(a.date_created ?? 0).getTime()) - (new Date(b.date_created ?? 0).getTime())) * direction;
    }

    if (orderby === 'rating') {
      return (parseFloat(a.average_rating ?? '0') - parseFloat(b.average_rating ?? '0')) * direction;
    }

    const menuOrderDiff = ((a.menu_order ?? 0) - (b.menu_order ?? 0)) * direction;
    if (menuOrderDiff !== 0) {
      return menuOrderDiff;
    }

    return String(a.name ?? '').localeCompare(String(b.name ?? '')) * direction;
  });

  return sorted;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const searchParams = request.nextUrl.searchParams;

    // Filtros desde query params
    const page        = searchParams.get('page') ?? '1';
    const perPage     = searchParams.get('per_page') ?? '24';
    const orderby     = searchParams.get('orderby') ?? 'menu_order';
    const order       = searchParams.get('order') ?? 'asc';
    const minPrice    = searchParams.get('min_price');
    const maxPrice    = searchParams.get('max_price');
    const inStock     = searchParams.get('in_stock');
    const rating      = searchParams.get('rating');
    const search      = searchParams.get('search')?.trim() ?? '';
    const minimal     = ['1', 'true', 'yes'].includes((searchParams.get('minimal') ?? '').toLowerCase());
    const attributeFilters = parseAttributeFilters(searchParams);

    // 1. Buscar categoría
    const catRes = await wcApi.get('/products/categories', {
      params: { slug, per_page: 1 },
    });
    const categories = catRes.data;
    if (!categories?.length) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    const category = categories[0];

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const itemsPerPage = Math.max(parseInt(perPage, 10) || 24, 1);
    const allCategories = await getAllCategoriesCached();
    const categoryIds = collectCategoryAndChildrenIds(allCategories, category.id);
    const categoryParam = Array.from(categoryIds).join(',');

    // Fast path: sin filtros de atributos ni rating -> delegar paginación/orden a WooCommerce.
    if (!search && attributeFilters.length === 0 && !rating) {
      const fastProductsRes = await wcApi.get('/products', {
        params: {
          category: categoryParam,
          per_page: itemsPerPage,
          page: currentPage,
          status: 'publish',
          orderby,
          order,
          min_price: minPrice || undefined,
          max_price: maxPrice || undefined,
          stock_status: inStock === 'true' ? 'instock' : undefined,
          search: search || undefined,
        },
      });

      const fastProducts = Array.isArray(fastProductsRes.data)
        ? fastProductsRes.data.filter(isDisplayableProduct)
        : [];
      const totalProducts = parseInt(fastProductsRes.headers['x-wp-total'] ?? '0', 10) || fastProducts.length;
      const totalPages = parseInt(fastProductsRes.headers['x-wp-totalpages'] ?? '1', 10) || 1;

      if (minimal) {
        return withCacheHeaders(NextResponse.json({
          category,
          products: fastProducts,
          totalProducts,
          totalPages,
          attributes: [],
          priceRange: { min: 0, max: 0 },
        }));
      }

      // Muestra filtros rápidos basados en una muestra para no bloquear la respuesta.
      const sampleRes = await wcApi.get('/products', {
        params: {
          category: categoryParam,
          per_page: 60,
          page: 1,
          status: 'publish',
          search: search || undefined,
        },
      });
      const sampleProducts = Array.isArray(sampleRes.data)
        ? sampleRes.data.filter(isDisplayableProduct)
        : [];

      return withCacheHeaders(NextResponse.json({
        category,
        products: fastProducts,
        totalProducts,
        totalPages,
        attributes: buildAttributeMap(sampleProducts),
        priceRange: buildPriceRange(sampleProducts),
      }));
    }

    // Fast path mínimo para 1 filtro de atributo simple (uso principal: home).
    if (
      minimal &&
      !rating &&
      attributeFilters.length === 1 &&
      attributeFilters[0].terms.length === 1
    ) {
      const filter = attributeFilters[0];
      const attributeId = await getAttributeIdBySlugCached(filter.slug);
      const attributeTermId = attributeId
        ? await getAttributeTermIdBySlugCached(attributeId, filter.terms[0])
        : null;

      if (attributeId && attributeTermId) {
        const filteredRes = await wcApi.get('/products', {
          params: {
            category: categoryParam,
            per_page: itemsPerPage,
            page: currentPage,
            status: 'publish',
            orderby,
            order,
            attribute: attributeId,
            attribute_term: attributeTermId,
            min_price: minPrice || undefined,
            max_price: maxPrice || undefined,
            stock_status: inStock === 'true' ? 'instock' : undefined,
            search: search || undefined,
          },
        });

        const filteredProducts = Array.isArray(filteredRes.data)
          ? filteredRes.data.filter(isDisplayableProduct)
          : [];
        const totalProducts = parseInt(filteredRes.headers['x-wp-total'] ?? '0', 10) || filteredProducts.length;
        const totalPages = parseInt(filteredRes.headers['x-wp-totalpages'] ?? '1', 10) || 1;

        return withCacheHeaders(NextResponse.json({
          category,
          products: filteredProducts,
          totalProducts,
          totalPages,
          attributes: [],
          priceRange: { min: 0, max: 0 },
        }));
      }
    }

    // 2. Cargar todos los productos solo cuando hay filtros complejos.
    const allProducts = await fetchAllCategoryProducts(category.id, search);

    // 3. Atributos disponibles: sacados de los productos sin filtro (para el sidebar)
    const attributes = buildAttributeMap(allProducts);

    // 4. Rango de precios real de la categoría
    const priceRange = buildPriceRange(allProducts);

    // 5. Aplicar filtros reales sobre todos los productos de la categoría
    let filteredProducts = allProducts.filter((product) => {
      if (minPrice && parseFloat(product.price ?? '0') < parseFloat(minPrice)) {
        return false;
      }

      if (maxPrice && parseFloat(product.price ?? '0') > parseFloat(maxPrice)) {
        return false;
      }

      if (inStock === 'true' && product.stock_status !== 'instock') {
        return false;
      }

      if (rating && parseFloat(product.average_rating ?? '0') < parseFloat(rating)) {
        return false;
      }

      return attributeFilters.every(({ slug, terms }) => {
        const productAttribute = getCanonicalSpecifications(product).find((attr) => attr.slug === slug);
        if (!productAttribute) {
          return false;
        }

        const optionSlugs = productAttribute.options.map(specificationTerm);
        return terms.some((term) => optionSlugs.includes(term));
      });
    });

    if (search) {
      const fallbackOrder = sortProducts(filteredProducts, orderby, order);
      const fallbackIndex = new Map(fallbackOrder.map((product, index) => [product.id, index]));
      filteredProducts = [...filteredProducts].sort((left, right) =>
        scoreProductSearch(right, search) - scoreProductSearch(left, search)
        || (fallbackIndex.get(left.id) ?? 0) - (fallbackIndex.get(right.id) ?? 0)
      );
    } else {
      filteredProducts = sortProducts(filteredProducts, orderby, order);
    }

    const totalProducts = filteredProducts.length;
    const totalPages = Math.max(Math.ceil(totalProducts / itemsPerPage), 1);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const products = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

    return withCacheHeaders(NextResponse.json({
      category,
      products,
      totalProducts,
      totalPages,
      attributes,
      priceRange,
    }));
  } catch (error: any) {
    console.error('Error fetching category products:', error);
    return NextResponse.json(
      { error: 'Error fetching category products', detail: error?.response?.data || error?.message },
      { status: error?.response?.status || 500 }
    );
  }
}
