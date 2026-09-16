import { notFound } from 'next/navigation';
import { ProductPageClient } from '@/components/product/ProductPageClient';
import { getBaseUrl } from '@/lib/seo';
import {
  capitalizeProductSentences,
  correctSupplierAccentErrors,
  hasReadableProductContent,
  jsonLdStringify,
  stripProductHtml,
} from '@/lib/productContent';
import { getProductForPage } from '@/lib/productPageData';
import { woocommerce } from '@/lib/woocommerce';

interface ProductPageProps {
  params: { slug: string };
}

export const revalidate = 300;

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductForPage(params.slug);
  if (!product) notFound();
  const renderedProduct = {
    ...product,
    description: correctSupplierAccentErrors(product.description),
    short_description: correctSupplierAccentErrors(product.short_description),
  };

  const brandName = product.attributes?.find((attribute) =>
    /^(marca|brand|fabricante)$/i.test(attribute.name.trim()),
  )?.options?.[0] || product.name.split(/\s+/)[0] || 'Inforvel';
  // El atributo "Marca" de WooCommerce suele venir en mayúsculas (p.ej.
  // "APPLE"); sin pasarlo a formato Título antes de usarlo como término
  // protegido, cada mención de la marca en el texto (y en el propio JSON-LD
  // de SEO) sale gritando en mayúsculas.
  const brandNameDisplay = brandName.trim().length <= 3
    ? brandName.trim().toUpperCase()
    : brandName
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.charAt(0).toLocaleUpperCase('es-ES') + word.slice(1))
        .join(' ');
  const descriptionHtml = capitalizeProductSentences(product.description, [
    brandNameDisplay, 'Intel', 'AMD', 'NVIDIA', 'Windows', 'USB', 'Wi-Fi', 'Bluetooth',
  ]);
  const description = hasReadableProductContent(descriptionHtml)
    ? stripProductHtml(descriptionHtml).slice(0, 500)
    : `${product.name} disponible en Inforvel con garantía oficial y soporte especializado.`;
  const canonical = `${getBaseUrl().replace(/\/+$/, '')}/producto/${product.slug}`;

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images.map((image) => image.src).filter(Boolean),
    description,
    sku: product.sku || String(product.id),
    brand: {
      '@type': 'Brand',
      name: brandNameDisplay,
    },
    offers: {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'EUR',
      price: product.price,
      availability: product.stock_status === 'instock'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
    aggregateRating: product.rating_count > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.average_rating,
      reviewCount: product.rating_count,
    } : undefined,
  };

  const primaryCategory = product.categories[0];
  const similarProducts = primaryCategory
    ? (await woocommerce.getProducts({ category: String(primaryCategory.id), per_page: 9 }))
        .filter((candidate) => candidate.id !== product.id)
        .slice(0, 8)
    : [];

  const siteBase = getBaseUrl().replace(/\/+$/, '');
  const breadcrumbItems = [
    { name: 'Inicio', item: siteBase },
    { name: 'Tienda', item: `${siteBase}/tienda` },
    ...(primaryCategory ? [{ name: primaryCategory.name, item: `${siteBase}/categoria/${primaryCategory.slug}` }] : []),
    { name: product.name, item: canonical },
  ];
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdStringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdStringify(breadcrumbSchema) }}
      />
      <ProductPageClient product={renderedProduct} similarProducts={similarProducts} />
    </>
  );
}
