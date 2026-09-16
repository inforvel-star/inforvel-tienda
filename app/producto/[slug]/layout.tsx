import type { Metadata } from 'next';
import { getBaseUrl } from '@/lib/seo';
import { stripProductHtml } from '@/lib/productContent';
import { getProductForPage } from '@/lib/productPageData';

interface ProductLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

function productDescription(value: string): string {
  const plainText = stripProductHtml(value);

  if (plainText.length <= 155) return plainText;
  return `${plainText.slice(0, 152).trimEnd()}…`;
}

export async function generateMetadata({ params }: ProductLayoutProps): Promise<Metadata> {
  const product = await getProductForPage(params.slug);

  if (!product) {
    return {
      title: 'Producto no encontrado',
      robots: { index: false, follow: false },
    };
  }

  const title = product.name;
  const description = productDescription(product.description)
    || `${product.name} disponible en Inforvel.`;
  const canonical = `${getBaseUrl().replace(/\/+$/, '')}/producto/${product.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
    },
  };
}

export default function ProductLayout({ children }: ProductLayoutProps) {
  return children;
}
