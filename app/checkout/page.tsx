'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cartStore';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { Lock, ShoppingBag } from 'lucide-react';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotal } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && items.length === 0) {
      router.push('/carrito');
    }
  }, [items, router, mounted]);

  if (!mounted) {
    return null;
  }

  if (items.length === 0) {
    return null;
  }

  const total = getTotal();
  const basePrice = total / 1.21;
  const tax = total - basePrice;
  const shipping = 0;

  return (
    <div className="min-h-screen pt-20 pb-16 bg-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Lock className="w-5 h-5 text-green-500" />
          <span className="text-sm text-zinc-400">
            Pago seguro con Stripe
          </span>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-6 md:p-8">
              <h1 className="text-2xl font-bold mb-6 text-white">Finalizar compra</h1>

              <Elements
                stripe={stripePromise}
                options={{
                  mode: 'payment',
                  amount: Math.round(total * 100),
                  currency: 'eur',
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#3b82f6',
                      colorBackground: '#09090b',
                      colorText: '#ffffff',
                      colorDanger: '#ef4444',
                      fontFamily: 'Inter, sans-serif',
                      borderRadius: '8px',
                    },
                  },
                }}
              >
                <CheckoutForm />
              </Elements>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 bg-zinc-950 rounded-xl border border-zinc-800 p-6 space-y-6">
              <h2 className="text-xl font-bold text-white">Resumen del pedido</h2>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={`${item.id}-${item.variationId || 'default'}`}
                    className="flex items-center gap-3"
                  >
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                      <img
                        src={item.image || '/placeholder.png'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2 text-white">
                        {item.name}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Cantidad: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {(item.price * item.quantity).toFixed(2)}€
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 py-4 border-y border-zinc-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Base imponible</span>
                  <span className="font-medium text-white">{basePrice.toFixed(2)}€</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">IVA (21%)</span>
                  <span className="font-medium text-white">{tax.toFixed(2)}€</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Envío</span>
                  <span className="font-medium text-green-500">Gratis</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xl font-bold">
                <span className="text-white">Total</span>
                <span className="text-blue-500">{total.toFixed(2)}€</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Lock className="w-4 h-4" />
                <span>Transacción segura y encriptada</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
