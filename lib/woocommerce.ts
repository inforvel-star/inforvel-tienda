import axios from 'axios';
import { isDisplayableProduct } from '@/lib/productVisibility';
import { stripProductHtml } from '@/lib/productContent';
import { safeErrorForLog, sanitizeAxiosErrorForLogging } from '@/lib/safeLogging';

// ✅ SEGURO: estas variables NO tienen prefijo NEXT_PUBLIC_ y solo están disponibles
// en el servidor (Server Components y API Routes). Nunca llegan al navegador.
const WC_API_BASE = process.env.WC_API_URL || `${process.env.NEXT_PUBLIC_WC_URL}/wp-json/wc/v3`;
const WC_KEY = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;

const wcApi = axios.create({
  baseURL: WC_API_BASE,
  auth: {
    username: WC_KEY!,
    password: WC_SECRET!,
  },
});

wcApi.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(sanitizeAxiosErrorForLogging(error)),
);

export { wcApi };

function normalizeWooImageSrc(src: string): string {
  const value = String(src || '').trim();
  if (!value) return value;

  // Algunas referencias llegan con sufijos como "-0-3.jpg" que no existen en WP.
  // Normalizamos a "-0.jpg" para recuperar la imagen original.
  return value.replace(/-0-\d+(\.(?:jpe?g|png|webp|avif))(\?.*)?$/i, '-0$1$2');
}

function isPlaceholderImageUrl(value: string): boolean {
  const src = String(value || '').trim().toLowerCase();
  if (!src) return true;

  return (
    src === '/placeholder.png' ||
    src.includes('woocommerce-placeholder') ||
    src.includes('/placeholder.') ||
    src.includes('/no-image') ||
    src.includes('/no_image') ||
    src.includes('/sin-imagen') ||
    src.includes('/sin_imagen')
  );
}

function normalizeProductImages<T extends { images?: Array<{ src?: string }> }>(product: T): T {
  if (!Array.isArray(product.images)) return product;

  const normalizedImages = product.images
    .map((image) => ({
      ...image,
      src: normalizeWooImageSrc(String(image?.src ?? '')),
    }))
    .filter((image) => !isPlaceholderImageUrl(String(image?.src ?? '')) && String(image?.src ?? '').trim() !== '');

  return {
    ...product,
    images: normalizedImages,
  };
}

export function normalizeProductPricing<T extends {
  price?: string | number;
  regular_price?: string | number;
  on_sale?: boolean;
}>(product: T): T {
  const price = Number.parseFloat(String(product.price ?? ''));
  const regularPrice = Number.parseFloat(String(product.regular_price ?? ''));
  const hasRealDiscount = Number.isFinite(price) && Number.isFinite(regularPrice) && price > 0 && regularPrice > price;
  return hasRealDiscount && !product.on_sale ? { ...product, on_sale: true } : product;
}

function normalizeProduct<T extends { images?: Array<{ src?: string }>; price?: string | number; regular_price?: string | number; on_sale?: boolean }>(product: T): T {
  return normalizeProductPricing(normalizeProductImages(product));
}

function normalizeSearchValue(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-ES')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function scoreProductSearch(product: WCProduct, rawQuery: string): number {
  const query = normalizeSearchValue(rawQuery);
  if (!query) return 0;

  const name = normalizeSearchValue(product.name);
  const sku = normalizeSearchValue(product.sku);
  const brand = normalizeSearchValue(
    product.attributes?.filter((attribute) => /^(marca|brand|fabricante)$/i.test(attribute.name.trim()))
      .flatMap((attribute) => attribute.options)
      .join(' '),
  );
  const model = normalizeSearchValue(
    product.attributes?.filter((attribute) => /^(modelo|model)$/i.test(attribute.name.trim()))
      .flatMap((attribute) => attribute.options)
      .join(' '),
  );
  const description = normalizeSearchValue(stripProductHtml(product.description || ''));
  const wordPattern = new RegExp(`(?:^| )${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: |$)`);

  let score = 0;
  if (name === query) score += 1_000;
  else if (name.startsWith(`${query} `)) score += 800;
  else if (wordPattern.test(name)) score += 650;
  else if (name.includes(query)) score += 500;

  if (brand === query) score += 750;
  else if (brand.includes(query)) score += 450;

  if (sku === query || model === query) score += 700;
  else if (sku.includes(query) || model.includes(query)) score += 400;

  // La descripción conserva utilidad cuando no hay coincidencias estructuradas,
  // pero nunca puede adelantar a una coincidencia en nombre, marca o modelo.
  if (description.includes(query)) score += 10;
  return score;
}

