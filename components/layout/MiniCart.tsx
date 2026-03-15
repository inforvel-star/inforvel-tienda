'use client';

import { useCartStore } from '@/lib/store/cartStore';
import { X, ShoppingBag, Loader as Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CartItem } from '@/components/cart/CartItem';

export function MiniCart() {
  const { items, isOpen, setCartOpen, getTotal, getItemCount, isLoading, isSyncing } =
    useCartStore();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const itemCount = getItemCount();

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={() => setCartOpen(false)}
      />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white border-l z-50 flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Tu Carrito</h2>
              <p className="text-sm text-gray-600">
                {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCartOpen(false)}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {isSyncing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700">Sincronizando carrito...</span>
          </motion.div>
        )}

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6"
            >
              <ShoppingBag className="w-12 h-12 text-gray-400" />
            </motion.div>
            <h3 className="text-xl font-bold mb-2">Tu carrito está vacío</h3>
            <p className="text-gray-600 mb-6">
              Descubre nuestros productos y añádelos a tu carrito
            </p>
            <Button onClick={() => setCartOpen(false)} asChild size="lg">
              <Link href="/tienda">Explorar Tienda</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {items.map((item) => (
                    <CartItem
                      key={`${item.id}-${item.variationId || 'default'}`}
                      item={item}
                      compact
                    />
                  ))}
                </div>
              </AnimatePresence>
            </div>

            <div className="border-t p-6 space-y-4 bg-gray-50">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">${getTotal().toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Envío</span>
                  <span className="text-green-600 font-medium">GRATIS</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-lg font-bold">Total</span>
                <motion.span
                  key={getTotal()}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-2xl font-bold"
                >
                  ${getTotal().toFixed(2)}
                </motion.span>
              </div>

              <Button className="w-full" size="lg" asChild disabled={isLoading}>
                <Link href="/checkout">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    'Finalizar Compra'
                  )}
                </Link>
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setCartOpen(false)}
                asChild
              >
                <Link href="/carrito">Ver Carrito Completo</Link>
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}
