// Aplica finalizeProductDescription a productos YA publicados en WooCommerce,
// en lotes pequeños y controlados — pensado para el despliegue gradual antes
// de conectar la limpieza al sync automático de todo el catálogo.
//
// Por qué usa el `description` actual de WooCommerce como "texto crudo" en
// vez de volver a tirar del feed de MegaSur: el feed solo conserva 2
// snapshots (current/previous) y deja de tocar un producto en cuanto sale
// del feed activo, así que para catálogo ya publicado el dato más fiable
// que tenemos es el que ya está en WooCommerce. Antes de sobrescribirlo se
// guarda tal cual en la meta `_iv_description_raw_backup` (una sola vez —
// si el producto ya tiene backup, no se toca, para no perder el original
// si el script se corre varias veces).
//
// Uso:
//   npm run backfill:clean-descriptions -- --dry-run --limit=50   # solo enseña diffs, no escribe nada
//   npm run backfill:clean-descriptions -- --limit=50             # escribe de verdad, 50 productos
//   npm run backfill:clean-descriptions -- --limit=100 --ids=537843,463612  # productos concretos primero

import axios from 'axios';
import { existsSync, readFileSync } from 'node:fs';
import { finalizeProductDescription } from '../lib/productContent';

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const baseURL = process.env.WC_API_URL || `${process.env.NEXT_PUBLIC_WC_URL}/wp-json/wc/v3`;
const username = process.env.WC_CONSUMER_KEY;
const password = process.env.WC_CONSUMER_SECRET;

if (!baseURL || !username || !password) {
  throw new Error('Faltan WC_API_URL/NEXT_PUBLIC_WC_URL o las credenciales de WooCommerce.');
}

const api = axios.create({ baseURL, auth: { username, password } });

const DESCRIPTION_RAW_BACKUP_META_KEY = '_iv_description_raw_backup';

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const arg = process.argv.find((a) => a.startsWith('--limit='));
  const value = arg ? Number.parseInt(arg.split('=')[1], 10) : 50;
  return Number.isFinite(value) && value > 0 ? value : 50;
})();
const ONLY_IDS = (() => {
  const arg = process.argv.find((a) => a.startsWith('--ids='));
  if (!arg) return null;
  const ids = arg
    .split('=')[1]
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter(Number.isFinite);
  return ids.length > 0 ? new Set(ids) : null;
})();

interface WCProductLite {
  id: number;
  name: string;
  slug: string;
  description: string;
  meta_data: Array<{ key: string; value: unknown }>;
  attributes: Array<{ name: string; options: string[] }>;
}

function getMetaValue(product: WCProductLite, key: string): string | undefined {
  const entry = (product.meta_data || []).find((item) => item?.key === key);
  return entry ? String(entry.value ?? '') : undefined;
}

function getBrand(product: WCProductLite): string {
  const backupBrandMeta = getMetaValue(product, '_megasur_fabricante') || getMetaValue(product, '_iv_unifier_brand');
  if (backupBrandMeta) return backupBrandMeta;
  const attr = (product.attributes || []).find((a) => /marca|brand/i.test(a?.name || ''));
  return attr?.options?.[0] || '';
}

async function fetchCandidatePage(page: number): Promise<WCProductLite[]> {
  const response = await api.get('/products', {
    params: {
      status: 'publish',
      per_page: 100,
      page,
      _fields: 'id,name,slug,description,meta_data,attributes',
    },
  });
  return Array.isArray(response.data) ? response.data : [];
}

async function fetchSpecificProducts(ids: Set<number>): Promise<WCProductLite[]> {
  const results = await Promise.all(
    Array.from(ids).map(async (id) => {
      try {
        const { data } = await api.get(`/products/${id}`, {
          params: { _fields: 'id,name,slug,description,meta_data,attributes' },
        });
        return data as WCProductLite;
      } catch {
        return null;
      }
    })
  );
  return results.filter((p): p is WCProductLite => Boolean(p));
}

