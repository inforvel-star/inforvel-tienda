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

    const { currency = 'eur', metadata, line_items, coupon_code } = await request.json();
    const totals = await calculateCheckoutTotals(line_items, coupon_code);
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
