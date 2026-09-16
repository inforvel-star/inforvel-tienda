const fs = require('fs');
const path = require('path');

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function parseDotEnv(content) {
  const out = {};
  for (const line of String(content || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let val = trimmed.slice(eqIndex + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function loadDotEnv(rootDir) {
  const candidates = [
    path.join(rootDir, '.env'),
    path.join(rootDir, '.env.local'),
    path.join(rootDir, 'catalog-unifier', '.env'),
    path.join(rootDir, 'catalog-unifier', '.env.local'),
  ];

  for (const envPath of candidates) {
    if (!fileExists(envPath)) continue;
    const parsed = parseDotEnv(fs.readFileSync(envPath, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function detectRootDir(cwd) {
  if (path.basename(cwd) === 'catalog-unifier') {
    return cwd;
  }
  const nested = path.join(cwd, 'catalog-unifier');
  if (fileExists(nested)) {
    return nested;
  }
  return cwd;
}

function resolveFromProject(projectRoot, value, fallback) {
  const selected = value && String(value).trim() ? String(value).trim() : fallback;
  return path.resolve(projectRoot, selected);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadConfig(cwd = process.cwd()) {
  const rootDir = detectRootDir(cwd);
  const projectRoot = path.basename(rootDir) === 'catalog-unifier' ? path.dirname(rootDir) : rootDir;

  loadDotEnv(projectRoot);

  const dbPath = resolveFromProject(
    projectRoot,
    process.env.CATALOG_UNIFIER_DB_PATH,
    './catalog-unifier/storage/unifier.db'
  );
  const outputDir = resolveFromProject(
    projectRoot,
    process.env.CATALOG_UNIFIER_OUTPUT_DIR,
    './catalog-unifier/output'
  );

  const config = {
    rootDir,
    projectRoot,
    dbPath,
    outputDir,
    schemaPath: path.join(rootDir, 'db', 'schema.sql'),
    categoryMap: readJson(path.join(rootDir, 'config', 'category-map.json')),
    attributeTemplates: readJson(path.join(rootDir, 'config', 'attribute-templates.json')),
    weeklyRotation: readJson(path.join(rootDir, 'config', 'weekly-brand-rotation.json')),
    pricing: {
      defaultMarginPercent: Number(process.env.UNIFIER_DEFAULT_MARGIN_PERCENT || 20),
      weeklyMarginPercent: Number(process.env.UNIFIER_WEEKLY_MARGIN_PERCENT || 10),
      shippingFeeEur: Number(process.env.UNIFIER_SHIPPING_FEE_EUR || 5),
    },
    storage: {
      keepDbRuns: Number(process.env.UNIFIER_DB_KEEP_RUNS || 5),
      keepOutputRuns: Number(process.env.UNIFIER_OUTPUT_KEEP_RUNS || 5),
      storeRawStaging: String(process.env.UNIFIER_STORE_RAW_STAGING || '0').trim() === '1',
      storeRawUnifiedSources: String(process.env.UNIFIER_STORE_RAW_UNIFIED_SOURCES || '0').trim() === '1',
      storeUnifiedAttributesJson: String(process.env.UNIFIER_STORE_UNIFIED_ATTRIBUTES_JSON || '1').trim() !== '0',
      vacuumOnPrune: String(process.env.UNIFIER_DB_VACUUM_ON_PRUNE || '1').trim() !== '0',
    },
    export: {
      writeJson: String(process.env.UNIFIER_EXPORT_JSON || '1').trim() !== '0',
      writeCsv: String(process.env.UNIFIER_EXPORT_CSV || '1').trim() !== '0',
      prettyJson: String(process.env.UNIFIER_EXPORT_PRETTY_JSON || '0').trim() === '1',
      includeRawJson: String(process.env.UNIFIER_EXPORT_INCLUDE_RAW_JSON || '0').trim() === '1',
    },
    woocommerce: {
      url: String(process.env.UNIFIER_WC_URL || process.env.NEXT_PUBLIC_WC_URL || '').trim(),
      consumerKey: String(process.env.UNIFIER_WC_CONSUMER_KEY || process.env.WC_CONSUMER_KEY || process.env.WC_SERVER_CONSUMER_KEY || '').trim(),
      consumerSecret: String(process.env.UNIFIER_WC_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET || process.env.WC_SERVER_CONSUMER_SECRET || '').trim(),
      timeoutMs: Number(process.env.UNIFIER_WC_TIMEOUT_MS || 30000),
      allowCreateCategories: String(process.env.UNIFIER_WC_CREATE_CATEGORIES || '1').trim() !== '0',
    },
    providers: {
      megasur: {
        localPath: resolveFromProject(projectRoot, process.env.MEGASUR_LOCAL_PATH, './storage/megasur/current.json'),
        feedUrl: String(process.env.MEGASUR_FEED_URL || '').trim(),
      },
      dmi: {
        localPath: String(process.env.DMI_LOCAL_PATH || '').trim()
          ? resolveFromProject(projectRoot, process.env.DMI_LOCAL_PATH, '')
          : '',
        apiUrl: String(process.env.DMI_API_URL || '').trim(),
        username: String(process.env.DMI_USERNAME || '').trim(),
        password: String(process.env.DMI_PASSWORD || '').trim(),
        cachePath: resolveFromProject(
          projectRoot,
          process.env.DMI_CACHE_PATH,
          './catalog-unifier/storage/dmi-current.json'
        ),
        cacheMaxAgeMinutes: Number(process.env.DMI_CACHE_MAX_AGE_MINUTES || 60),
      },
    },
  };

  return config;
}

module.exports = {
  loadConfig,
  fileExists,
};
