#!/usr/bin/env node

const { loadConfig } = require('./config');
const {
  initDatabase,
  createSyncRun,
  finishSyncRun,
  insertStagedProducts,
  insertUnifiedProducts,
  insertProductAttributes,
  insertPublishActions,
  pruneRuns,
  optimizeDatabase,
} = require('./db');
const { fetchMegaSurProducts } = require('./providers/megasur');
const { fetchDmiProducts } = require('./providers/dmi');
const { normalizeProviderRows } = require('./pipeline/normalize');
const { dedupeProducts } = require('./pipeline/dedupe');
const { buildResolver, buildCategoryAudit } = require('./pipeline/category-map');
const { buildAttributes } = require('./pipeline/attributes');
const { applyPricing, getActiveWeekBrand } = require('./pipeline/pricing');
const { exportUnifiedProducts, exportAuxiliaryReports } = require('./pipeline/exporter');
const { publishCatalog } = require('./publish/publisher');
const { pruneOutputArtifacts } = require('./housekeeping');

function parseArgs(argv) {
  const args = {
    command: 'run',
    source: 'all',
    dryRun: true,
    limit: 0,
    date: '',
    publish: 'off',
    publishLimit: 200,
    allowCreateCategories: null,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;

    if (!token.startsWith('--') && i === 2) {
      args.command = token;
      continue;
    }

    if (token.startsWith('--source=')) args.source = token.split('=')[1] || 'all';
    else if (token === '--apply') args.dryRun = false;
    else if (token === '--dry-run') args.dryRun = true;
    else if (token.startsWith('--limit=')) args.limit = Number(token.split('=')[1] || 0);
    else if (token.startsWith('--date=')) args.date = token.split('=')[1] || '';
    else if (token.startsWith('--publish=')) args.publish = (token.split('=')[1] || 'off').toLowerCase();
    else if (token.startsWith('--publish-limit=')) args.publishLimit = Number(token.split('=')[1] || 0);
    else if (token.startsWith('--publish-create-categories=')) {
      const val = token.split('=')[1];
      args.allowCreateCategories = val === '1' || String(val).toLowerCase() === 'true';
    }
  }

  return args;
}

function shouldIncludeSource(allOrSingle, provider) {
  return allOrSingle === 'all' || allOrSingle === provider;
}

async function loadProviderData(config, source) {
  const datasets = [];

  if (shouldIncludeSource(source, 'megasur')) {
    try {
      const data = await fetchMegaSurProducts(config);
      datasets.push(data);
    } catch (error) {
      datasets.push({
        provider: 'megasur',
        source: 'error',
        items: [],
        warning: `MegaSur error: ${error?.message || String(error)}`,
      });
    }
  }

  if (shouldIncludeSource(source, 'dmi')) {
    try {
      const data = await fetchDmiProducts(config);
      datasets.push(data);
    } catch (error) {
      datasets.push({
        provider: 'dmi',
        source: 'error',
        items: [],
        warning: `DMI error: ${error?.message || String(error)}`,
      });
    }
  }

  return datasets;
}

function logHeader(title) {
  console.log(`\n=== ${title} ===`);
}

