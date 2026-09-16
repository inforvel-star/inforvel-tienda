import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { parseNullableNumber } from '../app/catalog';
import type { WCProduct } from '../lib/woocommerce';
import { finalizeProductDescription } from '../lib/productContent';
import { calculateInforvelPrice, calculateWeeklyPromoPrice, DEFAULT_PRICING_CONFIG, PricingConfig } from '../lib/pricing';
import fs from 'fs/promises';
import path from 'path';

/**
 * Estructura de un producto según el feed de MegaSur.
 * Puedes añadir más campos si los necesitas (ej: descripcion_larga).
 */
interface MegaSurProduct {
    key: string;
    referencia: string;
    partNumber: string;
    ean: string;
    nombre: string;
    fabricante: string;
    familia: string;
    subfamilia: string;
    stock: string;
    pvd: string; // Precio de compra sin IVA (formato español)
    pvp: string; // PVP orientativo del proveedor (formato español) -- NO se usa para calcular el precio salvo fallback explícito, ver MEGASUR_ALLOW_PVD_FALLBACK_TO_PVP
    canon: string; // Canon/LPI adicional del proveedor, si existe (formato español)
    imagenes: { url: string }[];
    descripcion_larga?: string;
}

interface WCCategory {
    id: number;
    name: string;
    slug: string;
    parent: number;
}

interface WeeklyBrandCampaign {
    brand: string;
}

// Configuración de la API de WooCommerce
const wooCommerceApi = new WooCommerceRestApi({
    url: process.env.NEXT_PUBLIC_WC_URL!,
    consumerKey: (process.env.WC_CONSUMER_KEY || process.env.WC_SERVER_CONSUMER_KEY)!,
    consumerSecret: (process.env.WC_CONSUMER_SECRET || process.env.WC_SERVER_CONSUMER_SECRET)!,
    version: 'wc/v3',
});

const MEGASUR_FEED_URL = process.env.MEGASUR_FEED_URL;
const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'megasur');
const CURRENT_FEED_PATH = path.join(STORAGE_DIR, 'current.json');
const PREVIOUS_FEED_PATH = path.join(STORAGE_DIR, 'previous.json');
const LOCK_PATH = path.join(STORAGE_DIR, 'sync.lock');

let lockAcquired = false;

const defaultWeeklyLaptopCampaigns: WeeklyBrandCampaign[] = [
    { brand: 'HP' },
    { brand: 'Lenovo' },
    { brand: 'MSI' },
    { brand: 'Apple' },
];

const defaultWeeklySmartphoneCampaigns: WeeklyBrandCampaign[] = [
    { brand: 'Samsung' },
    { brand: 'Xiaomi' },
    { brand: 'Apple' },
    { brand: 'Motorola' },
];

