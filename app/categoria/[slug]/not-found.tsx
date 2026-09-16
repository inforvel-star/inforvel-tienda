import type { Metadata } from 'next';
import GlobalNotFound from '@/app/not-found';

export const metadata: Metadata = {
  title: { absolute: 'Categoría no encontrada | Inforvel' },
  robots: { index: false, follow: false },
};

export default GlobalNotFound;
