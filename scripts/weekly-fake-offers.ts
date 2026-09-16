import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

type WCMeta = {
  id?: number;
  key: string;
  value: string;
};

type WCProduct = {
  id: number;
  name: string;
  regular_price: string;
  sale_price: string;
  price: string;
  on_sale: boolean;
  status: string;
  meta_data?: WCMeta[];
};

const FAKE_META_KEYS = {
  active: '_iv_fake_offer_active',
  originalRegular: '_iv_fake_offer_original_regular',
  originalSale: '_iv_fake_offer_original_sale',
  originalPrice: '_iv_fake_offer_original_price',
  fakeRegular: '_iv_fake_offer_fake_regular',
  batchDate: '_iv_fake_offer_batch_date',
} as const;

function env(name: string, fallback = ''): string {
  return process.env[name] || fallback;
}

function asNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parsePrice(input: string | undefined): number {
  if (!input) return 0;
  const cleaned = input.replace(',', '.').replace(/[^\d.]/g, '');
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function toPrice(value: number): string {
  return value.toFixed(2);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function mapMeta(meta: WCMeta[] = []): Record<string, WCMeta> {
  const out: Record<string, WCMeta> = {};
  for (const item of meta) {
    out[item.key] = item;
  }
  return out;
}

function isRealProviderSale(product: WCProduct): boolean {
  const regular = parsePrice(product.regular_price);
  const sale = parsePrice(product.sale_price);
  return sale > 0 && regular > sale;
}

const wcUrl = env('WC_URL', env('NEXT_PUBLIC_WC_URL'));
const wcKey = env('WC_CONSUMER_KEY', env('WC_SERVER_CONSUMER_KEY'));
const wcSecret = env('WC_CONSUMER_SECRET', env('WC_SERVER_CONSUMER_SECRET'));

if (!wcUrl || !wcKey || !wcSecret) {
  throw new Error(
    'Faltan variables de entorno WooCommerce. Configura WC_URL/WC_CONSUMER_KEY/WC_CONSUMER_SECRET.'
  );
}

const api = new WooCommerceRestApi({
  url: wcUrl,
  consumerKey: wcKey,
  consumerSecret: wcSecret,
  version: 'wc/v3',
});

async function fetchAllPublishedProducts(): Promise<WCProduct[]> {
  const all: WCProduct[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await api.get('products', {
      status: 'publish',
      per_page: perPage,
      page,
      orderby: 'id',
      order: 'asc',
    });

    const products = response.data as WCProduct[];
    all.push(...products);

    if (products.length < perPage) {
      break;
    }
    page += 1;
  }

  return all;
}

function buildMetaUpdate(
  existingMetaMap: Record<string, WCMeta>,
  updates: Record<string, string>
): WCMeta[] {
  return Object.entries(updates).map(([key, value]) => {
    const existing = existingMetaMap[key];
    if (existing?.id) {
      return { id: existing.id, key, value };
    }
    return { key, value };
  });
}

async function updateProduct(productId: number, payload: Record<string, unknown>) {
  await api.put(`products/${productId}`, payload);
}

async function revertFakeOffers(products: WCProduct[], dryRun: boolean) {
  let reverted = 0;
  let clearedOnly = 0;

  for (const product of products) {
    const metaMap = mapMeta(product.meta_data);
    const isFakeActive = metaMap[FAKE_META_KEYS.active]?.value === '1';

    if (!isFakeActive) continue;

    const originalRegular = metaMap[FAKE_META_KEYS.originalRegular]?.value ?? '';
    const originalSale = metaMap[FAKE_META_KEYS.originalSale]?.value ?? '';
    const originalPrice = metaMap[FAKE_META_KEYS.originalPrice]?.value ?? '';
    const fakeRegular = metaMap[FAKE_META_KEYS.fakeRegular]?.value ?? '';

    const stillInExpectedFakeState =
      product.regular_price === fakeRegular &&
      product.sale_price === originalPrice;

    const metaReset = buildMetaUpdate(metaMap, {
      [FAKE_META_KEYS.active]: '0',
      [FAKE_META_KEYS.originalRegular]: '',
      [FAKE_META_KEYS.originalSale]: '',
      [FAKE_META_KEYS.originalPrice]: '',
      [FAKE_META_KEYS.fakeRegular]: '',
      [FAKE_META_KEYS.batchDate]: '',
    });

    if (!stillInExpectedFakeState) {
      if (!dryRun) {
        await updateProduct(product.id, { meta_data: metaReset });
      }
      clearedOnly += 1;
      continue;
    }

    if (!dryRun) {
      await updateProduct(product.id, {
        regular_price: originalRegular,
        sale_price: originalSale,
        meta_data: metaReset,
      });
    }
    reverted += 1;
  }

  return { reverted, clearedOnly };
}

async function applyWeeklyFakeOffers(products: WCProduct[], dryRun: boolean) {
  const minPct = asNumber(env('FAKE_OFFER_MIN_PERCENT', '10'), 10);
  const maxPct = asNumber(env('FAKE_OFFER_MAX_PERCENT', '25'), 25);
  const configuredCount = asNumber(env('FAKE_OFFER_COUNT', '24'), 24);
  const batchDate = new Date().toISOString().slice(0, 10);

  const eligible = products.filter((product) => {
    if (product.status !== 'publish') return false;
    if (isRealProviderSale(product)) return false;
    const current = parsePrice(product.price || product.regular_price);
    return current > 0;
  });

  if (eligible.length === 0) {
    return { applied: 0, selected: 0, skippedNoEligible: true };
  }

  const selectedCount = Math.max(1, Math.min(configuredCount, eligible.length));
  const selected = shuffle(eligible).slice(0, selectedCount);

  let applied = 0;

  for (const product of selected) {
    const currentPrice = parsePrice(product.price || product.regular_price);
    const pct = randomInt(minPct, maxPct);
    const fakeRegular = toPrice(currentPrice * (1 + pct / 100));
    const originalRegular = product.regular_price || toPrice(currentPrice);
    const originalSale = product.sale_price || '';

    const metaMap = mapMeta(product.meta_data);
    const metaUpdate = buildMetaUpdate(metaMap, {
      [FAKE_META_KEYS.active]: '1',
      [FAKE_META_KEYS.originalRegular]: originalRegular,
      [FAKE_META_KEYS.originalSale]: originalSale,
      [FAKE_META_KEYS.originalPrice]: toPrice(currentPrice),
      [FAKE_META_KEYS.fakeRegular]: fakeRegular,
      [FAKE_META_KEYS.batchDate]: batchDate,
    });

    if (!dryRun) {
      await updateProduct(product.id, {
        regular_price: fakeRegular,
        sale_price: toPrice(currentPrice),
        meta_data: metaUpdate,
      });
    }
    applied += 1;
  }

  return { applied, selected: selectedCount, skippedNoEligible: false };
}

function shouldApplyNewBatchToday(forceApply: boolean): boolean {
  if (forceApply) return true;
  const today = new Date();
  const day = today.getUTCDay(); // 1 = Monday
  return day === 1;
}

async function run() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  const forceApply = args.has('--force-apply');
  const revertOnly = args.has('--revert-only');

  console.log('=== Inforvel Fake Offers Weekly ===');
  console.log(`Modo dry-run: ${dryRun ? 'SI' : 'NO'}`);

  const products = await fetchAllPublishedProducts();
  console.log(`Productos publicados detectados: ${products.length}`);

  const revertResult = await revertFakeOffers(products, dryRun);
  console.log(`Ofertas simuladas revertidas: ${revertResult.reverted}`);
  console.log(`Registros fake limpiados (sin tocar precio): ${revertResult.clearedOnly}`);

  if (revertOnly) {
    console.log('Modo --revert-only completado.');
    return;
  }

  if (!shouldApplyNewBatchToday(forceApply)) {
    console.log('Hoy no es lunes (UTC). No se aplica nuevo lote semanal.');
    console.log('Usa --force-apply si quieres aplicarlo manualmente hoy.');
    return;
  }

  const applyResult = await applyWeeklyFakeOffers(products, dryRun);
  if (applyResult.skippedNoEligible) {
    console.log('No hay productos elegibles para ofertas simuladas.');
    return;
  }

  console.log(`Productos seleccionados para oferta simulada: ${applyResult.selected}`);
  console.log(`Productos con oferta simulada aplicada: ${applyResult.applied}`);
}

run().catch((error) => {
  console.error('Error en la ejecución semanal de ofertas simuladas:', error?.message || error);
  process.exit(1);
});
