'use client';

import { useEffect, useState } from 'react';
import { woocommerce, WCProduct } from '@/lib/woocommerce';
import { ProductGrid } from '@/components/products/ProductGrid';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PriceRange {
  min: number;
  max: number;
  label: string;
}

const priceRanges: PriceRange[] = [
  { min: 0, max: 50, label: 'Menos de 50€' },
  { min: 50, max: 100, label: '50€ - 100€' },
  { min: 100, max: 500, label: '100€ - 500€' },
  { min: 500, max: Infinity, label: 'Más de 500€' },
];

export default function TiendaPage() {
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<WCProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<number[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await woocommerce.getProducts({ per_page: 100 });
        setProducts(data);
        setFilteredProducts(data);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = [...products];

    // Filtro de precio
    if (selectedPriceRanges.length > 0) {
      filtered = filtered.filter((product) => {
        const price = parseFloat(product.price);
        return selectedPriceRanges.some((index) => {
          const range = priceRanges[index];
          return price >= range.min && price < range.max;
        });
      });
    }

    // Filtro de disponibilidad
    if (inStockOnly) {
      filtered = filtered.filter((product) => product.stock_status === 'instock');
    }

    // Ordenamiento
    if (sortBy === 'price-asc') {
      filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortBy === 'price-desc') {
      filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }

    setFilteredProducts(filtered);
  }, [products, selectedPriceRanges, inStockOnly, sortBy]);

  const togglePriceRange = (index: number) => {
    setSelectedPriceRanges((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const clearFilters = () => {
    setSelectedPriceRanges([]);
    setInStockOnly(false);
    setSortBy('featured');
  };

  const hasActiveFilters = selectedPriceRanges.length > 0 || inStockOnly;

  return (
    <div className="min-h-screen pt-20 pb-16 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Todos los productos
          </h1>
          <p className="text-zinc-400">
            Descubre nuestro catálogo completo de productos tecnológicos
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/50">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtros
                </h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Precio</h4>
                    <div className="space-y-2">
                      {priceRanges.map((range, index) => (
                        <label key={index} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPriceRanges.includes(index)}
                            onChange={() => togglePriceRange(index)}
                            className="rounded bg-zinc-900 border-zinc-800"
                          />
                          <span className="text-sm text-zinc-400">{range.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-900">
                    <h4 className="text-sm font-medium mb-2">Disponibilidad</h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                        className="rounded bg-zinc-900 border-zinc-800"
                      />
                      <span className="text-sm text-zinc-400">En stock</span>
                    </label>
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      className="w-full border-zinc-800 hover:bg-zinc-900"
                      size="sm"
                      onClick={clearFilters}
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                {loading ? 'Cargando...' : `${filteredProducts.length} productos encontrados`}
              </p>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 rounded-lg border border-zinc-900 bg-zinc-950 text-sm"
              >
                <option value="featured">Destacados</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-zinc-900 rounded-xl mb-4"></div>
                    <div className="h-4 bg-zinc-900 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-zinc-900 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-zinc-400 mb-4">No se encontraron productos con los filtros seleccionados</p>
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              </div>
            ) : (
              <ProductGrid products={filteredProducts} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
