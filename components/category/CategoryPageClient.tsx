'use client';

import { useState, useCallback, useTransition } from 'react';
import { CategoryFilters } from './CategoryFilters';
import { ProductGrid } from '@/components/products/ProductGrid';
import { SlidersHorizontal, X } from 'lucide-react';

interface Term { id: number; name: string; slug: string }
interface Attr { id: number; name: string; slug: string; terms: Record<string | number, Term> }
interface Filters {
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  rating?: number;
  attributes: Record<string, string[]>;
}

interface Props {
  initialProducts: any[];
  totalProducts: number;
  totalPages: number;
  attributes: Attr[];
  priceRange: { min: number; max: number };
  categorySlug: string;
  searchQuery?: string;
}

export function CategoryPageClient({
  initialProducts,
  totalProducts,
  totalPages,
  attributes,
  priceRange,
  categorySlug,
  searchQuery = '',
}: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(totalProducts);
  const [filters, setFilters] = useState<Filters>({ attributes: {} });
  const [orderby, setOrderby] = useState('menu_order');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialProducts.length < totalProducts);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const buildQuery = useCallback((f: Filters, ob: string, o: string, p: number) => {
    const q = new URLSearchParams();
    q.set('orderby', ob);
    q.set('order', o);
    q.set('page', String(p));
    q.set('per_page', '24');
    if (searchQuery) q.set('search', searchQuery);
    if (f.minPrice !== undefined) q.set('min_price', String(f.minPrice));
    if (f.maxPrice !== undefined) q.set('max_price', String(f.maxPrice));
    if (f.inStock) q.set('in_stock', 'true');
    if (f.rating) q.set('rating', String(f.rating));

    for (const [slug, terms] of Object.entries(f.attributes)) {
      if (terms.length > 0) {
        q.append('attributes', `${slug}:${terms.join(',')}`);
      }
    }
    return q.toString();
  }, [searchQuery]);

  const fetchProducts = useCallback(async (f: Filters, ob: string, o: string, p: number, append = false) => {
    setLoading(true);
    try {
      const qs = buildQuery(f, ob, o, p);
      const res = await fetch(`/api/categories/${categorySlug}?${qs}`);
      const data = await res.json();
      setTotal(data.totalProducts ?? 0);
      setHasMore(p < (data.totalPages ?? 1));
      setProducts(append ? (prev) => [...prev, ...data.products] : data.products);
    } finally {
      setLoading(false);
    }
  }, [buildQuery, categorySlug]);

  const handleFiltersChange = (f: Filters) => {
    setFilters(f);
    setPage(1);
    startTransition(() => fetchProducts(f, orderby, order, 1));
  };

  const handleOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [ob, o] = e.target.value.split(':');
    setOrderby(ob);
    setOrder(o);
    setPage(1);
    startTransition(() => fetchProducts(filters, ob, o, 1));
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchProducts(filters, orderby, order, next, true);
  };

  const activeFilterCount =
    (filters.inStock ? 1 : 0) +
    (filters.rating ? 1 : 0) +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    Object.values(filters.attributes).flat().length;

  return (
    <div className="flex gap-8 relative">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-72 bg-zinc-950 z-50 overflow-y-auto p-6 transition-transform duration-300
          lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:w-64 lg:bg-transparent lg:z-auto lg:translate-x-0 lg:overflow-y-auto lg:p-0 lg:shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Botón cerrar en móvil */}
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden flex items-center gap-2 mb-6 text-sm text-zinc-400 hover:text-white"
        >
          <X className="w-4 h-4" /> Cerrar filtros
        </button>

        <CategoryFilters
          attributes={attributes}
          priceRange={priceRange}
          filters={filters}
          onChange={handleFiltersChange}
        />
      </aside>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        {/* Barra superior */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 text-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-700"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">{activeFilterCount}</span>
              )}
            </button>
            <p className="text-sm text-muted-foreground">
              {loading ? 'Buscando...' : `${total} productos`}
            </p>
          </div>

          <select
            onChange={handleOrderChange}
            defaultValue="menu_order:asc"
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-border bg-background text-sm"
          >
            <option value="menu_order:asc">Destacados</option>
            <option value="price:asc">Precio: menor a mayor</option>
            <option value="price:desc">Precio: mayor a menor</option>
            <option value="date:desc">Más recientes</option>
            <option value="rating:desc">Mejor valorados</option>
          </select>
        </div>

        {/* Grid */}
        {products.length === 0 && !loading ? (
          <div className="text-center py-20 text-zinc-400">
            No se encontraron productos con estos filtros.
          </div>
        ) : (
          <div className={isPending || loading ? 'opacity-60 pointer-events-none transition-opacity' : ''}>
            <ProductGrid products={products} />
          </div>
        )}

        {/* Cargar más */}
        {hasMore && (
          <div className="mt-10 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Cargar más productos'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
