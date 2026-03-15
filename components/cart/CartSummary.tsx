'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/lib/store/cartStore';
import { ShoppingBag, Truck } from 'lucide-react';

interface CartSummaryProps {
  showCheckoutButton?: boolean;
  shippingCost?: number;
}

export function CartSummary({ showCheckoutButton = true, shippingCost = 0 }: CartSummaryProps) {
  const router = useRouter();
  const { items, getTotal, getItemCount } = useCartStore();

  const subtotal = getTotal();
  const total = subtotal + shippingCost;
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
      <Card className="sticky top-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Resumen del Pedido
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Productos ({itemCount} {itemCount === 1 ? 'artículo' : 'artículos'})
              </span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm items-center">
              <span className="flex items-center gap-2 text-gray-600">
                <Truck className="h-4 w-4" />
                Envío
              </span>
              <span className="font-medium">
                {shippingCost === 0 ? (
                  <span className="text-green-600">GRATIS</span>
                ) : (
                  `$${shippingCost.toFixed(2)}`
                )}
              </span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total</span>
            <motion.span
              key={total}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold text-gray-900"
            >
              ${total.toFixed(2)}
            </motion.span>
          </div>

          {subtotal < 50 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-amber-50 border border-amber-200 rounded-lg p-3"
            >
              <p className="text-xs text-amber-800">
                Añade <span className="font-semibold">${(50 - subtotal).toFixed(2)}</span> más para obtener envío gratis
              </p>
            </motion.div>
          )}
        </CardContent>

        {showCheckoutButton && (
          <CardFooter className="flex flex-col gap-3">
            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={items.length === 0}
            >
              Proceder al Pago
            </Button>

            <Button
              variant="outline"
              className="w-full"
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
