import axios from 'axios';
import { existsSync, readFileSync } from 'node:fs';
import { correctSupplierAccentErrors } from '../lib/productContent';

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const baseURL = process.env.WC_API_URL || `${process.env.NEXT_PUBLIC_WC_URL}/wp-json/wc/v3`;
const username = process.env.WC_CONSUMER_KEY;
const password = process.env.WC_CONSUMER_SECRET;

if (!baseURL || !username || !password) {
  throw new Error('Faltan WC_API_URL/NEXT_PUBLIC_WC_URL o las credenciales de WooCommerce.');
}

const api = axios.create({ baseURL, auth: { username, password } });
const suspiciousPattern = /[\p{L}]*ió(?=n\p{L})[\p{L}]*/giu;

interface ProductDescriptionAudit {
  id: number;
  slug: string;
  description?: string;
  short_description?: string;
}

function matches(value: string): string[] {
  return Array.from(value.matchAll(suspiciousPattern), (match) => match[0]);
}

async function fetchPage(page: number): Promise<ProductDescriptionAudit[]> {
  const response = await api.get('/products', {
    params: {
      status: 'publish',
      per_page: 100,
      page,
      _fields: 'id,slug,description,short_description',
    },
  });
  return Array.isArray(response.data) ? response.data : [];
}

async function main() {
  const firstResponse = await api.get('/products', {
    params: {
      status: 'publish',
      per_page: 100,
      page: 1,
      _fields: 'id,slug,description,short_description',
    },
  });
  const totalPages = Number.parseInt(firstResponse.headers['x-wp-totalpages'] || '1', 10) || 1;
  const products: ProductDescriptionAudit[] = Array.isArray(firstResponse.data) ? firstResponse.data : [];

  for (let start = 2; start <= totalPages; start += 6) {
    const pages = Array.from({ length: Math.min(6, totalPages - start + 1) }, (_, index) => start + index);
    products.push(...(await Promise.all(pages.map(fetchPage))).flat());
  }

  const affected: Array<{ id: number; slug: string; terms: string[] }> = [];
  let rawMatches = 0;
  let correctedMatches = 0;

  for (const product of products) {
    const raw = `${product.description || ''} ${product.short_description || ''}`;
    const terms = matches(raw);
    if (terms.length > 0) affected.push({ id: product.id, slug: product.slug, terms: Array.from(new Set(terms)) });
    rawMatches += terms.length;
    correctedMatches += matches(correctSupplierAccentErrors(raw)).length;
  }

  console.log(JSON.stringify({
    scannedProducts: products.length,
    affectedProducts: affected.length,
    rawMatches,
    correctedMatches,
    examples: affected.slice(0, 20),
  }, null, 2));

  if (correctedMatches !== 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('No se pudo completar la auditoría:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
