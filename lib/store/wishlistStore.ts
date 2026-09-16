import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WCProduct } from '@/lib/woocommerce';

interface WishlistStore {
  products: WCProduct[];
  hasProduct: (id: number) => boolean;
  toggleProduct: (product: WCProduct) => boolean;
}

function compactProduct(product: WCProduct): WCProduct {
  return {
    ...product,
    description: '',
    short_description: '',
    attributes: [],
    variations: [],
    meta_data: [],
  };
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      products: [],
      hasProduct: (id) => get().products.some((product) => product.id === id),
      toggleProduct: (product) => {
        const exists = get().products.some((item) => item.id === product.id);
        set({
          products: exists
            ? get().products.filter((item) => item.id !== product.id)
            : [compactProduct(product), ...get().products],
        });
        return !exists;
      },
    }),
    { name: 'inforvel-wishlist' },
  ),
);
