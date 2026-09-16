const { WooClient, isConfigured } = require('./woocommerce-client');

function sanitizeSku(raw) {
  const value = String(raw || '').trim().toUpperCase();
  if (!value) return '';
  return value
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function buildWooSku(product) {
  const eanSku = sanitizeSku(product.ean);
  if (eanSku) return `EAN-${eanSku}`;

  const pnSku = sanitizeSku(product.pn);
  if (pnSku) return `PN-${pnSku}`;

  const providerSku = sanitizeSku(product.providerSku);
  if (providerSku) return providerSku;

  const fallback = sanitizeSku(product.canonicalKey);
  return fallback || `IV-${Date.now()}`;
}

function buildCandidateSkus(product) {
  const candidates = [
    buildWooSku(product),
    sanitizeSku(product.providerSku),
    sanitizeSku(product.ean),
    sanitizeSku(product.pn),
  ].filter(Boolean);

  return Array.from(new Set(candidates));
}

function toWooStatus(product) {
  if (!product.imageUrl) return 'draft';
  if (!product.pricing?.finalPrice || product.pricing.finalPrice <= 0) return 'draft';
  return 'publish';
}

function toWooPayload(product, categoryIds, sku) {
  const regularPrice = product.pricing?.finalPrice > 0
    ? String(product.pricing.finalPrice.toFixed(2))
    : '';

  const metaData = [
    { key: '_iv_unifier_canonical_key', value: product.canonicalKey },
    { key: '_iv_unifier_provider', value: product.provider },
    { key: '_iv_unifier_provider_sku', value: product.providerSku || '' },
    { key: '_iv_unifier_ean', value: product.ean || '' },
    { key: '_iv_unifier_pn', value: product.pn || '' },
    { key: '_iv_unifier_brand', value: product.brand || '' },
    { key: '_iv_unifier_margin_percent', value: String(product.pricing?.marginPercent ?? '') },
    { key: '_iv_unifier_shipping_fee', value: String(product.pricing?.shippingFee ?? '') },
    { key: '_iv_unifier_weekly_brand', value: product.pricing?.isWeeklyBrand ? '1' : '0' },
    { key: '_iv_unifier_active_week_brand', value: product.pricing?.activeWeekBrand || '' },
  ];

  const payload = {
    name: product.name,
    sku,
    type: 'simple',
    status: toWooStatus(product),
    regular_price: regularPrice,
    description: product.description || '',
    manage_stock: true,
    stock_quantity: Math.max(0, Number(product.stock || 0)),
    categories: categoryIds.length ? categoryIds.map((id) => ({ id })) : [],
    images: product.imageUrl ? [{ src: product.imageUrl }] : [],
    meta_data: metaData,
  };

  return payload;
}

async function ensureCategoryPath(client, product, opts) {
  const family = String(product?.category?.family || '').trim();
  const subfamily = String(product?.category?.subfamily || '').trim();

  if (!family || family.toLowerCase() === 'sin categorizar') {
    return {
      categoryIds: [],
      created: [],
      warning: 'sin-categoria-canonica',
    };
  }

  const created = [];
  let familyRow = await client.findCategory(family, 0);

  if (!familyRow && opts.allowCreateCategories) {
    if (opts.mode === 'apply') {
      familyRow = await client.createCategory(family, 0);
    } else {
      familyRow = { id: -1, name: family, parent: 0 };
    }
    created.push({ name: family, parent: 0, simulated: opts.mode !== 'apply' });
  }

  if (!familyRow) {
    return {
      categoryIds: [],
      created,
      warning: 'categoria-familia-no-encontrada',
    };
  }

  if (!subfamily) {
    return {
      categoryIds: familyRow.id > 0 ? [familyRow.id] : [],
      created,
      warning: '',
    };
  }

  let subRow = await client.findCategory(subfamily, familyRow.id > 0 ? familyRow.id : 0);
  if (!subRow && opts.allowCreateCategories) {
    if (opts.mode === 'apply' && familyRow.id > 0) {
      subRow = await client.createCategory(subfamily, familyRow.id);
    } else {
      subRow = { id: -1, name: subfamily, parent: familyRow.id || 0 };
    }
    created.push({
      name: subfamily,
      parent: familyRow.id || 0,
      simulated: opts.mode !== 'apply' || familyRow.id <= 0,
    });
  }

  if (subRow && subRow.id > 0) {
    return {
      categoryIds: [subRow.id],
      created,
      warning: '',
    };
  }

  return {
    categoryIds: familyRow.id > 0 ? [familyRow.id] : [],
    created,
    warning: subRow ? 'subcategoria-simulada' : 'subcategoria-no-encontrada',
  };
}

async function publishCatalog(products, config, options) {
  const mode = options.mode || 'off';
  if (mode === 'off') {
    return {
      mode,
      attempted: 0,
      created: 0,
      updated: 0,
      errors: 0,
      warnings: ['publicacion-desactivada'],
      actions: [],
    };
  }

  if (!isConfigured(config)) {
    return {
      mode,
      attempted: 0,
      created: 0,
      updated: 0,
      errors: 0,
      warnings: ['woocommerce-no-configurado'],
      actions: [],
    };
  }

  const client = new WooClient(config);
  const limit = Number(options.limit || 0);
  const selected = limit > 0 ? products.slice(0, limit) : products;

  const stats = {
    mode,
    attempted: selected.length,
    created: 0,
    updated: 0,
    errors: 0,
    warnings: [],
    actions: [],
    categoryCreatesPlanned: 0,
  };

  for (const product of selected) {
    const action = {
      canonicalKey: product.canonicalKey,
      sku: '',
      operation: 'unknown',
      mode,
      ok: false,
      productId: null,
      message: '',
      status: '',
      createdCategories: [],
    };

    try {
      const candidateSkus = buildCandidateSkus(product);
      const sku = candidateSkus[0] || buildWooSku(product);
      action.sku = sku;

      const categoryResult = await ensureCategoryPath(client, product, {
        mode,
        allowCreateCategories: Boolean(options.allowCreateCategories),
      });
      action.createdCategories = categoryResult.created;
      stats.categoryCreatesPlanned += categoryResult.created.length;
      if (categoryResult.warning) {
        stats.warnings.push(`${product.canonicalKey}:${categoryResult.warning}`);
      }

      let canonical = null;
      for (const candidate of candidateSkus) {
        const existing = await client.getProductsBySku(candidate);
        if (existing[0]) {
          canonical = existing[0];
          break;
        }
      }

      const payload = toWooPayload(product, categoryResult.categoryIds, canonical?.sku || sku);
      action.status = payload.status;

      if (!canonical) {
        action.operation = 'create';
        if (mode === 'apply') {
          const created = await client.createProduct(payload);
          action.productId = Number(created?.id || 0) || null;
        }
        action.ok = true;
        action.message = mode === 'apply' ? 'created' : 'simulated-create';
        stats.created += 1;
      } else {
        action.operation = 'update';
        action.productId = Number(canonical?.id || 0) || null;
        if (mode === 'apply' && action.productId) {
          await client.updateProduct(action.productId, payload);
        }
        action.ok = true;
        action.message = mode === 'apply' ? 'updated' : 'simulated-update';
        stats.updated += 1;
      }
    } catch (error) {
      stats.errors += 1;
      action.ok = false;
      action.message = error?.message || String(error);
    }

    stats.actions.push(action);
  }

  if (stats.warnings.length > 200) {
    stats.warnings = stats.warnings.slice(0, 200);
    stats.warnings.push('warnings-truncated');
  }

  return stats;
}

module.exports = {
  publishCatalog,
  buildWooSku,
  toWooStatus,
};
