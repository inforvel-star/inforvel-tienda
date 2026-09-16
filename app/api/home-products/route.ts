import { NextRequest, NextResponse } from 'next/server';
import { wcApi } from '@/lib/woocommerce';
import { getPrimaryImageSrc, isDisplayableProduct } from '@/lib/productVisibility';
import { normalizeProductPricing } from '@/lib/woocommerce';
import { createClient, RedisClientType } from 'redis';

const CACHE_TTL_MS = 5 * 60 * 1000;
const PERSISTED_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
const IMAGE_HEALTH_TTL_MS = 6 * 60 * 60 * 1000;
const IMAGE_CHECK_TIMEOUT_MS = 2500;
const PRODUCT_FIELDS = [
  'id', 'name', 'slug', 'price', 'regular_price', 'sale_price', 'on_sale',
  'stock_status', 'stock_quantity', 'images', 'categories', 'attributes',
  'average_rating', 'rating_count', 'inforvel_badges',
].join(',');

type HomeProduct = Record<string, unknown>;

interface HomeProductsPayload {
  laptops: HomeProduct[];
  smartphones: HomeProduct[];
  bestSellers: HomeProduct[];
  sales: HomeProduct[];
  latest: HomeProduct[];
  components: HomeProduct[];
  weeklyLaptops: HomeProduct[];
  generatedAt: string;
}

const cache = new Map<string, { expiresAt: number; data: HomeProductsPayload }>();
const pending = new Map<string, Promise<HomeProductsPayload>>();
const imageHealthCache = new Map<string, { reachable: boolean; expiresAt: number }>();
let redisClient: RedisClientType | null = null;
let redisConnection: Promise<RedisClientType | null> | null = null;

async function getRedisClient(): Promise<RedisClientType | null> {
  const redisUrl = process.env.REDIS_URL || '';
  if (!redisUrl) return null;
  if (redisClient?.isOpen) return redisClient;
  if (redisConnection) return redisConnection;

  redisConnection = (async () => {
    try {
      const client = createClient({ url: redisUrl });
      client.on('error', () => undefined);
      await client.connect();
      redisClient = client as RedisClientType;
      return redisClient;
    } catch {
      redisClient = null;
      return null;
    } finally {
      redisConnection = null;
    }
  })();

  return redisConnection;
}

function persistedCacheKey(key: string): string {
  return `home-products:v2:${key}`;
}

async function readPersistedPayload(key: string): Promise<HomeProductsPayload | null> {
  try {
    const redis = await getRedisClient();
    const raw = redis ? await redis.get(persistedCacheKey(key)) : null;
    return raw ? JSON.parse(raw) as HomeProductsPayload : null;
  } catch {
    return null;
  }
}

async function persistPayload(key: string, data: HomeProductsPayload): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (redis) {
      await redis.set(persistedCacheKey(key), JSON.stringify(data), { EX: PERSISTED_CACHE_TTL_SECONDS });
    }
  } catch {
    // La caché persistente es una mejora; nunca debe bloquear la respuesta de productos.
  }
}

function safeBrand(value: string | null, fallback: string): string {
  const brand = String(value || fallback).trim().slice(0, 40);
  return brand || fallback;
}

function normalizeProductText(product: HomeProduct): string {
  const categories = Array.isArray(product.categories)
    ? product.categories.map((category: any) => `${category?.name || ''} ${category?.slug || ''}`).join(' ')
    : '';
  return `${String(product.name || '')} ${categories}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function isLaptopProduct(product: HomeProduct): boolean {
  const text = normalizeProductText(product);
  const laptopTerms = /\b(portatil|notebook|laptop|macbook|chromebook|thinkpad|elitebook|ideapad|vivobook|zenbook|ultrabook|zbook)\b/;
  const accessoryTerms = /\b(cable|kit|router|carcasa|filtro|privacidad|funda|mochila|maletin|cargador|adaptador|bateria|soporte|base|dock|docking|estacion|repuesto|protector|pantalla|teclado|raton|bolsa)\b/;
  return laptopTerms.test(text) && !accessoryTerms.test(text);
}

function matchesBrand(product: HomeProduct, brand: string): boolean {
  const normalizedBrand = brand
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!normalizedBrand) return false;

  const attributes = Array.isArray(product.attributes)
    ? product.attributes.flatMap((attribute: any) => [
        String(attribute?.name || ''),
        ...(Array.isArray(attribute?.options) ? attribute.options.map(String) : []),
      ])
    : [];
  const context = [String(product.name || ''), ...attributes]
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const escapedBrand = normalizedBrand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escapedBrand}([^a-z0-9]|$)`, 'i').test(context);
}

