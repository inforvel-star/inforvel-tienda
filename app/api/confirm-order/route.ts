import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { checkRateLimit } from '@/lib/rateLimit';
import { buildCartFingerprint } from '@/lib/server/checkout';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

const WC_URL = process.env.NEXT_PUBLIC_WC_URL;
const WC_KEY = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;

export async function POST(request: NextRequest) {
  // Rate limit: 5 confirmaciones de pedido por IP por minuto
  const rateLimitError = await checkRateLimit(request, 5, 60_000);
  if (rateLimitError) return rateLimitError;

  try {
    const { payment_intent_id, order_id } = await request.json();

    if (!payment_intent_id || !order_id) {
      return NextResponse.json(
        { error: 'Faltan parámetros' },
        { status: 400 }
      );
    }

    // 1. Verify payment intent status with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'El pago no se ha completado', status: paymentIntent.status },
        { status: 400 }
      );
    }

    // Load order to validate payment/order binding before marking as paid.
    const orderGetRes = await fetch(
      `${WC_URL}/wp-json/wc/v3/orders/${order_id}`,
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64'),
        },
      }
    );

    if (!orderGetRes.ok) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const order = await orderGetRes.json();
    const metaData = Array.isArray(order?.meta_data) ? order.meta_data : [];
    const storedIntent = String(
      metaData.find((m: any) => m?.key === '_stripe_payment_intent_id')?.value || ''
    ).trim();
    const storedFingerprint = String(
      metaData.find((m: any) => m?.key === '_checkout_cart_fingerprint')?.value || ''
    ).trim();

    if (!storedIntent || storedIntent !== payment_intent_id) {
      return NextResponse.json(
        { error: 'El pago no corresponde con el pedido indicado' },
        { status: 403 }
      );
    }

    const orderLineItems = Array.isArray(order?.line_items) ? order.line_items : [];
    const normalizedItems = orderLineItems
      .map((item: any) => ({
        product_id: Number(item?.product_id),
        quantity: Number(item?.quantity),
      }))
      .filter((item: any) => Number.isInteger(item.product_id) && item.product_id > 0 && Number.isInteger(item.quantity) && item.quantity > 0);
    const couponCode = String(order?.coupon_lines?.[0]?.code || '');
    const recalculatedFingerprint = buildCartFingerprint(normalizedItems, couponCode);
    if (storedFingerprint && storedFingerprint !== recalculatedFingerprint) {
      return NextResponse.json({ error: 'Integridad del pedido inválida' }, { status: 403 });
    }

    const orderTotalInCents = Math.round(Number.parseFloat(String(order?.total || '0')) * 100);
    const paymentAmountInCents = Number(paymentIntent.amount_received || paymentIntent.amount || 0);
    if (!Number.isFinite(orderTotalInCents) || orderTotalInCents <= 0 || paymentAmountInCents !== orderTotalInCents) {
      return NextResponse.json(
        { error: 'Importe de pago no coincide con el pedido' },
        { status: 403 }
      );
    }

    // 2. Update WooCommerce order status to "processing" (paid)
    const wcResponse = await fetch(
      `${WC_URL}/wp-json/wc/v3/orders/${order_id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64'),
        },
        body: JSON.stringify({
          status: 'processing',
          transaction_id: payment_intent_id,
          set_paid: true,
        }),
      }
    );

    if (!wcResponse.ok) {
      const errorData = await wcResponse.text();
      console.error('WooCommerce update error:', errorData);
      return NextResponse.json(
        { error: 'Error al actualizar el pedido en WooCommerce' },
        { status: 500 }
      );
    }

    const updatedOrder = await wcResponse.json();

    return NextResponse.json({
      success: true,
      order_id: updatedOrder.id,
      status: updatedOrder.status,
    });
  } catch (error: any) {
    console.error('Error confirming order:', error);
    return NextResponse.json(
      { error: error.message || 'Error al confirmar el pedido' },
      { status: 500 }
    );
  }
}
