const fs = require('fs');
const { fileExists } = require('../config');

async function readLocalJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

async function fetchRemoteJson(url, timeoutMs = 45000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    throw new Error(`MegaSur feed HTTP ${response.status}`);
  }

  const text = await response.text();
  if (!text || !text.trim().startsWith('[')) {
    throw new Error('MegaSur devolvió contenido no JSON-array');
  }

  return JSON.parse(text);
}

async function fetchMegaSurProducts(config) {
  const localPath = config.providers.megasur.localPath;
  const feedUrl = config.providers.megasur.feedUrl;

  let data;
  let source = '';

  if (localPath && fileExists(localPath)) {
    data = await readLocalJson(localPath);
    source = `local:${localPath}`;
  } else if (feedUrl) {
    data = await fetchRemoteJson(feedUrl);
    source = `remote:${feedUrl}`;
  } else {
    throw new Error('MegaSur no configurado: define MEGASUR_LOCAL_PATH o MEGASUR_FEED_URL');
  }

  if (!Array.isArray(data)) {
    throw new Error('Feed MegaSur inválido: se esperaba un array');
  }

  return {
    provider: 'megasur',
    source,
    items: data,
  };
}

module.exports = {
  fetchMegaSurProducts,
};