async function run() {
  const args = parseArgs(process.argv);
  if (args.command !== 'run') {
    throw new Error(`Comando no soportado: ${args.command}`);
  }
  if (!['off', 'simulate', 'apply'].includes(args.publish)) {
    throw new Error(`Modo de publicación inválido: ${args.publish}. Usa off|simulate|apply.`);
  }

  const config = loadConfig(process.cwd());
  const runDate = args.date ? new Date(args.date) : new Date();
  if (Number.isNaN(runDate.getTime())) {
    throw new Error(`Fecha inválida en --date: ${args.date}`);
  }

  const db = initDatabase(config);
  const runId = createSyncRun(db, { source: args.source, dryRun: args.dryRun });

  try {
    logHeader('Catalog Unifier MVP');
    console.log(`Run ID: ${runId}`);
    console.log(`Source: ${args.source}`);
    console.log(`Dry run: ${args.dryRun ? 'sí' : 'no'}`);
    console.log(`Publish: ${args.publish}`);

    const datasets = await loadProviderData(config, args.source);
    const providerWarnings = [];
    const providerIngest = [];

    let normalized = [];
    for (const dataset of datasets) {
      if (dataset.warning) {
        providerWarnings.push(`${dataset.provider}: ${dataset.warning}`);
      }
      const rows = normalizeProviderRows(dataset.items, dataset.provider);
      normalized.push(...rows);
      providerIngest.push({
        provider: dataset.provider,
        source: dataset.source,
        normalizedCount: rows.length,
        warning: dataset.warning || '',
      });
      console.log(`${dataset.provider}: ${rows.length} productos normalizados (${dataset.source})`);
    }

    if (args.limit > 0) {
      normalized = normalized.slice(0, args.limit);
      console.log(`Límite aplicado: ${normalized.length} productos`);
    }

    const stagedCount = insertStagedProducts(db, runId, normalized, config.storage);
    const dedupe = dedupeProducts(normalized);
    const categoryResolver = buildResolver(config.categoryMap);

    const enriched = dedupe.winners.map((winner) => {
      const category = categoryResolver.resolveCategory(winner);
      const attributes = buildAttributes(winner, category, config.attributeTemplates);
      const pricing = applyPricing(winner, config.pricing, config.weeklyRotation, runDate);

      return {
        ...winner,
        category,
        attributes,
        pricing,
      };
    });
    const winnersByProvider = {};
    for (const row of enriched) {
      const key = row.provider || 'unknown';
      winnersByProvider[key] = (winnersByProvider[key] || 0) + 1;
    }

    const unifiedCount = insertUnifiedProducts(db, runId, enriched, config.storage);
    const attrsCount = insertProductAttributes(db, runId, enriched);
    const categoryAudit = buildCategoryAudit(enriched);

    let publishStats = {
      mode: 'off',
      attempted: 0,
      created: 0,
      updated: 0,
      errors: 0,
      warnings: ['publicacion-desactivada'],
      actions: [],
      categoryCreatesPlanned: 0,
    };

    if (args.publish !== 'off') {
      const allowCreateCategories = args.allowCreateCategories === null
        ? Boolean(config.woocommerce.allowCreateCategories)
        : Boolean(args.allowCreateCategories);

      logHeader('Publicación Controlada WooCommerce');
      console.log(`Modo: ${args.publish}`);
      console.log(`Límite de publicación: ${args.publishLimit > 0 ? args.publishLimit : 'sin límite'}`);
      console.log(`Crear categorías faltantes: ${allowCreateCategories ? 'sí' : 'no'}`);

      publishStats = await publishCatalog(enriched, config, {
        mode: args.publish,
        limit: args.publishLimit,
        allowCreateCategories,
      });

      const savedActions = insertPublishActions(db, runId, publishStats);
      publishStats.actionsStored = savedActions;
      console.log(`Plan de publicación: ${publishStats.attempted} productos (create=${publishStats.created}, update=${publishStats.updated}, errors=${publishStats.errors})`);
    }

    const exportData = exportUnifiedProducts(
      enriched,
      config.outputDir,
      {
        runId,
        source: args.source,
        dryRun: args.dryRun,
        publishMode: args.publish,
        createdAt: new Date().toISOString(),
        activeWeekBrand: getActiveWeekBrand(config.weeklyRotation, runDate),
        dedupe: dedupe.stats,
        categoryAudit,
        warnings: providerWarnings,
      },
      config.export
    );
    const extraReports = exportAuxiliaryReports(config.outputDir, exportData.base, {
      categoryAudit,
      publishPlan: publishStats,
    });

    let storageMaintenance = {
      dbPrune: { keepRuns: config.storage.keepDbRuns, deletedRunCount: 0 },
      outputPrune: { keepRuns: config.storage.keepOutputRuns, deletedRunGroups: 0, deletedFiles: 0, freedBytes: 0 },
      vacuumApplied: false,
    };

    try {
      const dbPrune = pruneRuns(db, config.storage.keepDbRuns);
      const vacuumApplied = dbPrune.deletedRunCount > 0 && Boolean(config.storage.vacuumOnPrune);
      optimizeDatabase(db, { vacuum: vacuumApplied });
      const outputPrune = pruneOutputArtifacts(config.outputDir, config.storage.keepOutputRuns);

      storageMaintenance = {
        dbPrune,
        outputPrune,
        vacuumApplied,
      };
    } catch (maintError) {
      providerWarnings.push(`mantenimiento almacenamiento: ${maintError?.message || String(maintError)}`);
    }

    const publishSummary = {
      mode: publishStats.mode,
      attempted: publishStats.attempted,
      created: publishStats.created,
      updated: publishStats.updated,
      errors: publishStats.errors,
      categoryCreatesPlanned: publishStats.categoryCreatesPlanned,
      warnings: (publishStats.warnings || []).slice(0, 20),
      warningsCount: (publishStats.warnings || []).length,
      actionsStored: publishStats.actionsStored || 0,
    };

    const summary = {
      stagedCount,
      unifiedCount,
      attrsCount,
      dedupe: dedupe.stats,
      activeWeekBrand: getActiveWeekBrand(config.weeklyRotation, runDate),
      output: exportData,
      extraReports,
      providers: {
        ingest: providerIngest,
        winnersByProvider,
      },
      categories: {
        categorizedCount: categoryAudit.categorizedCount,
        uncategorizedCount: categoryAudit.uncategorizedCount,
        topFamilies: categoryAudit.byFamily.slice(0, 10),
        topUnresolved: categoryAudit.unresolvedTop.slice(0, 10),
      },
      publish: publishSummary,
      storageMaintenance,
      providerWarnings,
    };

    finishSyncRun(db, runId, { status: 'ok', summary });

    logHeader('Resumen');
    console.log(`Staging: ${stagedCount}`);
    console.log(`Unificados: ${unifiedCount}`);
    console.log(`Atributos: ${attrsCount}`);
    console.log(`Clusters duplicados: ${dedupe.stats.duplicateClusters}`);
    console.log(`Clusters multi-proveedor: ${dedupe.stats.multiProviderClusters}`);
    console.log(`Descartados por dedupe: ${dedupe.stats.losersCount}`);
    console.log(`Marca activa semanal: ${summary.activeWeekBrand || 'n/a'}`);
    if (exportData.jsonPath) console.log(`JSON: ${exportData.jsonPath}`);
    if (exportData.csvPath) console.log(`CSV: ${exportData.csvPath}`);
    if (extraReports.categoryAuditPath) console.log(`Category audit: ${extraReports.categoryAuditPath}`);
    if (extraReports.publishPlanPath) console.log(`Publish plan: ${extraReports.publishPlanPath}`);
    console.log(`Sin categorizar: ${categoryAudit.uncategorizedCount}`);
    console.log(`Publicación (${publishSummary.mode}): create=${publishSummary.created}, update=${publishSummary.updated}, errors=${publishSummary.errors}`);
    console.log(`Retención DB: keep=${storageMaintenance.dbPrune.keepRuns}, runs_purgados=${storageMaintenance.dbPrune.deletedRunCount}`);
    console.log(`Retención output: keep=${storageMaintenance.outputPrune.keepRuns}, grupos_borrados=${storageMaintenance.outputPrune.deletedRunGroups}, ficheros_borrados=${storageMaintenance.outputPrune.deletedFiles}`);

    if (providerWarnings.length) {
      console.log('\nAvisos:');
      for (const warning of providerWarnings) console.log(`- ${warning}`);
    }

    console.log('\nProveedores (ingesta):');
    for (const entry of providerIngest) {
      console.log(`- ${entry.provider}: ${entry.normalizedCount} (${entry.source})`);
    }
    console.log('Ganadores tras dedupe:');
    for (const [provider, count] of Object.entries(winnersByProvider)) {
      console.log(`- ${provider}: ${count}`);
    }
  } catch (error) {
    finishSyncRun(db, runId, {
      status: 'error',
      summary: {},
      errorText: error?.stack || String(error),
    });
    throw error;
  } finally {
    db.close();
  }
}

run().catch((error) => {
  console.error('\nERROR EN CATALOG-UNIFIER MVP');
  console.error(error?.stack || error);
  process.exit(1);
});
