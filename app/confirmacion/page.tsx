'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CircleCheck as CheckCircle, Package, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ConfirmacionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('order_id');
    if (!id) {
      router.push('/');
    } else {
      setOrderId(id);
    }
  }, [searchParams, router]);

  if (!orderId) {
    return null;
  }

  return (
    <div className="min-h-screen pt-20 pb-16 flex items-center justify-center">
      <div className="max-w-2xl w-full px-4">
        <div className="bg-card border border-border rounded-2xl p-8 md:p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>

          <h1 className="text-3xl font-bold mb-4">
            ¡Pedido realizado con éxito!
          </h1>

          <p className="text-lg text-muted-foreground mb-6">
            Tu pedido ha sido procesado correctamente y pronto estará en camino.
          </p>

          <div className="bg-accent rounded-xl p-6 mb-8 text-left">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">
                Número de pedido
              </span>
              <span className="font-bold text-lg">#{orderId}</span>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium">Pedido confirmado</p>
                  <p className="text-xs text-muted-foreground">
                    Hemos recibido tu pedido correctamente
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium">En preparación</p>
                  <p className="text-xs text-muted-foreground">
                    Estamos preparando tu pedido para el envío
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-8">
            Recibirás un email de confirmación con los detalles de tu pedido y el
            seguimiento del envío. Si tienes alguna pregunta, no dudes en
            contactarnos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/cuenta">Ver mis pedidos</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/tienda">Seguir comprando</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
