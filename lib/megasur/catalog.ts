import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export const MEGASUR_FEED_URL =
  process.env.MEGASUR_FEED_URL ||
  'https://www.megasur.es/download/file?file=json&u=309471&hash=d4397986a0a80c806444ad25d8254e8b';

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'megasur');
const CURRENT_FILE = path.join(STORAGE_DIR, 'current.json');
const PREVIOUS_FILE = path.join(STORAGE_DIR, 'previous.json');
const TMP_FILE = path.join(STORAGE_DIR, 'incoming.tmp');

const PRODUCT_ARRAY_KEYS = [
  'products',
  'producto',
  'productos',
  'items',
  'articulos',
  'artículos',
  'articles',
  'data',
  'results',
];

const PRODUCT_ID_KEYS = [
  'sku',
  'id',
  'codigo',
  'codigo_producto',
  'referencia',
  'reference',
  'ean',
  'upc',
  'mpn',
  'model',
];

export interface SnapshotInfo {
  exists: boolean;
  path: string;
  updatedAt: string | null;
  size: number;
  hash: string | null;
}

export interface MegaSurSnapshot {
  raw: string;
  json: unknown;
  products: Record<string, unknown>[];
  info: SnapshotInfo;
}

export interface MegaSurApiProduct {
  key: string;
  referencia: string;
  partNumber: string;
  ean: string;
  nombre: string;
  descripcion: string;
  fabricante: string;
  familia: string;
  subfamilia: string;
  stock: number | null;
  pvd: number | null;
  pvp: number | null;
  canon: number | null;
  peso: number | null;
  volumen: number | null;
  dimensiones: {
    largo: number | null;
    ancho: number | null;
    alto: number | null;
  };
  fechaAlta: string;
  envioInmediato: boolean;
  bajoPedido: boolean;
  bajoPedidoRecepcion: string;
  outlet: boolean;
  licenciaElectronica: boolean;
  imagenes: string[];
  raw: Record<string, unknown>;
}

export interface MegaSurDiff {
  previous: SnapshotInfo;
  current: SnapshotInfo;
  status: 'first_sync' | 'unchanged' | 'updated';
  totals: {
    previousProducts: number;
    currentProducts: number;
    added: number;
    removed: number;
    updated: number;
  };
  changes: {
    added: Record<string, unknown>[];
    removed: Record<string, unknown>[];
    updated: Array<{
      key: string;
      before: Record<string, unknown>;
      after: Record<string, unknown>;
      changedFields: string[];
    }>;
  };
}

export interface SyncResult {
  ok: boolean;
  sourceUrl: string;
  syncedAt: string;
  message: string;
  previous: SnapshotInfo;
  current: SnapshotInfo;
  diff: MegaSurDiff;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys(value[key]);
        return acc;
      }, {});
  }

  return value;
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function ensureStorageDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

async function getFileInfo(filePath: string): Promise<SnapshotInfo> {
  try {
    const stats = await fs.stat(filePath);
    const raw = await fs.readFile(filePath, 'utf8');

    return {
      exists: true,
      path: filePath,
      updatedAt: stats.mtime.toISOString(),
      size: stats.size,
      hash: hashContent(raw),
    };
  } catch {
    return {
      exists: false,
      path: filePath,
      updatedAt: null,
      size: 0,
      hash: null,
    };
  }
}

async function readSnapshot(filePath: string): Promise<MegaSurSnapshot | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const json = JSON.parse(raw);
    const info = await getFileInfo(filePath);

    return {
      raw,
      json,
      products: extractProducts(json),
      info,
    };
  } catch {
    return null;
  }
}

function extractProducts(source: unknown): Record<string, unknown>[] {
  if (Array.isArray(source) && source.every(isPlainObject)) {
    return source.filter((item) => !looksLikeHeaderRow(item));
  }

  if (isPlainObject(source)) {
    for (const key of PRODUCT_ARRAY_KEYS) {
      const candidate = source[key];
      if (Array.isArray(candidate) && candidate.every(isPlainObject)) {
        return candidate.filter((item) => !looksLikeHeaderRow(item));
      }
    }

    for (const value of Object.values(source)) {
      if (Array.isArray(value) && value.every(isPlainObject)) {
        return value.filter((item) => !looksLikeHeaderRow(item));
      }
    }

    for (const value of Object.values(source)) {
      if (isPlainObject(value)) {
        const nested = extractProducts(value);
        if (nested.length > 0) {
          return nested;
        }
      }
    }
  }

  return [];
}

