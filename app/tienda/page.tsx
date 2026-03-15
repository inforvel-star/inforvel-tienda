import { Metadata } from 'next';
import { woocommerce } from '@/lib/woocommerce';
import { ProductGrid } from '@/components/products/ProductGrid';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Tienda | Inforvel',
  description: 'Explora nuestro catálogo completo de productos tecnológicos',
};

export default async function TiendaPage() {
  const products = await woocommerce.getProducts({ per_page: 24 });

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Todos los productos
          </h1>
          <p className="text-muted-foreground">
            Descubre nuestro catálogo completo de productos tecnológicos
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtros
                </h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Precio</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Menos de 50€</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">50€ - 100€</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">100€ - 500€</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Más de 500€</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-medium mb-2">Disponibilidad</h4>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">En stock</span>
                    </label>
                  </div>

                  <Button variant="outline" className="w-full" size="sm">
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {products.length} productos encontrados
              </p>

              <select className="px-4 py-2 rounded-lg border border-border bg-background text-sm">
                <option>Destacados</option>
                <option>Precio: menor a mayor</option>
                <option>Precio: mayor a menor</option>
                <option>Más recientes</option>
              </select>
            </div>

            <ProductGrid products={products} />
          </div>
        </div>
      </div>
    </div>
  );
}
