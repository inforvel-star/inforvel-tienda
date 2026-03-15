import Link from 'next/link';
import { ShoppingBag, Facebook, Instagram, Twitter, CreditCard } from 'lucide-react';
import { WCCategory } from '@/lib/woocommerce';

interface FooterProps {
  categories?: WCCategory[];
}

export function Footer({ categories = [] }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center transition-transform group-hover:scale-105">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">Inforvel</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Tu tienda de confianza para tecnología y reparaciones. Calidad y
              servicio garantizado.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="#"
                className="w-9 h-9 rounded-full bg-accent flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </Link>
              <Link
                href="#"
                className="w-9 h-9 rounded-full bg-accent flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </Link>
              <Link
                href="#"
                className="w-9 h-9 rounded-full bg-accent flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Categorías</h4>
            <ul className="space-y-3">
              {categories.slice(0, 5).map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/categoria/${category.slug}`}
                    className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Atención al Cliente</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/cuenta"
                  className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
                >
                  Mi cuenta
                </Link>
              </li>
              <li>
                <Link
                  href="/cuenta/pedidos"
                  className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
                >
                  Mis pedidos
                </Link>
              </li>
              <li>
                <Link
                  href="/ayuda"
                  className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
                >
                  Centro de ayuda
                </Link>
              </li>
              <li>
                <Link
                  href="/contacto"
                  className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
                >
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/terminos"
                  className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
                >
                  Términos y condiciones
                </Link>
              </li>
              <li>
                <Link
                  href="/privacidad"
                  className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
                >
                  Política de privacidad
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
                >
                  Política de cookies
                </Link>
              </li>
              <li>
                <Link
                  href="/envios"
                  className="text-sm text-muted-foreground hover:text-blue-500 transition-colors"
                >
                  Envíos y devoluciones
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © {currentYear} Inforvel. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Pagos seguros con:</span>
              <div className="flex items-center gap-2">
                <div className="w-10 h-6 rounded bg-accent flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="w-10 h-6 rounded bg-accent flex items-center justify-center text-[10px] font-bold">
                  VISA
                </div>
                <div className="w-10 h-6 rounded bg-accent flex items-center justify-center text-[10px] font-bold">
                  MC
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
