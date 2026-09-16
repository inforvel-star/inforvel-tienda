import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Tienda online de informática en Córdoba',
  description: 'Compra online equipos informáticos, portátiles, smartphones, componentes y accesorios en Córdoba con envío rápido y garantía.',
  alternates: {
    canonical: absoluteUrl('/tienda'),
  },
  openGraph: {
    title: 'Tienda online de informática en Córdoba | Inforvel',
    description: 'Compra online equipos informáticos, portátiles, smartphones, componentes y accesorios en Córdoba con envío rápido y garantía.',
    url: absoluteUrl('/tienda'),
  },
};

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="bg-black px-4 pt-8 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tienda online de informática en Córdoba
          </h1>
        </div>
      </header>
      {children}
    </>
  );
}
