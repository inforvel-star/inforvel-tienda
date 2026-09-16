'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentRequestButtonElement, useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/lib/store/cartStore';
import { useCouponStore } from '@/lib/store/couponStore';
import { ShoppingBag, Store, Truck } from 'lucide-react';
import { PaymentRequest } from '@stripe/stripe-js';

import { toast } from 'sonner';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface CartSummaryProps {
  showCheckoutButton?: boolean;
  shippingCost?: number;
}

function PaymentRequestButton() {
  const stripe = useStripe();
  const router = useRouter();
  const { items, getTotal, clearCart } = useCartStore();
  const { appliedCoupon } = useCouponStore();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    let total = getTotal();
    if (appliedCoupon) {
      total = Math.max(0, total - appliedCoupon.discount);
    }
    const pr = stripe.paymentRequest({
      country: 'ES',
      currency: 'eur',
      total: {
        label: 'Total',
        amount: Math.round(total * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
      requestPayerPhone: true,
      requestShipping: true,
      shippingOptions: [
        {
          id: 'free-shipping',
          label: 'Envío gratis',
          detail: 'Entrega en 24-48h',
          amount: 0,
        },
      ],
    });

    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr);
      }
    });

    pr.on('paymentmethod', async (ev) => {
      try {
        const response = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_method: 'stripe',
            payment_method_title: ev.walletName || 'Wallet',
            billing: {
              first_name: ev.payerName?.split(' ')[0] || '',
              last_name: ev.payerName?.split(' ').slice(1).join(' ') || '',
              email: ev.payerEmail || '',
              phone: ev.payerPhone || '',
              address_1: ev.shippingAddress?.addressLine?.[0] || '',
              address_2: ev.shippingAddress?.addressLine?.[1] || '',
              city: ev.shippingAddress?.city || '',
              state: ev.shippingAddress?.region || '',
              postcode: ev.shippingAddress?.postalCode || '',
              country: ev.shippingAddress?.country || 'ES',
            },
            line_items: items.map((item) => ({
              product_id: item.id,
              quantity: item.quantity,
            })),
            ...(appliedCoupon && {
              coupon_lines: [
                { code: appliedCoupon.code }
              ]
            }),
          })
        });
        const order = await response.json();

        if (!order) {
          ev.complete('fail');
          toast.error('Error al crear el pedido');
          return;
        }

        ev.complete('success');
        clearCart();
        router.push(`/confirmacion?order_id=${order.id}`);
      } catch (error) {
        ev.complete('fail');
        console.error('Error:', error);
        toast.error('Error al procesar el pedido');
      }
    });
  }, [stripe, getTotal, items, clearCart, router, appliedCoupon]);

  if (!paymentRequest) {
    return null;
  }

  return (
    <PaymentRequestButtonElement
      options={{
        paymentRequest,
        style: {
          paymentRequestButton: {
            type: 'default',
            theme: 'dark',
            height: '48px',
          },
        },
      }}
    />
  );
}

export function CartSummary({ showCheckoutButton = true, shippingCost = 0 }: CartSummaryProps) {
  const router = useRouter();
  const { items, getTotal, getItemCount } = useCartStore();
  const { appliedCoupon } = useCouponStore();

  const subtotal = getTotal();
  const total = Math.max(0, subtotal - (appliedCoupon?.discount || 0));
  const basePrice = total / 1.21;
  const tax = total - basePrice;
  const itemCount = getItemCount();

  const handleCheckout = () => {
    router.push('/checkout');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="sticky top-24 bg-zinc-950 border-zinc-800 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ShoppingBag className="h-5 w-5" />
            Resumen del Pedido
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">
                Productos ({itemCount} {itemCount === 1 ? 'artículo' : 'artículos'})
              </span>
              <span className="font-medium text-white">{subtotal.toFixed(2)}€</span>
            </div>

            {appliedCoupon && (
              <div className="flex justify-between text-sm items-center">
                <span className="text-zinc-400 flex items-center gap-1">
                  Descuento ({appliedCoupon.code})
                </span>
                <span className="font-medium text-green-500">-{appliedCoupon.discount.toFixed(2)}€</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Base imponible</span>
              <span className="font-medium text-white">{basePrice.toFixed(2)}€</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">IVA (21%)</span>
              <span className="font-medium text-white">{tax.toFixed(2)}€</span>
            </div>

            <div className="flex justify-between text-sm items-center">
              <span className="flex items-center gap-2 text-zinc-400">
                <Truck className="h-4 w-4" />
                Envío
              </span>
              <span className="font-medium text-green-500">GRATIS</span>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-white">Total</span>
            <motion.span
              key={total}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold text-blue-500"
            >
              {total.toFixed(2)}€
            </motion.span>
          </div>

          <div className="grid gap-2 rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs">
            <div className="flex items-center gap-2 text-green-300"><Truck className="h-4 w-4" /><strong>Envío gratis</strong><span className="text-zinc-500">· 24-48h</span></div>
            <div className="flex items-center gap-2 text-purple-300"><Store className="h-4 w-4" /><strong>Recogida gratis en tienda</strong><span className="text-zinc-500">· Córdoba</span></div>
            {total >= 50 && (
              <div className="flex items-center gap-2 text-zinc-300"><span className="rounded bg-[#ffb3c7] px-1.5 py-0.5 font-black text-black">Klarna.</span><span>Fracciona tu pago en checkout</span></div>
            )}
          </div>
        </CardContent>

        {showCheckoutButton && (
          <CardFooter className="flex flex-col gap-3">
            <Elements stripe={stripePromise}>
              <PaymentRequestButton />
            </Elements>

            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20"
              size="lg"
              onClick={handleCheckout}
              disabled={items.length === 0}
            >
              Proceder al Pago
            </Button>

            <Button
              variant="outline"
              className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white"
              onClick={() => router.push('/tienda')}
            >
              Seguir Comprando
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}
