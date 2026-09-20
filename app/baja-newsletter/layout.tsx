import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Baja de Newsletter',
  robots: { index: false, follow: false },
};

export default function BajaNewsletterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