function getIsoWeekNumber(date: Date): number {
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNumber = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    return Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getActiveWeeklyBrands(date = new Date()): string[] {
    const week = getIsoWeekNumber(date);
    const laptopBrand = defaultWeeklyLaptopCampaigns[(week - 1) % defaultWeeklyLaptopCampaigns.length]?.brand ?? '';
    const smartphoneBrand = defaultWeeklySmartphoneCampaigns[(week - 1) % defaultWeeklySmartphoneCampaigns.length]?.brand ?? '';
    return [laptopBrand, smartphoneBrand].filter(Boolean);
}

function normalizeBrand(value: string): string {
    return String(value || '').trim().toLowerCase();
}

function isWeeklyBrandProduct(product: MegaSurProduct, activeBrands: string[]): boolean {
    const fabricante = normalizeBrand(product.fabricante);
    if (!fabricante) return false;
    return activeBrands.some((brand) => fabricante.includes(normalizeBrand(brand)));
}

async function acquireSyncLock() {
    try {
        const handle = await fs.open(LOCK_PATH, 'wx');
        await handle.close();
        lockAcquired = true;
    } catch {
        throw new Error('Ya hay una sincronización de MegaSur en ejecución (sync.lock presente).');
    }
}

async function releaseSyncLock() {
    if (!lockAcquired) return;
    try {
        await fs.unlink(LOCK_PATH);
    } catch {
        // no-op
    } finally {
        lockAcquired = false;
    }
}

function getRawField(raw: Record<string, any>, keys: string[]): any {
    for (const key of keys) {
        if (raw[key] !== undefined && raw[key] !== null && String(raw[key]).trim() !== '') {
            return raw[key];
        }
    }
    return undefined;
}

function normalizeRawMegaSurProduct(raw: Record<string, any>, index: number): MegaSurProduct {
    const referencia = String(getRawField(raw, ['referencia', 'Referencia', 'reference']) || '').trim();
    const key = String(getRawField(raw, ['key', 'id']) || referencia || `row-${index}`).trim();
    const imagenesRaw = getRawField(raw, ['imagenes', 'images']) || '';
    const imagenes = Array.isArray(imagenesRaw)
        ? imagenesRaw
            .map((img) => {
                if (typeof img === 'string') return img.trim();
                if (img && typeof img.url === 'string') return img.url.trim();
                if (img && typeof img.src === 'string') return img.src.trim();
                return '';
            })
            .filter(Boolean)
            .map((url) => ({ url }))
        : String(imagenesRaw)
            .split(',')
            .map((url) => url.trim())
            .filter(Boolean)
            .map((url) => ({ url }));

    return {
        key,
        referencia,
        partNumber: String(getRawField(raw, ['part_number', 'partNumber']) || '').trim(),
        ean: String(getRawField(raw, ['ean', 'EAN']) || '').trim(),
        nombre: String(getRawField(raw, ['nombre', 'name']) || '').trim(),
        fabricante: String(getRawField(raw, ['fabricante', 'brand']) || '').trim(),
        familia: String(getRawField(raw, ['familia']) || '').trim(),
        subfamilia: String(getRawField(raw, ['subfamilia']) || '').trim(),
        stock: String(getRawField(raw, ['stock']) || '').trim(),
        pvd: String(getRawField(raw, ['pvd', 'PVD']) || '').trim(),
        pvp: String(getRawField(raw, ['pvp', 'PVP']) || '').trim(),
        canon: String(getRawField(raw, ['canon', 'CANON', 'canon_lpi', 'canonDigital', 'importe_canon']) || '').trim(),
        imagenes,
        descripcion_larga: String(getRawField(raw, ['descripcion_larga', 'descripcion', 'description']) || '').trim(),
    };
}

function normalizeFeedProducts(json: unknown): MegaSurProduct[] {
    if (!Array.isArray(json)) {
        throw new Error('El feed no tiene formato de array de productos.');
    }

    const normalized = json
        .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
        .map((item, index) => normalizeRawMegaSurProduct(item as Record<string, any>, index));

    // Deduplicar por SKU dentro del propio feed.
    const bySku = new Map<string, MegaSurProduct>();
    for (const product of normalized) {
        const sku = String(product.referencia || product.key || '').trim();
        if (!sku) continue;
        if (!bySku.has(sku)) {
            bySku.set(sku, product);
            continue;
        }

        const existing = bySku.get(sku)!;
        const currentPrice = parseNullableNumber(product.pvp);
        const existingPrice = parseNullableNumber(existing.pvp);

        // Nos quedamos con el registro con precio válido o con más imágenes si ambos son válidos.
        const shouldReplace =
            (existingPrice === null && currentPrice !== null) ||
            (currentPrice !== null &&
                existingPrice !== null &&
                product.imagenes.length > existing.imagenes.length);

        if (shouldReplace) {
            bySku.set(sku, product);
        }
    }

    return Array.from(bySku.values());
}

function isValidRemoteImageUrl(value: string): boolean {
    const trimmed = String(value || '').trim();
    if (!trimmed) return false;

    try {
        const parsed = new URL(trimmed);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

const imageReachabilityCache = new Map<string, boolean>();

async function isReachableImageUrl(url: string): Promise<boolean> {
    const cached = imageReachabilityCache.get(url);
    if (cached !== undefined) {
        return cached;
    }

    const checkResult = async (method: 'HEAD' | 'GET') => {
        const response = await fetch(url, {
            method,
            signal: AbortSignal.timeout(8000),
            headers: method === 'GET' ? { Range: 'bytes=0-0' } : undefined,
        });
        if (!response.ok) return false;

        const contentType = response.headers.get('content-type') || '';
        if (contentType.toLowerCase().startsWith('image/')) return true;
        return /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?.*)?$/i.test(url);
    };

    let reachable = false;
    try {
        reachable = await checkResult('HEAD');
        if (!reachable) {
            reachable = await checkResult('GET');
        }
    } catch {
        reachable = false;
    }

    imageReachabilityCache.set(url, reachable);
    return reachable;
}

function isLikelyPlaceholderImageUrl(value: string): boolean {
    const src = String(value || '').trim().toLowerCase();
    if (!src) return true;

    return (
        src === '/placeholder.png' ||
        src.includes('woocommerce-placeholder') ||
        src.includes('/placeholder.') ||
        src.includes('/no-image') ||
        src.includes('/no_image') ||
        src.includes('/sin-imagen') ||
        src.includes('/sin_imagen')
    );
}

function hasValidCatalogImage(product: any): boolean {
    const src = String(product?.images?.[0]?.src || '').trim();
    if (!src) return false;
    if (isLikelyPlaceholderImageUrl(src)) return false;
    return true;
}

function isMegaSurProduct(product: any): boolean {
    const meta = Array.isArray(product?.meta_data) ? product.meta_data : [];
    return meta.some((item: any) => item?.key === '_megasur_product' && String(item?.value) === '1');
}

// Nombre de la meta_key donde se guarda la descripción tal como llegó del
// feed, ANTES de pasar por finalizeProductDescription. Solo se escribe la
// primera vez (si el producto ya tiene una, no se toca): el feed de MegaSur
// solo conserva 2 snapshots (current/previous) y dejamos de tocar un
// producto en cuanto sale del feed activo, así que este es el único sitio
// donde queda un rastro estable del texto original para poder revertir.
const DESCRIPTION_RAW_BACKUP_META_KEY = '_iv_description_raw_backup';

// --- Motor de precios v2 (lib/pricing.ts) ---------------------------------
//
// PRICING_DRY_RUN=1: calcula y muestra por consola el precio de cada
// producto (SKU, PVD, canon, portes, coste real, margen, beneficio mínimo,
// precio sin IVA, IVA, precio bruto, precio comercial, beneficio estimado,
// precio actual en WooCommerce) pero NUNCA hace PUT/POST de regular_price
// ni sale_price. El resto de campos (stock, descripción, imágenes) se
// siguen actualizando con normalidad. Por defecto ACTIVADO (hay que fijar
// PRICING_DRY_RUN=0 explícitamente para que el motor escriba precios).
const PRICING_DRY_RUN = process.env.PRICING_DRY_RUN !== '0';

// Por defecto el PVD es obligatorio: si falta o es inválido, el producto NO
// recibe precio calculado y se fuerza a borrador (ver requisito "no usar
// PVP como sustituto automático salvo config explícita"). Activar solo si
// se decide conscientemente que el PVP del proveedor es un sustituto
// aceptable cuando no hay PVD.
const ALLOW_PVD_FALLBACK_TO_PVP = process.env.MEGASUR_ALLOW_PVD_FALLBACK_TO_PVP === '1';

// Permite ajustar portes/IVA/descuento de promo sin tocar código, vía
// variables de entorno. Si no se definen, se usan los valores por defecto
// de lib/pricing.ts (DEFAULT_PRICING_CONFIG).
function buildPricingConfigOverrides(): Partial<PricingConfig> {
    const overrides: Partial<PricingConfig> = {};
    const envNumber = (key: string): number | undefined => {
        const raw = process.env[key];
        if (raw === undefined || raw.trim() === '') return undefined;
        const value = Number.parseFloat(raw); // formato estándar (punto decimal), NO usar parseNullableNumber aquí
        return Number.isFinite(value) ? value : undefined;
    };

    const shippingSurcharge = envNumber('MEGASUR_SHIPPING_SURCHARGE');
    if (shippingSurcharge !== undefined) overrides.shippingSurcharge = shippingSurcharge;

    const freeShippingThreshold = envNumber('MEGASUR_FREE_SHIPPING_THRESHOLD');
    if (freeShippingThreshold !== undefined) overrides.freeShippingThreshold = freeShippingThreshold;

    const vatRate = envNumber('MEGASUR_VAT_RATE');
    if (vatRate !== undefined) overrides.vatRate = vatRate;

    if (process.env.MEGASUR_PRICES_INCLUDE_VAT === '0') overrides.pricesIncludeVat = false;
    if (process.env.MEGASUR_PRICES_INCLUDE_VAT === '1') overrides.pricesIncludeVat = true;

    const weeklyPromoDiscountPercent = envNumber('MEGASUR_WEEKLY_PROMO_DISCOUNT_PERCENT');
    if (weeklyPromoDiscountPercent !== undefined) overrides.weeklyPromoDiscountPercent = weeklyPromoDiscountPercent;

    return overrides;
}

const PRICING_CONFIG_OVERRIDES = buildPricingConfigOverrides();

// Metas donde se guarda el desglose del cálculo (todas con prefijo "_" ->
// WooCommerce/WordPress las trata como protegidas: no se exponen en la API
// pública ni se muestran al cliente).
const MANUAL_PRICE_META_KEY = '_iv_manual_price';
const SUPPLIER_PVD_META_KEY = '_iv_supplier_pvd';
const SUPPLIER_CANON_META_KEY = '_iv_supplier_canon';
const SHIPPING_COST_META_KEY = '_iv_shipping_cost_estimated';
const REAL_COST_META_KEY = '_iv_real_cost';
const MARGIN_PERCENT_META_KEY = '_iv_margin_percent';
const MINIMUM_PROFIT_META_KEY = '_iv_minimum_profit';
const PRICE_BEFORE_ROUNDING_META_KEY = '_iv_price_before_rounding';
const GROSS_PROFIT_META_KEY = '_iv_estimated_gross_profit';
const PRICING_VERSION_META_KEY = '_iv_pricing_version';
// Reservado para una futura comparación con precios de mercado (Amazon,
// PcComponentes...). No se escribe todavía -- no implementado en esta
// versión a propósito (ver punto 12 del encargo: estabilizar primero el
// cálculo interno antes de bloquear por precio de mercado).
// const MARKET_PRICE_REFERENCE_META_KEY = '_iv_market_price_reference';

function getMetaValue(product: any, key: string): string | undefined {
    const meta = Array.isArray(product?.meta_data) ? product.meta_data : [];
    const entry = meta.find((item: any) => item?.key === key);
    return entry ? String(entry.value ?? '') : undefined;
}

async function enforceDraftForPublishedMegaSurWithoutImage(): Promise<number> {
    console.log('\n--- Auditoría: MegaSur publicados sin imagen válida ---');

    let page = 1;
    let totalPages = 1;
    let drafted = 0;

    do {
        const response = await wooCommerceApi.get('products', {
            status: 'publish',
            per_page: 100,
            page,
            orderby: 'id',
            order: 'desc',
        });

        const products = Array.isArray(response.data) ? response.data : [];
        totalPages = Number.parseInt(response.headers?.['x-wp-totalpages'] || '1', 10) || 1;

        for (const product of products) {
            if (!isMegaSurProduct(product)) continue;
            if (hasValidCatalogImage(product)) continue;

            try {
                await wooCommerceApi.put(`products/${product.id}`, { status: 'draft' });
                drafted++;
                console.log(`  -> Enviado a borrador por imagen ausente/placeholder: ${product.name} (ID ${product.id})`);
            } catch (error: any) {
                console.error(
                    `  -> ERROR al auditar producto ID ${product.id}:`,
                    error.response?.data?.message || error.message
                );
            }
        }

        page++;
    } while (page <= totalPages);

    console.log(`Total enviados a borrador en auditoría: ${drafted}`);
    return drafted;
}

/**
 * Ensures the storage directory for feeds exists.
 */
async function ensureStorageDir() {
    try {
        await fs.mkdir(STORAGE_DIR, { recursive: true });
    } catch (error) {
        console.error(`Error creating storage directory at ${STORAGE_DIR}:`, error);
        throw error;
    }
}

/**
 * Descarga el feed de MegaSur desde la URL y lo guarda localmente.
 * Devuelve los productos o null si el feed no es válido.
 */
async function downloadAndSaveFeed(): Promise<MegaSurProduct[] | null> {
    if (!MEGASUR_FEED_URL) {
        throw new Error('La variable de entorno MEGASUR_FEED_URL no está definida.');
    }

    console.log(`Descargando feed desde: ${MEGASUR_FEED_URL}`);
    const response = await fetch(MEGASUR_FEED_URL, { signal: AbortSignal.timeout(45000) });
    if (!response.ok) {
        throw new Error(`Error al descargar el feed: ${response.statusText} (${response.status})`);
    }

    const rawData = await response.text();

    // Comprueba si es un mensaje de "procesando" en lugar de la lista de productos
    if (rawData.includes('Actualmente estamos procesando su solicitud')) {
        console.log('MegaSur está procesando la solicitud. Se omite la sincronización esta vez.');
        return null;
    }

    try {
        await fs.writeFile(CURRENT_FEED_PATH, rawData);
        console.log(`Feed guardado correctamente en: ${CURRENT_FEED_PATH}`);
        const parsed = JSON.parse(rawData);
        return normalizeFeedProducts(parsed);
    } catch (error) {
        throw new Error(`El feed descargado no es un JSON válido o no se pudo guardar. Error: ${error}`);
    }
}

async function readCurrentFeedFromDisk(): Promise<MegaSurProduct[] | null> {
    try {
        const data = await fs.readFile(CURRENT_FEED_PATH, 'utf-8');
        return normalizeFeedProducts(JSON.parse(data));
    } catch {
        return null;
    }
}

/**
 * Lee el feed anterior desde el archivo de almacenamiento.
 */
async function readPreviousFeed(): Promise<MegaSurProduct[]> {
    try {
        const data = await fs.readFile(PREVIOUS_FEED_PATH, 'utf-8');
        return normalizeFeedProducts(JSON.parse(data));
    } catch (error) {
        console.log('No se encontró un feed anterior. Se tratarán todos los productos como nuevos.');
        return [];
    }
}

/**
 * Compara dos productos para ver si hay cambios relevantes.
 */
function areProductsDifferent(oldProduct: MegaSurProduct, newProduct: MegaSurProduct): boolean {
    // Compara los campos más importantes. Añade más si es necesario.
    return (
        oldProduct.pvp !== newProduct.pvp ||
        oldProduct.pvd !== newProduct.pvd ||
        oldProduct.stock !== newProduct.stock ||
        oldProduct.nombre !== newProduct.nombre ||
        oldProduct.ean !== newProduct.ean ||
        oldProduct.familia !== newProduct.familia ||
        oldProduct.subfamilia !== newProduct.subfamilia ||
        JSON.stringify(oldProduct.imagenes) !== JSON.stringify(newProduct.imagenes)
    );
}

/**
 * Busca un producto en WooCommerce por su SKU.
 */
async function findProductsBySku(sku: string): Promise<WCProduct[]> {
    const { data } = await wooCommerceApi.get('products', { sku: sku, per_page: 100, status: 'any' });
    return Array.isArray(data) ? data : [];
}

async function trashDuplicateProductsBySku(products: WCProduct[], skuLabel: string): Promise<number> {
    if (products.length <= 1) return 0;

    // Mantener el de menor ID para no romper enlaces ya indexados.
    const sorted = [...products].sort((a, b) => a.id - b.id);
    const duplicates = sorted.slice(1);
    let trashed = 0;

    for (const duplicate of duplicates) {
        try {
            await wooCommerceApi.delete(`products/${duplicate.id}`, { force: false });
            trashed++;
            console.log(`  -> Duplicado enviado a papelera (SKU ${skuLabel}): ID ${duplicate.id}`);
        } catch (error: any) {
            console.error(`  -> ERROR enviando duplicado a papelera (ID ${duplicate.id}):`, error.response?.data?.message || error.message);
        }
    }

    return trashed;
}

/**
 * Cache to store category IDs and avoid repeated API calls during a single sync.
 * The key is a string like "parentName-childName" or "root-parentName".
 * Stores the category ID or null if not found to cache misses.
 */
const categoryCache = new Map<string, number | null>();

const BROKEN_FAMILIES = new Set(['', 'familia', 'ordenadores y servidores']);
const BROKEN_SUBFAMILIES = new Set(['', 'subfamilia']);

interface CategoryInferenceRule {
    pattern: RegExp;
    parent: string;
    child?: string;
}

// Overrides restricted to unambiguous product types whose provider taxonomy is
// known to be incorrect. Keep these rules narrow: they take precedence over the
// familia/subfamilia supplied by MegaSur.
const CATEGORY_OVERRIDE_RULES: CategoryInferenceRule[] = [
    { pattern: /\balfombrilla\b|\bmouse\s*pad\b/, parent: 'Periféricos', child: 'Alfombrillas' },
    { pattern: /^(?:aire\s+acondicionado)\b/, parent: 'Control de clima', child: 'Aire acondicionado portátil' },
    { pattern: /^(?:altavoz|barra\s+de\s+sonido|amplificador)\b/, parent: 'Altavoces' },
    { pattern: /^(?:proyector|pantalla\s+chroma)\b/, parent: 'Proyección' },
    { pattern: /^(?:escaner|scanner)\b/, parent: 'Escáneres' },
    { pattern: /^(?:libro\s+electronico|ebook)\b/, parent: 'E-books' },
    { pattern: /^(?:tablet|tabler|lenovo\s+tab)\b/, parent: 'Tablets' },
    { pattern: /^(?:ventilador|mini\s+ventilador|termoventilador)\b/, parent: 'Pequeños electrodomésticos' },
    { pattern: /^(?:cable|kit\s+cable)\b.*\bseguridad\b.*\bportatil\b/, parent: 'Accesorios portátiles', child: 'Cable Antirrobo para portátiles' },
    { pattern: /^(?:base\s+(?:de\s+)?refrigeracion|base\s+refrigeradora|base\b.*\bportatil\b)/, parent: 'Accesorios portátiles', child: 'Bases' },
    { pattern: /^(?:bolsa|bolso|trolley|bandolera|organizador\s+de\s+viaje|estuche|carcasa)\b/, parent: 'Accesorios portátiles', child: 'Maletines para Portátiles' },
    { pattern: /^(?:dock|minidock|hub)\b/, parent: 'Adaptadores y Convertidores', child: 'Hub USB' },
    { pattern: /^extension\s+de\s+garantia\b/, parent: 'Garantía y Soporte', child: 'Extensiones de la Garantía' },
    { pattern: /^(?:localizador|rastreador)\b/, parent: 'Equipos de navegación', child: 'Rastreadores gps' },
    { pattern: /^reposapies\b|^yoevu\b.*\bmesa\b/, parent: 'Muebles de oficina' },
    { pattern: /^impresora\b/, parent: 'Impresoras' },
    { pattern: /^monitor\b/, parent: 'Periféricos', child: 'Monitores PC' },
    { pattern: /^switch\b/, parent: 'Switches y Transceptores', child: 'Switches' },
    { pattern: /^fuente(?:\s+de)?\s+alimentaci(?:o)?n\b/, parent: 'Cajas y fuentes', child: 'Fuentes de Alimentación' },
    { pattern: /^tarjeta\s+grafica\b/, parent: 'Tarjetas', child: 'Tarjetas Gráficas' },
    { pattern: /^auriculares?\b/, parent: 'Auriculares' },
    { pattern: /^(?:portatil|ordenador\s+portatil)\b/, parent: 'Portátiles' },
    { pattern: /^placa\s+base\b/, parent: 'Placas base' },
    { pattern: /^teclado\b/, parent: 'Periféricos', child: 'Teclados' },
    { pattern: /^(?:raton|mouse)\b/, parent: 'Periféricos', child: 'Ratones' },
    { pattern: /^memoria\s+ram\b/, parent: 'Memoria RAM' },
    { pattern: /^(?:caja\s+ordenador|chasis\s+pc)\b/, parent: 'Cajas y fuentes', child: 'Chasis PC' },
    { pattern: /^router\b/, parent: 'Routers y Modems' },
    { pattern: /^tablet\b/, parent: 'Tablets' },
    { pattern: /^(?:smartphone|movil)\b/, parent: 'Telefonía', child: 'Smartphones' },
];

const CATEGORY_INFERENCE_RULES: CategoryInferenceRule[] = [
    { pattern: /\bmultifuncion\b|\bmfp\b/, parent: 'Impresoras', child: 'Impresoras Multifunción' },
    { pattern: /\bimpresora\b.*\blaser\b|\blaser\b.*\bimpresora\b/, parent: 'Impresoras', child: 'Impresoras Láser/Led' },
    { pattern: /\bimpresora\b.*\binyeccion\b|\binyeccion\b.*\bimpresora\b|\bpixma\b|\bmaxify\b/, parent: 'Impresoras', child: 'Impresoras de Inyección' },
    { pattern: /\bimpresora\b|\bplotter\b|\bdesignjet\b/, parent: 'Impresoras' },
    { pattern: /\btoner\b|\bcartucho\b|\btinta\b/, parent: 'Consumibles' },
    { pattern: /\bservidor\b|\bnas\b/, parent: 'Servidores', child: 'Servidores NAS' },
    { pattern: /\brack\b/, parent: 'Servidores' },
    { pattern: /^(?:portatil|ordenador\s+portatil|laptop)\b|\b(?:notebook|chromebook|macbook|ultrabook|thinkpad|thinkbook|toughbook|elitebook|probook|latitude|lifebook|vivobook|zenbook|aspire|travelmate|ideapad|omnibook|lg\s+gram)\b/, parent: 'Portátiles' },
    { pattern: /\bteclado\b/, parent: 'Periféricos', child: 'Teclados' },
    { pattern: /\braton\b|\bmouse\b/, parent: 'Periféricos', child: 'Ratones' },
    { pattern: /\bmonitor\b/, parent: 'Periféricos', child: 'Monitores PC' },
    { pattern: /\bwebcam\b|\bcamara web\b/, parent: 'Periféricos', child: 'Cámaras Web' },
    { pattern: /\bauricular\b|\bheadset\b|\bearbud\b/, parent: 'Auriculares' },
    { pattern: /\bmicrofono\b/, parent: 'Micrófonos' },
    { pattern: /\baltavoz\b|\bspeaker\b/, parent: 'Altavoces' },
    { pattern: /\brouter\b|\bmodem\b/, parent: 'Routers y Modems' },
    { pattern: /\bswitch\b/, parent: 'Switches y Transceptores', child: 'Switches' },
    { pattern: /\bwifi\b|\bwi-fi\b|\brepetidor\b|\baccess point\b|\bpunto de acceso\b/, parent: 'Wifi' },
    { pattern: /\bcable\b|\bconector\b|\badaptador\b|\bhdmi\b|\bdisplayport\b|\brj45\b|\bethernet\b|\busb\b|\bvga\b/, parent: 'Cables y Conectores', child: 'Cables' },
    { pattern: /\bmemoria ram\b|\bram\b|\bddr[345]\b/, parent: 'Memoria RAM' },
    { pattern: /\bdisco duro externo\b|\bportable ssd\b/, parent: 'Discos Duros Externos' },
    { pattern: /\bssd\b|\bnvme\b|\bm\.2\b|\bhdd\b|\bdisco duro\b/, parent: 'Discos duros internos' },
    { pattern: /\bplaca base\b|\bmotherboard\b/, parent: 'Placas base' },
    { pattern: /\bprocesador\b|\bcpu\b|\bintel core\b|\bryzen\b/, parent: 'Procesadores' },
    { pattern: /\bfuente de alimentacion\b|\bpsu\b/, parent: 'Cajas y fuentes', child: 'Fuentes de Alimentación' },
    { pattern: /\bsmartphone\b|\biphone\b|\bgalaxy\b|\bxiaomi\b|\bredmi\b|\bpixel\b/, parent: 'Telefonía', child: 'Smartphones' },
    { pattern: /\btelefono fijo\b|\btelefono fijo\b/, parent: 'Telefonía', child: 'Teléfonos fijos' },
    { pattern: /\btablet\b|\bipad\b/, parent: 'Tablets' },
    { pattern: /\btpv\b|\bportamonedas\b|\bdat[aá]fono\b/, parent: 'TPV, Lectores e Impresoras' },
    { pattern: /\bscanner\b|\bescaner\b|\bescaner\b/, parent: 'Escáneres' },
    { pattern: /\bproyector\b|\bpantalla de proyeccion\b|\bvideoproyector\b/, parent: 'Proyección' },
    { pattern: /\bjuego ps[45]\b|\bplaystation\b|\bxbox\b|\bnintendo\b|\bconsola\b/, parent: 'Videojuegos, Consolas y Accesorios' },
    { pattern: /\bgaming\b/, parent: 'Gaming' },
    { pattern: /\bsai\b|\bups\b|\bsais\b/, parent: 'Electricidad', child: 'SAI (UPS)' },
    { pattern: /\bvigilancia\b|\bcctv\b|\bnvr\b|\bdvr\b/, parent: 'Seguridad', child: 'Cámaras de Vigilancia' },
    { pattern: /\bcamara\b/, parent: 'Fotografía' },
    { pattern: /\bventilador\b|\bfreidora\b|\bairfryer\b|\btostador\b|\bexprimidor\b|\bbatidora\b|\baspirador\b|\bcalientacamas\b|\bradiador\b|\bamasadora\b/, parent: 'Pequeños electrodomésticos' },
    { pattern: /\blavadora\b|\bfrigorifico\b|\bnevera\b|\blavavajillas\b|\bsecadora\b|\bcongelador\b/, parent: 'Electrodomésticos grandes' },
    { pattern: /\bcesped\b|\bjardin\b|\bterraza\b/, parent: 'Jardín y patio' },
    { pattern: /\bescritorio\b|\bcajonera\b|\bmesa\b|\bsilla\b|\btablero\b/, parent: 'Muebles de oficina' },
    { pattern: /\blampara\b|\biluminacion\b|\bluces\b|\bluz\b/, parent: 'Iluminación' },
    { pattern: /\btelevisor\b|\b tv\b/, parent: 'TV' },
    { pattern: /\ball in one\b|\baio\b/, parent: 'PCs Sobremesa' },
    { pattern: /\bordenador\b|\bpc\b|\bworkstation\b|\bsff\b|\bmini pc\b/, parent: 'PCs Sobremesa' },
];

function normalizeText(value: string | undefined | null): string {
    return (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function isBrokenCategoryValue(value: string | undefined | null, brokenSet: Set<string>): boolean {
    return brokenSet.has(normalizeText(value));
}

function getCategoryOverride(product: MegaSurProduct): { parent: string; child?: string } | null {
    const productName = normalizeText(product.nombre);
    const rule = CATEGORY_OVERRIDE_RULES.find((candidate) => candidate.pattern.test(productName));
    return rule ? { parent: rule.parent, child: rule.child } : null;
}

function inferCategoryNamesFromProduct(product: MegaSurProduct): { parent: string; child?: string } | null {
    const haystack = normalizeText(
        `${product.nombre || ''} ${product.fabricante || ''} ${product.descripcion_larga || ''}`,
    );

    for (const rule of CATEGORY_INFERENCE_RULES) {
        if (rule.pattern.test(haystack)) {
            return { parent: rule.parent, child: rule.child };
        }
    }

    return null;
}

/**
 * Finds an existing category by name and parent ID. It does NOT create categories.
 * Caches results (including misses) to minimize API calls.
 * @param name The name of the category to find.
 * @param parentId The ID of the parent category, if any.
 * @returns The ID of the found category, or null if it doesn't exist.
 */
async function findAndCacheCategory(name: string, parentId: number | null = null): Promise<number | null> {
    const cacheKey = `${parentId || 'root'}-${name.toLowerCase()}`;
    if (categoryCache.has(cacheKey)) {
        return categoryCache.get(cacheKey)!;
    }

    // Search for existing category
    const searchParams: { search: string; parent?: number; per_page: number } = { search: name, per_page: 100 };
    if (parentId) {
        searchParams.parent = parentId;
    }

    const { data: existing } = await wooCommerceApi.get('products/categories', searchParams);

    // The 'search' param can be broad, so we find an exact match from the results.
    const exactMatch = existing.find((cat: WCCategory) => cat.name.toLowerCase() === name.toLowerCase() && cat.parent === (parentId || 0));

    if (exactMatch) {
        categoryCache.set(cacheKey, exactMatch.id);
        return exactMatch.id;
    }

    // If no exact match is found, log it and cache the miss.
    console.log(`  -> AVISO: No se encontró la categoría '${name}'. El producto no se asignará a esta categoría (o se usará la categoría padre si existe).`);
    categoryCache.set(cacheKey, null);
    return null;
}

async function resolveCategoryIdForProduct(product: MegaSurProduct): Promise<number | null> {
    let parentCategoryName = (product.familia || '').trim();
    let childCategoryName = (product.subfamilia || '').trim();
    const categoryOverride = getCategoryOverride(product);

    if (categoryOverride) {
        parentCategoryName = categoryOverride.parent;
        childCategoryName = categoryOverride.child || '';
    }

    const isParentBroken = isBrokenCategoryValue(parentCategoryName, BROKEN_FAMILIES);
    const isChildBroken = isBrokenCategoryValue(childCategoryName, BROKEN_SUBFAMILIES);

    if (isParentBroken && !isChildBroken && childCategoryName) {
        // If provider sends a generic parent but a useful subfamily,
        // trust the subfamily instead of forcing text inference.
        parentCategoryName = childCategoryName;
        childCategoryName = '';
    } else if (isParentBroken) {
        const inferred = inferCategoryNamesFromProduct(product);
        if (inferred) {
            parentCategoryName = inferred.parent;
            // Keep a valid provider subfamily if it exists; only infer child when missing/broken.
            childCategoryName = (!isChildBroken && childCategoryName) ? childCategoryName : (inferred.child || '');
        }
    } else if (isChildBroken) {
        childCategoryName = '';
    }

    if (!parentCategoryName) return null;

    const parentCategoryId = await findAndCacheCategory(parentCategoryName);
    if (!parentCategoryId) return null;

    if (childCategoryName) {
        const childCategoryId = await findAndCacheCategory(childCategoryName, parentCategoryId);
        if (childCategoryId) {
            return childCategoryId;
        }
    }

    return parentCategoryId;
}

/**
 * Envía los resultados de la sincronización a la API de WordPress.
 */
async function reportToWordPress(summary: {
    created: number;
    updated: number;
    removed: number;
    skipped: number;
    errors: number;
}) {
    const endpoint = process.env.WP_SYNC_API_ENDPOINT;
    const token = process.env.MEGASUR_SYNC_TOKEN;

    if (!endpoint || !token) {
        console.log('\nAVISO: No se ha configurado el endpoint de WordPress (WP_SYNC_API_ENDPOINT) o el token (MEGASUR_SYNC_TOKEN). No se reportarán los resultados.');
        return;
    }

    try {
        await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(summary),
        });
        console.log('Resultados reportados a WordPress correctamente.');
    } catch (error: any) {
        console.error('Error al reportar los resultados a WordPress:', error.message);
    }
}

/**
 * Orquesta la sincronización diferencial.
 */
async function runDifferentialSync() {
    console.log('Iniciando la sincronización diferencial de MegaSur con WooCommerce...');
    await acquireSyncLock();
    try {
        const activeWeeklyBrands = getActiveWeeklyBrands();
        console.log(`Marcas activas de la week (ISO): ${activeWeeklyBrands.join(', ') || 'ninguna'}`);

        let megasurProducts: MegaSurProduct[] | null = null;
        try {
            megasurProducts = await downloadAndSaveFeed();
        } catch (error: any) {
            console.error('Error al descargar feed remoto. Se intentará usar el último feed local:', error.message || error);
            megasurProducts = await readCurrentFeedFromDisk();
        }

        if (!megasurProducts || megasurProducts.length === 0) {
            console.log('No hay feed utilizable (ni remoto ni local). Finalizando.');
            return;
        }

        const previousProducts = await readPreviousFeed();

        const newProductsMap = new Map(megasurProducts.map((p) => [String(p.referencia || p.key).trim(), p]));
        const oldProductsMap = new Map(previousProducts.map((p) => [String(p.referencia || p.key).trim(), p]));

        const toCreate: MegaSurProduct[] = [];
        const toUpdate: MegaSurProduct[] = [];
        const toSetOutOfStock: MegaSurProduct[] = [];
        const forceFullSync = process.env.MEGASUR_FORCE_FULL_SYNC === '1';

    // Identificar productos nuevos y actualizados
        for (const [sku, newProduct] of Array.from(newProductsMap.entries())) {
        if (!sku) continue;
        const oldProduct = oldProductsMap.get(sku);
        if (forceFullSync) {
            toUpdate.push(newProduct);
        } else if (!oldProduct) {
            toCreate.push(newProduct);
        } else if (areProductsDifferent(oldProduct, newProduct)) {
            toUpdate.push(newProduct);
        }
    }

    // Identificar productos eliminados
        for (const [sku, oldProduct] of Array.from(oldProductsMap.entries())) {
        if (!sku) continue;
        if (!newProductsMap.has(sku)) {
            toSetOutOfStock.push(oldProduct);
        }
    }

        console.log(`\nResumen de cambios detectados:`);
        console.log(`- ${toCreate.length} productos nuevos para crear.`);
        console.log(`- ${toUpdate.length} productos para actualizar.`);
        console.log(`- ${toSetOutOfStock.length} productos para marcar como sin stock.`);

        if (toCreate.length === 0 && toUpdate.length === 0 && toSetOutOfStock.length === 0) {
            console.log("\nNo se detectaron cambios. Sincronización finalizada.");
            return;
        }

        let created = 0, updated = 0, removed = 0, skipped = 0, errors = 0, deduped = 0, drafted = 0;

    // --- PROCESAR PRODUCTOS (CREAR Y ACTUALIZAR) ---
        const productsToProcess = [...toCreate, ...toUpdate];
        console.log('\n--- Procesando productos nuevos y actualizados ---');

        for (const product of productsToProcess) {
        try {
            const sku = String(product.referencia || product.key || '').trim();
            if (!sku) {
                console.warn(`- Omitido (sin SKU): ${product.nombre}`);
                skipped++;
                continue;
            }

            const candidateImageUrls = product.imagenes
                .map((img) => String(img?.url || '').trim())
                .filter(isValidRemoteImageUrl);
            const validImageUrls: string[] = [];
            for (const imageUrl of candidateImageUrls.slice(0, 4)) {
                if (await isReachableImageUrl(imageUrl)) {
                    validImageUrls.push(imageUrl);
                }
            }
            const hasValidImage = validImageUrls.length > 0;

            const stock = parseInt(product.stock, 10);

            // --- Gestión de Categorías (sin crear nuevas) ---
            const finalCategoryId = await resolveCategoryIdForProduct(product);
            // -------------------------------------------------

            // Se necesita ANTES de construir productData para saber si ya
            // existe un backup del texto crudo (y no pisarlo), si el precio
            // está protegido como manual, y para poder reutilizar
            // canonicalProduct más abajo sin volver a pedirlo.
            const existingProducts = await findProductsBySku(sku);
            const canonicalProduct = existingProducts.length > 0
                ? [...existingProducts].sort((a, b) => a.id - b.id)[0]
                : null;

            // --- Cálculo de precio (motor v2, lib/pricing.ts) ---
            const pvd = parseNullableNumber(product.pvd);
            const pvp = parseNullableNumber(product.pvp);
            const canon = parseNullableNumber(product.canon);
            const pvdForPricing =
                pvd !== null && pvd > 0
                    ? pvd
                    : ALLOW_PVD_FALLBACK_TO_PVP && pvp !== null && pvp > 0
                        ? pvp
                        : null;
            const pricing = calculateInforvelPrice(pvdForPricing, canon ?? 0, PRICING_CONFIG_OVERRIDES);
            const manualPriceLocked = Boolean(
                canonicalProduct && getMetaValue(canonicalProduct, MANUAL_PRICE_META_KEY) === '1'
            );
            // hasValidPrice cubre ambos casos en los que NO se debe forzar
            // borrador por precio: o bien el cálculo es válido, o bien el
            // precio está bajo control manual (un admin ya lo fijó a mano).
            const hasValidPrice = pricing.valid || manualPriceLocked;
            if (!pricing.valid && !manualPriceLocked) {
                console.warn(`  -> Sin precio calculable (SKU ${sku}): ${pricing.reason}`);
            }

            const shouldBeDraft = !hasValidPrice || !hasValidImage;
            const draftReasons: string[] = [];
            if (!hasValidPrice) draftReasons.push(`precio inválido: ${pricing.valid ? '' : pricing.reason}`);
            if (!hasValidImage) draftReasons.push('imagen ausente o inválida');

            // Limpieza de descripción detrás de un flag: por defecto se
            // mantiene el comportamiento actual (texto crudo del feed tal
            // cual) hasta que se decida activarla explícitamente.
            const rawDescription = product.descripcion_larga || '';
            const cleanDescriptionsEnabled = process.env.MEGASUR_CLEAN_DESCRIPTIONS === '1';
            const finalDescription = cleanDescriptionsEnabled
                ? finalizeProductDescription(rawDescription, product.nombre, product.fabricante)
                : rawDescription;
            const alreadyHasRawBackup = Boolean(
                canonicalProduct && getMetaValue(canonicalProduct, DESCRIPTION_RAW_BACKUP_META_KEY)
            );

            const productData: Record<string, any> = {
                name: product.nombre,
                sku: sku,
                type: 'simple',
                description: finalDescription,
                categories: finalCategoryId ? [{ id: finalCategoryId }] : [],
                manage_stock: true,
                stock_quantity: isNaN(stock) ? 0 : stock,
                images: validImageUrls.map((src) => ({ src })),
                meta_data: [
                    { key: '_megasur_part_number', value: product.partNumber },
                    { key: '_megasur_ean', value: product.ean },
                    { key: '_megasur_fabricante', value: product.fabricante },
                ],
            };
            if (cleanDescriptionsEnabled && rawDescription && !alreadyHasRawBackup) {
                productData.meta_data.push({ key: DESCRIPTION_RAW_BACKUP_META_KEY, value: rawDescription });
            }
            if (shouldBeDraft) {
                productData.status = 'draft';
            }

            // Asegura que el meta de "precio manual" exista y sea
            // descubrible/activable desde wp-admin (no lo pisa si ya existe).
            if (!canonicalProduct || getMetaValue(canonicalProduct, MANUAL_PRICE_META_KEY) === undefined) {
                productData.meta_data.push({ key: MANUAL_PRICE_META_KEY, value: '0' });
            }

            if (manualPriceLocked) {
                console.log(`  -> SKU ${sku}: precio protegido (_iv_manual_price=1), no se toca regular_price/sale_price.`);
            } else if (pricing.valid) {
                if (PRICING_DRY_RUN) {
                    const currentPrice = canonicalProduct ? String(canonicalProduct.regular_price ?? '') : '';
                    console.log(
                        `[PRICING_DRY_RUN] SKU=${sku} PVD=${pricing.pvd.toFixed(2)} canon=${pricing.canon.toFixed(2)} ` +
                        `portes=${pricing.shippingCost.toFixed(2)} costeReal=${pricing.realCost.toFixed(2)} margen=${pricing.marginPercent}% ` +
                        `benefMin=${pricing.minimumProfit.toFixed(2)} sinIVA=${pricing.basePriceExVat.toFixed(2)} IVA=${pricing.vatAmount.toFixed(2)} ` +
                        `bruto=${pricing.rawFinalPrice.toFixed(2)} comercial=${pricing.finalPrice.toFixed(2)} beneficioEst=${pricing.estimatedGrossProfit.toFixed(2)} ` +
                        `precioActualWC=${currentPrice || 'n/a'}`
                    );
                    // PRICING_DRY_RUN=1 (por defecto): nunca se hace PUT/POST de regular_price/sale_price.
                } else {
                    const isWeeklyPromo = isWeeklyBrandProduct(product, activeWeeklyBrands);
                    let salePrice = '';
                    let weeklyPromoDiscountApplied = 0;
                    if (isWeeklyPromo) {
                        const promo = calculateWeeklyPromoPrice(pricing.finalPrice, pricing.minimumSafePrice, PRICING_CONFIG_OVERRIDES);
                        if (!promo.blocked && promo.salePrice !== null) {
                            salePrice = promo.salePrice.toFixed(2);
                            weeklyPromoDiscountApplied = promo.discountPercentApplied;
                        }
                    }

                    productData.regular_price = pricing.finalPrice.toFixed(2);
                    productData.sale_price = salePrice;
                    productData.meta_data.push(
                        { key: SUPPLIER_PVD_META_KEY, value: pricing.pvd.toFixed(2) },
                        { key: SUPPLIER_CANON_META_KEY, value: pricing.canon.toFixed(2) },
                        { key: SHIPPING_COST_META_KEY, value: pricing.shippingCost.toFixed(2) },
                        { key: REAL_COST_META_KEY, value: pricing.realCost.toFixed(2) },
                        { key: MARGIN_PERCENT_META_KEY, value: String(pricing.marginPercent) },
                        { key: MINIMUM_PROFIT_META_KEY, value: pricing.minimumProfit.toFixed(2) },
                        { key: PRICE_BEFORE_ROUNDING_META_KEY, value: pricing.rawFinalPrice.toFixed(2) },
                        { key: GROSS_PROFIT_META_KEY, value: pricing.estimatedGrossProfit.toFixed(2) },
                        { key: PRICING_VERSION_META_KEY, value: pricing.pricingVersion },
                        { key: '_iv_weekly_promo_active', value: salePrice ? '1' : '0' },
                        { key: '_iv_weekly_promo_discount_percent', value: weeklyPromoDiscountApplied.toFixed(2) },
                    );
                }
            }

            if (existingProducts.length > 0 && canonicalProduct) {
                deduped += await trashDuplicateProductsBySku(existingProducts, sku);

                if (!productData.regular_price) {
                    // No se calculó (o no se escribe) precio nuevo esta vez:
                    // conservamos el precio actual para no romper catálogo.
                    delete productData.regular_price;
                }
                // Es una actualización
                await wooCommerceApi.put(`products/${canonicalProduct.id}`, productData);
                updated++;
                if (shouldBeDraft) {
                    drafted++;
                    console.log(`  -> Actualizado como borrador (${draftReasons.join(', ')}): ${product.nombre}`);
                } else {
                    console.log(`  -> Actualizado: ${product.nombre}`);
                }
            } else {
                // Es una creación
                await wooCommerceApi.post('products', productData);
                created++;
                if (shouldBeDraft) {
                    drafted++;
                    console.log(`  -> Creado como borrador (${draftReasons.join(', ')}): ${product.nombre}`);
                } else {
                    console.log(`  -> Creado: ${product.nombre}`);
                }
            }
        } catch (error: any) {
            console.error(`  -> ERROR al procesar ${product.nombre}:`, error.response?.data?.message || error.message);
            errors++;
        }
    }

    // --- PROCESAR PRODUCTOS ELIMINADOS (PONER SIN STOCK) ---
        if (toSetOutOfStock.length > 0) {
            console.log('\n--- Procesando productos eliminados (marcando sin stock) ---');
            for (const product of toSetOutOfStock) {
            try {
                const sku = String(product.referencia || product.key || '').trim();
                if (!sku) continue;

                const existingProducts = await findProductsBySku(sku);
                if (existingProducts.length > 0) {
                    deduped += await trashDuplicateProductsBySku(existingProducts, sku);
                    const canonicalProduct = [...existingProducts].sort((a, b) => a.id - b.id)[0];
                    if (canonicalProduct.stock_quantity !== 0) {
                        await wooCommerceApi.put(`products/${canonicalProduct.id}`, { stock_quantity: 0 });
                        removed++;
                        console.log(`  -> Marcado sin stock: ${product.nombre}`);
                    }
                }
            } catch (error: any) {
                console.error(`  -> ERROR al marcar sin stock ${product.nombre}:`, error.response?.data?.message || error.message);
                errors++;
            }
        }
    }

        // Auditoría final: corrige productos MegaSur antiguos que siguieron publicados sin imagen.
        const draftedByAudit = await enforceDraftForPublishedMegaSurWithoutImage();
        drafted += draftedByAudit;

    // Actualizar el archivo 'previous' para la próxima ejecución
        await fs.copyFile(CURRENT_FEED_PATH, PREVIOUS_FEED_PATH);
        console.log('\nFeed actual copiado a "previous" para la próxima sincronización.');

        console.log('\n--- Resumen de la Sincronización ---');
        console.log(`Productos nuevos creados: ${created}`);
        console.log(`Productos existentes actualizados: ${updated}`);
        console.log(`Productos marcados sin stock: ${removed}`);
        console.log(`Productos en borrador por datos incompletos: ${drafted}`);
        console.log(`Productos omitidos: ${skipped}`);
        console.log(`Duplicados consolidados (papelera): ${deduped}`);
        console.log(`Errores: ${errors}`);
        console.log('-------------------------------------\n');

    // Reportar a WordPress
        await reportToWordPress({
            created, updated, removed, skipped, errors
        });
    } finally {
        await releaseSyncLock();
    }
}

// Ejecutar la función
ensureStorageDir()
    .then(runDifferentialSync)
    .catch(err => {
        console.error('Ha ocurrido un error fatal durante la sincronización:', err);
        releaseSyncLock().catch(() => undefined);
        process.exit(1);
    });
