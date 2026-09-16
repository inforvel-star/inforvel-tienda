const fs = require('fs');
const path = require('path');

function isRunArtifact(filename) {
  return /^run-\d+-/.test(filename) && (filename.endsWith('.json') || filename.endsWith('.csv'));
}

function artifactBase(filename) {
  return filename
    .replace(/-category-audit\.json$/i, '')
    .replace(/-publish-plan\.json$/i, '')
    .replace(/\.json$/i, '')
    .replace(/\.csv$/i, '');
}

function pruneOutputArtifacts(outputDir, keepRuns = 15) {
  const safeKeepRuns = Number.isFinite(keepRuns) && keepRuns > 0 ? Math.floor(keepRuns) : 0;
  if (safeKeepRuns <= 0) {
    return {
      keepRuns: safeKeepRuns,
      deletedRunGroups: 0,
      deletedFiles: 0,
      freedBytes: 0,
    };
  }

  if (!fs.existsSync(outputDir)) {
    return {
      keepRuns: safeKeepRuns,
      deletedRunGroups: 0,
      deletedFiles: 0,
      freedBytes: 0,
    };
  }

  const entries = fs.readdirSync(outputDir, { withFileTypes: true });
  const groups = new Map();

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!isRunArtifact(entry.name)) continue;

    const base = artifactBase(entry.name);
    if (!base) continue;

    const filePath = path.join(outputDir, entry.name);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }

    const existing = groups.get(base) || { base, mtimeMs: 0, files: [] };
    existing.mtimeMs = Math.max(existing.mtimeMs, stat.mtimeMs || 0);
    existing.files.push(filePath);
    groups.set(base, existing);
  }

  const orderedGroups = Array.from(groups.values()).sort((a, b) => b.mtimeMs - a.mtimeMs);
  const removeGroups = orderedGroups.slice(safeKeepRuns);

  let deletedFiles = 0;
  let freedBytes = 0;

  for (const group of removeGroups) {
    for (const filePath of group.files) {
      try {
        const stat = fs.statSync(filePath);
        freedBytes += stat.size || 0;
      } catch {
        // Sigue con el borrado aunque no se pueda leer el tamaño.
      }

      try {
        fs.unlinkSync(filePath);
        deletedFiles += 1;
      } catch {
        // Ignorar artefactos no borrables y continuar.
      }
    }
  }

  return {
    keepRuns: safeKeepRuns,
    deletedRunGroups: removeGroups.length,
    deletedFiles,
    freedBytes,
  };
}

module.exports = {
  pruneOutputArtifacts,
};

