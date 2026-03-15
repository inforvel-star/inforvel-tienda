import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { woocommerce } from '@/lib/woocommerce';
import { ProductGrid } from '@/components/products/ProductGrid';
import Link from 'next/link';
import { ChevronRight, Chrome as Home } from 'lucide-react';

interface CategoryPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const categories = await woocommerce.getCategories();
  const category = categories.find((c) => c.slug === params.slug);

  if (!category) {
    return {
      title: 'Categoría no encontrada',
    };
  }

  return {
    title: `${category.name} | Inforvel`,
    description: category.description || `Explora ${category.name} en Inforvel`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const categories = await woocommerce.getCategories();
  const category = categories.find((c) => c.slug === params.slug);

  if (!category) {
    notFound();
  }

  const products = await woocommerce.getProducts({
    category: category.id.toString(),
    per_page: 24,
  });

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
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
          <span className="font-medium">{category.name}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{category.name}</h1>
          {category.description && (
            <p className="text-muted-foreground">{category.description}</p>
          )}
        </div>

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
  );
}
