'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { databaseAPI } from '@/lib/api/database';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  User,
  Package,
  LogOut,
  MapPin,
  Trophy,
  WalletCards,
  Clock3,
  Settings,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { PersonalInfo } from '@/components/account/PersonalInfo';
import { OrdersList } from '@/components/account/OrdersList';
import { AddressesList } from '@/components/account/AddressesList';
import { PointsWidget } from '@/components/account/PointsWidget';
import type { WCOrder } from '@/lib/woocommerce';

type TabType = 'personal' | 'orders' | 'addresses';

export default function CuentaPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [orders, setOrders] = useState<WCOrder[]>([]);
  const [addressCount, setAddressCount] = useState(0);
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    async function loadUserData() {
      const session = await authAPI.getSession();
      if (!session.authenticated) {
        router.push('/login');
        return;
      }

      setUserName(authAPI.getUserDisplayName());
      setUserEmail(session.email || authAPI.getUserEmail());
      const nextUserId = session.customer_id ? String(session.customer_id) : null;
      setUserId(nextUserId);
      setAvatarUrl(authAPI.getUserAvatarUrl());
      setAvatarFailed(false);

      if (nextUserId) {
        const [ordersRes, addressesRes, pointsRes] = await Promise.all([
          fetch(`/api/orders?customerId=${encodeURIComponent(nextUserId)}`, { cache: 'no-store' }),
          databaseAPI.getAddresses(),
          fetch(`/api/points?customerId=${encodeURIComponent(nextUserId)}`, { cache: 'no-store' }),
        ]);

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          if (Array.isArray(ordersData)) setOrders(ordersData);
        }

        if (Array.isArray(addressesRes)) {
          setAddressCount(addressesRes.length);
        }

        if (pointsRes.ok) {
          const pointsData = await pointsRes.json();
          if (typeof pointsData?.points === 'number') setPoints(pointsData.points);
        }
      }

      setIsLoading(false);
    }

    loadUserData();
  }, [router]);

  const handleLogout = async () => {
    await authAPI.logout();
    toast.success('Sesión cerrada');
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-16 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Cargando...</p>
        </div>
      </div>
    );
  }

  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const activeOrders = orders.filter((order) => ['pending', 'processing', 'on-hold'].includes(order.status)).length;
  const latestOrder = orders.length > 0 ? orders[0] : null;
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="min-h-screen pt-20 pb-16 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8 rounded-2xl border border-blue-900/40 bg-gradient-to-r from-blue-600/20 via-blue-500/10 to-cyan-400/10 p-6 shadow-lg shadow-blue-900/20">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-1 text-sm font-medium text-blue-200/90 capitalize">{today}</p>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                Hola, {userName || 'usuario'}
              </h1>
              <p className="mt-2 text-sm text-blue-100/80">
                Panel personal para gestionar perfil, pedidos y actividad.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeTab === 'personal' ? 'default' : 'outline'}
                className={activeTab === 'personal' ? 'bg-white text-slate-900 hover:bg-blue-50' : 'border-blue-200/50 bg-blue-900/20 text-blue-100 hover:bg-blue-900/35'}
                onClick={() => setActiveTab('personal')}
              >
                <Settings className="mr-2 h-4 w-4" />
                Mi perfil
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-rose-200/40 bg-rose-900/15 text-rose-100 hover:bg-rose-900/30"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Pedidos totales</p>
            <p className="mt-2 text-2xl font-bold text-white">{orders.length}</p>
            <p className="mt-2 text-xs text-slate-400">Activos: {activeOrders}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Gasto acumulado</p>
            <p className="mt-2 text-2xl font-bold text-white">{totalSpent.toFixed(2)} EUR</p>
            <p className="mt-2 text-xs text-slate-400">Compras en Inforvel</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Direcciones</p>
            <p className="mt-2 text-2xl font-bold text-white">{addressCount}</p>
            <p className="mt-2 text-xs text-slate-400">Envío y facturación</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Puntos</p>
            <p className="mt-2 text-2xl font-bold text-white">{points ?? 0}</p>
            <p className="mt-2 text-xs text-slate-400">Sistema de fidelización</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20">
                  {avatarUrl && !avatarFailed ? (
                    <img
                      src={avatarUrl}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'A'
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-lg text-white">
                    {userName || 'admin'}
                  </h2>
                  <p className="text-sm text-zinc-400">{userEmail}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <Button
                  variant={activeTab === 'personal' ? 'default' : 'ghost'}
                  className={`w-full justify-start ${activeTab === 'personal'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'text-zinc-300 hover:bg-slate-800'
                    }`}
                  onClick={() => setActiveTab('personal')}
                >
                  <User className="w-4 h-4 mr-2" />
                  Información personal
                </Button>
                <Button
                  variant={activeTab === 'orders' ? 'default' : 'ghost'}
                  className={`w-full justify-start ${activeTab === 'orders'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'text-zinc-300 hover:bg-slate-800'
                    }`}
                  onClick={() => setActiveTab('orders')}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Mis pedidos
                </Button>
                <Button
                  variant={activeTab === 'addresses' ? 'default' : 'ghost'}
                  className={`w-full justify-start ${activeTab === 'addresses'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'text-zinc-300 hover:bg-slate-800'
                    }`}
                  onClick={() => setActiveTab('addresses')}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Direcciones
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Actividad reciente</h3>
                <Clock3 className="h-4 w-4 text-slate-400" />
              </div>
              {latestOrder ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">Último movimiento</p>
                  <p className="text-sm font-medium text-white">Pedido #{latestOrder.id}</p>
                  <p className="text-xs text-slate-300">
                    {new Date(latestOrder.date_created).toLocaleDateString('es-ES')} · {latestOrder.total} EUR
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Todavía no hay actividad de compras.</p>
              )}
            </div>

            {userId && <PointsWidget userId={userId} />}
          </div>

          <div className="lg:col-span-2">
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <button
                className="rounded-xl border border-slate-800 bg-slate-900/85 px-3 py-3 text-left transition hover:border-blue-500/40 hover:bg-slate-900"
                onClick={() => setActiveTab('orders')}
              >
                <div className="mb-2 flex items-center justify-between">
                  <Package className="h-4 w-4 text-blue-300" />
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <p className="text-xs text-slate-400">Gestión</p>
                <p className="text-sm font-semibold text-white">Pedidos y facturas</p>
              </button>
              <button
                className="rounded-xl border border-slate-800 bg-slate-900/85 px-3 py-3 text-left transition hover:border-blue-500/40 hover:bg-slate-900"
                onClick={() => setActiveTab('addresses')}
              >
                <div className="mb-2 flex items-center justify-between">
                  <MapPin className="h-4 w-4 text-cyan-300" />
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <p className="text-xs text-slate-400">Datos</p>
                <p className="text-sm font-semibold text-white">Direcciones y contacto</p>
              </button>
              <button
                className="rounded-xl border border-slate-800 bg-slate-900/85 px-3 py-3 text-left transition hover:border-blue-500/40 hover:bg-slate-900"
                onClick={() => setActiveTab('personal')}
              >
                <div className="mb-2 flex items-center justify-between">
                  <User className="h-4 w-4 text-indigo-300" />
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <p className="text-xs text-slate-400">Perfil</p>
                <p className="text-sm font-semibold text-white">Información personal</p>
              </button>
            </div>

            <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-6">
              <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center rounded-full border border-blue-400/40 bg-blue-500/15 px-2.5 py-1 font-medium text-blue-100">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Espacio personal Inforvel
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 font-medium text-slate-300">
                  <WalletCards className="mr-1.5 h-3.5 w-3.5" />
                  Datos sincronizados
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 font-medium text-slate-300">
                  <Trophy className="mr-1.5 h-3.5 w-3.5" />
                  Programa de puntos activo
                </span>
              </div>
              {activeTab === 'personal' && (
                <PersonalInfo
                  userEmail={userEmail}
                  userName={userName}
                  avatarUrl={avatarUrl}
                  onAvatarUpdated={(value) => {
                    setAvatarUrl(value);
                    setAvatarFailed(false);
                    if (typeof window !== 'undefined') {
                      if (value) {
                        localStorage.setItem('wc_user_avatar_url', value);
                      } else {
                        localStorage.removeItem('wc_user_avatar_url');
                      }
                    }
                  }}
                />
              )}
              {activeTab === 'orders' && <OrdersList userId={userId} />}
              {activeTab === 'addresses' && <AddressesList />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