async function main() {
  console.log(`\nModo: ${DRY_RUN ? 'DRY-RUN (no escribe nada)' : 'ESCRITURA REAL'} — límite: ${LIMIT}${ONLY_IDS ? ` — solo IDs: ${Array.from(ONLY_IDS).join(',')}` : ''}\n`);

  let candidates: WCProductLite[] = [];

  if (ONLY_IDS) {
    candidates = await fetchSpecificProducts(ONLY_IDS);
  } else {
    // Solo productos que aún no tienen backup — así el script es reanudable:
    // cada ejecución avanza sobre catálogo nuevo sin re-tocar lo ya hecho.
    let page = 1;
    while (candidates.length < LIMIT) {
      const batch = await fetchCandidatePage(page);
      if (batch.length === 0) break;
      const pending = batch.filter(
        (p) => p.description && p.description.trim().length > 0 && !getMetaValue(p, DESCRIPTION_RAW_BACKUP_META_KEY)
      );
      candidates.push(...pending);
      page++;
      if (page > 500) break; // salvaguarda
    }
    candidates = candidates.slice(0, LIMIT);
  }

  if (candidates.length === 0) {
    console.log('No hay productos candidatos (o todos ya tienen backup de descripción).');
    return;
  }

  console.log(`Candidatos a procesar: ${candidates.length}\n`);

  let processed = 0;
  let unchanged = 0;
  let errors = 0;

  for (const product of candidates) {
    // Si el producto ya tiene backup, es un re-proceso (p.ej. tras arreglar
    // un bug del propio limpiador): hay que partir del texto crudo original
    // guardado, NO del `description` actual — ese ya pasó por una versión
    // anterior del limpiador y puede haber perdido marcas estructurales
    // (como el <br> entre título y párrafo) que ya no se pueden recuperar
    // una vez colapsadas. Si no hay backup todavía, es la primera vez que
    // se procesa este producto: el `description` actual ES el crudo.
    const existingBackup = getMetaValue(product, DESCRIPTION_RAW_BACKUP_META_KEY);
    const alreadyHasBackup = Boolean(existingBackup);
    const rawDescription = alreadyHasBackup ? existingBackup! : (product.description || '');
    const brand = getBrand(product);
    let finalDescription: string;
    try {
      finalDescription = finalizeProductDescription(rawDescription, product.name, brand);
    } catch (error: any) {
      console.error(`[${product.id}] ERROR al limpiar descripción: ${error?.message || error}`);
      errors++;
      continue;
    }

    const plainBefore = (product.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const plainAfter = finalDescription.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    if (plainBefore === plainAfter) {
      unchanged++;
      console.log(`[${product.id}] ${product.name} — sin cambios de texto visibles, se omite escritura.`);
      continue;
    }

    console.log(`\n[${product.id}] ${product.name}  (marca: "${brand}")`);
    console.log(`  antes:   ${plainBefore.slice(0, 140)}${plainBefore.length > 140 ? '…' : ''}`);
    console.log(`  después: ${plainAfter.slice(0, 140)}${plainAfter.length > 140 ? '…' : ''}`);

    if (DRY_RUN) {
      processed++;
      continue;
    }

    try {
      const metaData = alreadyHasBackup
        ? []
        : [{ key: DESCRIPTION_RAW_BACKUP_META_KEY, value: rawDescription }];

      await api.put(`/products/${product.id}`, {
        description: finalDescription,
        ...(metaData.length > 0 ? { meta_data: metaData } : {}),
      });
      processed++;
      console.log(`  -> Actualizado (backup ${alreadyHasBackup ? 'ya existía' : 'guardado'}).`);
    } catch (error: any) {
      console.error(`  -> ERROR al escribir: ${error.response?.data?.message || error.message}`);
      errors++;
    }
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`Modo: ${DRY_RUN ? 'dry-run' : 'escritura real'}`);
  console.log(`Procesados (con cambios${DRY_RUN ? ', no escritos' : ' y escritos'}): ${processed}`);
  console.log(`Sin cambios de texto (omitidos): ${unchanged}`);
  console.log(`Errores: ${errors}`);
}

main().catch((error) => {
  console.error('No se pudo completar el backfill:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
