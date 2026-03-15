'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { woocommerce, WCOrder } from '@/lib/woocommerce';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { User, Package, LogOut, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function CuentaPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [orders, setOrders] = useState<WCOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUserData() {
      if (!authAPI.isAuthenticated()) {
        router.push('/login');
        return;
      }

      setUserName(authAPI.getUserDisplayName());
      setUserEmail(authAPI.getUserEmail());

      setIsLoading(false);
    }

    loadUserData();
  }, [router]);

  const handleLogout = () => {
    authAPI.logout();
    toast.success('Sesión cerrada');
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-16 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mi cuenta</h1>
            <p className="text-muted-foreground">
              Gestiona tu perfil y pedidos
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center text-white text-2xl font-bold">
                  {userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h2 className="font-semibold text-lg">
                    {userName || 'Usuario'}
                  </h2>
                  <p className="text-sm text-gray-600">{userEmail}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  <User className="w-4 h-4 mr-2" />
                  Información personal
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Package className="w-4 h-4 mr-2" />
                  Mis pedidos
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Direcciones
                </Button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-bold mb-6">Pedidos recientes</h2>

              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                    <Package className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Aún no has realizado ningún pedido
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Explora nuestra tienda y encuentra los productos que necesitas
                  </p>
                  <Button asChild>
                    <Link href="/tienda">Ir a la tienda</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-border rounded-lg p-4 hover:border-blue-500/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold">Pedido #{order.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.date_created).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{order.total}€</p>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              order.status === 'completed'
                                ? 'bg-green-500/10 text-green-500'
                                : order.status === 'processing'
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'bg-gray-500/10 text-gray-500'
                            }`}
                          >
                            {order.status === 'completed'
                              ? 'Completado'
                              : order.status === 'processing'
                              ? 'En proceso'
                              : order.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {order.line_items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="font-medium">{item.total}€</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
