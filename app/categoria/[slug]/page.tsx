import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { woocommerce, wcApi, scoreProductSearch } from '@/lib/woocommerce';
import { isDisplayableProduct } from '@/lib/productVisibility';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { CategoryPageClient } from '@/components/category/CategoryPageClient';
import { getBaseUrl } from '@/lib/seo';
import { getCanonicalSpecifications, specificationTerm } from '@/lib/productSpecifications';
import { jsonLdStringify } from '@/lib/productContent';

interface CategoryPageProps {
  params: { slug: string };
  searchParams?: { search?: string | string[] };
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const category = await woocommerce.getCategoryBySlug(params.slug);
  if (!category) {
    return {
      title: 'Categoría no encontrada',
      robots: { index: false, follow: false },
    };
  }
  const baseUrl = getBaseUrl();
  return {
    title: `${category.name} en Córdoba`,
    description:
      category.description ||
      `Compra ${category.name.toLowerCase()} online en Córdoba con Inforvel. Venta de equipos informáticos, tecnología y accesorios con envío rápido.`,
    alternates: {
      canonical: `${baseUrl}/categoria/${category.slug}`,
    },
    openGraph: {
      title: `${category.name} | Tienda online en Córdoba`,
      description:
        category.description ||
        `Explora ${category.name.toLowerCase()} y compra online en Córdoba con Inforvel.`,
      url: `${baseUrl}/categoria/${category.slug}`,
    },
  };
}

async function getCategoryData(slug: string, searchQuery = '') {
  // 1. Find category by slug
  const catRes = await wcApi.get('/products/categories', {
    params: { slug, per_page: 1 },
  });
  const categories = catRes.data;
  if (!categories?.length) return null;
  const category = categories[0];

  // 2. Get all categories to find children
  const firstCatsRes = await wcApi.get('/products/categories', {
    params: { per_page: 100, page: 1 },
  });
  const categoryPages = Math.max(parseInt(firstCatsRes.headers['x-wp-totalpages'] ?? '1', 10) || 1, 1);
  const remainingCatResponses = categoryPages > 1
    ? await Promise.all(Array.from({ length: categoryPages - 1 }, (_, index) =>
      wcApi.get('/products/categories', { params: { per_page: 100, page: index + 2 } })
    ))
    : [];
  const allCategories = [firstCatsRes, ...remainingCatResponses]
    .flatMap((response) => Array.isArray(response.data) ? response.data : []);
  const categoryIds = new Set<number>([category.id]);
  const queue = [category.id];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = allCategories.filter((c: any) => (c.parent ?? 0) === currentId);
    for (const child of children) {
      if (!categoryIds.has(child.id)) {
        categoryIds.add(child.id);
        queue.push(child.id);
      }
    }
  }

  const categoryParam = Array.from(categoryIds).join(',');

  // 3. Carga inicial. Con búsqueda se ordena el conjunto completo por relevancia
  // estructurada (nombre/marca/modelo antes que descripción), igual que /tienda.
  const firstProductsRes = await wcApi.get('/products', {
    params: {
      category: categoryParam,
      per_page: searchQuery ? 100 : 60,
      page: 1,
      status: 'publish',
      search: searchQuery || undefined,
    },
  });
  const productPages = searchQuery
    ? Math.max(parseInt(firstProductsRes.headers['x-wp-totalpages'] ?? '1', 10) || 1, 1)
    : 1;
  const remainingProductResponses = productPages > 1
    ? await Promise.all(Array.from({ length: productPages - 1 }, (_, index) =>
      wcApi.get('/products', {
        params: {
          category: categoryParam,
          per_page: 100,
          page: index + 2,
          status: 'publish',
          search: searchQuery,
        },
      })
    ))
    : [];
  const availableProducts = [firstProductsRes, ...remainingProductResponses]
    .flatMap((response) => Array.isArray(response.data) ? response.data : [])
    .filter(isDisplayableProduct)
    .map((product, originalIndex) => ({ product, originalIndex, score: searchQuery ? scoreProductSearch(product, searchQuery) : 0 }))
    .sort((left, right) => right.score - left.score || left.originalIndex - right.originalIndex)
    .map(({ product }) => product);
  const products = availableProducts.slice(0, 24);
  const sampledProducts = availableProducts.slice(0, 60);

  // 4. Extraer las mismas especificaciones canónicas que utiliza la API.
  // Evita que la primera vista muestre filtros crudos que luego la API no reconoce.
  const attributeMap: Record<string, any> = {};
  for (const product of sampledProducts) {
    for (const specification of getCanonicalSpecifications(product)) {
      if (!attributeMap[specification.slug]) {
        attributeMap[specification.slug] = {
          id: 0,
          name: specification.name,
          slug: specification.slug,
          terms: {},
        };
      }
      for (const option of specification.options) {
        const key = specificationTerm(option);
        attributeMap[specification.slug].terms[key] = { id: 0, name: option, slug: key };
      }
    }
  }

  // 5. Price range aproximado por muestra (reduce latencia drásticamente)
  const prices = sampledProducts.map((p: any) => parseFloat(p.price)).filter(Boolean);
  const priceRange = {
    min: prices.length ? Math.floor(Math.min(...prices)) : 0,
    max: prices.length ? Math.ceil(Math.max(...prices)) : 9999,
  };

  const totalProducts = searchQuery
    ? availableProducts.length
    : (parseInt(firstProductsRes.headers['x-wp-total'] ?? '0', 10) || products.length);
  const totalPages = Math.max(Math.ceil(totalProducts / 24), 1);

  return {
    category,
    products,
    totalProducts,
    totalPages,
    attributes: Object.values(attributeMap),
    priceRange,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  try {
    const rawSearch = Array.isArray(searchParams?.search) ? searchParams?.search[0] : searchParams?.search;
    const searchQuery = rawSearch?.trim() ?? '';
    const data = await getCategoryData(params.slug, searchQuery);
    if (!data) notFound();

    const { category, products, totalProducts, totalPages, attributes, priceRange } = data;

    const siteBase = getBaseUrl().replace(/\/+$/, '');
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: siteBase },
        { '@type': 'ListItem', position: 2, name: 'Tienda', item: `${siteBase}/tienda` },
        { '@type': 'ListItem', position: 3, name: category.name, item: `${siteBase}/categoria/${category.slug}` },
      ],
    };

    return (
      <div className="min-h-screen pb-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdStringify(breadcrumbSchema) }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-8">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <Home className="w-4 h-4" />
            </Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Link href="/tienda" className="text-muted-foreground hover:text-foreground transition-colors">
              Tienda
            </Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{category.name}</span>
          </nav>

          {/* Título */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{category.name}</h1>
            {category.description && (
              <p className="text-muted-foreground">{category.description}</p>
            )}
          </div>

          {/* Layout con filtros + productos */}
          <CategoryPageClient
            initialProducts={products}
            totalProducts={totalProducts}
            totalPages={totalPages}
            attributes={attributes}
            priceRange={priceRange}
            categorySlug={params.slug}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    );
  } catch (error) {
    if ((error as { digest?: string })?.digest === 'NEXT_NOT_FOUND') throw error;
    console.error('Error loading category:', error);
    notFound();
  }
}
