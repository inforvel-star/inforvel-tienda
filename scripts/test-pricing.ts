// Pruebas unitarias del motor de precios (lib/pricing.ts). No toca red ni
// WooCommerce — solo evalúa la función pura contra casos conocidos.
//
// Uso: npm run test:pricing

import { calculateInforvelPrice, roundToCommercialPrice, calculateWeeklyPromoPrice } from '../lib/pricing';

let passed = 0;
let failed = 0;

function approxEqual(a: number, b: number, tolerance = 0.01): boolean {
    return Math.abs(a - b) <= tolerance;
}

function check(label: string, condition: boolean, detail: string) {
    if (condition) {
        passed++;
        console.log(`  OK   ${label}`);
    } else {
        failed++;
        console.log(`  FAIL ${label} -- ${detail}`);
    }
}

function runCase(
    label: string,
    pvd: number,
    canon: number,
    expected: { realCost: number; marginPercent: number; basePriceExVat: number; finalPrice: number }
) {
    console.log(`\n${label} (PVD=${pvd}, canon=${canon})`);
    const result = calculateInforvelPrice(pvd, canon);
    if (!result.valid) {
        failed++;
        console.log(`  FAIL resultado inválido: ${result.reason}`);
        return;
    }

    check('coste real', approxEqual(result.realCost, expected.realCost), `esperado ${expected.realCost}, obtenido ${result.realCost}`);
    check('margen %', result.marginPercent === expected.marginPercent, `esperado ${expected.marginPercent}, obtenido ${result.marginPercent}`);
    check(
        'base sin IVA',
        approxEqual(result.basePriceExVat, expected.basePriceExVat),
        `esperado ${expected.basePriceExVat}, obtenido ${result.basePriceExVat}`
    );
    check(
        'precio comercial final',
        approxEqual(result.finalPrice, expected.finalPrice, 0.011),
        `esperado ${expected.finalPrice}, obtenido ${result.finalPrice}`
    );
    check('precio comercial >= precio bruto con IVA', result.finalPrice >= result.rawFinalPrice - 0.01, 'el redondeo bajó el precio');
    console.log(
        `  detalle: realCost=${result.realCost} margen=${result.marginPercent}% priceByMargin=${result.priceByMargin} priceByMinimumProfit=${result.priceByMinimumProfit} usedMinimumProfit=${result.usedMinimumProfit} rawFinalPrice=${result.rawFinalPrice} finalPrice=${result.finalPrice} beneficioEstimado=${result.estimatedGrossProfit}`
    );
}

console.log('=== Casos A-E del enunciado ===');

// Caso A: PVD=50, canon=0 -> coste 57, margen 28%, base 72.96, PVP comercial 88.90
runCase('Caso A', 50, 0, { realCost: 57, marginPercent: 28, basePriceExVat: 72.96, finalPrice: 88.9 });

// Caso B: PVD=300, canon=0 -> coste 300 (sin portes, PVD>=100), margen 18%, base 354, PVP comercial 429 o 428.90 (ver nota de roundToCommercialPrice)
runCase('Caso B', 300, 0, { realCost: 300, marginPercent: 18, basePriceExVat: 354, finalPrice: 428.9 });

// Caso C: PVD=489.81, canon=5.33 -> coste 495.14, margen 15%, base 569.41, PVP comercial 699
runCase('Caso C', 489.81, 5.33, { realCost: 495.14, marginPercent: 15, basePriceExVat: 569.41, finalPrice: 699 });

// Caso D: PVD=15, canon=0 -> coste 15+0+7=22, margen 45%, base 31.90, PVP comercial 38.90
runCase('Caso D', 15, 0, { realCost: 22, marginPercent: 45, basePriceExVat: 31.9, finalPrice: 38.9 });

