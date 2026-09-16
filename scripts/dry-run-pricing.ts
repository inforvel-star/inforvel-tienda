// Dry-run del nuevo motor de precios (lib/pricing.ts) contra productos
// REALES del feed de MegaSur y su precio actual en WooCommerce.
//
// Solo hace peticiones GET a WooCommerce -- nunca escribe nada. Es seguro
// ejecutarlo contra producción/staging en cualquier momento.
//
// Uso:
//   npm run dryrun:pricing                  # muestra de ~24 productos diversos
//   npm run dryrun:pricing -- --skus=MGS...,MGS...   # SKUs concretos primero
//
// Fuente de datos: storage/megasur/current.json (última copia del feed
// guardada en disco por megasur-wc-sync.ts). AVISO: esa copia es de una
// fecha concreta (ver "mtime" que imprime el script) -- el PVD puede haber
// cambiado desde entonces en el proveedor real. Esto no afecta a la
// VALIDEZ de la lógica de cálculo (que es lo que se está probando aquí),
// pero sí puede hacer que el "% de diferencia" frente al precio actual de
// WooCommerce mezcle dos efectos: el cambio de fórmula Y el posible cambio
// de PVD desde la última sincronización real.

import axios from 'axios';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parseNullableNumber } from '../app/catalog';
import { calculateInforvelPrice, calculateWeeklyPromoPrice, PricingResult } from '../lib/pricing';

