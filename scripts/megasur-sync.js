#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const storageDir = path.join(rootDir, 'storage', 'megasur');
const tempFile = path.join(storageDir, 'incoming.tmp');
const currentFile = path.join(storageDir, 'current.json');
const previousFile = path.join(storageDir, 'previous.json');
const sourceUrl =
  process.env.MEGASUR_FEED_URL ||
  'https://www.megasur.es/download/file?file=json&u=309471&hash=d4397986a0a80c806444ad25d8254e8b';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function extractProducts(source) {
  const keys = ['products', 'producto', 'productos', 'items', 'articulos', 'artículos', 'articles', 'data', 'results'];

  if (Array.isArray(source) && source.every(isObject)) {
    return source.filter((item) => !looksLikeHeaderRow(item));
  }

  if (isObject(source)) {
    for (const key of keys) {
      if (Array.isArray(source[key]) && source[key].every(isObject)) {
        return source[key].filter((item) => !looksLikeHeaderRow(item));
      }
    }

    for (const value of Object.values(source)) {
      if (Array.isArray(value) && value.every(isObject)) {
        return value.filter((item) => !looksLikeHeaderRow(item));
      }
    }
  }

  return [];
}

function looksLikeHeaderRow(product) {
  const entries = Object.entries(product);
  if (entries.length === 0) {
    return false;
  }

  const matchingEntries = entries.filter(([key, value]) => key === String(value));
  return matchingEntries.length >= Math.ceil(entries.length * 0.7);
}

function getProductKey(product, index) {
  const keys = ['sku', 'id', 'codigo', 'codigo_producto', 'referencia', 'reference', 'ean', 'upc', 'mpn', 'model'];

  for (const key of keys) {
    if (product[key] !== undefined && product[key] !== null && String(product[key]).trim() !== '') {
      return `${key}:${String(product[key]).trim()}`;
    }
  }

  return `row:${index}`;
}

async function main() {
  ensureDir(storageDir);

  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent': 'MegaSurSync/1.0',
      accept: 'application/json,text/plain,*/*',
    },
  });

  if (!response.ok) {
    throw new Error(`Error descargando MegaSur: HTTP ${response.status}`);
  }

  const raw = await response.text();
  const trimmed = raw.trim();

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    throw new Error(trimmed || 'La respuesta del proveedor no es JSON.');
  }

  const incomingJson = JSON.parse(trimmed);
  fs.writeFileSync(tempFile, JSON.stringify(incomingJson), 'utf8');

  if (fs.existsSync(currentFile)) {
    fs.copyFileSync(currentFile, previousFile);
  }

  fs.renameSync(tempFile, currentFile);

  const currentJson = readJsonIfExists(currentFile);
  const previousJson = readJsonIfExists(previousFile);
  const currentProducts = extractProducts(currentJson);
  const previousProducts = extractProducts(previousJson);

  const currentMap = new Map(currentProducts.map((item, index) => [getProductKey(item, index), item]));
  const previousMap = new Map(previousProducts.map((item, index) => [getProductKey(item, index), item]));

  let added = 0;
  let removed = 0;
  let updated = 0;

  for (const [key, item] of currentMap.entries()) {
    const previousItem = previousMap.get(key);
    if (!previousItem) {
      added += 1;
      continue;
    }

    if (JSON.stringify(previousItem) !== JSON.stringify(item)) {
      updated += 1;
    }
  }

  for (const key of previousMap.keys()) {
    if (!currentMap.has(key)) {
      removed += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        syncedAt: new Date().toISOString(),
        sourceUrl,
        totals: {
          currentProducts: currentProducts.length,
          previousProducts: previousProducts.length,
          added,
          removed,
          updated,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error.message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
