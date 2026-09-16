PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  dry_run INTEGER NOT NULL DEFAULT 1,
  summary_json TEXT,
  error_text TEXT
);

CREATE TABLE IF NOT EXISTS staged_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_sku TEXT,
  ean TEXT,
  pn TEXT,
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  raw_family TEXT,
  raw_subfamily TEXT,
  cost REAL,
  supplier_price REAL,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  dedupe_key TEXT,
  raw_payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(run_id) REFERENCES sync_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_staged_run ON staged_products(run_id);
CREATE INDEX IF NOT EXISTS idx_staged_ean ON staged_products(ean);
CREATE INDEX IF NOT EXISTS idx_staged_pn ON staged_products(pn);

CREATE TABLE IF NOT EXISTS unified_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  canonical_key TEXT NOT NULL,
  winner_provider TEXT NOT NULL,
  provider_sku TEXT,
  ean TEXT,
  pn TEXT,
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  canonical_family TEXT,
  canonical_subfamily TEXT,
  cost REAL,
  margin_percent REAL,
  shipping_fee REAL,
  final_price REAL,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  is_weekly_brand INTEGER NOT NULL DEFAULT 0,
  active_week_brand TEXT,
  source_count INTEGER NOT NULL DEFAULT 1,
  source_providers_json TEXT NOT NULL,
  raw_sources_json TEXT NOT NULL,
  attributes_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(run_id) REFERENCES sync_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_unified_run ON unified_products(run_id);
CREATE INDEX IF NOT EXISTS idx_unified_key ON unified_products(canonical_key);

CREATE TABLE IF NOT EXISTS category_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  raw_family TEXT,
  raw_subfamily TEXT,
  canonical_family TEXT NOT NULL,
  canonical_subfamily TEXT,
  source TEXT NOT NULL DEFAULT 'config',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, raw_family, raw_subfamily)
);

CREATE TABLE IF NOT EXISTS product_attributes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  canonical_key TEXT NOT NULL,
  attribute_name TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.5,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(run_id) REFERENCES sync_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_attrs_run ON product_attributes(run_id);
CREATE INDEX IF NOT EXISTS idx_attrs_key ON product_attributes(canonical_key);

CREATE TABLE IF NOT EXISTS publish_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  mode TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  sku TEXT NOT NULL,
  operation TEXT NOT NULL,
  woo_product_id INTEGER,
  status TEXT NOT NULL,
  ok INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(run_id) REFERENCES sync_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_publish_run ON publish_actions(run_id);
CREATE INDEX IF NOT EXISTS idx_publish_sku ON publish_actions(sku);
