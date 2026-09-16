import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import fs from 'fs/promises';
import path from 'path';

interface CategoryRef { id: number; name: string; slug: string }
interface Product {
  id: number;
  sku: string;
  name: string;
  categories: CategoryRef[];
}

interface CategoryRule {
  targetId: number;
  targetName: string;
  pattern: RegExp;
}

const SOURCE_CATEGORY_ID = 89;
const RULES: CategoryRule[] = [
  { targetId: 118, targetName: 'Alfombrillas', pattern: /\balfombrilla\b|\bmouse\s*pad\b/i },
  { targetId: 442, targetName: 'Aire acondicionado portátil', pattern: /^aire\s+acondicionado\b/i },
  { targetId: 219, targetName: 'Altavoces', pattern: /^(?:altavoz|barra\s+de\s+sonido|amplificador|mesa\s+de\s+mezclas)\b/i },
  { targetId: 152, targetName: 'Proyección', pattern: /^proyector\b/i },
  { targetId: 156, targetName: 'Fotografía', pattern: /^pantalla\s+chroma\b/i },
  { targetId: 115, targetName: 'Escáneres', pattern: /^(?:escaner|scanner)\b/i },
  { targetId: 448, targetName: 'E-books', pattern: /^(?:libro\s+electronico|ebook)\b/i },
  { targetId: 107, targetName: 'Tablets', pattern: /^(?:tablet|tabler|lenovo\s+tab)\b/i },
  { targetId: 228, targetName: 'Pequeños electrodomésticos', pattern: /^(?:ventilador|mini\s+ventilador|termoventilador)\b/i },
  { targetId: 200, targetName: 'Cable Antirrobo para portátiles', pattern: /^(?:cable|kit\s+cable)\b.*\bseguridad\b.*\bportatil\b/i },
  { targetId: 343, targetName: 'Bases', pattern: /^(?:base\s+(?:de\s+)?refrigeracion|base\s+refrigeradora|base\b.*\bportatil\b|base\s+hp\s+usb-c)/i },
  { targetId: 248, targetName: 'Maletines para Portátiles', pattern: /^(?:bolsa|bolso|trolley|bandolera|organizador\s+de\s+viaje|estuche|carcasa)\b/i },
  { targetId: 134, targetName: 'Hub USB', pattern: /^(?:dock|minidock|hub)\b/i },
  { targetId: 159, targetName: 'Extensiones de la Garantía', pattern: /^extension\s+de\s+garantia\b/i },
  { targetId: 444, targetName: 'Rastreadores gps', pattern: /^(?:localizador|rastreador)\b/i },
  { targetId: 210, targetName: 'Muebles de oficina', pattern: /^reposapies\b|^yoevu\b.*\bmesa\b/i },
  { targetId: 117, targetName: 'Lápiz Digital', pattern: /^lapiz\b/i },
  { targetId: 111, targetName: 'Periféricos', pattern: /^cubierta\s+webcam\b/i },
  { targetId: 141, targetName: 'Lectores de código barras', pattern: /^lector\s+codigo\s+de\s+barras\b/i },
  { targetId: 126, targetName: 'Impresoras de Etiquetas Adhesivas', pattern: /^rotuladora\b/i },
  { targetId: 145, targetName: 'Calculadoras', pattern: /^calculadora\b/i },
  { targetId: 223, targetName: 'Regletas', pattern: /^regleta\b/i },
];

async function loadEnvironment(directory: string) {
  for (const filename of ['.env', '.env.local']) {
    try {
      const contents = await fs.readFile(path.join(directory, filename), 'utf8');
      for (const line of contents.split(/\r?\n/)) {
        const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) continue;
        process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
      }
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function chunks<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size));
}

async function main() {
  await loadEnvironment(process.cwd());
  const api = new WooCommerceRestApi({
    url: process.env.NEXT_PUBLIC_WC_URL!,
    consumerKey: (process.env.WC_CONSUMER_KEY || process.env.WC_SERVER_CONSUMER_KEY)!,
    consumerSecret: (process.env.WC_CONSUMER_SECRET || process.env.WC_SERVER_CONSUMER_SECRET)!,
    version: 'wc/v3',
  });
  const apply = process.argv.includes('--apply');
  const expected = Number(process.argv.find((argument) => argument.startsWith('--confirm='))?.split('=')[1] || 0);

  const first = await api.get('products', {
    category: SOURCE_CATEGORY_ID, status: 'publish', per_page: 100, page: 1,
    _fields: 'id,sku,name,categories',
  });
  const totalPages = Number(first.headers['x-wp-totalpages'] || 1);
  const remaining = totalPages > 1
    ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) =>
      api.get('products', {
        category: SOURCE_CATEGORY_ID, status: 'publish', per_page: 100, page: index + 2,
        _fields: 'id,sku,name,categories',
      })))
    : [];
  const products = [first, ...remaining].flatMap((response) => response.data as Product[]);
  const changes = products.flatMap((product) => {
    const rule = RULES.find((candidate) => candidate.pattern.test(normalize(product.name)));
    if (!rule) return [];
    const categories = [
      ...product.categories.filter((category) => category.id !== SOURCE_CATEGORY_ID),
      { id: rule.targetId, name: rule.targetName, slug: '' },
    ].filter((category, index, list) => list.findIndex((item) => item.id === category.id) === index);
    return [{ product, rule, categories }];
  });

  const byTarget = changes.reduce<Record<string, number>>((summary, change) => {
    summary[change.rule.targetName] = (summary[change.rule.targetName] || 0) + 1;
    return summary;
  }, {});
  console.log(JSON.stringify({ sourceTotal: products.length, changes: changes.length, byTarget }, null, 2));
  if (!apply) return;
  if (!expected || expected !== changes.length) {
    throw new Error(`Confirmación inválida: detectados=${changes.length}, --confirm=${expected || 0}`);
  }

  const backupDirectory = path.resolve(process.cwd(), 'artifacts');
  await fs.mkdir(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDirectory, `portatiles-contaminants-backup-${timestamp}.json`);
  await fs.writeFile(backupPath, JSON.stringify({ sourceCategoryId: SOURCE_CATEGORY_ID, changes }, null, 2));
  console.log(`Backup: ${backupPath}`);

  for (const batch of chunks(changes, 50)) {
    const response = await api.post('products/batch', {
      update: batch.map(({ product, categories }) => ({
        id: product.id,
        categories: categories.map(({ id }) => ({ id })),
      })),
    });
    if (!Array.isArray(response.data?.update) || response.data.update.length !== batch.length) {
      throw new Error(`Respuesta incompleta actualizando el lote iniciado en ${batch[0].product.id}`);
    }
    console.log(`Actualizados: ${batch.length}; último ID: ${batch[batch.length - 1].product.id}`);
  }

  let verified = 0;
  for (const batch of chunks(changes, 100)) {
    const response = await api.get('products', {
      include: batch.map(({ product }) => product.id).join(','), per_page: 100, status: 'any',
      _fields: 'id,categories',
    });
    const refreshed = new Map<number, Product>((response.data as Product[]).map((product) => [product.id, product]));
    for (const change of batch) {
      const categoryIds = (refreshed.get(change.product.id)?.categories || []).map((category) => category.id);
      if (categoryIds.includes(SOURCE_CATEGORY_ID) || !categoryIds.includes(change.rule.targetId)) {
        throw new Error(`Verificación fallida para producto ${change.product.id}`);
      }
      verified += 1;
    }
  }
  console.log(`Verificados: ${verified}`);
}

main().catch((error: any) => {
  console.error(error?.response?.data?.message || error.message);
  process.exit(1);
});
