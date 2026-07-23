import axios from 'axios';

const WC_URL = process.env.NEXT_PUBLIC_WC_URL;
const WC_KEY = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY;
const WC_SECRET = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET;

const wcApi = axios.create({
  baseURL: `${WC_URL}/wp-json/wc/v3`,
  auth: {
    username: WC_KEY!,
    password: WC_SECRET!,
  },
});

export interface WCProduct {
  id: number;
  name: string;
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
}

export interface WCCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
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
      const response = await wcApi.get('/products', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  },

  async getProduct(id: number): Promise<WCProduct | null> {
    try {
      const response = await wcApi.get(`/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  },

  async getProductBySlug(slug: string): Promise<WCProduct | null> {
    try {
      const response = await wcApi.get('/products', { params: { slug } });
      return response.data[0] || null;
    } catch (error) {
      console.error('Error fetching product by slug:', error);
      return null;
    }
  },

  async getCategories(params?: {
    per_page?: number;
    parent?: number;
  }): Promise<WCCategory[]> {
    try {
      const response = await wcApi.get('/products/categories', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  async getCategory(id: number): Promise<WCCategory | null> {
    try {
      const response = await wcApi.get(`/products/categories/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching category:', error);
      return null;
    }
  },

  async createOrder(orderData: {
    payment_method: string;
    payment_method_title: string;
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
    customer_id?: number;
  }): Promise<WCOrder | null> {
    try {
      const response = await wcApi.post('/orders', orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      return null;
    }
  },

  async getOrders(customerId?: number): Promise<WCOrder[]> {
    try {
      const params = customerId ? { customer: customerId } : {};
      const response = await wcApi.get('/orders', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  },

  async searchProducts(query: string): Promise<WCProduct[]> {
    try {
      const response = await wcApi.get('/products', {
        params: { search: query, per_page: 10 },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  },
};
