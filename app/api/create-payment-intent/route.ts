import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import Stripe from 'stripe';
import {
  buildCartFingerprint,
  calculateCheckoutTotals,
  signCheckoutToken,
} from '@/lib/server/checkout';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});



export async function POST(request: NextRequest) {
  try {
    const rateLimitError = await checkRateLimit(request, 10, 60_000);
    if (rateLimitError) return rateLimitError;

    const { currency = 'eur', metadata, line_items, coupon_code, debug_amount_cents } = await request.json();

    // Development helper: allow creating a payment intent with a forced amount
    // without calling the WooCommerce API. This is ONLY enabled when not in
    // production and when the caller provides `debug_amount_cents`.
    let totals;
    if (process.env.NODE_ENV !== 'production' && Number.isInteger(debug_amount_cents) && debug_amount_cents > 0) {
      totals = {
        subtotal: debug_amount_cents / 100,
        discount: 0,
        total: debug_amount_cents / 100,
        amountInCents: debug_amount_cents,
        normalizedItems: [],
      };
    } else {
      totals = await calculateCheckoutTotals(line_items, coupon_code);
    }
    const cartFingerprint = buildCartFingerprint(totals.normalizedItems, coupon_code);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totals.amountInCents,
      currency,
      automatic_payment_methods: { enabled: true },
      payment_method_configuration: 'pmc_1SX2jYJRNeOETRRfrTrypLyb',
      metadata: {
        ...(metadata || {}),
        cart_fingerprint: cartFingerprint,
        coupon_code: String(coupon_code || ''),
      },
    });

    const checkoutToken = signCheckoutToken(paymentIntent.id, cartFingerprint);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      checkoutToken,
      amount: totals.amountInCents,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating payment intent' },
      { status: 500 }
    );
  }
}
