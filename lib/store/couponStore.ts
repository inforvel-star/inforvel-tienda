import { create } from 'zustand';

interface CouponStore {
  appliedCoupon: { code: string; discount: number } | null;
  setCoupon: (coupon: { code: string; discount: number } | null) => void;
  removeCoupon: () => void;
}

export const useCouponStore = create<CouponStore>((set) => ({
  appliedCoupon: null,
  setCoupon: (coupon) => set({ appliedCoupon: coupon }),
  removeCoupon: () => set({ appliedCoupon: null }),
}));
