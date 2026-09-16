import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import fs from 'fs/promises';
import path from 'path';

interface CsvRow {
  id: string;
  sku: string;
  name: string;
  expectedType: string;
  confianza: string;
}

interface WooProduct {
  id: number;
  sku: string;
  name: string;
  status: string;
  categories: Array<{ id: number; name: string; slug: string }>;
}

const CATEGORY_IDS: Record<string, number> = {
  Monitor: 123,
  Switch: 138,
  'Fuente de alimentación': 199,
  'Tarjeta gráfica': 100,
  Auriculares: 327,
  Portátil: 89,
  'Placa base': 98,
  Teclado: 112,
  Ratón: 113,
  'Memoria RAM': 187,
  'Caja ordenador': 130,
  Impresora: 124,
  Router: 135,
  Tablet: 107,
  Smartphone: 373,
};

// The source report mistakes collectible electronic helmets for headphones.
// Their provider family is MERCHANDISING, represented by the WooCommerce
// category created specifically for that catalog family.
const PRODUCT_CATEGORY_OVERRIDES: Record<string, number> = {
  '288404': 713,
  '286402': 713,
  '282875': 713,
};

function targetCategoryId(row: CsvRow): number {
  return PRODUCT_CATEGORY_OVERRIDES[row.id] || CATEGORY_IDS[row.expectedType];
}

function parseCsv(text: string): CsvRow[] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') {
      record.push(field);
      field = '';
    } else if (character === '\n') {
      record.push(field.replace(/\r$/, ''));
      records.push(record);
      record = [];
      field = '';
    } else field += character;
  }

  if (field || record.length) {
    record.push(field);
    records.push(record);
  }

  const headers = records.shift() || [];
  return records.filter((row) => row.length > 1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])) as unknown as CsvRow,
  );
}

async function loadEnvironment(directory: string): Promise<void> {
  for (const filename of ['.env', '.env.local']) {
    try {
      const contents = await fs.readFile(path.join(directory, filename), 'utf8');
      for (const line of contents.split(/\r?\n/)) {
        const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) continue;
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[match[1]] = value;
      }
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
}

function chunks<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

async function main(): Promise<void> {
  const csvPath = process.argv.find((argument) => !argument.startsWith('--') && argument !== process.argv[0] && argument !== process.argv[1]);
  const apply = process.argv.includes('--apply');
  if (!csvPath) throw new Error('Uso: ts-node scripts/recategorize-products-from-csv.ts <csv> [--apply]');

  await loadEnvironment(process.cwd());
  const api = new WooCommerceRestApi({
    url: process.env.NEXT_PUBLIC_WC_URL!,
    consumerKey: (process.env.WC_CONSUMER_KEY || process.env.WC_SERVER_CONSUMER_KEY)!,
    consumerSecret: (process.env.WC_CONSUMER_SECRET || process.env.WC_SERVER_CONSUMER_SECRET)!,
    version: 'wc/v3',
  });
  const rows = parseCsv((await fs.readFile(path.resolve(csvPath), 'utf8')).replace(/^\uFEFF/, ''));
  const liveProducts = new Map<string, WooProduct>();

  for (const batch of chunks(rows, 100)) {
    const response = await api.get('products', {
      include: batch.map((row) => row.id).join(','),
      per_page: 100,
      status: 'any',
      _fields: 'id,sku,name,status,categories',
    });
    for (const product of response.data as WooProduct[]) liveProducts.set(String(product.id), product);
  }

  const missing = rows.filter((row) => !liveProducts.has(row.id));
  const skuMismatch = rows.filter((row) => liveProducts.has(row.id) && liveProducts.get(row.id)!.sku !== row.sku);
  const unknownTypes = rows.filter((row) => !CATEGORY_IDS[row.expectedType]);
  if (missing.length || skuMismatch.length || unknownTypes.length) {
    throw new Error(`Validación fallida: missing=${missing.length}, skuMismatch=${skuMismatch.length}, unknownTypes=${unknownTypes.length}`);
  }

  const changes = rows.filter((row) => {
    const categories = liveProducts.get(row.id)!.categories;
    return categories.length !== 1 || categories[0].id !== targetCategoryId(row);
  });
  const byType = changes.reduce<Record<string, number>>((summary, row) => {
    summary[row.expectedType] = (summary[row.expectedType] || 0) + 1;
    return summary;
  }, {});
  console.log(JSON.stringify({ rows: rows.length, productOverrides: Object.keys(PRODUCT_CATEGORY_OVERRIDES).length, changes: changes.length, byType }, null, 2));
  if (!apply || !changes.length) return;

  const backupDirectory = path.resolve(process.cwd(), 'artifacts');
  await fs.mkdir(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDirectory, `woocommerce-category-backup-${timestamp}.json`);
  await fs.writeFile(backupPath, JSON.stringify({ source: path.resolve(csvPath), products: changes.map((row) => liveProducts.get(row.id)) }, null, 2));
  console.log(`Backup: ${backupPath}`);

  for (const batch of chunks(changes, 100)) {
    const response = await api.post('products/batch', {
      update: batch.map((row) => ({ id: Number(row.id), categories: [{ id: targetCategoryId(row) }] })),
    });
    if (!Array.isArray(response.data?.update) || response.data.update.length !== batch.length) {
      throw new Error(`Respuesta incompleta del lote que comienza por ${batch[0].id}`);
    }
    console.log(`Actualizados ${batch.length}; último ID ${batch[batch.length - 1].id}`);
  }

  let verified = 0;
  for (const batch of chunks(rows, 100)) {
    const response = await api.get('products', {
      include: batch.map((row) => row.id).join(','),
      per_page: 100,
      status: 'any',
      _fields: 'id,categories',
    });
    const products = new Map<string, WooProduct>((response.data as WooProduct[]).map((product) => [String(product.id), product]));
    for (const row of batch) {
      const categories = products.get(row.id)?.categories || [];
      if (categories.length !== 1 || categories[0].id !== targetCategoryId(row)) {
        throw new Error(`Verificación posterior fallida para ${row.id}`);
      }
      verified += 1;
    }
  }
  console.log(`Verificados: ${verified}`);
}

main().catch((error: any) => {
  console.error(error.response?.data?.message || error.message);
  process.exit(1);
});
