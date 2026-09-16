'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
import { WCProduct } from '@/lib/woocommerce';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { getPrimaryImageSrc } from '@/lib/productVisibility';
import { ProductBadges } from './ProductBadges';

interface ProductCardProps {
  product: WCProduct;
  onAddToCart?: (product: WCProduct) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = getPrimaryImageSrc(product);
  const regularPrice = parseFloat(product.regular_price || '0');
  const currentPrice = parseFloat(product.price || '0');
  const hasDiscount = product.on_sale && regularPrice > currentPrice && currentPrice > 0;
  const discountPct = hasDiscount ? Math.round(((regularPrice - currentPrice) / regularPrice) * 100) : 0;

  if (!imageUrl || imageFailed) {
    return null;
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-black transition-colors duration-200 hover:border-zinc-700">
      {hasDiscount && (
        <Badge className="absolute left-3 top-3 z-10 bg-[#DE350B] text-[10px] font-bold text-white hover:bg-[#DE350B]">
          -{discountPct}%
        </Badge>
      )}

      {product.stock_status === 'outofstock' && (
        <Badge className="absolute right-3 top-3 z-10 bg-zinc-600 text-[10px] text-white hover:bg-zinc-600">
          Agotado
        </Badge>
      )}

      <Link href={`/producto/${product.slug}`} className="block">
        <div className="p-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-white">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              onError={() => setImageFailed(true)}
            />
          </div>
        </div>

        <div className="px-3 pb-4">
          <ProductBadges product={product} className="mb-3" />

          <h3 className="mb-2 min-h-[2.5rem] line-clamp-2 text-sm font-semibold uppercase leading-snug text-white transition-colors group-hover:text-zinc-100 md:text-base">
            {product.name}
          </h3>

          <div className="mb-2">
            {hasDiscount && (
              <span className="mr-2 text-xs text-zinc-500 line-through">
                {product.regular_price}€
              </span>
            )}
            <span className="text-3xl font-extrabold leading-none text-[#3B82F6] md:text-4xl">
              {product.price}€
            </span>
          </div>

          <p className="text-xs font-semibold text-[#22C55E]">
            Envío rápido y garantía
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Soporte Inforvel incluido
          </p>
          {product.stock_status !== 'instock' && (
            <p className="mt-2 flex items-center gap-1 text-xs text-zinc-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Sin stock
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}
