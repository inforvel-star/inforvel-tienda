import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variationId?: number;
  maxStock?: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
  isSyncing: boolean;

  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: number, variationId?: number) => void;
  updateQuantity: (id: number, quantity: number, variationId?: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  getTotal: () => number;
  getItemCount: () => number;

  loadCartFromServer: () => Promise<void>;
  saveCartToServer: () => Promise<void>;
  syncCartOnLogin: () => Promise<void>;
  setItems: (items: CartItem[]) => void;
  setLoading: (loading: boolean) => void;
  setSyncing: (syncing: boolean) => void;
}

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('wc_auth_token');
};

const isUserLoggedIn = (): boolean => {
  return !!getAuthToken();
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      isLoading: false,
      isSyncing: false,

      addItem: async (item) => {
        const items = get().items;
        const existingItemIndex = items.findIndex(
          (i) => i.id === item.id && i.variationId === item.variationId
        );

        if (existingItemIndex > -1) {
          const newItems = [...items];
          const currentQty = newItems[existingItemIndex].quantity;
          const newQty = currentQty + (item.quantity || 1);
          const maxStock = newItems[existingItemIndex].maxStock;

          if (maxStock && newQty > maxStock) {
            newItems[existingItemIndex].quantity = maxStock;
          } else {
            newItems[existingItemIndex].quantity = newQty;
          }

          set({ items: newItems });
        } else {
          set({ items: [...items, { ...item, quantity: item.quantity || 1 }] });
        }

        if (isUserLoggedIn()) {
          await get().saveCartToServer();
        }
      },

      removeItem: async (id, variationId) => {
        set({
          items: get().items.filter(
            (item) => !(item.id === id && item.variationId === variationId)
          ),
        });

        if (isUserLoggedIn()) {
          await get().saveCartToServer();
        }
      },

      updateQuantity: async (id, quantity, variationId) => {
        if (quantity <= 0) {
          await get().removeItem(id, variationId);
          return;
        }

        const items = get().items;
        const itemIndex = items.findIndex(
          (i) => i.id === id && i.variationId === variationId
        );

        if (itemIndex > -1) {
          const newItems = [...items];
          const maxStock = newItems[itemIndex].maxStock;

          if (maxStock && quantity > maxStock) {
            newItems[itemIndex].quantity = maxStock;
          } else {
            newItems[itemIndex].quantity = quantity;
          }

          set({ items: newItems });

          if (isUserLoggedIn()) {
            await get().saveCartToServer();
          }
        }
      },

      clearCart: async () => {
        set({ items: [] });

        if (isUserLoggedIn()) {
          await get().saveCartToServer();
        }
      },

      toggleCart: () => set({ isOpen: !get().isOpen }),

      setCartOpen: (open) => set({ isOpen: open }),

      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      setItems: (items) => set({ items }),

      setLoading: (loading) => set({ isLoading: loading }),

      setSyncing: (syncing) => set({ isSyncing: syncing }),

      loadCartFromServer: async () => {
        const token = getAuthToken();
        if (!token) return;

        try {
          set({ isLoading: true });

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_WC_URL}/wp-json/custom/v1/cart`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.cart)) {
              set({ items: data.cart });
            }
          }
        } catch (error) {
          console.error('Error loading cart from server:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      saveCartToServer: async () => {
        const token = getAuthToken();
        if (!token) return;

        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_WC_URL}/wp-json/custom/v1/cart`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ items: get().items }),
            }
          );

          if (!response.ok) {
            console.error('Error saving cart to server');
          }
        } catch (error) {
          console.error('Error saving cart to server:', error);
        }
      },

      syncCartOnLogin: async () => {
        const token = getAuthToken();
        if (!token) return;

        try {
          set({ isSyncing: true });

          const localItems = get().items;

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_WC_URL}/wp-json/custom/v1/cart`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();

            if (data.success && Array.isArray(data.cart) && data.cart.length > 0) {
              set({ items: data.cart });
            } else if (localItems.length > 0) {
              await fetch(
                `${process.env.NEXT_PUBLIC_WC_URL}/wp-json/custom/v1/cart`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ items: localItems }),
                }
              );
            }
          }
        } catch (error) {
          console.error('Error syncing cart on login:', error);
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
