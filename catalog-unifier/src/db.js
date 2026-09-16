const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function initDatabase(config) {
  ensureDirForFile(config.dbPath);
  const db = new DatabaseSync(config.dbPath);

  const schemaSql = fs.readFileSync(config.schemaPath, 'utf8');
  db.exec(schemaSql);

  return db;
}

function createSyncRun(db, { source, dryRun }) {
  const startedAt = new Date().toISOString();
  const stmt = db.prepare(
    'INSERT INTO sync_runs (started_at, status, source, dry_run) VALUES (?, ?, ?, ?) RETURNING id'
  );
  const row = stmt.get(startedAt, 'running', source, dryRun ? 1 : 0);
  return Number(row.id);
}

function finishSyncRun(db, runId, { status, summary, errorText }) {
  const finishedAt = new Date().toISOString();
  const stmt = db.prepare(
    'UPDATE sync_runs SET finished_at = ?, status = ?, summary_json = ?, error_text = ? WHERE id = ?'
  );
  stmt.run(finishedAt, status, JSON.stringify(summary || {}), errorText || null, runId);
}

function insertStagedProducts(db, runId, products, options = {}) {
  if (!Array.isArray(products) || products.length === 0) return 0;
  const storeRawStaging = options.storeRawStaging === true;

  const stmt = db.prepare(`
    INSERT INTO staged_products (
      run_id, provider, provider_sku, ean, pn, name, description, brand,
      raw_family, raw_subfamily, cost, supplier_price, stock, image_url,
      dedupe_key, raw_payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    for (const p of products) {
      stmt.run(
        runId,
        p.provider || '',
        p.providerSku || '',
        p.ean || '',
        p.pn || '',
        p.name || '',
        p.description || '',
        p.brand || '',
        p.rawFamily || '',
        p.rawSubfamily || '',
        p.cost ?? null,
        p.supplierPrice ?? null,
        p.stock ?? 0,
        p.imageUrl || '',
        p.dedupeKey || '',
        storeRawStaging ? JSON.stringify(p.raw || {}) : '{}'
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return products.length;
}

function insertUnifiedProducts(db, runId, products, options = {}) {
  if (!Array.isArray(products) || products.length === 0) return 0;
  const storeRawUnifiedSources = options.storeRawUnifiedSources === true;
  const storeUnifiedAttributesJson = options.storeUnifiedAttributesJson !== false;

  const stmt = db.prepare(`
    INSERT INTO unified_products (
      run_id, canonical_key, winner_provider, provider_sku, ean, pn, name, description,
      brand, canonical_family, canonical_subfamily, cost, margin_percent, shipping_fee,
      final_price, stock, image_url, is_weekly_brand, active_week_brand, source_count,
      source_providers_json, raw_sources_json, attributes_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    for (const p of products) {
      stmt.run(
        runId,
        p.canonicalKey,
        p.provider,
        p.providerSku || '',
        p.ean || '',
        p.pn || '',
        p.name || '',
        p.description || '',
        p.brand || '',
        p.category.family || '',
        p.category.subfamily || '',
        p.cost ?? null,
        p.pricing.marginPercent ?? null,
        p.pricing.shippingFee ?? null,
        p.pricing.finalPrice ?? null,
        p.stock ?? 0,
        p.imageUrl || '',
        p.pricing.isWeeklyBrand ? 1 : 0,
        p.pricing.activeWeekBrand || '',
        p.sourceCount || 1,
        JSON.stringify(p.sourceProviders || []),
        storeRawUnifiedSources ? JSON.stringify(p.sources || []) : '[]',
        storeUnifiedAttributesJson ? JSON.stringify(p.attributes || {}) : '{}'
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return products.length;
}

function insertProductAttributes(db, runId, products) {
  if (!Array.isArray(products) || products.length === 0) return 0;

  const stmt = db.prepare(`
    INSERT INTO product_attributes (
      run_id, canonical_key, attribute_name, attribute_value, source, confidence
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  db.exec('BEGIN');
  try {
    for (const p of products) {
      for (const [name, value] of Object.entries(p.attributes || {})) {
        if (value === undefined || value === null || String(value).trim() === '') continue;
        stmt.run(runId, p.canonicalKey, name, String(value), 'mvp-extractor', 0.7);
        count += 1;
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return count;
}

function insertPublishActions(db, runId, publishStats) {
  const actions = Array.isArray(publishStats?.actions) ? publishStats.actions : [];
  if (actions.length === 0) return 0;

  const stmt = db.prepare(`
    INSERT INTO publish_actions (
      run_id, mode, canonical_key, sku, operation, woo_product_id, status, ok, message, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    for (const action of actions) {
      stmt.run(
        runId,
        action.mode || publishStats.mode || 'off',
        action.canonicalKey || '',
        action.sku || '',
        action.operation || 'unknown',
        action.productId || null,
        action.status || '',
        action.ok ? 1 : 0,
        action.message || '',
        JSON.stringify(action || {})
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return actions.length;
}

function pruneRuns(db, keepRuns = 5) {
  const safeKeepRuns = Number.isFinite(keepRuns) && keepRuns > 0 ? Math.floor(keepRuns) : 0;
  if (safeKeepRuns <= 0) {
    return {
      keepRuns: safeKeepRuns,
      deletedRunCount: 0,
      deletedRunIds: [],
    };
  }

  const obsoleteRows = db.prepare(
    'SELECT id FROM sync_runs ORDER BY id DESC LIMIT -1 OFFSET ?'
  ).all(safeKeepRuns);
  const obsoleteIds = obsoleteRows.map((row) => Number(row.id)).filter(Number.isFinite);

  if (obsoleteIds.length === 0) {
    return {
      keepRuns: safeKeepRuns,
      deletedRunCount: 0,
      deletedRunIds: [],
    };
  }

  const placeholders = obsoleteIds.map(() => '?').join(',');
  const tablesByRun = ['publish_actions', 'product_attributes', 'unified_products', 'staged_products'];

  db.exec('BEGIN');
  try {
    for (const table of tablesByRun) {
      db.prepare(`DELETE FROM ${table} WHERE run_id IN (${placeholders})`).run(...obsoleteIds);
    }
    db.prepare(`DELETE FROM sync_runs WHERE id IN (${placeholders})`).run(...obsoleteIds);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return {
    keepRuns: safeKeepRuns,
    deletedRunCount: obsoleteIds.length,
    deletedRunIds: obsoleteIds,
  };
}

function optimizeDatabase(db, { vacuum = false } = {}) {
  db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  if (vacuum) {
    db.exec('VACUUM;');
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  }
}

module.exports = {
  initDatabase,
  createSyncRun,
  finishSyncRun,
  insertStagedProducts,
  insertUnifiedProducts,
  insertProductAttributes,
  insertPublishActions,
  pruneRuns,
  optimizeDatabase,
};
