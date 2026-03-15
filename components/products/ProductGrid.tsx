'use client';

import { WCProduct } from '@/lib/woocommerce';
import { ProductCard } from './ProductCard';
import { useCartStore } from '@/lib/store/cartStore';
import { toast } from 'sonner';

interface ProductGridProps {
  products: WCProduct[];
}

export function ProductGrid({ products }: ProductGridProps) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (product: WCProduct) => {
    addItem({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      image: product.images[0]?.src || '/placeholder.png',
      maxStock: product.stock_quantity || undefined,
    });

    toast.success('Producto añadido al carrito', {
      description: product.name,
    });
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se encontraron productos</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={handleAddToCart}
        />
      ))}
    </div>
  );
}
