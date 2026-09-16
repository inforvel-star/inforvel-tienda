import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { ProductGrid } from '@/components/products/ProductGrid';
import { WCProduct } from '@/lib/woocommerce';
import { absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Productos Reacondicionados | Inforvel',
  description: 'Compra productos tecnológicos reacondicionados con garantía al mejor precio. Todos certificados y probados.',
  alternates: {
    canonical: absoluteUrl('/reacondicionados'),
  },
  openGraph: {
    title: 'Productos Reacondicionados | Inforvel',
    description: 'Compra productos tecnológicos reacondicionados con garantía al mejor precio. Todos certificados y probados.',
    url: absoluteUrl('/reacondicionados'),
  },
};

async function getRefurbishedProducts() {
  try {
    const baseUrl = process.env.INTERNAL_APP_URL || process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const response = await fetch(
      `${baseUrl}/api/refurbished?page=1&per_page=24`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching refurbished products:', error);
    return { products: [], total: 0, pages: 0 };
  }
}

export default async function RefurbishedPage() {
  const { products, total } = await getRefurbishedProducts();

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-8">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
          </Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <Link
            href="/tienda"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Tienda
          </Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">Reacondicionados</span>
        </nav>

        {/* Hero Section */}
        <div className="mb-12">
          <div className="inline-block px-3 py-1 text-xs font-semibold bg-green-900/40 text-green-400 rounded-full mb-4">
            Certificados y garantizados
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Productos Reacondicionados</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Tecnología de calidad a mejor precio. Todos nuestros reacondicionados pasan controles de calidad rigurosos
            e incluyen garantía de satisfacción.
          </p>
        </div>

        {/* Product Count */}
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'producto encontrado' : 'productos encontrados'}
          </p>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">No se encontraron productos reacondicionados en este momento.</p>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </div>
  );
}
