function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function compactSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function toSlug(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function safeString(value) {
  return compactSpaces(String(value || ''));
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Soporta formatos ES (1.234,56) y EN (1234.56).
  let candidate = raw.replace(/[^\d,.-]/g, '');
  if (!candidate) return null;

  const hasComma = candidate.includes(',');
  const hasDot = candidate.includes('.');

  if (hasComma && hasDot) {
    if (candidate.lastIndexOf(',') > candidate.lastIndexOf('.')) {
      candidate = candidate.replace(/\./g, '').replace(',', '.');
    } else {
      candidate = candidate.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    candidate = candidate.replace(',', '.');
  }

  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickFirst(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') {
      return obj[key];
    }
  }
  return undefined;
}

module.exports = {
  normalizeText,
  compactSpaces,
  toSlug,
  safeString,
  parseNumber,
  pickFirst,
};
