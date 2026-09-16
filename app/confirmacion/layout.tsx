import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pedido Confirmado',
  robots: { index: false, follow: false },
};

export default function ConfirmacionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
