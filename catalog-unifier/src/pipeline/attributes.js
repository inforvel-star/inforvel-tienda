const { normalizeText } = require('../utils/text');

function extractRegex(text, regex, formatter = (value) => value) {
  const match = String(text || '').match(regex);
  if (!match) return '';
  return formatter(match[1] || match[0], match[2], match);
}

function detectProfile(product, category) {
  const family = normalizeText(category.family);
  const subfamily = normalizeText(category.subfamily);
  const text = normalizeText(`${product.name} ${product.description}`);

  if (family.includes('portatil') || subfamily.includes('portatil') || /\b(laptop|notebook|macbook)\b/.test(text)) {
    return 'Portátiles';
  }

  if (subfamily.includes('raton') || /\b(mouse|raton)\b/.test(text)) {
    return 'Ratones';
  }

  if (family.includes('telefon') || subfamily.includes('smartphone') || /\b(iphone|smartphone|movil)\b/.test(text)) {
    return 'Smartphones';
  }

  return 'default';
}

function buildLaptopAttributes(product, attributes) {
  const text = `${product.name} ${product.description}`;
  const ram = extractRegex(text, /(\d{1,3})\s?gb\s?(?:ram)?/i, (v) => `${v} GB`);
  const storage = extractRegex(text, /(\d+(?:\.\d+)?)\s?(tb|gb)\s?(?:ssd|nvme|emmc)?/i, (v, unit) => `${v} ${unit}`);
  const screen = extractRegex(text, /(\d{1,2}(?:[\.,]\d)?)\s?"/i, (v) => `${v.replace(',', '.')}"`);
  const cpu = extractRegex(text, /\b(i[3579][-\w]+|ryzen\s?[3579][\w-]*|apple\s?m\d(?:\s?pro|\s?max)?|ultra\s?[3579])\b/i);
  const os = extractRegex(text, /\b(windows\s?1[01]|windows\s?\d+|linux|ubuntu|mac\s?os|chrome\s?os|w11h|w11)\b/i);

  if (cpu) attributes['Procesador'] = cpu.toUpperCase();
  if (ram) attributes['RAM'] = ram;
  if (storage) attributes['Almacenamiento'] = storage;
  if (screen) attributes['Pantalla'] = screen;
  if (os) attributes['Sistema operativo'] = os;
}

function buildMouseAttributes(product, attributes) {
  const text = `${product.name} ${product.description}`;

  let connection = '';
  if (/bluetooth/i.test(text)) connection = 'Bluetooth';
  else if (/wireless|inalambrico|inalámbrico|2\.4\s?ghz/i.test(text)) connection = 'Inalámbrico';
  else if (/usb|cable|wired/i.test(text)) connection = 'Cable';

  const dpi = extractRegex(text, /(\d{3,5})\s?dpi/i, (v) => `${v} DPI`);
  const buttons = extractRegex(text, /(\d{1,2})\s?botones?/i, (v) => `${v}`);

  if (connection) attributes['Tipo conexión'] = connection;
  if (dpi) attributes['DPI'] = dpi;
  if (buttons) attributes['Número de botones'] = buttons;
}

function buildSmartphoneAttributes(product, attributes) {
  const text = `${product.name} ${product.description}`;

  const storage = extractRegex(text, /(\d+(?:\.\d+)?)\s?(tb|gb)\b/i, (v, unit) => `${v} ${unit}`);
  const ram = extractRegex(text, /(\d{1,3})\s?gb\s?ram/i, (v) => `${v} GB`);
  const screen = extractRegex(text, /(\d(?:[\.,]\d{1,2})?)\s?"/i, (v) => `${v.replace(',', '.')}"`);
  const has5g = /\b5g\b/i.test(text) ? 'Sí' : '';

  if (storage) attributes['Almacenamiento'] = storage;
  if (ram) attributes['RAM'] = ram;
  if (screen) attributes['Pantalla'] = screen;
  if (has5g) attributes['5G'] = has5g;
}

function buildAttributes(product, category, templatesConfig) {
  const attributes = {};
  const profile = detectProfile(product, category);

  attributes['Marca'] = product.brand || 'Sin marca';
  if (product.ean) attributes['EAN'] = product.ean;
  if (product.pn) attributes['PN'] = product.pn;

  if (profile === 'Portátiles') {
    buildLaptopAttributes(product, attributes);
  } else if (profile === 'Ratones') {
    buildMouseAttributes(product, attributes);
  } else if (profile === 'Smartphones') {
    buildSmartphoneAttributes(product, attributes);
  }

  // Conserva orden mínimo según plantilla cuando exista.
  const template = templatesConfig?.[profile] || templatesConfig?.default || [];
  const ordered = {};
  for (const key of template) {
    if (attributes[key]) ordered[key] = attributes[key];
  }
  for (const [k, v] of Object.entries(attributes)) {
    if (!ordered[k] && v) ordered[k] = v;
  }

  return ordered;
}

module.exports = {
  buildAttributes,
};
