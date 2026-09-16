import { cn } from '@/lib/utils';
import { getProductBadgeIds, PRODUCT_BADGES } from '@/lib/productBadges';
import type { WCProduct } from '@/lib/woocommerce';

interface ProductBadgesProps {
  product: Pick<WCProduct, 'inforvel_badges' | 'meta_data'>;
  variant?: 'card' | 'detail' | 'icons';
  limit?: number;
  className?: string;
}

export function ProductBadges({ product, variant = 'card', limit, className }: ProductBadgesProps) {
  const badgeIds = getProductBadgeIds(product);

  if (badgeIds.length === 0) {
    return null;
  }

  const visibleBadgeIds = typeof limit === 'number' ? badgeIds.slice(0, Math.max(0, limit)) : badgeIds;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)} aria-label="Distintivos del producto">
      {visibleBadgeIds.map((badgeId) => {
        const badge = PRODUCT_BADGES[badgeId];
        const Icon = badge.Icon;
        const label = variant === 'card' ? badge.shortLabel : badge.label;

        if (variant === 'icons') {
          return (
            <span
              key={badge.id}
              title={badge.label}
              aria-label={badge.label}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border shadow-md"
              style={badge.style}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          );
        }

        return (
          <span
            key={badge.id}
            className={cn(
              'inline-flex max-w-full items-center border font-bold uppercase shadow-sm',
              variant === 'card'
                ? 'min-h-[26px] gap-1 rounded-md px-2 py-1 text-[10px] leading-3'
                : 'min-h-[38px] gap-2 rounded-lg px-3 py-2 text-xs leading-4'
            )}
            style={badge.style}
          >
            <Icon className={cn('shrink-0', variant === 'card' ? 'h-3.5 w-3.5' : 'h-5 w-5')} aria-hidden="true" />
            <span className="min-w-0 whitespace-normal">{label}</span>
          </span>
        );
      })}
    </div>
  );
}
