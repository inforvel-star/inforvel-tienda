type ProductAttribute = {
  name?: string;
  slug?: string;
  options?: unknown[];
};

export type RefurbishedCandidate = {
  id?: number;
  name?: string;
  description?: string;
  short_description?: string;
  attributes?: ProductAttribute[];
};

// Excepciones confirmadas manualmente: el contenido importado los etiqueta como
// reacondicionados, pero los artículos son nuevos. Mantenerlas por ID evita que
// una futura sincronización del proveedor vuelva a introducirlos en el listado.
const CONFIRMED_NEW_PRODUCT_IDS = new Set([
  537021, // Disco duro externo Intenso 1 TB
  532374, // Monitor Dell P2423DE
  532372, // Servidor Dell PowerEdge T350 (registro actual)
  354781, // Servidor Dell PowerEdge T350 (registro anterior/duplicado)
]);

const REFURBISHED_WORD = /\b(?:reacondicionad[oa]s?|refurbished|renewed)\b/u;
const TITLE_REFURBISHED_WORD = /\b(?:reacondicionad[oa]s?|acondicionad[oa]s?|refurbished|renewed)\b/u;
const EXPLICIT_NEGATIVE = [
  /\breacondicionad[oa]s?\s*[:\-]?\s*(?:no|false|0)\b/u,
  /\b(?:no|sin)\s+(?:es\s+)?(?:un\s+|una\s+)?(?:producto\s+)?reacondicionad[oa]\b/u,
  /\b(?:estado|condicion)\s*[:\-]\s*(?:nuevo|nueva)\b/u,
];

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;|&(?:amp;)?#\d+;?|&[a-z]+;/gi, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ')
    .trim();
}

function attributeValues(attribute: ProductAttribute): string {
  return normalizeText(Array.isArray(attribute.options) ? attribute.options.join(' ') : '');
}

export function isAffirmativeRefurbishedTerm(value: unknown): boolean {
  const term = normalizeText(value);
  if (/^(?:si|yes|true|1)$/.test(term)) return true;
  return REFURBISHED_WORD.test(term);
}

export function isGenuinelyRefurbished(product: RefurbishedCandidate): boolean {
  if (CONFIRMED_NEW_PRODUCT_IDS.has(Number(product.id))) return false;

  const title = normalizeText(product.name);

  // An explicit product title is the strongest source of truth.
  if (TITLE_REFURBISHED_WORD.test(title)) return true;

  for (const attribute of product.attributes ?? []) {
    const key = normalizeText(`${attribute.name ?? ''} ${attribute.slug ?? ''}`);
    const values = attributeValues(attribute);

    if (/\breacondicionad[oa]?\b/u.test(key)) {
      if (isAffirmativeRefurbishedTerm(values)) return true;
      if (/^(?:no|false|0|nuevo|nueva)$/.test(values)) return false;
    }

    if (/\b(?:estado|condicion)\b/u.test(key) && REFURBISHED_WORD.test(values)) {
      return true;
    }
  }

  const characteristics = normalizeText(
    `${product.short_description ?? ''} ${product.description ?? ''}`,
  );

  // Supplier characteristics commonly contain "Reacondicionado: No". This
  // must be rejected before accepting a generic keyword occurrence.
  if (EXPLICIT_NEGATIVE.some((pattern) => pattern.test(characteristics))) {
    return false;
  }

  // Mentions about compatible/reused ink cartridges do not describe the
  // condition of the printer itself.
  if (/\b(?:cartuchos?|chips?|circuitos?)\b.{0,180}\breacondicionad[oa]s?\b/u.test(characteristics)) {
    return false;
  }

  const explicitPositive = /\b(?:reacondicionad[oa]?|estado|condicion)\s*[:\-]?\s*(?:si|yes|true|1|reacondicionad[oa])\b/u;
  if (explicitPositive.test(characteristics)) return true;

  // A narrative description is accepted only when it identifies the product
  // as refurbished near the beginning, not in unrelated legal/spec text.
  return REFURBISHED_WORD.test(characteristics.slice(0, 1000));
}
