const fs = require('fs');
const path = require('path');
const { toTimestampSafe } = require('../utils/date');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows) {
  const headers = [
    'canonical_key',
    'provider',
    'provider_sku',
    'name',
    'brand',
    'ean',
    'pn',
    'family',
    'subfamily',
    'cost',
    'margin_percent',
    'shipping_fee',
    'final_price',
    'stock',
    'image_url',
    'source_count',
    'attributes_json',
  ];

  const lines = [headers.join(',')];
  for (const row of rows) {
    const values = [
      row.canonicalKey,
      row.provider,
      row.providerSku,
      row.name,
      row.brand,
      row.ean,
      row.pn,
      row.category.family,
      row.category.subfamily,
      row.cost,
      row.pricing.marginPercent,
      row.pricing.shippingFee,
      row.pricing.finalPrice,
      row.stock,
      row.imageUrl,
      row.sourceCount,
      JSON.stringify(row.attributes || {}),
    ].map(csvEscape);

    lines.push(values.join(','));
  }

  return lines.join('\n');
}

function mapProductForJson(row, includeRawJson) {
  const base = {
    canonicalKey: row.canonicalKey,
    provider: row.provider,
    providerSku: row.providerSku,
    name: row.name,
    brand: row.brand,
    ean: row.ean,
    pn: row.pn,
    category: {
      family: row.category?.family || '',
      subfamily: row.category?.subfamily || '',
      source: row.category?.source || '',
      confidence: row.category?.confidence ?? null,
    },
    pricing: {
      cost: row.cost ?? null,
      marginPercent: row.pricing?.marginPercent ?? null,
      shippingFee: row.pricing?.shippingFee ?? null,
      finalPrice: row.pricing?.finalPrice ?? null,
      isWeeklyBrand: Boolean(row.pricing?.isWeeklyBrand),
      activeWeekBrand: row.pricing?.activeWeekBrand || '',
    },
    stock: row.stock ?? 0,
    imageUrl: row.imageUrl || '',
    sourceCount: row.sourceCount || 1,
    sourceProviders: row.sourceProviders || [],
    attributes: row.attributes || {},
  };

  if (includeRawJson) {
    base.rawFamily = row.rawFamily || '';
    base.rawSubfamily = row.rawSubfamily || '';
    base.raw = row.raw || {};
    base.sources = row.sources || [];
  }

  return base;
}

function exportUnifiedProducts(products, outputDir, metadata, options = {}) {
  ensureDir(outputDir);
  const writeJson = options.writeJson !== false;
  const writeCsv = options.writeCsv !== false;
  const prettyJson = options.prettyJson === true;
  const includeRawJson = options.includeRawJson === true;

  const stamp = toTimestampSafe(new Date());
  const base = `run-${metadata.runId}-${stamp}`;

  const jsonPath = path.join(outputDir, `${base}.json`);
  const csvPath = path.join(outputDir, `${base}.csv`);

  const payload = {
    metadata,
    products: products.map((row) => mapProductForJson(row, includeRawJson)),
  };

  if (writeJson) {
    const jsonContent = prettyJson
      ? JSON.stringify(payload, null, 2)
      : JSON.stringify(payload);
    fs.writeFileSync(jsonPath, jsonContent, 'utf8');
  }

  if (writeCsv) {
    fs.writeFileSync(csvPath, toCsv(products), 'utf8');
  }

  return {
    jsonPath: writeJson ? jsonPath : '',
    csvPath: writeCsv ? csvPath : '',
    count: products.length,
    base,
  };
}

function exportAuxiliaryReports(outputDir, base, reports) {
  ensureDir(outputDir);
  const result = {};

  if (reports?.categoryAudit) {
    const pathCategory = path.join(outputDir, `${base}-category-audit.json`);
    fs.writeFileSync(pathCategory, JSON.stringify(reports.categoryAudit, null, 2), 'utf8');
    result.categoryAuditPath = pathCategory;
  }

  if (reports?.publishPlan) {
    const pathPublish = path.join(outputDir, `${base}-publish-plan.json`);
    fs.writeFileSync(pathPublish, JSON.stringify(reports.publishPlan, null, 2), 'utf8');
    result.publishPlanPath = pathPublish;
  }

  return result;
}

module.exports = {
  exportUnifiedProducts,
  exportAuxiliaryReports,
};
