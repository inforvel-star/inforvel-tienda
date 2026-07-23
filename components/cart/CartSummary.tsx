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

  const total = getTotal();
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
              <span className="font-medium text-white">{total.toFixed(2)}€</span>
            </div>

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
        </CardContent>

        {showCheckoutButton && (
          <CardFooter className="flex flex-col gap-3">
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
