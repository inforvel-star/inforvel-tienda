import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ofertas',
  description: 'Descubre las mejores ofertas en informática: portátiles, smartphones, componentes y más con descuentos exclusivos.',
};

export default function OfertasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
