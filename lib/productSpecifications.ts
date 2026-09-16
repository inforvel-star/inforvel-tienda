import { correctSupplierAccentErrors, decodeHtmlEntities, toBrandDisplayCase } from './productContent';

type RawAttribute = {
  name?: string;
  slug?: string;
  options?: unknown[];
};

type ProductLike = {
  name?: string;
  description?: string;
  attributes?: RawAttribute[];
};

export interface CanonicalSpecification {
  name: string;
  slug: string;
  options: string[];
}

const SPEC_ORDER = [
  'spec-marca',
  'spec-ram',
  'spec-almacenamiento',
  'spec-procesador',
  'spec-pantalla',
  'spec-bateria',
  'spec-puertos',
  'spec-peso',
  'spec-sistema-operativo',
  'spec-grafica',
  'spec-wifi',
];

function plain(value: unknown): string {
  return correctSupplierAccentErrors(decodeHtmlEntities(String(value ?? '')))
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function descriptionLines(value: unknown): string[] {
  return correctSupplierAccentErrors(decodeHtmlEntities(String(value ?? '')))
    .replace(/<(?:br|li|\/li|p|\/p|h[1-6]|\/h[1-6]|tr|\/tr)[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length >= 4 && line.length <= 180);
}

function addDescriptionSpecification(
  grouped: Map<string, CanonicalSpecification>,
  slug: string,
  name: string,
  options: string[],
) {
  if (grouped.has(slug) || options.length === 0) return;
  grouped.set(slug, { slug, name, options: uniqueOptions(options) });
}

function extractDescriptionSpecifications(
  product: ProductLike,
  grouped: Map<string, CanonicalSpecification>,
) {
  const lines = descriptionLines(product.description);
  const firstMatch = (pattern: RegExp, cleanup: RegExp) => {
    const line = lines.find((candidate) => pattern.test(comparable(candidate)));
    return line ? line.replace(cleanup, '').trim() : '';
  };

  addDescriptionSpecification(grouped, 'spec-procesador', 'Procesador', [
    firstMatch(/^procesador\b/, /^procesador\s*:?[\s]*/i),
  ].filter(Boolean));
  const screenLines = lines
    .filter((line) => {
      const key = comparable(line);
      return (/^pantalla\b/.test(key) && /\d/.test(key)) || /^panel\b/.test(key);
    })
    .slice(0, 3)
    .map((line) => line.replace(/^pantalla\s*(?:de\s+)?/i, '').trim());
  addDescriptionSpecification(grouped, 'spec-pantalla', 'Pantalla', screenLines);
  addDescriptionSpecification(grouped, 'spec-bateria', 'Batería', [
    firstMatch(/^bateria\b/, /^bater[ií]a\s*(?:de\s+)?/i),
  ].filter(Boolean));
  addDescriptionSpecification(grouped, 'spec-peso', 'Peso', [
    firstMatch(/^peso\b/, /^peso\s*(?:aproximado\s*)?(?:de\s*)?:?\s*/i),
  ].filter(Boolean));

  const ports = lines
    .filter((line) => /^(?:\d+\s+puertos?\b|puertos?\b|salida\s+hdmi\b)/i.test(line))
    .slice(0, 8);
  addDescriptionSpecification(grouped, 'spec-puertos', 'Puertos y conexiones', ports);
}

function comparable(value: unknown): string {
  return plain(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalDefinition(label: string): Pick<CanonicalSpecification, 'name' | 'slug'> | null {
  const key = comparable(label).replace(/^pa /, '');

  if (/^(marca|fabricante)$/.test(key)) return { name: 'Marca', slug: 'spec-marca' };
  if (/^(memoria )?ram( instalada)?$/.test(key)) return { name: 'Memoria RAM', slug: 'spec-ram' };
  if (/^(almacenamiento|capacidad total de almacenamiento|capacidad de almacenamiento)$/.test(key)) {
    return { name: 'Almacenamiento', slug: 'spec-almacenamiento' };
  }
  if (/^(procesador|familia del procesador|modelo del procesador|marca del procesador)$/.test(key)) {
    return { name: 'Procesador', slug: 'spec-procesador' };
  }
  if (/^(sistema operativo|sistema operativo instalado|software sistema operativo)$/.test(key)) {
    return { name: 'Sistema operativo', slug: 'spec-sistema-operativo' };
  }
  if (/^(wifi|wi fi|estandar wi fi|conexion wi fi)$/.test(key)) {
    return { name: 'Wi-Fi', slug: 'spec-wifi' };
  }
  if (/^(tarjeta grafica|adaptador grafico|familia del adaptador grafico|modelo del adaptador grafico|graficos)$/.test(key)) {
    return { name: 'Gráfica', slug: 'spec-grafica' };
  }

  return null;
}

// Muchos atributos de WooCommerce (Procesador, Bluetooth, Wi-Fi...) vienen
// del feed del proveedor tal cual, a menudo en minúsculas ("apple m4",
// "bluetooth 6.0") — se capitaliza solo la primera letra (no Título completo,
// para no tocar de más valores técnicos como "8 núcleos" o números).
function capitalizeFirstLetter(value: string): string {
  const match = value.match(/[a-záéíóúñü]/i);
  if (!match || match.index === undefined) return value;
  const i = match.index;
  return value.slice(0, i) + value[i].toLocaleUpperCase('es-ES') + value.slice(i + 1);
}

function normalizeOption(slug: string, value: unknown): string | null {
  const option = plain(value);
  if (!option || option.length > 100 || /<\s*[-/]|[-/]\s*>/.test(String(value ?? ''))) return null;

  if (slug === 'spec-sistema-operativo') {
    const key = comparable(option);
    if (/mac ?os|os ?x/.test(key)) return 'macOS';
    if (/windows 11 pro/.test(key)) return 'Windows 11 Pro';
    if (/windows 11 home/.test(key)) return 'Windows 11 Home';
    if (/windows 11/.test(key)) return 'Windows 11';
    if (/free ?dos/.test(key)) return 'FreeDOS';
    if (/sin sistema/.test(key)) return 'Sin sistema operativo';
  }

  if (slug === 'spec-ram') {
    const match = option.match(/(\d{1,3})\s*GB/i);
    if (match) return `${Number(match[1])}GB`;
  }

  // El atributo "Marca" de WooCommerce suele venir tal cual lo escribió el
  // proveedor (a menudo en mayúsculas, "APPLE", "HIDITEC") — mismo criterio
  // de formato Título que ya se usa para insertar la marca en el cuerpo de
  // la descripción, para que no salga inconsistente entre productos.
  if (slug === 'spec-marca') {
    return toBrandDisplayCase(option) || option;
  }

  if (slug === 'spec-procesador') {
    return capitalizeFirstLetter(
      option
        .replace(/[®™]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  // Resto de campos (Bluetooth, Wi-Fi, Gráfica, Puertos...): igual que
  // Procesador, solo se capitaliza la primera letra del valor completo.
  return capitalizeFirstLetter(option);
}

function uniqueOptions(options: string[]): string[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = comparable(option);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function optionSort(slug: string, a: string, b: string): number {
  if (slug === 'spec-ram') {
    return (Number.parseInt(a, 10) || Number.MAX_SAFE_INTEGER) - (Number.parseInt(b, 10) || Number.MAX_SAFE_INTEGER);
  }
  if (slug === 'spec-almacenamiento') {
    const toGb = (value: string) => {
      const number = Number.parseFloat(value) || Number.MAX_SAFE_INTEGER;
      return /tb/i.test(value) ? number * 1024 : number;
    };
    return toGb(a) - toGb(b);
  }
  return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
}

export function specificationTerm(value: string): string {
  return comparable(value).replace(/\s+/g, '-');
}

export function getCanonicalSpecifications(
  product: ProductLike,
  options: { includeDescription?: boolean } = {},
): CanonicalSpecification[] {
  const grouped = new Map<string, CanonicalSpecification>();

  for (const attribute of product.attributes ?? []) {
    const definition = canonicalDefinition(attribute.name || attribute.slug || '');
    if (!definition) continue;

    const existing = grouped.get(definition.slug) ?? { ...definition, options: [] };
    for (const rawOption of attribute.options ?? []) {
      const option = normalizeOption(definition.slug, rawOption);
      if (option) existing.options.push(option);
    }
    grouped.set(definition.slug, existing);
  }

  if (options.includeDescription) extractDescriptionSpecifications(product, grouped);

  // Los equipos Apple deben encontrarse como macOS aunque el distribuidor use “Apple”.
  const productName = comparable(product.name);
  const isMacComputer = /\b(macbook|imac|mac mini|mac studio|mac pro)\b/.test(productName)
    && !/\b(filtro|funda|protector|cargador|cable|adaptador|soporte|base|dock|pantalla|teclado|repuesto)\b/.test(productName);
  if (!isMacComputer) {
    const os = grouped.get('spec-sistema-operativo');
    if (os) os.options = os.options.filter((option) => comparable(option) !== 'macos');
  }
  if (isMacComputer) {
    const os = grouped.get('spec-sistema-operativo') ?? {
      name: 'Sistema operativo',
      slug: 'spec-sistema-operativo',
      options: [],
    };
    os.options.push('macOS');
    grouped.set(os.slug, os);
  }

  return Array.from(grouped.values())
    .map((specification) => ({
      ...specification,
      options: uniqueOptions(specification.options).sort((a, b) => optionSort(specification.slug, a, b)),
    }))
    .filter((specification) => specification.options.length > 0)
    .sort((a, b) => SPEC_ORDER.indexOf(a.slug) - SPEC_ORDER.indexOf(b.slug));
}