// Caso E: PVD=100 -> no debe añadir portes (PVD >= 100)
console.log('\nCaso E (PVD=100, canon=0) -- no debe añadir portes');
{
    const result = calculateInforvelPrice(100, 0);
    if (result.valid) {
        check('sin portes en PVD=100', result.shippingCost === 0, `shippingCost=${result.shippingCost}, esperado 0`);
        check('coste real = PVD cuando no hay portes ni canon', result.realCost === 100, `realCost=${result.realCost}`);
    } else {
        failed++;
        console.log(`  FAIL resultado inválido: ${result.reason}`);
    }
}

console.log('\n=== Nota sobre el ejemplo 428,34€ -> 429€ del enunciado (tramo 100-500€) ===');
console.log(
    '  El enunciado da tres ejemplos en este tramo: 134,62->134,90 / 221,43->221,90 / 428,34->429.\n' +
    '  Los dos primeros encajan con "candidato más cercano por encima entre X,90 y el entero\n' +
    '  siguiente"; con esa misma regla, 428,34 debería redondear a 428,90 (más cerca que 429),\n' +
    '  no a 429. Implementado con la regla consistente (428,34 -> 428,90). Confirmar si se\n' +
    '  prefiere una regla distinta antes de integrar.'
);
{
    const r = roundToCommercialPrice(428.34);
    console.log(`  roundToCommercialPrice(428.34) = ${r}`);
}

console.log('\n=== Casos límite / validación defensiva ===');

check('PVD vacío/null -> inválido, no calcula precio', !calculateInforvelPrice(null).valid, 'debería ser inválido');
check('PVD undefined -> inválido', !calculateInforvelPrice(undefined).valid, 'debería ser inválido');
check('PVD = 0 -> inválido', !calculateInforvelPrice(0).valid, 'debería ser inválido');
check('PVD negativo -> inválido', !calculateInforvelPrice(-10).valid, 'debería ser inválido');
check('PVD = NaN -> inválido', !calculateInforvelPrice(NaN).valid, 'debería ser inválido');

{
    const withoutCanon = calculateInforvelPrice(50, undefined);
    check('canon ausente se trata como 0', withoutCanon.valid && withoutCanon.canon === 0, 'canon debería ser 0');
}
{
    const negativeCanon = calculateInforvelPrice(50, -5);
    check('canon negativo se ignora (trata como 0)', negativeCanon.valid && negativeCanon.canon === 0, 'canon negativo debería anularse a 0');
}

console.log('\n=== Fronteras exactas de los tramos de margen (PVD < límite, no <=) ===');
{
    const at20 = calculateInforvelPrice(20, 0);
    const justBelow20 = calculateInforvelPrice(19.99, 0);
    check('PVD=20 exacto entra en el tramo 20-49.99 (35%)', at20.valid && at20.marginPercent === 35, `obtenido ${at20.valid ? at20.marginPercent : 'inválido'}`);
    check('PVD=19.99 entra en el tramo <20 (45%)', justBelow20.valid && justBelow20.marginPercent === 45, `obtenido ${justBelow20.valid ? justBelow20.marginPercent : 'inválido'}`);
}
{
    const at1000 = calculateInforvelPrice(1000, 0);
    check('PVD=1000 exacto entra en el tramo >=1000 (11%)', at1000.valid && at1000.marginPercent === 11, `obtenido ${at1000.valid ? at1000.marginPercent : 'inválido'}`);
}

console.log('\n=== Idempotencia del redondeo comercial (aplicar dos veces no debe cambiar el resultado) ===');
for (const price of [38.9, 88.9, 134.9, 429, 599, 629, 699, 999, 1029]) {
    const once = roundToCommercialPrice(price);
    const twice = roundToCommercialPrice(once);
    check(`roundToCommercialPrice(${price}) es idempotente`, once === twice, `${once} !== ${twice}`);
}

