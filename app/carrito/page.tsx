'use client';

import { useCartStore } from '@/lib/store/cartStore';
import Link from 'next/link';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CartItem } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { motion, AnimatePresence } from 'framer-motion';

export default function CarritoPage() {
  const { items } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-20 pb-16 flex items-center justify-center bg-black">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md px-4"
        >
          <div className="w-32 h-32 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-16 h-16 text-zinc-600" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-white">Tu carrito está vacío</h1>
          <p className="text-zinc-400 mb-8 text-lg">
            Descubre nuestros productos y empieza a añadirlos a tu carrito
          </p>
          <Button size="lg" asChild className="px-8 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
            <Link href="/tienda">
              Explorar Tienda
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 text-white">Carrito de Compra</h1>
          <p className="text-zinc-400">
            Revisa tus productos antes de proceder al pago
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <AnimatePresence mode="popLayout">
              <div className="space-y-4">
                {items.map((item) => (
                  <CartItem
                    key={`${item.id}-${item.variationId || 'default'}`}
                    item={item}
                  />
                ))}
              </div>
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
            >
              <p className="text-sm text-green-400">
                <strong>Envío gratis</strong> en todos los pedidos
              </p>
            </motion.div>
          </div>

          <div className="lg:col-span-1">
            <CartSummary />
          </div>
        </div>
      </div>
    </div>
  );
}
