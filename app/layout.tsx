import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/sonner';
import { woocommerce, WCCategory } from '@/lib/woocommerce';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Inforvel | Tu tienda de tecnología profesional',
  description: 'Descubre los mejores productos tecnológicos, componentes y accesorios. Envío rápido y garantía de calidad.',
  openGraph: {
    title: 'Inforvel | Tu tienda de tecnología profesional',
    description: 'Descubre los mejores productos tecnológicos, componentes y accesorios.',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inforvel | Tu tienda de tecnología profesional',
    description: 'Descubre los mejores productos tecnológicos, componentes y accesorios.',
    images: [
      {
        url: 'https://bolt.new/static/og_default.png',
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let categories: WCCategory[] = [];

  try {
    categories = await woocommerce.getCategories({ per_page: 10 });
  } catch (error) {
    console.error('Error loading categories:', error);
  }

  return (
    <html lang="es">
      <body className={inter.className}>
        <Header categories={categories} />
        <main className="min-h-screen">{children}</main>
        <Footer categories={categories} />
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