function loadEnvFile(filePath: string) {
    if (!existsSync(filePath)) return;
    for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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

const FEED_PATH = path.join(process.cwd(), 'storage', 'megasur', 'current.json');

interface FeedProduct {
    referencia: string;
    nombre: string;
    familia: string;
    fabricante: string;
    PVD: string;
    CANON: string;
    outlet?: string | number;
}

function requestedSkus(): string[] | null {
    const arg = process.argv.find((a) => a.startsWith('--skus='));
    if (!arg) return null;
    return arg
        .slice('--skus='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function pickDiverseSample(products: FeedProduct[], size: number): FeedProduct[] {
    // Agrupar por tramo de PVD para asegurar cobertura de los 8 tramos de
    // margen, y dentro de cada tramo alternar familias para no repetir
    // categoría. Prioriza productos con canon > 0 para probar ese camino.
    const brackets: { max: number; label: string }[] = [
        { max: 20, label: '<20' },
        { max: 50, label: '20-49.99' },
        { max: 100, label: '50-99.99' },
        { max: 200, label: '100-199.99' },
        { max: 400, label: '200-399.99' },
        { max: 600, label: '400-599.99' },
        { max: 1000, label: '600-999.99' },
        { max: Infinity, label: '>=1000' },
    ];

    const byBracket = new Map<string, FeedProduct[]>();
    for (const bracket of brackets) byBracket.set(bracket.label, []);

    for (const product of products) {
        const pvd = parseNullableNumber(product.PVD);
        if (pvd === null || pvd <= 0) continue;
        const bracket = brackets.find((b) => pvd < b.max)!;
        byBracket.get(bracket.label)!.push(product);
    }

    const sample: FeedProduct[] = [];
    const seenFamilias = new Set<string>();
    const perBracket = Math.max(2, Math.ceil(size / brackets.length));

    // Primera pasada: 1 producto con canon>0 por tramo si existe, priorizando familia nueva.
    for (const bracket of brackets) {
        const pool = byBracket.get(bracket.label)!;
        const withCanon = pool.find((p) => {
            const canon = parseNullableNumber(p.CANON);
            return canon !== null && canon > 0 && !seenFamilias.has(p.familia);
        });
        if (withCanon) {
            sample.push(withCanon);
            seenFamilias.add(withCanon.familia);
        }
    }

    // Segunda pasada: rellenar cada tramo con productos de familia distinta a las ya elegidas.
    for (const bracket of brackets) {
        const pool = byBracket.get(bracket.label)!;
        let added = sample.filter((p) => {
            const pvd = parseNullableNumber(p.PVD)!;
            return pvd < bracket.max && pvd >= (brackets[brackets.indexOf(bracket) - 1]?.max ?? 0);
        }).length;

        for (const product of pool) {
            if (added >= perBracket || sample.length >= size) break;
            if (sample.includes(product)) continue;
            if (seenFamilias.has(product.familia) && added > 0) continue;
            sample.push(product);
            seenFamilias.add(product.familia);
            added++;
        }
    }

    // Tercera pasada: si aún faltan, rellenar sin filtro de familia.
    for (const bracket of brackets) {
        if (sample.length >= size) break;
        const pool = byBracket.get(bracket.label)!;
        for (const product of pool) {
            if (sample.length >= size) break;
            if (!sample.includes(product)) sample.push(product);
        }
    }

    return sample.slice(0, size);
}

async function fetchCurrentWcPrice(sku: string): Promise<{ regularPrice: number | null; status: string } | null> {
    try {
        const { data } = await api.get('products', { params: { sku, per_page: 5, status: 'any' } });
        if (!Array.isArray(data) || data.length === 0) return null;
        const product = data[0];
        // OJO: regular_price de la API de WooCommerce ya viene en formato
        // estándar (punto decimal, sin separador de miles) -- NO usar
        // parseNullableNumber aquí, que asume el formato español del feed
        // de MegaSur (coma decimal) y trataría "33.50" como 3350.
        const rawValue = String(product.regular_price ?? '').trim();
        const regularPrice = rawValue === '' ? null : Number.parseFloat(rawValue);
        return { regularPrice: regularPrice !== null && Number.isFinite(regularPrice) ? regularPrice : null, status: product.status };
    } catch (error: any) {
        console.error(`  ! Error consultando SKU ${sku} en WooCommerce:`, error.response?.status, error.response?.data?.message || error.message);
        return null;
    }
}

function eur(n: number | null | undefined): string {
    if (n === null || n === undefined || Number.isNaN(n)) return '--';
    return n.toFixed(2) + '€';
}

async function main() {
    if (!existsSync(FEED_PATH)) {
        throw new Error(`No existe el feed cacheado en ${FEED_PATH}. Ejecuta antes una sincronización de MegaSur.`);
    }

    const mtime = statSync(FEED_PATH).mtime;
    console.log(`Feed cacheado: ${FEED_PATH}`);
    console.log(`Última modificación: ${mtime.toISOString()} (AVISO: puede no reflejar el PVD más reciente del proveedor)\n`);

    const raw = JSON.parse(readFileSync(FEED_PATH, 'utf8')) as FeedProduct[];
    const products = raw.filter((p) => p && p.referencia && p.referencia !== 'referencia');

    const requested = requestedSkus();
    let sample: FeedProduct[];
    if (requested) {
        sample = requested
            .map((sku) => products.find((p) => p.referencia === sku))
            .filter((p): p is FeedProduct => Boolean(p));
        const missing = requested.filter((sku) => !products.find((p) => p.referencia === sku));
        if (missing.length) console.log(`AVISO: no encontrados en el feed cacheado: ${missing.join(', ')}\n`);
    } else {
        sample = pickDiverseSample(products, 24);
    }

    console.log(`Productos en la muestra: ${sample.length}\n`);
    console.log('='.repeat(160));

    type Row = {
        sku: string;
        nombre: string;
        pvd: number;
        canon: number;
        result: PricingResult;
        currentPrice: number | null;
        currentStatus: string | null;
        diffPercent: number | null;
    };

    const rows: Row[] = [];

    for (const product of sample) {
        const pvd = parseNullableNumber(product.PVD);
        const canon = parseNullableNumber(product.CANON);
        const calculation = calculateInforvelPrice(pvd, canon ?? 0);

        if (!calculation.valid) {
            console.log(`SKU ${product.referencia} (${product.nombre.slice(0, 60)}) -- OMITIDO: ${calculation.reason}`);
            continue;
        }

        const wc = await fetchCurrentWcPrice(product.referencia);
        const diffPercent =
            wc?.regularPrice && wc.regularPrice > 0
                ? Number((((calculation.finalPrice - wc.regularPrice) / wc.regularPrice) * 100).toFixed(1))
                : null;

        rows.push({
            sku: product.referencia,
            nombre: product.nombre,
            pvd: calculation.pvd,
            canon: calculation.canon,
            result: calculation,
            currentPrice: wc?.regularPrice ?? null,
            currentStatus: wc?.status ?? null,
            diffPercent,
        });
    }

    console.log('SKU'.padEnd(16), 'PVD'.padStart(9), 'canon'.padStart(7), 'portes'.padStart(7), 'coste real'.padStart(11), 'margen'.padStart(7), 'benef.min'.padStart(10), 'sin IVA'.padStart(9), 'IVA'.padStart(8), 'bruto c/IVA'.padStart(12), 'PVP comercial'.padStart(14), 'benef. est.'.padStart(11), 'PVP actual WC'.padStart(14), 'dif %'.padStart(8), 'nombre');
    console.log('-'.repeat(220));

    for (const row of rows) {
        const r = row.result;
        console.log(
            row.sku.padEnd(16),
            eur(r.pvd).padStart(9),
            eur(r.canon).padStart(7),
            eur(r.shippingCost).padStart(7),
            eur(r.realCost).padStart(11),
            `${r.marginPercent}%`.padStart(7),
            eur(r.minimumProfit).padStart(10),
            eur(r.basePriceExVat).padStart(9),
            eur(r.vatAmount).padStart(8),
            eur(r.rawFinalPrice).padStart(12),
            eur(r.finalPrice).padStart(14),
            eur(r.estimatedGrossProfit).padStart(11),
            (row.currentPrice !== null ? eur(row.currentPrice) : `(sin publicar${row.currentStatus ? '' : '/no encontrado'})`).padStart(14),
            (row.diffPercent !== null ? `${row.diffPercent > 0 ? '+' : ''}${row.diffPercent}%` : '--').padStart(8),
            row.nombre.slice(0, 70)
        );
    }

    console.log('\n' + '='.repeat(160));
    console.log('\n--- Productos cuyo precio sube más de un 15% frente al actual en WooCommerce ---');
    const bigIncreases = rows.filter((r) => r.diffPercent !== null && r.diffPercent > 15);
    if (bigIncreases.length === 0) console.log('  (ninguno en esta muestra)');
    for (const r of bigIncreases) {
        console.log(`  ${r.sku}  ${eur(r.currentPrice)} -> ${eur(r.result.finalPrice)}  (${r.diffPercent! > 0 ? '+' : ''}${r.diffPercent}%)  ${r.nombre.slice(0, 60)}`);
    }

    console.log('\n--- Productos cuyo precio BAJA frente al actual en WooCommerce ---');
    const decreases = rows.filter((r) => r.diffPercent !== null && r.diffPercent < 0);
    if (decreases.length === 0) console.log('  (ninguno en esta muestra)');
    for (const r of decreases) {
        console.log(`  ${r.sku}  ${eur(r.currentPrice)} -> ${eur(r.result.finalPrice)}  (${r.diffPercent}%)  ${r.nombre.slice(0, 60)}`);
    }

    console.log('\n--- Productos donde se aplicó el beneficio mínimo absoluto en vez del margen porcentual ---');
    const minimumProfitUsed = rows.filter((r) => r.result.usedMinimumProfit);
    if (minimumProfitUsed.length === 0) console.log('  (ninguno en esta muestra)');
    for (const r of minimumProfitUsed) {
        console.log(
            `  ${r.sku}  PVD=${eur(r.pvd)}  precio por margen=${eur(r.result.priceByMargin)}  precio por mínimo=${eur(r.result.priceByMinimumProfit)}  ${r.nombre.slice(0, 55)}`
        );
    }

    console.log('\n--- Simulación de promoción semanal (tope WEEKLY_PROMO_DISCOUNT_PERCENT=5, descuento variable según colchón) sobre esta muestra ---');
    let blockedCount = 0;
    let fullDiscountCount = 0;
    let partialDiscountCount = 0;
    for (const r of rows) {
        const promo = calculateWeeklyPromoPrice(r.result.finalPrice, r.result.minimumSafePrice);
        if (promo.blocked) {
            blockedCount++;
        } else if (promo.discountPercentApplied >= 4.9) {
            fullDiscountCount++;
        } else {
            partialDiscountCount++;
        }
    }
    console.log(`  ${fullDiscountCount} de ${rows.length} admiten el 5% completo, ${partialDiscountCount} admiten un descuento parcial (colchón limitado), ${blockedCount} sin colchón alguno (bloqueados del todo).`);

    console.log('\n--- Resumen ---');
    console.log(`Total procesados: ${rows.length}`);
    console.log(`Suben >15%: ${bigIncreases.length}`);
    console.log(`Bajan: ${decreases.length}`);
    console.log(`Usan beneficio mínimo: ${minimumProfitUsed.length}`);
    console.log(`Sin precio actual en WooCommerce (no publicado o SKU no encontrado): ${rows.filter((r) => r.currentPrice === null).length}`);
}

main().catch((error) => {
    console.error('Error fatal en el dry-run:', error);
    process.exitCode = 1;
});
