'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { ProductGrid } from '@/components/products/ProductGrid';
import { Button } from '@/components/ui/button';
import { useWishlistStore } from '@/lib/store/wishlistStore';

export default function FavoritosPage() {
  const products = useWishlistStore((state) => state.products);

  return (
    <main className="min-h-screen bg-black px-4 pb-16 pt-24 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-bold md:text-4xl">
            <Heart className="h-8 w-8 text-pink-400" /> Productos guardados
          </h1>
          <p className="mt-3 text-zinc-400">Tu selección se guarda en este dispositivo para que puedas retomarla más tarde.</p>
        </div>

        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-16 text-center">
            <Heart className="mx-auto mb-4 h-10 w-10 text-zinc-600" />
            <h2 className="mb-2 text-xl font-semibold">Todavía no has guardado productos</h2>
            <p className="mb-6 text-zinc-400">Usa “Guardar para más tarde” en cualquier ficha de producto.</p>
            <Button asChild><Link href="/tienda">Explorar la tienda</Link></Button>
          </div>
        )}
      </div>
    </main>
  );
}
