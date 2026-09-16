// Motor de precios de Inforvel (v2) — reemplaza a calculatePriceWithMargin.
//
// `calculateInforvelPrice` es una función PURA: mismo input -> mismo output,
// sin llamadas a red, WooCommerce ni al sistema de archivos. Toda la
// integración (parseo del feed, lectura/escritura en WooCommerce, flags de
// entorno) vive fuera de este fichero, en scripts/megasur-wc-sync.ts y en
// los scripts de prueba.
//
// Confirmado contra la tienda real antes de fijar PRICES_INCLUDE_VAT:
//   woocommerce_prices_include_tax = "yes"
//   tasa estándar ES = 21%
// Es decir, WooCommerce espera los precios YA con IVA incluido, así que el
// script SÍ debe añadir el IVA (una sola vez) antes de escribir regular_price.

export interface PricingConfig {
    /** Recargo que cobra el proveedor por pedido cuando el PVD queda por debajo de freeShippingThreshold. */
    shippingSurcharge: number;
    /** Umbral de PVD a partir del cual el proveedor no cobra el recargo de envío. */
    freeShippingThreshold: number;
    /** Tipo de IVA aplicable (0.21 = 21%). */
    vatRate: number;
    /** Si WooCommerce espera precios con IVA incluido. Ver nota arriba: en esta tienda es `true`. */
    pricesIncludeVat: boolean;
    /** Descuento aplicado sobre el precio regular ya calculado para construir sale_price en promos semanales. */
    weeklyPromoDiscountPercent: number;
    /** Se guarda en el meta _iv_pricing_version para poder identificar con qué versión del motor se calculó cada producto. */
    pricingVersion: string;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
    shippingSurcharge: 7,
    freeShippingThreshold: 100,
    vatRate: 0.21,
    pricesIncludeVat: true,
    weeklyPromoDiscountPercent: 5,
    pricingVersion: '2',
};

interface MarginBracket {
    maxPvd: number;
    marginPercent: number;
}

// PVD < maxPvd (el primer tramo que cumple gana). El último tramo usa
// Infinity para cubrir "PVD >= 1000" sin caso especial.
const MARGIN_BRACKETS: MarginBracket[] = [
    { maxPvd: 20, marginPercent: 45 },
    { maxPvd: 50, marginPercent: 35 },
    { maxPvd: 100, marginPercent: 28 },
    { maxPvd: 200, marginPercent: 22 },
    { maxPvd: 400, marginPercent: 18 },
    { maxPvd: 600, marginPercent: 15 },
    { maxPvd: 1000, marginPercent: 13 },
    { maxPvd: Infinity, marginPercent: 11 },
];

interface ProfitBracket {
    maxPvd: number;
    minimumProfit: number;
}

const MINIMUM_PROFIT_BRACKETS: ProfitBracket[] = [
    { maxPvd: 25, minimumProfit: 8 },
    { maxPvd: 50, minimumProfit: 10 },
    { maxPvd: 100, minimumProfit: 15 },
    { maxPvd: 200, minimumProfit: 25 },
    { maxPvd: 400, minimumProfit: 40 },
    { maxPvd: 700, minimumProfit: 60 },
    { maxPvd: 1000, minimumProfit: 75 },
    { maxPvd: Infinity, minimumProfit: 100 },
];

function round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function bracketFor<T extends { maxPvd: number }>(brackets: T[], pvd: number): T {
    return brackets.find((bracket) => pvd < bracket.maxPvd) ?? brackets[brackets.length - 1];
}