function looksLikeHeaderRow(product: Record<string, unknown>): boolean {
  const entries = Object.entries(product);
  if (entries.length === 0) {
    return false;
  }

  const matchingEntries = entries.filter(([key, value]) => key === String(value));
  return matchingEntries.length >= Math.ceil(entries.length * 0.7);
}

function getProductKey(product: Record<string, unknown>, index: number): string {
  for (const field of PRODUCT_ID_KEYS) {
    const value = product[field];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return `${field}:${String(value).trim()}`;
    }
  }

  return `row:${index}:${hashContent(JSON.stringify(sortKeys(product)))}`;
}

function parseNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value).trim().replace(/\./g, '').replace(',', '.');
  if (normalized === '') {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableInteger(value: unknown): number | null {
  const parsed = parseNullableNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return ['1', 'true', 'si', 'sí'].includes(String(value).trim().toLowerCase());
}

function splitImages(value: unknown): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeMegaSurProduct(
  product: Record<string, unknown>,
  index: number
): MegaSurApiProduct {
  return {
    key: getProductKey(product, index),
    referencia: String(product.referencia || ''),
    partNumber: String(product.part_number || ''),
    ean: String(product.ean || ''),
    nombre: String(product.nombre || ''),
    descripcion: String(product.descripcion || ''),
    fabricante: String(product.fabricante || ''),
    familia: String(product.familia || ''),
    subfamilia: String(product.subfamilia || ''),
    stock: parseNullableInteger(product.stock),
    pvd: parseNullableNumber(product.PVD),
    pvp: parseNullableNumber(product.PVP),
    canon: parseNullableNumber(product.CANON),
    peso: parseNullableNumber(product.peso),
    volumen: parseNullableNumber(product.volumen),
    dimensiones: {
      largo: parseNullableNumber(product.largo),
      ancho: parseNullableNumber(product.ancho),
      alto: parseNullableNumber(product.alto),
    },
    fechaAlta: String(product.fecha_alta || ''),
    envioInmediato: normalizeBoolean(product.envio_inmediato),
    bajoPedido: normalizeBoolean(product.bajo_pedido),
    bajoPedidoRecepcion: String(product.bajo_pedido_recepcion || ''),
    outlet: normalizeBoolean(product.outlet),
    licenciaElectronica: normalizeBoolean(product.licencia_electronica),
    imagenes: splitImages(product.imagenes),
    raw: product,
  };
}

function diffProductFields(
  previousProduct: Record<string, unknown>,
  currentProduct: Record<string, unknown>
): string[] {
  const keys = new Set([
    ...Object.keys(previousProduct),
    ...Object.keys(currentProduct),
  ]);

  return Array.from(keys).filter((key) => {
    const before = JSON.stringify(sortKeys(previousProduct[key]));
    const after = JSON.stringify(sortKeys(currentProduct[key]));
    return before !== after;
  });
}

function buildDiff(
  previousSnapshot: MegaSurSnapshot | null,
  currentSnapshot: MegaSurSnapshot | null
): MegaSurDiff {
  const previousProducts = previousSnapshot?.products || [];
  const currentProducts = currentSnapshot?.products || [];

  const previousMap = new Map<string, Record<string, unknown>>();
  const currentMap = new Map<string, Record<string, unknown>>();

  previousProducts.forEach((product, index) => {
    previousMap.set(getProductKey(product, index), product);
  });

  currentProducts.forEach((product, index) => {
    currentMap.set(getProductKey(product, index), product);
  });

  const added: Record<string, unknown>[] = [];
  const removed: Record<string, unknown>[] = [];
  const updated: MegaSurDiff['changes']['updated'] = [];

  for (const [key, product] of Array.from(currentMap.entries())) {
    const previousProduct = previousMap.get(key);
    if (!previousProduct) {
      added.push(product);
      continue;
    }

    const changedFields = diffProductFields(previousProduct, product);
    if (changedFields.length > 0) {
      updated.push({
        key,
        before: previousProduct,
        after: product,
        changedFields,
      });
    }
  }

  for (const [key, product] of Array.from(previousMap.entries())) {
    if (!currentMap.has(key)) {
      removed.push(product);
    }
  }

  const status: MegaSurDiff['status'] = !previousSnapshot
    ? 'first_sync'
    : added.length === 0 && removed.length === 0 && updated.length === 0
      ? 'unchanged'
      : 'updated';

  return {
    previous: previousSnapshot?.info || {
      exists: false,
      path: PREVIOUS_FILE,
      updatedAt: null,
      size: 0,
      hash: null,
    },
    current: currentSnapshot?.info || {
      exists: false,
      path: CURRENT_FILE,
      updatedAt: null,
      size: 0,
      hash: null,
    },
    status,
    totals: {
      previousProducts: previousProducts.length,
      currentProducts: currentProducts.length,
      added: added.length,
      removed: removed.length,
      updated: updated.length,
    },
    changes: {
      added,
      removed,
      updated,
    },
  };
}

function isJsonPayload(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

export async function fetchMegaSurRaw(url: string = MEGASUR_FEED_URL): Promise<string> {
  const response = await axios.get<string>(url, {
    responseType: 'text',
    timeout: 60_000,
    maxContentLength: 100 * 1024 * 1024,
    maxBodyLength: 100 * 1024 * 1024,
  });

  return response.data;
}

export async function syncMegaSurCatalog(url: string = MEGASUR_FEED_URL): Promise<SyncResult> {
  await ensureStorageDir();

  const previousCurrent = await readSnapshot(CURRENT_FILE);
  const previousFileInfo = await getFileInfo(PREVIOUS_FILE);

  const raw = await fetchMegaSurRaw(url);
  if (!isJsonPayload(raw)) {
    throw new Error(raw.trim() || 'La respuesta del proveedor no es un JSON válido.');
  }

  JSON.parse(raw);
  await fs.writeFile(TMP_FILE, raw, 'utf8');

  if (previousCurrent) {
    await fs.copyFile(CURRENT_FILE, PREVIOUS_FILE);
  }

  await fs.rename(TMP_FILE, CURRENT_FILE);

  const currentSnapshot = await readSnapshot(CURRENT_FILE);
  const previousSnapshot = await readSnapshot(PREVIOUS_FILE);
  const diff = buildDiff(previousSnapshot, currentSnapshot);

  return {
    ok: true,
    sourceUrl: url,
    syncedAt: new Date().toISOString(),
    message: previousCurrent
      ? 'Catálogo sincronizado y comparado correctamente.'
      : 'Primera sincronización completada.',
    previous: previousSnapshot?.info || previousFileInfo,
    current: currentSnapshot!.info,
    diff,
  };
}

export async function getMegaSurSnapshots() {
  await ensureStorageDir();

  const [currentSnapshot, previousSnapshot] = await Promise.all([
    readSnapshot(CURRENT_FILE),
    readSnapshot(PREVIOUS_FILE),
  ]);

  return {
    current: currentSnapshot,
    previous: previousSnapshot,
    diff: buildDiff(previousSnapshot, currentSnapshot),
  };
}

export async function listMegaSurProducts(options?: {
  search?: string | null;
  limit?: number | null;
  offset?: number | null;
}) {
  const snapshots = await getMegaSurSnapshots();
  const products = snapshots.current?.products || [];

  const search = options?.search?.trim().toLowerCase();
  const filtered = search
    ? products.filter((product) =>
        JSON.stringify(product).toLowerCase().includes(search)
      )
    : products;

  const offset = Math.max(options?.offset || 0, 0);
  const limit = Math.max(options?.limit || filtered.length, 0);

  return {
    meta: {
      total: filtered.length,
      offset,
      limit,
      snapshot: snapshots.current?.info || {
        exists: false,
        path: CURRENT_FILE,
        updatedAt: null,
        size: 0,
        hash: null,
      },
      diffStatus: snapshots.diff.status,
      extractedProducts: products.length,
    },
    items: filtered
      .slice(offset, offset + limit)
      .map((product, index) => normalizeMegaSurProduct(product, offset + index)),
  };
}

export async function getMegaSurProductByKey(key: string) {
  const snapshots = await getMegaSurSnapshots();
  const products = snapshots.current?.products || [];

  const index = products.findIndex(
    (product, productIndex) => getProductKey(product, productIndex) === key
  );

  return index >= 0 ? normalizeMegaSurProduct(products[index], index) : null;
}