function uniqueProducts(...groups: HomeProduct[][]): HomeProduct[] {
  const seen = new Set<number>();
  const result: HomeProduct[] = [];
  for (const product of groups.flat()) {
    const id = Number(product.id || 0);
    if (id > 0 && !seen.has(id) && isDisplayableProduct(product)) {
      seen.add(id);
      result.push(product);
    }
  }
  return result;
}

async function hasReachableImage(product: HomeProduct): Promise<boolean> {
  const src = getPrimaryImageSrc(product);
  if (!src) return false;

  const cached = imageHealthCache.get(src);
  if (cached && cached.expiresAt > Date.now()) return cached.reachable;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_CHECK_TIMEOUT_MS);
  let reachable = false;

  try {
    const response = await fetch(src, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    reachable = response.ok && (!contentType || contentType.toLowerCase().startsWith('image/'));
  } catch {
    reachable = false;
  } finally {
    clearTimeout(timeout);
  }

  imageHealthCache.set(src, { reachable, expiresAt: Date.now() + IMAGE_HEALTH_TTL_MS });
  return reachable;
}

async function takeReachableProducts(products: HomeProduct[], limit = 12): Promise<HomeProduct[]> {
  const candidates = uniqueProducts(products);
  const result: HomeProduct[] = [];
  const batchSize = 12;

  for (let index = 0; index < candidates.length && result.length < limit; index += batchSize) {
    const batch = candidates.slice(index, index + batchSize);
    const checks = await Promise.all(batch.map(hasReachableImage));
    batch.forEach((product, productIndex) => {
      if (checks[productIndex] && result.length < limit) result.push(product);
    });
  }

  return result;
}

async function getCategoryId(slug: string): Promise<number> {
  const response = await wcApi.get('/products/categories', {
    params: { slug, per_page: 1, _fields: 'id' },
  });
  const id = Number(response.data?.[0]?.id || 0);
  if (!id) throw new Error(`Category not found: ${slug}`);
  return id;
}

async function getProducts(params: Record<string, string | number | boolean>): Promise<HomeProduct[]> {
  const response = await wcApi.get('/products', {
    params: {
      status: 'publish',
      _fields: PRODUCT_FIELDS,
      ...params,
    },
  });
  return (Array.isArray(response.data) ? response.data : [])
    .map(normalizeProductPricing)
    .filter(isDisplayableProduct);
}

function discounted(products: HomeProduct[]): HomeProduct[] {
  const seen = new Set<number>();
  return products.filter((product) => {
    const id = Number(product.id || 0);
    const price = Number.parseFloat(String(product.price || ''));
    const regularPrice = Number.parseFloat(String(product.regular_price || ''));
    if (!id || seen.has(id) || !(price > 0 && regularPrice > price)) return false;
    seen.add(id);
    return true;
  });
}