/**
 * Redondeo comercial. Nunca reduce el precio de entrada — siempre busca el
 * primer valor "bonito" hacia arriba.
 *
 * <100€: siguiente terminación en ,90 o ,99 (el que quede más cerca sin
 *   bajar del precio).
 * 100-500€: siguiente terminación en ,90 o el entero comercial siguiente,
 *   el que quede más cerca sin bajar del precio.
 * >=500€: escalera fija de precios psicológicos (599, 629, 649, 679, 699,
 *   729...), que se repite en bloques de 100 (X29/X49/X79/X99) indefinidamente.
 *
 * Nota sobre el ejemplo del enunciado 428,34 -> 429€: se usa la regla de
 * "candidato más cercano por encima" (igual que 134,62->134,90 y
 * 221,43->221,90), así que 428,34€ redondea a 428,90€, no a 429€. Confirmado
 * con el usuario — ver scripts/test-pricing.ts.
 */
export function roundToCommercialPrice(rawPrice: number): number {
    if (!Number.isFinite(rawPrice) || rawPrice <= 0) return 0;

    const EPS = 0.001;

    if (rawPrice < 100) {
        const base = Math.floor(rawPrice);
        const candidate90 = round2(base + 0.9);
        if (candidate90 >= rawPrice - EPS) return candidate90;
        const candidate99 = round2(base + 0.99);
        if (candidate99 >= rawPrice - EPS) return candidate99;
        return round2(base + 1.9);
    }

    if (rawPrice < 500) {
        const base = Math.floor(rawPrice);
        const candidate90 = round2(base + 0.9);
        if (candidate90 >= rawPrice - EPS) return candidate90;
        return base + 1;
    }

    // Escalera fija >=500: 599, luego bloques de 100 con offsets [29,49,79,99].
    if (rawPrice <= 599 + EPS) return 599;
    const hundredBase = Math.floor((rawPrice - 600) / 100) * 100 + 600;
    const offsets = [29, 49, 79, 99];
    for (const offset of offsets) {
        const candidate = hundredBase + offset;
        if (candidate >= rawPrice - EPS) return candidate;
    }
    return hundredBase + 100 + 29;
}

export interface PricingResult {
    pvd: number;
    canon: number;
    shippingCost: number;
    realCost: number;
    marginPercent: number;
    minimumProfit: number;
    priceByMargin: number;
    priceByMinimumProfit: number;
    /** true si se usó el beneficio mínimo absoluto en vez del margen porcentual. */
    usedMinimumProfit: boolean;
    basePriceExVat: number;
    vatAmount: number;
    rawFinalPrice: number;
    finalPrice: number;
    estimatedGrossProfit: number;
    /**
     * Precio mínimo rentable (con IVA, antes del redondeo comercial). Una
     * promoción nunca debe fijar sale_price por debajo de este valor.
     */
    minimumSafePrice: number;
    pricingVersion: string;
}

export type PricingCalculation =
    | ({ valid: true } & PricingResult)
    | { valid: false; reason: string; pvd: number | null };

/**
 * Calcula el PVP final de un producto a partir de su PVD (sin IVA) y canon.
 * No consulta el feed ni WooCommerce — recibe números ya parseados.
 */
