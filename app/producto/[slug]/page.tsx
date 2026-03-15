'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Chrome as Home, Star, ShoppingCart, Check, Truck, Shield } from 'lucide-react';
import { woocommerce, WCProduct } from '@/lib/woocommerce';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cartStore';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<WCProduct | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    async function fetchProduct() {
      const prod = await woocommerce.getProductBySlug(params.slug as string);
      if (prod) {
        setProduct(prod);
      }
      setIsLoading(false);
    }
    fetchProduct();
  }, [params.slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-16 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-20 pb-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Producto no encontrado</h1>
          <Button onClick={() => router.push('/tienda')}>Volver a la tienda</Button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      image: product.images[0]?.src || '/placeholder.png',
      quantity,
      maxStock: product.stock_quantity || undefined,
    });

    toast.success('Producto añadido al carrito', {
      description: `${quantity}x ${product.name}`,
    });
  };

  const rating = parseFloat(product.average_rating) || 0;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center gap-2 text-sm mb-8">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
          </Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <Link
            href="/tienda"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Tienda
          </Link>
          {product.categories.length > 0 && (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <Link
                href={`/categoria/${product.categories[0].slug}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {product.categories[0].name}
              </Link>
            </>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-border bg-card">
              <Image
                src={product.images[selectedImage]?.src || '/placeholder.png'}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
              {product.on_sale && (
                <Badge className="absolute top-4 left-4 bg-red-500 hover:bg-red-600">
                  Oferta
                </Badge>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? 'border-blue-500'
                        : 'border-border hover:border-blue-500/50'
                    }`}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt || product.name}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {product.name}
              </h1>

              {rating > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(rating)
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {rating.toFixed(1)} ({product.rating_count} reseñas)
                  </span>
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                {product.on_sale && product.regular_price && (
                  <span className="text-2xl text-muted-foreground line-through">
                    {product.regular_price}€
                  </span>
                )}
                <span className="text-4xl font-bold text-blue-500">
                  {product.price}€
                </span>
              </div>

              {product.stock_status === 'instock' ? (
                <div className="flex items-center gap-2 text-green-500 mb-6">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">En stock</span>
                  {product.stock_quantity && (
                    <span className="text-sm text-muted-foreground">
                      ({product.stock_quantity} disponibles)
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-red-500 font-medium mb-6">Agotado</div>
              )}
            </div>

            {product.short_description && (
              <div
                className="text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.short_description }}
              />
            )}

            {product.stock_status === 'instock' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="font-medium">Cantidad:</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setQuantity(
                          Math.min(
                            product.stock_quantity || 999,
                            quantity + 1
                          )
                        )
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Añadir al carrito
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Envío rápido</p>
                  <p className="text-xs text-muted-foreground">24-48h</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Garantía oficial</p>
                  <p className="text-xs text-muted-foreground">2 años</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {product.description && (
          <div className="mt-16 pt-16 border-t border-border">
            <h2 className="text-2xl font-bold mb-6">Descripción</h2>
            <div
              className="prose prose-neutral dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
