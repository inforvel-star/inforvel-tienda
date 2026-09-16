import { create } from 'zustand';

export interface ProductTabItem {
  id: string;
  label: string;
}

interface ProductTabsState {
  active: boolean;
  tabs: ProductTabItem[];
  activeTab: string;
  visible: boolean;
  price: string | null;
  canAddToCart: boolean;
  onTabClick: (id: string) => void;
  onAddToCart: () => void;
  setProductTabs: (data: Partial<Omit<ProductTabsState, 'setProductTabs' | 'clearProductTabs'>>) => void;
  clearProductTabs: () => void;
}

const initialState = {
  active: false,
  tabs: [] as ProductTabItem[],
  activeTab: '',
  visible: false,
  price: null as string | null,
  canAddToCart: false,
  onTabClick: () => {},
  onAddToCart: () => {},
};

// Lets the product page hand its tab bar (Descripción/Especificaciones/...)
// to the site Header, which swaps its secondary "Blog / Reacondicionados /
// Campañas" links row for these tabs once the page scrolls past the main
// add-to-cart buttons, instead of stacking a second bar below it.
export const useProductTabsStore = create<ProductTabsState>((set) => ({
  ...initialState,
  setProductTabs: (data) => set((state) => ({ ...state, ...data, active: true })),
  clearProductTabs: () => set({ ...initialState }),
}));
