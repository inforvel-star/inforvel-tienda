'use client';

import { useEffect, useState } from 'react';
import { WCProduct } from '@/lib/woocommerce';
import { ProductGrid } from '@/components/products/ProductGrid';
import { Flame, Tag, TrendingDown, Mail, CheckCircle2, Loader2 } from 'lucide-react';

export default function OfertasPage() {
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('featured');
  const [nlEmail, setNlEmail] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlResult, setNlResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlEmail.trim()) return;
    setNlLoading(true);
    setNlResult(null);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nlEmail.trim() }),
      });
      const data = await res.json();
      setNlResult(data);
      if (data.success) setNlEmail('');
    } catch {
      setNlResult({ success: false, message: 'Error de conexión. Inténtalo de nuevo.' });
    } finally {
      setNlLoading(false);
    }
  };

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch('/api/products?per_page=100&on_sale=true&orderby=date&order=desc');
        const data = await response.json();
        setProducts((Array.isArray(data) ? data : []).filter((product) => {
          const price = parseFloat(product.price || '0');
          const regularPrice = parseFloat(product.regular_price || '0');
          return price > 0 && regularPrice > price;
        }));
      } catch (error) {
        console.error('Error loading sale products:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-asc') return parseFloat(a.price) - parseFloat(b.price);
    if (sortBy === 'price-desc') return parseFloat(b.price) - parseFloat(a.price);
    if (sortBy === 'discount') {
      const discountA = parseFloat(a.regular_price) - parseFloat(a.price);
      const discountB = parseFloat(b.regular_price) - parseFloat(b.price);
      return discountB - discountA;
    }
    return 0;
  });

  return (
    <div className="min-h-screen pb-16 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Hero banner */}
        <div className="relative rounded-2xl overflow-hidden mb-10 bg-gradient-to-br from-red-600/20 via-orange-500/10 to-yellow-500/10 border border-red-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative px-6 py-10 sm:px-10 sm:py-14 md:py-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-red-400" />
              </div>
              <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold uppercase tracking-wider">
                Ofertas activas
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Campañas y ofertas
            </h1>
            <p className="text-zinc-400 max-w-2xl text-base md:text-lg leading-relaxed">
              En nuestra web ya puedes encontrar los productos de informática a los mejores precios.
              Descubre descuentos exclusivos en portátiles, smartphones, componentes y accesorios
              seleccionados para ti.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-sm">
                <Tag className="w-4 h-4 text-green-400" />
                <span className="text-zinc-300">Precios reducidos</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-sm">
                <TrendingDown className="w-4 h-4 text-blue-400" />
                <span className="text-zinc-300">Hasta agotar stock</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-zinc-400">
            {loading
              ? 'Cargando ofertas...'
              : `${sortedProducts.length} producto${sortedProducts.length !== 1 ? 's' : ''} en oferta`}
          </p>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-lg border border-zinc-900 bg-zinc-950 text-sm"
          >
            <option value="featured">Destacados</option>
            <option value="discount">Mayor descuento</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
          </select>
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-zinc-900 rounded-xl mb-4" />
                <div className="h-4 bg-zinc-900 rounded w-3/4 mb-2" />
                <div className="h-4 bg-zinc-900 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-6">
              <Tag className="w-7 h-7 text-zinc-600" />
            </div>
            <h2 className="text-xl font-semibold mb-3">No hay ofertas activas en este momento</h2>
            <p className="text-zinc-400 max-w-md mx-auto">
              Vuelve pronto, estamos preparando nuevas campañas y descuentos especiales para ti.
            </p>
          </div>
        ) : (
          <ProductGrid products={sortedProducts} />
        )}

        {/* Newsletter subscription */}
        <div className="mt-16 relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600/15 via-purple-500/10 to-pink-500/10 border border-blue-500/20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="relative px-6 py-10 sm:px-10 sm:py-14 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-5">
              <Mail className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              No te pierdas ninguna oferta
            </h2>
            <p className="text-zinc-400 max-w-lg mx-auto mb-8">
              Suscríbete y te avisaremos por email cada vez que pongamos un producto en oferta.
              Sin spam, solo descuentos reales.
            </p>

            {nlResult?.success ? (
              <div className="flex items-center justify-center gap-3 text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-6 py-4 max-w-md mx-auto">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="text-sm">{nlResult.message}</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={nlEmail}
                  onChange={(e) => { setNlEmail(e.target.value); setNlResult(null); }}
                  placeholder="tu@email.com"
                  required
                  className="flex-1 px-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={nlLoading}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shrink-0"
                >
                  {nlLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    'Suscribirme'
                  )}
                </button>
              </form>
            )}

            {nlResult && !nlResult.success && (
              <p className="text-red-400 text-sm mt-4">{nlResult.message}</p>
            )}

            <p className="text-zinc-600 text-xs mt-6">
              Solo recibirás emails cuando haya nuevas ofertas. Sin spam.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
