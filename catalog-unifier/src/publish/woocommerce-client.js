const { normalizeText } = require('../utils/text');

function trimSlash(url) {
  return String(url || '').replace(/\/$/, '');
}

function isConfigured(config) {
  return Boolean(
    config?.woocommerce?.url &&
    config?.woocommerce?.consumerKey &&
    config?.woocommerce?.consumerSecret
  );
}

class WooClient {
  constructor(config) {
    this.baseUrl = trimSlash(config.woocommerce.url);
    this.consumerKey = config.woocommerce.consumerKey;
    this.consumerSecret = config.woocommerce.consumerSecret;
    this.timeoutMs = Number(config.woocommerce.timeoutMs || 30000);
    this.categoryCache = new Map();
    this.categoriesLoaded = false;
  }

  buildEndpoint(pathname, query = {}) {
    const url = new URL(`${this.baseUrl}/wp-json/wc/v3/${String(pathname).replace(/^\//, '')}`);
    url.searchParams.set('consumer_key', this.consumerKey);
    url.searchParams.set('consumer_secret', this.consumerSecret);

    for (const [key, value] of Object.entries(query || {})) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }

    return url.toString();
  }

  async request(method, pathname, query = {}, body) {
    const url = this.buildEndpoint(pathname, query);
    const maxAttempts = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        const text = await response.text();
        let data;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = text;
        }

        if (!response.ok) {
          const message = typeof data === 'object' && data?.message
            ? data.message
            : `HTTP ${response.status}`;
          throw new Error(`WooCommerce ${method} ${pathname}: ${message}`);
        }

        return {
          data,
          headers: response.headers,
        };
      } catch (error) {
        lastError = error;
        const msg = String(error?.message || '');
        const retryable = msg.includes('timeout') || msg.includes('aborted') || msg.includes('EAI_AGAIN');
        if (!retryable || attempt >= maxAttempts) {
          break;
        }
      }
    }

    throw lastError || new Error(`WooCommerce ${method} ${pathname}: error desconocido`);
  }

  async getProductsBySku(sku) {
    const { data } = await this.request('GET', 'products', {
      sku,
      per_page: 20,
      status: 'any',
    });

    return Array.isArray(data) ? data : [];
  }

  async createProduct(payload) {
    const { data } = await this.request('POST', 'products', {}, payload);
    return data;
  }

  async updateProduct(productId, payload) {
    const { data } = await this.request('PUT', `products/${productId}`, {}, payload);
    return data;
  }

  categoryKey(name, parentId) {
    return `${normalizeText(name)}||${Number(parentId || 0)}`;
  }

  async loadCategories() {
    if (this.categoriesLoaded) return;

    let page = 1;
    let totalPages = 1;

    do {
      const { data, headers } = await this.request('GET', 'products/categories', {
        per_page: 100,
        page,
        hide_empty: false,
      });

      const rows = Array.isArray(data) ? data : [];
      for (const row of rows) {
        const key = this.categoryKey(row?.name || '', row?.parent || 0);
        if (!this.categoryCache.has(key)) {
          this.categoryCache.set(key, row);
        }
      }

      totalPages = Number(headers.get('x-wp-totalpages') || '1') || 1;
      page += 1;
    } while (page <= totalPages);

    this.categoriesLoaded = true;
  }

  async findCategory(name, parentId = 0) {
    await this.loadCategories();
    return this.categoryCache.get(this.categoryKey(name, parentId)) || null;
  }

  async createCategory(name, parentId = 0) {
    const payload = parentId ? { name, parent: parentId } : { name };
    const { data } = await this.request('POST', 'products/categories', {}, payload);

    const key = this.categoryKey(data?.name || name, data?.parent || parentId || 0);
    this.categoryCache.set(key, data);
    return data;
  }
}

module.exports = {
  WooClient,
  isConfigured,
};
