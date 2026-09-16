// Auditoría de solo lectura: por defecto detecta productos cuyo precio no se
// ha modificado en X días (señal fiable, no depende de la categoría). No
// escribe nada en WooCommerce — solo imprime un informe para revisión manual.
//
// El criterio "--ratio" (precio muy por encima de la mediana de su
// categoría) está desactivado por defecto: el catálogo tiene categorías con
// productos mal clasificados (p.ej. CPUs de gama alta o tarjetas gráficas
// metidas en "PCs Sobremesa"/"Cables y Conectores"), así que su mediana no
// es fiable y ese criterio da muchos falsos positivos. Actívalo a propósito
// si quieres revisarlo igualmente, sabiendo esto.
//
// Uso:
//   npm run audit:stale-prices                # solo por antigüedad, días=90
//   npm run audit:stale-prices -- --days=60
//   npm run audit:stale-prices -- --ratio=2   # activa también el criterio de precio vs categoría (ruidoso, ver arriba)

import axios from 'axios';
import { existsSync, readFileSync } from 'node:fs';

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

function getArgNumber(flag: string, fallback: number): number {
  const arg = process.argv.find((a) => a.startsWith(`--${flag}=`));
  if (!arg) return fallback;
  const value = Number.parseFloat(arg.split('=')[1]);
  return Number.isFinite(value) ? value : fallback;
}

const STALE_DAYS = getArgNumber('days', 90);
// Sin valor por defecto a propósito: el criterio de ratio-vs-categoría solo
// se activa si se pasa --ratio explícitamente (ver cabecera del fichero).
const RATIO_THRESHOLD = process.argv.some((a) => a.startsWith('--ratio=')) ? getArgNumber('ratio', 1.5) : null;

interface ProductPriceAudit {
  id: number;
  name: string;
  sku: string;
  slug: string;
  regular_price: string;
  date_modified: string;
  categories: Array<{ id: number; name: string }>;
}

async function fetchPage(page: number): Promise<ProductPriceAudit[]> {
  const response = await api.get('/products', {
    params: {
      status: 'publish',
      per_page: 100,
      page,
      _fields: 'id,name,sku,slug,regular_price,date_modified,categories',
    },
  });
  return Array.isArray(response.data) ? response.data : [];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

async function main() {
  const first = await api.get('/products', {
    params: {
      status: 'publish',
      per_page: 100,
      page: 1,
      _fields: 'id,name,sku,slug,regular_price,date_modified,categories',
    },
  });
  const totalPages = Number.parseInt(first.headers['x-wp-totalpages'] || '1', 10) || 1;
  const products: ProductPriceAudit[] = Array.isArray(first.data) ? first.data : [];

  for (let start = 2; start <= totalPages; start += 6) {
    const pages = Array.from({ length: Math.min(6, totalPages - start + 1) }, (_, i) => start + i);
    products.push(...(await Promise.all(pages.map(fetchPage))).flat());
  }

  const MIN_CATEGORY_SIZE = 8; // por debajo de esto la mediana no es fiable

  // Precio y categoría primaria válidos únicamente.
  const withPrice = products
    .map((p) => ({
      ...p,
      priceNum: Number.parseFloat(p.regular_price),
      category: p.categories?.[0]?.name || 'Sin categoría',
    }))
    .filter((p) => Number.isFinite(p.priceNum) && p.priceNum > 0);

  const byCategory = new Map<string, number[]>();
  for (const p of withPrice) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category)!.push(p.priceNum);
  }
  const categoryMedian = new Map<string, number>();
  byCategory.forEach((prices, category) => {
    // "Sin categoría" mezcla productos de precio muy dispar (de un cable a
    // un servidor) — su mediana no sirve para comparar precio, se excluye
    // del ratio (el producto puede seguir marcándose por antigüedad).
    if (category === 'Sin categoría' || prices.length < MIN_CATEGORY_SIZE) return;
    categoryMedian.set(category, median(prices));
  });

  const now = Date.now();
  const flagged = withPrice
    .map((p) => {
      const medianForCategory = categoryMedian.get(p.category);
      const ratio = medianForCategory ? p.priceNum / medianForCategory : null;
      const daysSinceUpdate = p.date_modified
        ? Math.floor((now - new Date(p.date_modified).getTime()) / 86400000)
        : Infinity;
      const reasons: string[] = [];
      if (daysSinceUpdate > STALE_DAYS) reasons.push('SIN TOCAR');
      if (RATIO_THRESHOLD !== null && ratio !== null && ratio > RATIO_THRESHOLD) reasons.push('PRECIO ALTO vs CATEGORÍA');
      return { ...p, medianForCategory, ratio, daysSinceUpdate, reasons };
    })
    .filter((p) => p.reasons.length > 0)
    // Un precio muy por encima de la mediana es la señal más clara de error de
    // datos (incluso si se sincronizó hace poco, como el caso real encontrado
    // del iPhone 14 Plus a 1.246€ modificado hace 4 días) — se ordena por
    // ratio primero, antigüedad como desempate.
    .sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0) || b.daysSinceUpdate - a.daysSinceUpdate);

  console.log(`\nProductos escaneados: ${withPrice.length}`);
  console.log(
    `Umbral: > ${STALE_DAYS} días sin modificar` +
      (RATIO_THRESHOLD !== null
        ? `, o precio > ${RATIO_THRESHOLD}x la mediana de su categoría (ruidoso, ver cabecera del script)`
        : ' (criterio de precio vs categoría desactivado — pásale --ratio=N para activarlo)')
  );
  console.log(`Productos sospechosos: ${flagged.length}\n`);

  console.table(
    flagged.slice(0, 60).map((p) => ({
      id: p.id,
      nombre: p.name.length > 40 ? p.name.slice(0, 37) + '...' : p.name,
      sku: p.sku || '-',
      precio: p.priceNum,
      categoria: p.category,
      'mediana cat.': p.medianForCategory ? Math.round(p.medianForCategory * 100) / 100 : 'N/A',
      ratio: p.ratio ? Math.round(p.ratio * 100) / 100 : 'N/A',
      'días s/tocar': Number.isFinite(p.daysSinceUpdate) ? p.daysSinceUpdate : 'N/A',
      motivo: p.reasons.join(' + '),
      url: `https://inforvel.online/producto/${p.slug}`,
    }))
  );

  if (flagged.length > 60) {
    console.log(`\n(mostrando los 60 primeros de ${flagged.length}, ordenados de más a menos sospechoso)`);
  }
}

main().catch((error) => {
  console.error('No se pudo completar la auditoría:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