console.log('\n=== Escalera >=500€ sigue el patrón indicado en el enunciado ===');
{
    const expectedLadder = [599, 629, 649, 679, 699, 729, 749, 779, 799, 829, 849, 879, 899, 929, 949, 979, 999];
    for (const expected of expectedLadder) {
        const rounded = roundToCommercialPrice(expected - 0.01);
        check(`el precio comercial justo por debajo de ${expected} redondea a ${expected}`, rounded === expected, `obtenido ${rounded}`);
    }
    // Continuación del patrón por encima de 1000
    check('patrón continúa por encima de 1000 (1029)', roundToCommercialPrice(1028.5) === 1029, `obtenido ${roundToCommercialPrice(1028.5)}`);
    check('patrón continúa por encima de 1000 (1099)', roundToCommercialPrice(1080) === 1099, `obtenido ${roundToCommercialPrice(1080)}`);
}

console.log('\n=== Promoción semanal: descuento variable según colchón disponible (decisión confirmada por el usuario) ===');
{
    // Con colchón amplio entre regularPrice y minimumSafePrice, se aplica el
    // 5% completo.
    const roomyPromo = calculateWeeklyPromoPrice(100, 50);
    check('con colchón amplio, se aplica el descuento completo pedido', !roomyPromo.blocked && approxEqual(roomyPromo.discountPercentApplied, 5, 0.5), `discountPercentApplied=${roomyPromo.discountPercentApplied}`);
    check('sale_price nunca por debajo del mínimo rentable', roomyPromo.salePrice === null || roomyPromo.salePrice >= 50 - 0.01, `salePrice=${roomyPromo.salePrice}`);

    // Con colchón insuficiente para el 5% completo, se aplica el máximo
    // posible (menor que el 5%) en vez de bloquear la promo entera.
    const tightPromo = calculateWeeklyPromoPrice(100, 97, { weeklyPromoDiscountPercent: 40 });
    check('con colchón insuficiente, no se bloquea del todo: aplica el máximo posible', !tightPromo.blocked, 'no debería bloquear, solo limitar el descuento');
    check('el descuento aplicado queda por debajo del pedido cuando el colchón no llega', tightPromo.discountPercentApplied < 40, `discountPercentApplied=${tightPromo.discountPercentApplied}`);
    check('sale_price respeta el mínimo rentable incluso con descuento agresivo pedido', tightPromo.salePrice === null || tightPromo.salePrice >= 97 - 0.01, `salePrice=${tightPromo.salePrice}`);

    // Solo se bloquea del todo cuando no hay colchón alguno.
    const noRoomPromo = calculateWeeklyPromoPrice(100, 100);
    check('sin colchón, la promo sí queda bloqueada del todo', noRoomPromo.blocked, 'debería bloquear cuando regularPrice == minimumSafePrice');
}

console.log('\n=== Con descuento variable, los productos de margen ajustado SÍ obtienen promo (más pequeña) en vez de quedar sin ninguna ===');
{
    // Caso A del enunciado (PVD=50): finalPrice=88.90, minimumSafePrice=88.28
    // -> colchón de solo un 0.7%. Con el bloqueo binario anterior esto no
    // admitía ninguna promo; con el descuento variable sí, aunque sea un
    // descuento pequeño (limitado al colchón real).
    const base = calculateInforvelPrice(50, 0);
    if (base.valid) {
        const promo = calculateWeeklyPromoPrice(base.finalPrice, base.minimumSafePrice);
        console.log(`  PVD=50 -> finalPrice=${base.finalPrice}, minimumSafePrice=${base.minimumSafePrice}, sale_price=${promo.salePrice}, descuento aplicado=${promo.discountPercentApplied}%`);
        check('producto de margen ajustado obtiene una promo (aunque pequeña) en vez de ninguna', !promo.blocked, 'no debería bloquearse del todo');
        check('el descuento aplicado es menor que el 5% pedido (colchón insuficiente para el 5% completo)', promo.discountPercentApplied < 5, `discountPercentApplied=${promo.discountPercentApplied}`);
    }
}

console.log('\n=== Resumen ===');
console.log(`Pasadas: ${passed}`);
console.log(`Fallidas: ${failed}`);
if (failed > 0) {
    process.exitCode = 1;
}
