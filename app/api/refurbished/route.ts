import { NextRequest, NextResponse } from 'next/server';
import { wcApi } from '@/lib/woocommerce';
import { isDisplayableProduct } from '@/lib/productVisibility';
import {
  isAffirmativeRefurbishedTerm,
  isGenuinelyRefurbished,
} from '@/lib/refurbishedProducts';

const WOO_PAGE_SIZE = 100;
const KEYWORD_QUERIES = ['reacondicionado', 'reacondicionada', 'refurbished', 'renewed'];

async function fetchAllProducts(params: Record<string, string | number>) {
  const firstResponse = await wcApi.get('/products', {
    params: { ...params, per_page: WOO_PAGE_SIZE, page: 1, status: 'publish' },
  });
  const products = Array.isArray(firstResponse.data) ? [...firstResponse.data] : [];
  const totalPages = Math.max(1, Number(firstResponse.headers['x-wp-totalpages']) || 1);

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await wcApi.get('/products', {
      params: { ...params, per_page: WOO_PAGE_SIZE, page, status: 'publish' },
    });
    if (Array.isArray(response.data)) products.push(...response.data);
  }

  return products;
}

async function fetchKeywordCandidates() {
  const responses = await Promise.all(
    KEYWORD_QUERIES.map((search) => fetchAllProducts({ search })),
  );
  return responses.flat();
}

async function fetchAttributeCandidates(attributes: any[]) {
  const refurbishedAttr = attributes.find((attribute: any) => {
    const slug = String(attribute?.slug ?? '').toLowerCase();
    const name = String(attribute?.name ?? '').toLowerCase();
    return slug === 'pa_reacondicionado'
      || slug === 'reacondicionado'
      || name === 'reacondicionado';
  });

  if (!refurbishedAttr?.id) return [];

  const termsResponse = await wcApi.get(
    `/products/attributes/${refurbishedAttr.id}/terms`,
    { params: { per_page: 100 } },
  );
  const affirmativeTerms = (Array.isArray(termsResponse.data) ? termsResponse.data : [])
    .filter((term: any) => isAffirmativeRefurbishedTerm(`${term?.name ?? ''} ${term?.slug ?? ''}`));

  if (!affirmativeTerms.length) return [];

  const taxonomy = String(refurbishedAttr.slug ?? 'reacondicionado').startsWith('pa_')
    ? String(refurbishedAttr.slug)
    : `pa_${String(refurbishedAttr.slug ?? 'reacondicionado')}`;

  return fetchAllProducts({
    attribute: taxonomy,
    attribute_term: affirmativeTerms.map((term: any) => term.id).join(','),
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get('per_page')) || 24));

    // Obtener el ID del atributo "reacondicionado"
    const attributesResponse = await wcApi.get('/products/attributes', {
      params: { per_page: 100 },
    });

    const attributes = Array.isArray(attributesResponse.data) ? attributesResponse.data : [];
    const [keywordCandidates, attributeCandidates] = await Promise.all([
      fetchKeywordCandidates(),
      fetchAttributeCandidates(attributes),
    ]);

    const uniqueProducts = new Map<number, any>();
    for (const product of [...keywordCandidates, ...attributeCandidates]) {
      const id = Number(product?.id);
      if (Number.isFinite(id)) uniqueProducts.set(id, product);
    }

    const matchingProducts = Array.from(uniqueProducts.values())
      .filter(isDisplayableProduct)
      .filter(isGenuinelyRefurbished)
      .sort((left, right) => Number(right?.id ?? 0) - Number(left?.id ?? 0));

    const total = matchingProducts.length;
    const pages = total > 0 ? Math.ceil(total / perPage) : 0;
    const offset = (page - 1) * perPage;

    return NextResponse.json({
      products: matchingProducts.slice(offset, offset + perPage),
      total,
      pages,
    });
  } catch (error: any) {
    console.error('Error fetching refurbished products:', error);
    return NextResponse.json(
      {
        error: 'Error fetching refurbished products',
        detail: error?.response?.data || error?.message,
      },
      { status: error?.response?.status || 500 }
    );
  }
}
