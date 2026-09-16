import crypto from 'crypto';

const WC_URL = process.env.NEXT_PUBLIC_WC_URL;
const WC_KEY = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;
const WC_AUTH = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

export interface CheckoutLineItemInput {
  product_id: number;
  quantity: number;
}

export interface CheckoutTotals {
  subtotal: number;
  discount: number;
  total: number;
  amountInCents: number;
  normalizedItems: CheckoutLineItemInput[];
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeLineItems(rawLineItems: any): CheckoutLineItemInput[] {
  if (!Array.isArray(rawLineItems)) return [];

  return rawLineItems
    .map((item) => ({
      product_id: Number(item?.product_id),
      quantity: Number(item?.quantity),
    }))
    .filter(
      (item) =>
        Number.isInteger(item.product_id) &&
        item.product_id > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= 99
    );
}

async function fetchProductPrice(productId: number): Promise<number> {
  if (!WC_URL) {
    throw new Error('WC URL no configurada');
  }

  const res = await fetch(`${WC_URL}/wp-json/wc/v3/products/${productId}`, {
    headers: { Authorization: WC_AUTH },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`No se pudo cargar el producto ${productId}`);
  }

  const product = await res.json();
  if (product?.status !== 'publish') {
    throw new Error(`Producto ${productId} no disponible`);
  }

  const price = Number.parseFloat(String(product?.price ?? ''));
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Precio inválido para producto ${productId}`);
  }

  return price;
}

async function resolveCouponDiscount(couponCode: string, subtotal: number, totalQty: number): Promise<number> {
  if (!couponCode || !WC_URL) return 0;

  const res = await fetch(
    `${WC_URL}/wp-json/wc/v3/coupons?code=${encodeURIComponent(couponCode)}&per_page=1`,
    { headers: { Authorization: WC_AUTH }, cache: 'no-store' }
  );

  if (!res.ok) return 0;
  const coupons = await res.json();
  const coupon = Array.isArray(coupons) ? coupons[0] : null;
  if (!coupon) return 0;

  // Ignore expired coupons.
  if (coupon.date_expires && new Date(coupon.date_expires).getTime() < Date.now()) {
    return 0;
  }

  const amount = Number.parseFloat(String(coupon.amount ?? '0'));
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  let discount = 0;
  switch (coupon.discount_type) {
    case 'percent':
      discount = subtotal * (amount / 100);
      break;
    case 'fixed_product':
      discount = amount * totalQty;
      break;
    case 'fixed_cart':
    default:
      discount = amount;
      break;
  }

  return Math.max(0, Math.min(roundCurrency(discount), subtotal));
}

export async function calculateCheckoutTotals(
  lineItemsRaw: any,
  couponCode?: string | null
): Promise<CheckoutTotals> {
  const normalizedItems = normalizeLineItems(lineItemsRaw);
  if (normalizedItems.length === 0) {
    throw new Error('No hay productos válidos en el carrito');
  }

  const prices = await Promise.all(normalizedItems.map((item) => fetchProductPrice(item.product_id)));
  const subtotal = roundCurrency(
    normalizedItems.reduce((acc, item, index) => acc + prices[index] * item.quantity, 0)
  );
  const totalQty = normalizedItems.reduce((acc, item) => acc + item.quantity, 0);
  const discount = await resolveCouponDiscount(String(couponCode || '').trim(), subtotal, totalQty);
  const total = roundCurrency(Math.max(0, subtotal - discount));
  const amountInCents = Math.round(total * 100);

  if (amountInCents < 50) {
    throw new Error('El importe mínimo de pago es 0,50€');
  }

  return { subtotal, discount, total, amountInCents, normalizedItems };
}

export function buildCartFingerprint(lineItems: CheckoutLineItemInput[], couponCode?: string | null): string {
  const normalized = [...lineItems]
    .sort((a, b) => a.product_id - b.product_id)
    .map((item) => `${item.product_id}:${item.quantity}`)
    .join('|');
  const payload = `${normalized}|coupon:${String(couponCode || '').trim().toLowerCase()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function signCheckoutToken(paymentIntentId: string, cartFingerprint: string): string {
  const secret = process.env.CHECKOUT_HMAC_SECRET || process.env.MEGASUR_SYNC_TOKEN || 'insecure-dev-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(`${paymentIntentId}:${cartFingerprint}`)
    .digest('hex');
}

export function verifyCheckoutToken(paymentIntentId: string, cartFingerprint: string, token: string): boolean {
  const expected = signCheckoutToken(paymentIntentId, cartFingerprint);
  const normalizedExpected = Buffer.from(expected, 'utf-8');
  const normalizedToken = Buffer.from(String(token || ''), 'utf-8');
  if (normalizedExpected.length !== normalizedToken.length) return false;
  return crypto.timingSafeEqual(normalizedExpected, normalizedToken);
}

