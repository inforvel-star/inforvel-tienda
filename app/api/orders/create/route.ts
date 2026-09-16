import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { woocommerce } from '@/lib/woocommerce';
import {
    buildCartFingerprint,
    calculateCheckoutTotals,
    verifyCheckoutToken,
} from '@/lib/server/checkout';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
});

export async function POST(request: NextRequest) {
    const rateLimitError = await checkRateLimit(request, 10, 60_000);
    if (rateLimitError) return rateLimitError;

    try {
        const orderData = await request.json();
        const paymentIntentId = String(orderData?.payment_intent_id || '').trim();
        const checkoutToken = String(orderData?.checkout_token || '').trim();
        const couponCode = String(orderData?.coupon_lines?.[0]?.code || '').trim();
        const billing = orderData?.billing || {};
        const firstName = String(billing?.first_name || '').trim();
        const lastName = String(billing?.last_name || '').trim();
        const email = String(billing?.email || '').trim().toLowerCase();
        const phone = String(billing?.phone || '').trim();
        const address1 = String(billing?.address_1 || '').trim();
        const city = String(billing?.city || '').trim();
        const postcode = String(billing?.postcode || '').trim();
        const country = String(billing?.country || '').trim().toUpperCase();

        if (!paymentIntentId || !checkoutToken) {
            return NextResponse.json(
                { error: 'payment_intent_id y checkout_token son obligatorios' },
                { status: 400 }
            );
        }

        if (
            !firstName ||
            !lastName ||
            !email ||
            !phone ||
            !address1 ||
            !city ||
            !postcode ||
            !country
        ) {
            return NextResponse.json(
                { error: 'Faltan campos obligatorios de facturación' },
                { status: 400 }
            );
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'Email de facturación inválido' }, { status: 400 });
        }

        if (!/^[A-Z]{2}$/.test(country)) {
            return NextResponse.json({ error: 'País de facturación inválido' }, { status: 400 });
        }

        const totals = await calculateCheckoutTotals(orderData?.line_items, couponCode);
        const cartFingerprint = buildCartFingerprint(totals.normalizedItems, couponCode);
        if (!verifyCheckoutToken(paymentIntentId, cartFingerprint, checkoutToken)) {
            return NextResponse.json({ error: 'Token de checkout inválido' }, { status: 403 });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (!paymentIntent || paymentIntent.amount !== totals.amountInCents) {
            return NextResponse.json({ error: 'Importe de pago inválido' }, { status: 400 });
        }

        const sanitizedOrderData: Record<string, any> = {
            ...orderData,
            billing: {
                ...billing,
                first_name: firstName,
                last_name: lastName,
                email,
                phone,
                address_1: address1,
                city,
                postcode,
                country,
            },
            line_items: totals.normalizedItems,
            meta_data: [
                ...(Array.isArray(orderData?.meta_data) ? orderData.meta_data : []),
                { key: '_stripe_payment_intent_id', value: paymentIntentId },
                { key: '_checkout_cart_fingerprint', value: cartFingerprint },
            ],
        };
        delete sanitizedOrderData.payment_intent_id;
        delete sanitizedOrderData.checkout_token;
        delete sanitizedOrderData.total;
        delete sanitizedOrderData.subtotal;

        const order = await woocommerce.createOrder(sanitizedOrderData as any);

        if (!order) {
            return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error('Error creating order:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
