'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Chrome as Home, Star, ShoppingCart, Check, Truck, Shield, MessageSquarePlus, Store, MessageCircle, Heart, Zap, ExternalLink } from 'lucide-react';
import { WCProduct } from '@/lib/woocommerce';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cartStore';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { authAPI } from '@/lib/api/auth';
import { getCanonicalSpecifications } from '@/lib/productSpecifications';
import { ProductBadges } from '@/components/products/ProductBadges';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { useProductTabsStore } from '@/lib/store/productTabsStore';
import {
  capitalizeProductSentences,
  hasReadableProductContent,
  normalizeSupplierHtml,
} from '@/lib/productContent';

interface ProductReview {
  id: number;
  reviewer: string;
  reviewer_avatar_urls?: Record<string, string>;
  review: string;
  rating: number;
  date_created: string;
  verified?: boolean;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character] || character);
}

function extractHighlights(descriptionHtml: string, max = 4): string[] {
  const listMatch = descriptionHtml.match(/<ul[^>]*>([\s\S]*?)<\/ul>/i);
  if (!listMatch) return [];

  return Array.from(listMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((match) => match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((text) => text.length >= 8 && text.length <= 160)
    .slice(0, max);
}

const SPEC_GROUPS: Record<string, string> = {
  'spec-marca': 'General',
  'spec-sistema-operativo': 'General',
  'spec-procesador': 'Rendimiento',
  'spec-ram': 'Rendimiento',
  'spec-almacenamiento': 'Rendimiento',
  'spec-grafica': 'Rendimiento',
  'spec-pantalla': 'Pantalla y diseño',
  'spec-peso': 'Pantalla y diseño',
  'spec-wifi': 'Conectividad',
  'spec-puertos': 'Conectividad',
  'spec-bateria': 'Batería',
};
const SPEC_GROUP_ORDER = ['General', 'Rendimiento', 'Pantalla y diseño', 'Conectividad', 'Batería', 'Otros'];

function getSupplierLogo(html: string): { src: string; alt: string } | null {
  const imageTag = html.match(/<img\b[^>]*>/i)?.[0];
  if (!imageTag) return null;

  const readAttribute = (name: string) =>
    imageTag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, 'i'))?.slice(1).find(Boolean) || '';
  const src = readAttribute('src').replace(/&amp;/gi, '&').trim();

  if (!/^https?:\/\//i.test(src) && !src.startsWith('/')) return null;
  return { src, alt: readAttribute('alt').trim() || 'Marca del producto' };
}

interface ProductPageClientProps {
  product: WCProduct;
  similarProducts?: WCProduct[];
}

export function ProductPageClient({ product, similarProducts = [] }: ProductPageClientProps) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    reviewer: '',
    review: '',
    rating: 5,
  });
  const addItem = useCartStore((state) => state.addItem);
  const wishlistProducts = useWishlistStore((state) => state.products);
  const toggleWishlistProduct = useWishlistStore((state) => state.toggleProduct);
  const isSaved = wishlistProducts.some((item) => item.id === product.id);
  const [activeTab, setActiveTab] = useState('descripcion');
  const [showStickyBar, setShowStickyBar] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const setProductTabs = useProductTabsStore((state) => state.setProductTabs);
  const clearProductTabs = useProductTabsStore((state) => state.clearProductTabs);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-tab-section]'));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) {
          setActiveTab(visible[0].target.getAttribute('data-tab-section') || 'descripcion');
        }
      },
      { rootMargin: '-140px 0px -70% 0px', threshold: 0 }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [product.id]);

  // The sticky tab bar stays hidden until the main "add to cart" buttons in
  // the hero scroll out of view above the viewport, then slides in.
  useEffect(() => {
    const target = ctaRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [product.id]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  useEffect(() => {
    authAPI.getSession().then((session) => {
      setIsLoggedIn(session.authenticated);
      const displayName = authAPI.getUserDisplayName();
      if (displayName) {
        setReviewForm((prev) => ({ ...prev, reviewer: prev.reviewer || displayName }));
      }
    });
  }, []);

  useEffect(() => {
    async function fetchReviews() {
      if (!product?.id) {
        return;
      }

      setReviewsLoading(true);
      try {
        const response = await fetch(`/api/products/${product.id}/reviews`, { cache: 'no-store' });
        const data = await response.json();
        setReviews(data.reviews ?? []);
      } catch (error) {
        console.error('Error loading reviews:', error);
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    }

    fetchReviews();
  }, [product?.id]);

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

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/checkout');
  };

  const handleWishlist = () => {
    const saved = toggleWishlistProduct(product);
    toast.success(saved ? 'Producto guardado para más tarde' : 'Producto eliminado de favoritos');
  };

  const rating = parseFloat(product.average_rating) || 0;
  const showKlarna = Number.parseFloat(product.price) >= 50;
  const discountPercent = product.on_sale && product.regular_price
    ? Math.round((1 - Number.parseFloat(product.price) / Number.parseFloat(product.regular_price)) * 100)
    : 0;
  const reviewsCount = reviews.length || product.rating_count || 0;
  const ratingSource = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : rating;
  const roundedRating = Math.round(ratingSource * 10) / 10;
  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((review) => review.rating === stars).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { stars, count, percentage };
  });
  const visibleAttributes = getCanonicalSpecifications(product, { includeDescription: true });
  const productBrand = product.attributes?.find((attribute) =>
    /^(marca|brand|fabricante)$/i.test(attribute.name.trim()),
  )?.options?.[0] || product.name.split(/\s+/)[0] || '';
  // El atributo "Marca" de WooCommerce suele venir en mayúsculas (p.ej.
  // "APPLE"), y capitalizeProductSentences lo inserta tal cual donde
  // aparezca en el texto — sin esto, cada mención de la marca en el cuerpo
  // de la descripción sale gritando en mayúsculas aunque el texto ya esté
  // bien capitalizado. Se pasa a formato Título salvo siglas cortas (≤3).
  const productBrandDisplay = productBrand.trim().length <= 3
    ? productBrand.trim().toUpperCase()
    : productBrand
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.charAt(0).toLocaleUpperCase('es-ES') + word.slice(1))
        .join(' ');
  const normalizedDescription = capitalizeProductSentences(product.description, [
    productBrandDisplay, 'Intel', 'AMD', 'NVIDIA', 'Windows', 'USB', 'Wi-Fi', 'Bluetooth',
  ]);
  const normalizedShortDescription = normalizeSupplierHtml(product.short_description);
  const supplierLogo = getSupplierLogo(normalizedShortDescription);
  const descriptionHtml = hasReadableProductContent(normalizedDescription)
    ? normalizedDescription
    : `<p><strong>${escapeHtml(product.name)}</strong> disponible en Inforvel con garantía oficial y soporte especializado. Consulta sus especificaciones para confirmar que se adapta a tu uso.</p>`;
  const highlights = extractHighlights(descriptionHtml);
  const groupedSpecifications = useMemo(() => {
    const groups = new Map<string, typeof visibleAttributes>();
    for (const attribute of visibleAttributes) {
      const groupName = SPEC_GROUPS[attribute.slug] || 'Otros';
      const existing = groups.get(groupName) ?? [];
      existing.push(attribute);
      groups.set(groupName, existing);
    }
    return SPEC_GROUP_ORDER
      .map((name) => ({ name, items: groups.get(name) ?? [] }))
      .filter((group) => group.items.length > 0);
  }, [visibleAttributes]);
  const productMeta = new Map(
    (product.meta_data ?? [])
      .map((meta) => [String(meta?.key || '').trim(), String(meta?.value ?? '').trim()] as const)
      .filter(([key, value]) => Boolean(key) && Boolean(value))
  );
  const pickFirstValue = (...values: Array<string | undefined | null>) =>
    values.map((value) => String(value ?? '').trim()).find(Boolean) || null;
  const productReference = pickFirstValue(
    productMeta.get('_megasur_ref'),
    productMeta.get('_megasur_original_sku'),
    product.sku
  );
  const productEan = pickFirstValue(
    productMeta.get('_megasur_ean'),
    productMeta.get('_ean'),
    productMeta.get('ean')
  );
  const productPn = pickFirstValue(
    productMeta.get('_megasur_part_number'),
    productMeta.get('_part_number'),
    productMeta.get('part_number'),
    productMeta.get('pn')
  );
  const technicalIds = [
    { label: 'Ref', value: productReference },
    { label: 'EAN', value: productEan },
    { label: 'PN', value: productPn },
  ].filter((item) => Boolean(item.value));
  const googleReviewsUrl = 'https://www.google.com/maps/search/?api=1&query=Inforvel+C%C3%B3rdoba';
  const whatsappUrl = `https://wa.me/34652369650?text=${encodeURIComponent(`Hola Inforvel, tengo una duda sobre ${product.name} (https://inforvel.online/producto/${product.slug}).`)}`;
  const handleReviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!product) {
      return;
    }

    if (!isLoggedIn) {
      toast.error('Necesitas iniciar sesión para enviar una opinion');
      return;
    }

    if (!reviewForm.reviewer || !reviewForm.review || !reviewForm.rating) {
      toast.error('Completa nombre, puntuacion y opinion');
      return;
    }

    setIsSubmittingReview(true);

    try {
      const response = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo enviar la valoracion');
      }

      setReviews((prev) => [data.review, ...prev]);
      setReviewForm({
        reviewer: '',
        review: '',
        rating: 5,
      });
      toast.success('Valoracion enviada correctamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar la valoracion');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Hand the tab bar off to the site Header: on desktop it replaces the
  // "Blog / Reacondicionados / Campañas" links row once the page scrolls
  // past the main add-to-cart buttons, instead of stacking a new bar.
  useEffect(() => {
    const tabs = [
      { id: 'descripcion', label: 'Descripción', show: Boolean(descriptionHtml) },
      { id: 'especificaciones', label: 'Especificaciones', show: visibleAttributes.length > 0 },
      { id: 'opiniones', label: `Opiniones${reviewsCount > 0 ? ` (${reviewsCount})` : ''}`, show: true },
      { id: 'similares', label: 'Similares', show: similarProducts.length > 0 },
    ].filter((tab) => tab.show).map(({ id, label }) => ({ id, label }));

    setProductTabs({
      tabs,
      activeTab,
      visible: showStickyBar,
      price: `${product.price}€`,
      canAddToCart: product.stock_status === 'instock',
      onTabClick: scrollToSection,
      onAddToCart: handleAddToCart,
    });
  }, [activeTab, showStickyBar, descriptionHtml, visibleAttributes.length, reviewsCount, similarProducts.length, product.price, product.stock_status]);

  useEffect(() => clearProductTabs, [clearProductTabs]);

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
            <div className="relative aspect-[4/3] md:aspect-[5/4] rounded-3xl overflow-hidden border border-border bg-white p-4 md:p-8">
              <Image
                src={product.images[selectedImage]?.src || '/placeholder.png'}
                alt={product.name}
                fill
                className="object-contain p-2 md:p-4"
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
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 bg-white transition-all ${selectedImage === index
                        ? 'border-blue-500'
                        : 'border-border hover:border-blue-500/50'
                      }`}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt || product.name}
                      fill
                      className="object-contain p-2"
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

              <ProductBadges product={product} variant="detail" className="mb-5" />

              {rating > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.round(ratingSource)
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-gray-300'
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {roundedRating.toFixed(1)} ({reviewsCount} reseñas)
                  </span>
                </div>
              )}

              {highlights.length > 0 && (
                <div className="mb-6 rounded-2xl border border-zinc-800 border-l-4 border-l-blue-500 bg-zinc-950/60 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">
                    Lo más destacado
                  </h4>
                  <ul className="space-y-1.5 text-sm text-zinc-300">
                    {highlights.map((item, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-blue-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-4 mb-6 flex-wrap">
                {product.on_sale && product.regular_price && (
                  <span className="text-2xl text-muted-foreground line-through">
                    {product.regular_price}€
                  </span>
                )}
                <span className="text-4xl font-bold text-blue-500">
                  {product.price}€
                </span>
                {discountPercent > 0 && (
                  <span className="rounded-md bg-blue-500/15 px-2 py-1 text-xs font-bold text-blue-300">
                    -{discountPercent}%
                  </span>
                )}
                {showKlarna && (
                  <span className="inline-flex items-center gap-2 rounded-lg bg-[#ffb3c7] px-3 py-2 text-xs font-semibold text-black">
                    <span className="text-base font-black">Klarna.</span> Fracciona tu pago
                  </span>
                )}
              </div>

              <p className="-mt-3 mb-5 text-sm font-medium text-green-400">
                Envío gratis · 24-48h <span className="text-zinc-600">|</span> Recogida gratis en tienda (Córdoba)
              </p>

              <a href={googleReviewsUrl} target="_blank" rel="noopener noreferrer" className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-yellow-500/25 bg-yellow-500/10 px-4 py-3 hover:border-yellow-500/50">
                <div>
                  <p className="font-semibold text-yellow-300">4,6★ en Google · +1.000 clientes</p>
                  <p className="text-xs text-zinc-400">Compra con la confianza de una tienda física en Córdoba.</p>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-yellow-400" />
              </a>

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

              {(technicalIds.length > 0 || supplierLogo) && (
                <div className="mb-6">
                  {technicalIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
                      {technicalIds.map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className="text-muted-foreground">{item.label}:</span>
                          <span className="font-medium text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {supplierLogo && (
                    <img
                      src={supplierLogo.src}
                      alt={supplierLogo.alt}
                      className="mt-4 h-auto max-h-12 w-auto max-w-[150px] object-contain"
                      loading="eager"
                    />
                  )}
                </div>
              )}
            </div>

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

                <div ref={ctaRef} className="grid gap-3 sm:grid-cols-2">
                  <Button size="lg" className="w-full" onClick={handleAddToCart}>
                    <ShoppingCart className="w-5 h-5 mr-2" /> Añadir al carrito
                  </Button>
                  <Button size="lg" variant="outline" className="w-full border-blue-500 text-blue-300 hover:bg-blue-500/10" onClick={handleBuyNow}>
                    <Zap className="w-5 h-5 mr-2" /> Comprar ahora
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="ghost" className="justify-start text-zinc-300" onClick={handleWishlist}>
                    <Heart className={`mr-2 h-5 w-5 ${isSaved ? 'fill-pink-500 text-pink-500' : ''}`} />
                    {isSaved ? 'Guardado para más tarde' : 'Guardar para más tarde'}
                  </Button>
                  <Button variant="ghost" asChild className="justify-start text-green-300">
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-5 w-5" /> ¿Dudas? WhatsApp</a>
                  </Button>
                </div>
                {isSaved && <Link href="/favoritos" className="block text-center text-xs text-pink-300 hover:text-pink-200">Ver productos guardados</Link>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Envío gratis</p>
                  <p className="text-xs text-muted-foreground">Entrega 24-48h</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Recogida gratis</p>
                  <p className="text-xs text-muted-foreground">Tienda de Córdoba</p>
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

              {showKlarna && (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/10 text-xs font-black text-pink-300">K.</div>
                  <div>
                    <p className="font-medium text-sm">Pago con Klarna</p>
                    <p className="text-xs text-muted-foreground">Disponible en checkout</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {descriptionHtml && (
          <div id="descripcion" data-tab-section="descripcion" className="mt-16 pt-16 border-t border-border scroll-mt-32">
            <h2 className="text-2xl font-bold mb-6">Descripción</h2>
            <div
              className="prose prose-neutral dark:prose-invert max-w-4xl leading-8 prose-headings:mt-10 prose-headings:mb-4 prose-p:mb-6 prose-li:my-2 prose-img:my-10 prose-img:rounded-2xl prose-img:bg-white prose-img:p-4 [&_table]:w-full [&_table]:border-separate [&_table]:border-spacing-0 [&_table]:overflow-hidden [&_table]:rounded-2xl [&_table]:border [&_table]:border-zinc-800 [&_tr]:!bg-transparent [&_td]:!bg-zinc-950/60 [&_td]:!text-zinc-300 [&_td]:border-b [&_td]:border-zinc-800 [&_td]:px-4 [&_td]:py-3 [&_td:first-child]:font-semibold [&_td:first-child]:text-zinc-100 [&_td:first-child]:capitalize"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </div>
        )}

        {visibleAttributes.length > 0 && (
          <div id="especificaciones" data-tab-section="especificaciones" className="mt-16 pt-16 border-t border-border scroll-mt-32">
            <h2 className="text-2xl font-bold mb-6">Especificaciones</h2>
            <div className="space-y-8">
              {groupedSpecifications.map((group) => (
                <div key={group.name}>
                  <h3 className="text-sm font-semibold text-blue-400 mb-3">{group.name}</h3>
                  <div className="grid gap-3">
                    {group.items.map((attribute) => (
                      <div
                        key={attribute.slug}
                        className="grid md:grid-cols-[220px_1fr] gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                      >
                        <div className="text-sm font-semibold text-zinc-200">{attribute.name}</div>
                        <div className="text-sm text-zinc-400">{attribute.options.join(', ')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div id="opiniones" data-tab-section="opiniones" className="mt-16 pt-16 border-t border-border scroll-mt-32">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Opiniones</h2>
              <p className="text-sm text-zinc-400">Valoraciones reales de clientes sobre este producto.</p>
            </div>
            <a
              href="#crear-opinion"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Deja tu opinion
            </a>
          </div>

          <div className="grid lg:grid-cols-[280px_1fr] gap-8 mb-10">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
              <div className="text-4xl font-bold text-white mb-2">{reviewsCount > 0 ? roundedRating.toFixed(1) : 'Nuevo'}</div>
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.round(ratingSource) ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-700'}`}
                  />
                ))}
              </div>
              {reviewsCount > 0 ? (
                <p className="text-sm text-zinc-400">{reviewsCount} opiniones registradas</p>
              ) : (
                <a href={googleReviewsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-yellow-300 hover:text-yellow-200">4,6★ en Google · Ver confianza de la tienda</a>
              )}
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6 space-y-3">
              {ratingDistribution.map((item) => (
                <div key={item.stars} className="grid grid-cols-[44px_1fr_38px] items-center gap-3">
                  <span className="text-sm text-zinc-300">{item.stars}★</span>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-400"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 text-right">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <form
            id="crear-opinion"
            onSubmit={handleReviewSubmit}
            className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6 mb-10"
          >
            <h3 className="text-lg font-semibold mb-4">Deja tu opinion</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Tu nombre"
                value={reviewForm.reviewer}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, reviewer: event.target.value }))}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              />
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
                {isLoggedIn ? 'Email verificado desde tu cuenta' : 'Inicia sesión para poder opinar'}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-zinc-300 mb-2">Tu puntuacion</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setReviewForm((prev) => ({ ...prev, rating: value }))}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 ${value <= reviewForm.rating ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-700'
                        }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              placeholder="Cuéntanos tu experiencia con este producto"
              value={reviewForm.review}
              onChange={(event) => setReviewForm((prev) => ({ ...prev, review: event.target.value }))}
              rows={5}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
              <p className="text-xs text-zinc-500">Tu valoracion se publicará en cuanto el sistema la acepte.</p>
              <Button type="submit" disabled={isSubmittingReview || !isLoggedIn}>
                {isSubmittingReview ? 'Enviando...' : 'Añadir opinion'}
              </Button>
            </div>
          </form>

          <div className="space-y-4">
            {reviewsLoading ? (
              <div className="text-sm text-zinc-500">Cargando opiniones...</div>
            ) : reviews.length > 0 ? (
              reviews.map((review) => (
                <div key={review.id} className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-white">{review.reviewer}</span>
                        {review.verified && (
                          <Badge variant="outline" className="border-green-500/30 text-green-400">
                            Compra verificada
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-700'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-zinc-500">
                      {new Date(review.date_created).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <div
                    className="text-sm leading-7 text-zinc-300"
                    dangerouslySetInnerHTML={{ __html: review.review }}
                  />
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">
                Este producto todavía no tiene opiniones. Sé el primero en valorar.
              </div>
            )}
          </div>
        </div>

        {similarProducts.length > 0 && (
          <div id="similares" data-tab-section="similares" className="mt-16 pt-16 border-t border-border scroll-mt-32">
            <h2 className="text-2xl font-bold mb-6">Productos similares</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {similarProducts.map((item) => (
                <Link
                  key={item.id}
                  href={`/producto/${item.slug}`}
                  className="flex-none w-[190px] rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 hover:border-blue-500/50 transition-colors"
                >
                  <div className="relative aspect-square rounded-xl bg-white mb-3 overflow-hidden">
                    <Image
                      src={item.images[0]?.src || '/placeholder.png'}
                      alt={item.name}
                      fill
                      className="object-contain p-3"
                    />
                  </div>
                  <p className="text-xs font-medium text-zinc-200 line-clamp-2 mb-2 min-h-[32px]">{item.name}</p>
                  <p className="text-base font-bold text-blue-500">{item.price}€</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
