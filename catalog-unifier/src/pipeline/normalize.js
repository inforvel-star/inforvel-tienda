const { parseNumber, pickFirst, safeString } = require('../utils/text');

function normalizeImages(rawImages) {
  if (!rawImages) return '';

  if (Array.isArray(rawImages)) {
    for (const img of rawImages) {
      if (!img) continue;
      if (typeof img === 'string' && img.trim()) return img.trim();
      if (typeof img === 'object') {
        const url = String(img.url || img.src || '').trim();
        if (url) return url;
      }
    }
    return '';
  }

  const candidate = String(rawImages).split(',').map((x) => x.trim()).find(Boolean);
  return candidate || '';
}

function toStock(value) {
  const n = parseNumber(value);
  if (n === null) return 0;
  return Math.max(0, Math.trunc(n));
}

function normalizeProduct(raw, provider) {
  const providerSku = safeString(
    pickFirst(raw, ['referencia', 'sku', 'SKU', 'id', 'key'])
  );
  const name = safeString(pickFirst(raw, ['nombre', 'name', 'titulo', 'title']));

  if (!providerSku || !name || name.toLowerCase() === 'nombre') {
    return null;
  }

  const ean = safeString(pickFirst(raw, ['ean', 'EAN', 'barcode']));
  const pn = safeString(pickFirst(raw, ['part_number', 'partNumber', 'pn', 'PN', 'mpn']));
  const brand = safeString(pickFirst(raw, ['fabricante', 'brand', 'marca', 'manufacturer']));
  const rawFamily = safeString(pickFirst(raw, ['familia', 'family', 'category']));
  const rawSubfamily = safeString(pickFirst(raw, ['subfamilia', 'subcategory', 'subCategory']));
  const description = safeString(
    pickFirst(raw, ['descripcion_larga', 'descripcion', 'description', 'short_description'])
  );

  const cost = parseNumber(pickFirst(raw, ['PVD', 'pvd', 'cost', 'coste', 'purchase_price']));
  const supplierPrice = parseNumber(pickFirst(raw, ['PVP', 'pvp', 'price', 'precio']));
  const stock = toStock(pickFirst(raw, ['stock', 'quantity', 'qty', 'existencias']));
  const imageUrl = normalizeImages(pickFirst(raw, ['imagenes', 'images', 'image', 'imagen', 'foto']));

  const dedupeKey = ean || pn || `${provider}:${providerSku}`;

  return {
    provider,
    providerSku,
    ean,
    pn,
    name,
    description,
    brand,
    rawFamily,
    rawSubfamily,
    cost,
    supplierPrice,
    stock,
    imageUrl,
    dedupeKey,
    raw,
  };
}

function normalizeProviderRows(items, provider) {
  const out = [];
  for (const raw of items || []) {
    if (!raw || typeof raw !== 'object') continue;
    const normalized = normalizeProduct(raw, provider);
    if (normalized) out.push(normalized);
  }
  return out;
}

module.exports = {
  normalizeProviderRows,
};
