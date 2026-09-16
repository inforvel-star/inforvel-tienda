import type { LucideIcon } from 'lucide-react';
import {
  BadgePercent,
  BriefcaseBusiness,
  Building2,
  Gamepad2,
  House,
  Star,
  Truck,
} from 'lucide-react';
import type { WCProduct } from '@/lib/woocommerce';

export const PRODUCT_BADGE_META_KEY = '_inforvel_product_badges';

export const PRODUCT_BADGE_IDS = [
  'recommended',
  'quality-price',
  'office',
  'remote-work',
  'gaming',
  'business',
  'fast-delivery',
] as const;

export type ProductBadgeId = (typeof PRODUCT_BADGE_IDS)[number];

export interface ProductBadgeDefinition {
  id: ProductBadgeId;
  label: string;
  shortLabel: string;
  Icon: LucideIcon;
  style: {
    backgroundColor: string;
    borderColor: string;
    color: string;
  };
}

export const PRODUCT_BADGES: Record<ProductBadgeId, ProductBadgeDefinition> = {
  recommended: {
    id: 'recommended',
    label: 'Recomendado por Inforvel',
    shortLabel: 'Recomendado',
    Icon: Star,
    style: { backgroundColor: '#08213f', borderColor: '#183c66', color: '#ffffff' },
  },
  'quality-price': {
    id: 'quality-price',
    label: 'Mejor calidad/precio',
    shortLabel: 'Calidad/precio',
    Icon: BadgePercent,
    style: { backgroundColor: '#168c3a', borderColor: '#24a04c', color: '#ffffff' },
  },
  office: {
    id: 'office',
    label: 'Para oficina',
    shortLabel: 'Oficina',
    Icon: BriefcaseBusiness,
    style: { backgroundColor: '#2563eb', borderColor: '#4a8df3', color: '#ffffff' },
  },
  'remote-work': {
    id: 'remote-work',
    label: 'Teletrabajo',
    shortLabel: 'Teletrabajo',
    Icon: House,
    style: { backgroundColor: '#7138b7', borderColor: '#8b55ce', color: '#ffffff' },
  },
  gaming: {
    id: 'gaming',
    label: 'Gaming',
    shortLabel: 'Gaming',
    Icon: Gamepad2,
    style: { backgroundColor: '#f97300', borderColor: '#fb922e', color: '#ffffff' },
  },
  business: {
    id: 'business',
    label: 'Para empresa',
    shortLabel: 'Empresa',
    Icon: Building2,
    style: { backgroundColor: '#c91818', borderColor: '#e33131', color: '#ffffff' },
  },
  'fast-delivery': {
    id: 'fast-delivery',
    label: 'Entrega rápida',
    shortLabel: 'Entrega rápida',
    Icon: Truck,
    style: { backgroundColor: '#087f8c', borderColor: '#169ba8', color: '#ffffff' },
  },
};

function normalizeBadgeValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return value.split(',').map((item) => item.trim());
    }
  }

  return [];
}

export function getProductBadgeIds(product: Pick<WCProduct, 'inforvel_badges' | 'meta_data'>): ProductBadgeId[] {
  const apiValues = normalizeBadgeValues(product.inforvel_badges);
  const metaValues = normalizeBadgeValues(
    product.meta_data?.find((meta) => meta.key === PRODUCT_BADGE_META_KEY)?.value
  );
  const selected = new Set(apiValues.length ? apiValues : metaValues);

  return PRODUCT_BADGE_IDS.filter((badgeId) => selected.has(badgeId));
}
