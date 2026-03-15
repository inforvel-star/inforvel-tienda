import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Package, Truck, Shield, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { woocommerce, WCProduct, WCCategory } from '@/lib/woocommerce';
import { ProductGrid } from '@/components/products/ProductGrid';

export default async function Home() {
  let featuredProducts: WCProduct[] = [];
  let categories: WCCategory[] = [];

  try {
    [featuredProducts, categories] = await Promise.all([
      woocommerce.getProducts({ per_page: 8, featured: true }),
      woocommerce.getCategories({ per_page: 6 }),
    ]);
  } catch (error) {
    console.error('Error loading data:', error);
  }

  return (
    <div className="flex flex-col">
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Envío gratis en pedidos superiores a 50€
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Tu solución tecnológica{' '}
                <span className="text-blue-500">completa</span>
              </h1>

              <p className="text-lg text-muted-foreground leading-relaxed">
                Descubre los mejores productos tecnológicos, componentes premium y
                accesorios de última generación. Calidad garantizada y servicio
                técnico profesional.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <Link href="/tienda">
                    Explorar tienda
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/servicios">Servicios técnicos</Link>
                </Button>
              </div>
            </div>

            <div className="relative h-[400px] lg:h-[500px] rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-blue-500/10 to-purple-500/10">
              <div className="absolute inset-0 flex items-center justify-center">
                <Package className="w-32 h-32 text-blue-500/20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 border-y border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Envío rápido</h3>
                <p className="text-sm text-muted-foreground">24-48h península</p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Compra segura</h3>
                <p className="text-sm text-muted-foreground">Pago protegido</p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Garantía oficial</h3>
                <p className="text-sm text-muted-foreground">En todos los productos</p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Headphones className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Soporte experto</h3>
                <p className="text-sm text-muted-foreground">Atención personalizada</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Explora por categorías
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Encuentra exactamente lo que necesitas navegando por nuestras
                categorías especializadas
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categoria/${category.slug}`}
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-border bg-card hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
                >
                  {category.image?.src ? (
                    <Image
                      src={category.image.src}
                      alt={category.name}
                      fill
                      className="object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
                  )}

                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <h3 className="font-bold text-lg mb-2 group-hover:text-blue-500 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {category.count} productos
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {featuredProducts.length > 0 && (
        <section className="py-16 md:py-24 bg-card/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Productos destacados
                </h2>
                <p className="text-muted-foreground">
                  Los productos más populares seleccionados para ti
                </p>
              </div>
              <Button variant="outline" asChild className="hidden md:flex">
                <Link href="/tienda">
                  Ver todo
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>

            <ProductGrid products={featuredProducts} />

            <div className="mt-8 text-center md:hidden">
              <Button variant="outline" asChild>
                <Link href="/tienda">
                  Ver todo
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="py-16 md:py-24 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            ¿Necesitas ayuda con tu dispositivo?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Ofrecemos servicios de reparación profesional para móviles, ordenadores
            y otros dispositivos. Diagnóstico gratuito y presupuesto sin compromiso.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="tel:+34652369650">Llamar ahora</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/servicios">Ver servicios</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