export interface WCProduct {
  id: number;
  name: string;
  sku?: string;
  slug: string;
  permalink: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_status: string;
  stock_quantity: number | null;
  description: string;
  short_description: string;
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    options: string[];
  }>;
  variations: number[];
  average_rating: string;
  rating_count: number;
  inforvel_badges?: string[];
  meta_data?: Array<{
    id?: number;
    key: string;
    value: unknown;
  }>;
}

export interface WCCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent?: number;
  image: {
    src: string;
    alt: string;
  } | null;
  count: number;
}

export interface WCOrder {
  id: number;
  status: string;
  total: string;
  date_created: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    total: string;
  }>;
}

export const woocommerce = {
  async getProducts(params?: {
    per_page?: number;
    page?: number;
    category?: string;
    search?: string;
    orderby?: string;
    order?: 'asc' | 'desc';
    featured?: boolean;
    on_sale?: boolean;
  }): Promise<WCProduct[]> {
    try {
      const response = await wcApi.get('/products', {
        params: {
          ...params,
          status: 'publish',
        },
      });
      const products = Array.isArray(response.data) ? response.data : [];
      return products.map(normalizeProduct).filter(isDisplayableProduct);
    } catch (error) {
      console.error('Error fetching products:', safeErrorForLog(error));
      return [];
    }
  },

  async getProduct(id: number): Promise<WCProduct | null> {
    try {
      const response = await wcApi.get(`/products/${id}`);
      return normalizeProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', safeErrorForLog(error));
      return null;
    }
  },

  async getProductBySlug(slug: string): Promise<WCProduct | null> {
    try {
      const response = await wcApi.get('/products', { params: { slug, status: 'publish' } });
      return response.data[0] ? normalizeProductImages(response.data[0]) : null;
    } catch (error) {
      console.error('Error fetching product by slug:', safeErrorForLog(error));
      return null;
    }
  },

  async getCategories(params?: {
    per_page?: number;
    page?: number;
    parent?: number;
  }): Promise<WCCategory[]> {
    try {
      const response = await wcApi.get('/products/categories', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', safeErrorForLog(error));
      throw error;
    }
  },

  async getCategory(id: number): Promise<WCCategory | null> {
    try {
      const response = await wcApi.get(`/products/categories/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching category:', safeErrorForLog(error));
      return null;
    }
  },

  async getCategoryBySlug(slug: string): Promise<WCCategory | null> {
    try {
      const response = await wcApi.get('/products/categories', {
        params: { slug, per_page: 1 },
      });
      return Array.isArray(response.data) && response.data[0] ? response.data[0] : null;
    } catch (error) {
      console.error('Error fetching category by slug:', safeErrorForLog(error));
      return null;
    }
  },

  async createOrder(orderData: {
    payment_method: string;
    payment_method_title: string;
    customer_note?: string;
    billing: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      address_1: string;
      address_2?: string;
      city: string;
      state: string;
      postcode: string;
      country: string;
    };
    line_items: Array<{
      product_id: number;
      quantity: number;
    }>;
    coupon_lines?: Array<{
      code: string;
    }>;
    customer_id?: number;
  }): Promise<WCOrder | null> {
    try {
      const response = await wcApi.post('/orders', orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', safeErrorForLog(error));
      return null;
    }
  },

  async getOrders(customerId?: number): Promise<WCOrder[]> {
    try {
      const params = customerId ? { customer: customerId } : {};
      const response = await wcApi.get('/orders', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', safeErrorForLog(error));
      return [];
    }
  },

  async searchProducts(query: string): Promise<WCProduct[]> {
    try {
      const response = await wcApi.get('/products', {
        params: { search: query, per_page: 30, status: 'publish' },
      });
      const products = Array.isArray(response.data) ? response.data : [];
      return products
        .map(normalizeProduct)
        .filter(isDisplayableProduct)
        .map((product, originalIndex) => ({ product, originalIndex, score: scoreProductSearch(product, query) }))
        .sort((left, right) => right.score - left.score || left.originalIndex - right.originalIndex)
        .slice(0, 10)
        .map(({ product }) => product);
    } catch (error) {
      console.error('Error searching products:', safeErrorForLog(error));
      return [];
    }
  },
};
