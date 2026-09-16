const fs = require('fs');
const path = require('path');
const { fileExists } = require('../config');

async function readLocalJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

async function requestJson(url, options, maxAttempts = 2) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(`DMI HTTP ${response.status} en ${url}`);
      }

      return data;
    } catch (error) {
      lastError = error;
      const msg = String(error?.message || '');
      const retryable = msg.includes('timeout') || msg.includes('aborted') || msg.includes('EAI_AGAIN');
      if (!retryable || attempt >= maxAttempts) {
        break;
      }
    }
  }

  throw lastError || new Error(`DMI request error en ${url}`);
}

function indexBySku(pricePayload) {
  const out = new Map();
  const items = Array.isArray(pricePayload?.products) ? pricePayload.products : [];
  for (const row of items) {
    const sku = String(row?.sku || row?.SKU || '').trim();
    if (!sku) continue;
    out.set(sku, row);
  }
  return out;
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, data) {
  ensureDirForFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
}

function fileAgeMinutes(filePath) {
  const stat = fs.statSync(filePath);
  const ageMs = Date.now() - stat.mtimeMs;
  return ageMs / 60000;
}

function isRateLimitOrTransient(error) {
  const msg = String(error?.message || '').toLowerCase();
  return (
    msg.includes('http 429') ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    msg.includes('eai_again') ||
    msg.includes('fetch failed')
  );
}

async function fetchDmiViaApi(config) {
  const { apiUrl, username, password } = config.providers.dmi;
  const base = String(apiUrl || '').replace(/\/$/, '');

  if (!base || !username || !password) {
    return {
      provider: 'dmi',
      source: 'skipped',
      items: [],
      warning: 'DMI sin credenciales/API en este entorno, se omite en MVP',
    };
  }

  const authData = await requestJson(`${base}/api/v2/users/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    signal: AbortSignal.timeout(40000),
  });

  const token = String(authData?.token || '').trim();
  if (!token) {
    throw new Error('Auth DMI fallida: token vacío');
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const products = await requestJson(`${base}/api/v2/products/getallproducts`, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(70000),
  });

  const pricePayload = await requestJson(`${base}/api/v2/price/getpriceperformance`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ skus: [] }),
    signal: AbortSignal.timeout(70000),
  });

  const priceMap = indexBySku(pricePayload);

  const merged = Array.isArray(products)
    ? products.map((product) => {
        const sku = String(product?.sku || product?.SKU || product?.referencia || '').trim();
        const extra = priceMap.get(sku) || {};
        return {
          ...product,
          referencia: product?.referencia || sku,
          pvp: product?.pvp ?? product?.price ?? extra?.pvp ?? extra?.price,
          pvd: product?.pvd ?? product?.cost ?? extra?.cost ?? product?.pvp,
          stock: product?.stock ?? extra?.stock ?? 0,
        };
      })
    : [];

  return {
    provider: 'dmi',
    source: `api:${base}`,
    items: merged,
  };
}

async function fetchDmiProducts(config) {
  const providerConfig = config.providers.dmi || {};
  const localPath = providerConfig.localPath;
  const cachePath = providerConfig.cachePath;
  const cacheMaxAgeMinutes = Number(providerConfig.cacheMaxAgeMinutes || 0);

  if (localPath && fileExists(localPath)) {
    const data = await readLocalJson(localPath);
    if (!Array.isArray(data)) {
      throw new Error('DMI local inválido: se esperaba array');
    }

    return {
      provider: 'dmi',
      source: `local:${localPath}`,
      items: data,
    };
  }

  if (cachePath && fileExists(cachePath) && cacheMaxAgeMinutes > 0) {
    try {
      const age = fileAgeMinutes(cachePath);
      if (age <= cacheMaxAgeMinutes) {
        const data = await readLocalJson(cachePath);
        if (Array.isArray(data)) {
          return {
            provider: 'dmi',
            source: `cache:${cachePath}`,
            items: data,
            warning: `DMI en caché (${Math.round(age)} min)`,
          };
        }
      }
    } catch {
      // Si falla la cache, continúa a API.
    }
  }

  try {
    const fromApi = await fetchDmiViaApi(config);
    if (cachePath && Array.isArray(fromApi.items) && fromApi.items.length > 0) {
      writeJson(cachePath, fromApi.items);
    }
    return fromApi;
  } catch (error) {
    if (cachePath && fileExists(cachePath) && isRateLimitOrTransient(error)) {
      const data = await readLocalJson(cachePath);
      if (Array.isArray(data)) {
        return {
          provider: 'dmi',
          source: `cache-fallback:${cachePath}`,
          items: data,
          warning: `DMI fallback cache por error API: ${error?.message || String(error)}`,
        };
      }
    }
    throw error;
  }
}

module.exports = {
  fetchDmiProducts,
};
