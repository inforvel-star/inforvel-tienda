import { cache } from 'react';
import { woocommerce } from '@/lib/woocommerce';

export const getProductForPage = cache((slug: string) => woocommerce.getProductBySlug(slug));