async function buildPayload(laptopBrand: string, smartphoneBrand: string): Promise<HomeProductsPayload> {
  const [laptopCategory, smartphoneCategory, peripheralCategory] = await Promise.all([
    getCategoryId('portatiles'),
    getCategoryId('smartphones'),
    getCategoryId('perifericos'),
  ]);

  const [laptopCandidates, smartphones, bestSellers, sales, latest, components, weeklyLaptopCandidates] = await Promise.all([
    getProducts({ category: laptopCategory, per_page: 60, orderby: 'date', order: 'desc' }),
    getProducts({ category: smartphoneCategory, search: smartphoneBrand, per_page: 24, orderby: 'date', order: 'desc' }),
    getProducts({ per_page: 12, orderby: 'popularity', order: 'desc' }),
    getProducts({ per_page: 60, on_sale: true, orderby: 'date', order: 'desc' }),
    getProducts({ per_page: 12, orderby: 'date', order: 'desc' }),
    getProducts({ category: peripheralCategory, per_page: 12, orderby: 'date', order: 'desc' }),
    getProducts({ category: laptopCategory, search: laptopBrand, per_page: 40, orderby: 'date', order: 'desc' }),
  ]);

  const laptops = await takeReachableProducts(laptopCandidates.filter(isLaptopProduct));
  const weeklyLaptops = await takeReachableProducts(uniqueProducts(
    weeklyLaptopCandidates.filter(isLaptopProduct).filter((product) => matchesBrand(product, laptopBrand)),
    laptopCandidates.filter(isLaptopProduct).filter((product) => matchesBrand(product, laptopBrand))
  ));
  const weeklySmartphones = await takeReachableProducts(uniqueProducts(
    smartphones.filter((product) => matchesBrand(product, smartphoneBrand))
  ));
  const resolvedBestSellers = await takeReachableProducts(uniqueProducts(
    bestSellers,
    latest,
    laptopCandidates,
    components,
    smartphones
  ));
  const resolvedLatest = await takeReachableProducts(uniqueProducts(
    latest,
    laptopCandidates,
    smartphones,
    components,
    bestSellers
  ));
  const resolvedComponents = await takeReachableProducts(components);

  const saleProducts = await takeReachableProducts(discounted([
    ...sales,
    ...bestSellers,
    ...latest,
    ...laptopCandidates,
    ...components,
  ]));

  return {
    laptops,
    smartphones: weeklySmartphones,
    bestSellers: resolvedBestSellers,
    sales: saleProducts,
    latest: resolvedLatest,
    components: resolvedComponents,
    weeklyLaptops,
    generatedAt: new Date().toISOString(),
  };
}

function getOrCreatePayload(key: string, laptopBrand: string, smartphoneBrand: string) {
  const existing = pending.get(key);
  if (existing) return existing;

  const request = buildPayload(laptopBrand, smartphoneBrand)
    .then((data) => {
      cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      void persistPayload(key, data);
      return data;
    })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

export async function GET(request: NextRequest) {
  const laptopBrand = safeBrand(request.nextUrl.searchParams.get('laptop_brand'), 'HP');
  const smartphoneBrand = safeBrand(request.nextUrl.searchParams.get('smartphone_brand'), 'Samsung');
  const key = `${laptopBrand.toLowerCase()}|${smartphoneBrand.toLowerCase()}`;
  let cached = cache.get(key);

  if (!cached) {
    const persisted = await readPersistedPayload(key);
    if (persisted) {
      cached = { data: persisted, expiresAt: 0 };
      cache.set(key, cached);
    }
  }

  if (cached && cached.expiresAt > Date.now()) {
    const response = NextResponse.json(cached.data);
    response.headers.set('X-Home-Cache', 'HIT');
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return response;
  }

  // Si existe una selección anterior, se sirve inmediatamente mientras se renueva.
  if (cached) {
    void getOrCreatePayload(key, laptopBrand, smartphoneBrand).catch((error) => {
      console.error('Error refreshing home products:', error instanceof Error ? error.message : 'unknown error');
    });
    const response = NextResponse.json(cached.data);
    response.headers.set('X-Home-Cache', 'STALE');
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=900');
    return response;
  }

  try {
    const data = await getOrCreatePayload(key, laptopBrand, smartphoneBrand);
    const response = NextResponse.json(data);
    response.headers.set('X-Home-Cache', 'MISS');
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return response;
  } catch (error) {
    console.error('Error preloading home products:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Unable to preload home products' }, { status: 502 });
  }
}
