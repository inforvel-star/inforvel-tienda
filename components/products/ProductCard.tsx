import Link from 'next/link';
import Image from 'next/image';
import { Star, ShoppingCart } from 'lucide-react';
import { WCProduct } from '@/lib/woocommerce';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: WCProduct;
  onAddToCart?: (product: WCProduct) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const imageUrl = product.images[0]?.src || '/placeholder.png';
  const rating = parseFloat(product.average_rating) || 0;

  return (
    <div className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
      {product.on_sale && (
        <Badge className="absolute top-3 left-3 z-10 bg-red-500 hover:bg-red-600">
          Oferta
        </Badge>
      )}

      {product.stock_status === 'outofstock' && (
        <Badge className="absolute top-3 right-3 z-10 bg-gray-500">
          Agotado
        </Badge>
      )}

      <Link href={`/producto/${product.slug}`} className="block">
        <div className="relative aspect-square bg-accent overflow-hidden">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        <div className="p-4">
          {product.categories.length > 0 && (
            <p className="text-xs text-muted-foreground mb-1">
              {product.categories[0].name}
            </p>
          )}

          <h3 className="font-semibold text-sm line-clamp-2 mb-2 min-h-[2.5rem] group-hover:text-blue-500 transition-colors">
            {product.name}
          </h3>

          {rating > 0 && (
            <div className="flex items-center gap-1 mb-3">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              <span className="text-xs text-muted-foreground">
                {rating.toFixed(1)} ({product.rating_count})
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {product.on_sale && product.regular_price && (
                <span className="text-sm text-muted-foreground line-through">
                  {product.regular_price}€
                </span>
              )}
              <span className="text-lg font-bold text-blue-500">
                {product.price}€
              </span>
            </div>
          </div>
        </div>
      </Link>

      {product.stock_status !== 'outofstock' && (
        <div className="px-4 pb-4">
          <Button
            className="w-full"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              onAddToCart?.(product);
            }}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Añadir al carrito
          </Button>
        </div>
      )}
    </div>
  );
}