export function calculateInforvelPrice(
    pvdInput: number | null | undefined,
    canonInput: number | null | undefined = 0,
    options: Partial<PricingConfig> = {}
): PricingCalculation {
    const config: PricingConfig = { ...DEFAULT_PRICING_CONFIG, ...options };

    const pvd = typeof pvdInput === 'number' && Number.isFinite(pvdInput) ? pvdInput : null;

    if (pvd === null) {
        return { valid: false, reason: 'PVD ausente o no numérico', pvd: null };
    }
    if (pvd <= 0) {
        return { valid: false, reason: `PVD inválido (${pvd}): debe ser mayor que 0`, pvd };
    }

    const canon =
        typeof canonInput === 'number' && Number.isFinite(canonInput) && canonInput > 0 ? canonInput : 0;

    const shippingCost = pvd < config.freeShippingThreshold ? config.shippingSurcharge : 0;
    const realCost = round2(pvd + canon + shippingCost);

    const marginPercent = bracketFor(MARGIN_BRACKETS, pvd).marginPercent;
    const minimumProfit = bracketFor(MINIMUM_PROFIT_BRACKETS, pvd).minimumProfit;

    const priceByMargin = round2(realCost * (1 + marginPercent / 100));
    const priceByMinimumProfit = round2(realCost + minimumProfit);
    const usedMinimumProfit = priceByMinimumProfit > priceByMargin;
    const basePriceExVat = Math.max(priceByMargin, priceByMinimumProfit);

    const vatAmount = config.pricesIncludeVat ? round2(basePriceExVat * config.vatRate) : 0;
    const rawFinalPrice = config.pricesIncludeVat ? round2(basePriceExVat + vatAmount) : basePriceExVat;

    const finalPrice = roundToCommercialPrice(rawFinalPrice);

    const finalPriceExVat = config.pricesIncludeVat ? finalPrice / (1 + config.vatRate) : finalPrice;
    const estimatedGrossProfit = round2(finalPriceExVat - realCost);

    return {
        valid: true,
        pvd,
        canon,
        shippingCost,
        realCost,
        marginPercent,
        minimumProfit,
        priceByMargin,
        priceByMinimumProfit,
        usedMinimumProfit,
        basePriceExVat,
        vatAmount,
        rawFinalPrice,
        finalPrice,
        estimatedGrossProfit,
        minimumSafePrice: rawFinalPrice,
        pricingVersion: config.pricingVersion,
    };
}

export interface WeeklyPromoResult {
    /** null solo si no hay colchón alguno entre regularPrice y minimumSafePrice (caso raro). */
    salePrice: number | null;
    blocked: boolean;
    /** Descuento realmente aplicado (puede ser menor que weeklyPromoDiscountPercent si el colchón no da para tanto). */
    discountPercentApplied: number;
    reason?: string;
}

/**
 * Calcula el sale_price de una promo semanal a partir del regular_price ya
 * calculado, usando como tope weeklyPromoDiscountPercent pero SIN bajar
 * nunca de minimumSafePrice. En vez de bloquear la promo entera cuando el
 * colchón de margen no llega al descuento deseado, aplica el máximo
 * descuento posible dentro de ese colchón (puede ser menor que el % pedido).
 * Solo se bloquea del todo si no queda colchón (regularPrice ya está en el
 * mínimo rentable, p.ej. el redondeo comercial no dejó margen extra).
 */
export function calculateWeeklyPromoPrice(
    regularPrice: number,
    minimumSafePrice: number,
    options: Partial<PricingConfig> = {}
): WeeklyPromoResult {
    const config: PricingConfig = { ...DEFAULT_PRICING_CONFIG, ...options };

    const maxAllowedDiscountAmount = round2(regularPrice - minimumSafePrice);
    if (maxAllowedDiscountAmount <= 0.01) {
        return {
            salePrice: null,
            blocked: true,
            discountPercentApplied: 0,
            reason: `Sin colchón de margen: regularPrice (${regularPrice}€) ya está en el mínimo rentable (${minimumSafePrice}€)`,
        };
    }

    const desiredDiscountAmount = round2(regularPrice * (config.weeklyPromoDiscountPercent / 100));
    const actualDiscountAmount = Math.min(desiredDiscountAmount, maxAllowedDiscountAmount);
    const rawSalePrice = round2(regularPrice - actualDiscountAmount);

    // Redondeo hacia abajo a la terminación ,90 más cercana: en una promo el
    // objetivo es un precio atractivo más bajo, no el redondeo "hacia arriba"
    // de roundToCommercialPrice (pensado para el precio regular). Nunca por
    // debajo del mínimo rentable.
    const base = Math.floor(rawSalePrice);
    const roundedDown = rawSalePrice - base >= 0.9 ? round2(base + 0.9) : round2(base - 1 + 0.9);
    const salePrice = roundedDown >= minimumSafePrice ? roundedDown : round2(rawSalePrice);

    return {
        salePrice,
        blocked: false,
        discountPercentApplied: round2(((regularPrice - salePrice) / regularPrice) * 100),
    };
}
