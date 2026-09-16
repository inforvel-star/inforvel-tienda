const { getIsoWeekNumber } = require('../utils/date');
const { normalizeText } = require('../utils/text');

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getActiveWeekBrand(rotationConfig, date = new Date()) {
  const rotation = Array.isArray(rotationConfig?.rotation) ? rotationConfig.rotation : [];
  if (rotation.length === 0) return '';
  const week = getIsoWeekNumber(date);
  return String(rotation[(week - 1) % rotation.length] || '').trim();
}

function applyPricing(product, pricingConfig, rotationConfig, runDate = new Date()) {
  const activeWeekBrand = getActiveWeekBrand(rotationConfig, runDate);
  const productBrand = normalizeText(product.brand);
  const isWeeklyBrand = activeWeekBrand && productBrand.includes(normalizeText(activeWeekBrand));

  const marginPercent = isWeeklyBrand
    ? Number(pricingConfig.weeklyMarginPercent)
    : Number(pricingConfig.defaultMarginPercent);

  const shippingFee = Number(pricingConfig.shippingFeeEur || 0);
  const baseCost =
    (typeof product.cost === 'number' && Number.isFinite(product.cost) && product.cost > 0)
      ? product.cost
      : (typeof product.supplierPrice === 'number' && Number.isFinite(product.supplierPrice)
        ? product.supplierPrice
        : 0);

  const finalPrice = baseCost > 0
    ? round2(baseCost * (1 + marginPercent / 100) + shippingFee)
    : 0;

  return {
    baseCost,
    marginPercent,
    shippingFee,
    finalPrice,
    isWeeklyBrand: Boolean(isWeeklyBrand),
    activeWeekBrand,
  };
}

module.exports = {
  applyPricing,
  getActiveWeekBrand,
};
