'use client';

import { useState, useEffect } from 'react';
import { WCOrder } from '@/lib/woocommerce';
import { Button } from '@/components/ui/button';
import { Package, Loader as Loader2 } from 'lucide-react';
import Link from 'next/link';

export function OrdersList({ userId }: { userId: string | number | null }) {
  const [orders, setOrders] = useState<WCOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [userId]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      if (!userId) {
        setOrders([]);
        return;
      }

      const response = await fetch(`/api/orders?customerId=${encodeURIComponent(String(userId))}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        setOrders([]);
        return;
      }
      const fetchedOrders = await response.json();
      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-500/10 text-green-500 border-green-500/20',
      processing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'on-hold': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      pending: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
      refunded: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const getStatusText = (status: string) => {
    const statusTexts: Record<string, string> = {
      completed: 'Completado',
      processing: 'En proceso',
      'on-hold': 'En espera',
      pending: 'Pendiente',
      cancelled: 'Cancelado',
      refunded: 'Reembolsado',
      failed: 'Fallido',
    };
    return statusTexts[status] || status;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6 text-white">Mis pedidos</h2>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-white">
            Aún no has realizado ningún pedido
          </h3>
          <p className="text-zinc-400 mb-6">
            Explora nuestra tienda y encuentra los productos que necesitas
          </p>
          <Button asChild className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
            <Link href="/tienda">Ir a la tienda</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border border-zinc-800 rounded-lg p-4 hover:border-blue-500/50 transition-colors bg-zinc-950"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-white">Pedido #{order.id}</p>
                  <p className="text-sm text-zinc-400">
                    {new Date(order.date_created).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-white">{order.total}€</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>

              {order.line_items && order.line_items.length > 0 && (
                <div className="space-y-2 border-t border-zinc-800 pt-3">
                  {order.line_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-zinc-400">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-medium text-white">{item.total}€</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
