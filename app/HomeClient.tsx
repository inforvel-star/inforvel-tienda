'use client';

import { ElementType, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Wrench, ShoppingBag, Zap, ShieldCheck, HeartHandshake,
  ArrowRight, Monitor, HardDriveUpload, Fan, Headset,
  Smartphone, Percent, Truck, Sparkles, RotateCcw, Store, Star
} from 'lucide-react';
import { testimonials, testimonialRatingValue } from '@/lib/testimonials';
import { WCProduct } from '@/lib/woocommerce';
import { getPrimaryImageSrc, isDisplayableProduct } from '@/lib/productVisibility';
import { ProductBadges } from '@/components/products/ProductBadges';
import { getBaseUrl, siteConfig, GOOGLE_REVIEWS_URL } from '@/lib/seo';
import {
  defaultWeeklyCampaignConfig,
  getWeeklyCampaignSet,
  normalizeWeeklyCampaignConfig,
  WeeklyBrandCampaign,
  WeeklyCampaignSet,
} from '@/lib/weeklyCampaigns';
import { versionedBannerSrc } from '@/lib/bannerVersion';

interface Service {
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface Step {
  number: number;
  title: string;
  description: string;
}

interface ProductSectionConfig {
  key: string;
  title: string;
  description: string;
  emptyMessage: string;
  hrefFallback: string;
  ctaLabel: string;
  categorySlug?: string;
  orderby?: string;
  order?: 'asc' | 'desc';
}

interface ProductSectionData extends ProductSectionConfig {
  href: string;
  products: WCProduct[];
  bannerSrc?: string;
}

interface CategoryProductsResponse {
  products?: WCProduct[];
}

export interface HomeProductsResponse {
  laptops: WCProduct[];
  smartphones: WCProduct[];
  bestSellers: WCProduct[];
  sales: WCProduct[];
  latest: WCProduct[];
  components: WCProduct[];
  weeklyLaptops: WCProduct[];
}
interface FeaturedCategoryItem {
  title: string;
  description: string;
  href: string;
  image: string;
}

const services: Service[] = [
  { icon: 'smartphone', title: 'Reparación de móviles', description: 'Pantallas, baterías, conectores y placas base. Todas las marcas con repuestos premium.', color: 'text-blue-400' },
  { icon: 'monitor', title: 'Reparación de ordenadores', description: 'Diagnóstico de hardware y software para portátiles y sobremesas.', color: 'text-purple-400' },
  { icon: 'hard-drive-upload', title: 'Instalación de SSD', description: 'Dale una segunda vida a tu equipo multiplicando su velocidad de arranque y carga.', color: 'text-green-400' },
  { icon: 'zap', title: 'Optimización de PC', description: 'Limpieza de virus, optimización de sistema operativo y mejora de rendimiento.', color: 'text-yellow-400' },
  { icon: 'fan', title: 'Limpieza de equipos', description: 'Mantenimiento térmico, cambio de pasta térmica y limpieza interna profunda.', color: 'text-cyan-400' },
  { icon: 'headset', title: 'Soporte técnico', description: 'Asesoramiento experto remoto y presencial para cualquier problema tecnológico.', color: 'text-pink-400' },
];

const steps: Step[] = [
  { number: 1, title: 'Contacta', description: 'Llámanos o escríbenos' },
  { number: 2, title: 'Diagnóstico', description: 'Evaluamos el problema' },
  { number: 3, title: 'Reparación', description: 'Solucionamos rápido' },
  { number: 4, title: 'Listo', description: 'Dispositivo como nuevo' },
];

const categorySections: ProductSectionConfig[] = [
  {
    key: 'laptops',
    title: 'Portátiles destacados',
    description: 'Equipos listos para estudiar, trabajar o jugar, elegidos para rendir desde el primer día.',
    emptyMessage: 'No hemos encontrado portátiles para mostrar ahora mismo.',
    hrefFallback: '/tienda',
    ctaLabel: 'Ver portátiles',
    categorySlug: 'portatiles',
    orderby: 'date',
    order: 'desc',
  },
  {
    key: 'smartphones',
    title: 'Smartphones recomendados',
    description: 'Modelos seleccionados para que encuentres móvil rápido, fiable y al mejor precio.',
    emptyMessage: 'No hemos encontrado smartphones para mostrar ahora mismo.',
    hrefFallback: '/tienda',
    ctaLabel: 'Ver smartphones',
    categorySlug: 'smartphones',
    orderby: 'date',
    order: 'desc',
  },
];

const bestSellerSection: ProductSectionConfig = {
  key: 'best-sellers',
  title: 'Lo más vendido',
  description: 'Los productos que más están saliendo y mejor están funcionando entre nuestros clientes.',
  emptyMessage: 'Ahora mismo no hay productos destacados en esta sección.',
  hrefFallback: '/tienda',
  ctaLabel: 'Ver todo el catálogo',
  orderby: 'popularity',
  order: 'desc',
};

const HOMEPAGE_PRODUCT_LIMIT = 6;
const HOMEPAGE_FETCH_POOL = 12;
const WEEKLY_BRAND_FETCH_POOL = 24;
const HOMEPAGE_TIMEOUT_MS = 8000;

const featuredCategoryItems: FeaturedCategoryItem[] = [
  { title: 'Portátiles', description: 'Trabajo, estudio y gaming', href: '/categoria/portatiles', image: '/categorias/portatiles.webp' },
  { title: 'Smartphones', description: 'Gama media y alta', href: '/categoria/smartphones', image: '/categorias/smartphones.webp' },
  { title: 'Componentes', description: 'SSD, RAM, placas y más', href: '/tienda?search=ssd', image: '/categorias/componentes.webp' },
  { title: 'Monitores', description: 'Oficina y productividad', href: '/tienda?search=monitor', image: '/categorias/monitores.webp' },
  { title: 'Impresoras', description: 'Hogar y empresa', href: '/tienda?search=impresora', image: '/categorias/impresoras.webp' },
  { title: 'Accesorios', description: 'Teclados, ratones y más', href: '/tienda?search=teclado', image: '/categorias/accesorios.webp' },
  { title: 'Reacondicionados', description: 'Calidad con garantía', href: '/reacondicionados', image: '/categorias/reacondicionados.webp' },
  { title: 'Ofertas', description: 'Descuentos activos', href: '/ofertas', image: '/categorias/ofertas.webp' },
];

function buildImageCandidates(product: WCProduct): string[] {
  const out: string[] = [];
  const push = (value?: string | null) => {
    const src = String(value || '').trim();
    if (src && !out.includes(src)) out.push(src);
  };

  push(getPrimaryImageSrc(product));
  for (const image of product.images || []) {
    push(image?.src);
  }

  const extra: string[] = [];
  for (const src of out) {
    extra.push(src.replace(/-0(\.(?:jpe?g|png|webp|avif))(\?.*)?$/i, '-0-3$1$2'));
    extra.push(src.replace(/-0(\.(?:jpe?g|png|webp|avif))(\?.*)?$/i, '$1$2'));
    extra.push(src.replace(/-0-\d+(\.(?:jpe?g|png|webp|avif))(\?.*)?$/i, '-0$1$2'));
  }
  for (const src of extra) push(src);

  push('/placeholder.png');
  return out;
}

function SafeCardImage({ product, alt }: { product: WCProduct; alt: string }) {
  const candidates = useMemo(() => buildImageCandidates(product), [product]);
  const [index, setIndex] = useState(0);

  return (
    <Image
      src={candidates[index] || '/placeholder.png'}
      alt={alt}
      fill
      className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
      onError={() => setIndex((prev) => (prev < candidates.length - 1 ? prev + 1 : prev))}
    />
  );
}

const faqItems = [
  {
    question: '¿Qué vende Inforvel online en Córdoba?',
    answer: 'Vendemos ordenadores, portátiles, móviles, tablets, consumibles de impresora (tinta y tóner), componentes y accesorios informáticos. Todo con envío rápido desde Córdoba a cualquier punto de España.',
  },
  {
    question: '¿Puedo comprar equipos informáticos online desde cualquier punto de España?',
    answer: 'Sí. Nuestra tienda es 100% online y enviamos a toda España. Clientes de Córdoba y alrededores también pueden beneficiarse de nuestro servicio técnico a domicilio.',
  },
  {
    question: '¿Inforvel también ofrece reparación de móviles y ordenadores?',
    answer: 'Sí, reparamos tanto móviles como ordenadores. Nuestro técnico puede desplazarse a domicilio en Córdoba el mismo día, y contamos con valoraciones de clientes que destacan la rapidez, profesionalidad y buen precio del servicio.',
  },
];

const icons: Record<string, ElementType> = {
  smartphone: Smartphone,
  monitor: Monitor,
  'hard-drive-upload': HardDriveUpload,
  zap: Zap,
  fan: Fan,
  headset: Headset,
};

const getIcon = (iconName: string, color: string) => {
  const IconComponent = icons[iconName] || Smartphone;
  return <IconComponent className={`w-6 h-6 ${color}`} />;
};

function toEmptySection(section: ProductSectionConfig): ProductSectionData {
  return {
    ...section,
    href: section.hrefFallback,
    products: [],
  };
}

function uniqueById(products: WCProduct[]): WCProduct[] {
  const seen = new Set<number>();
  const result: WCProduct[] = [];
  for (const product of products) {
    if (!seen.has(product.id) && isDisplayableProduct(product)) {
      seen.add(product.id);
      result.push(product);
    }
  }
  return result;
}

function takeHomepageProducts(products: WCProduct[]): WCProduct[] {
  return uniqueById(products).slice(0, HOMEPAGE_PRODUCT_LIMIT);
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = HOMEPAGE_TIMEOUT_MS): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeProductContext(product: WCProduct): string {
  const title = (product.name || '').toLowerCase();
  const categories = (product.categories || [])
    .map((category) => (category?.name || '').toLowerCase())
    .join(' ');
  return `${title} ${categories}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function filterSmartphoneProducts(products: WCProduct[]): WCProduct[] {
  const include = /\b(smartphone|iphone|galaxy|redmi|poco|motorola|moto g|moto e|pixel|telefono movil|movil libre|5g)\b/i;
  const exclude = /\b(funda|protector|cargador|powerbank|cable|adaptador|usb wifi|tarjeta de red|soporte|elevador monitor|monitor|desinfectante|higienizante|limpiador|spray|cartucho|toner|tinta)\b/i;
  return products.filter((product) => {
    const ctx = normalizeProductContext(product);
    return include.test(ctx) && !exclude.test(ctx);
  });
}

function filterLaptopProducts(products: WCProduct[]): WCProduct[] {
  const include = /\b(portatil|notebook|laptop|macbook|chromebook|thinkpad|elitebook|ideapad|vivobook|zenbook|ultrabook|surface laptop)\b/i;
  const exclude = /\b(cable|kit|router|carcasa|filtro|privacidad|adaptador|adaptador de red|usb wifi|wifi usb|tarjeta de red|dongle|soporte|elevador monitor|base refrigeradora|base|dock|docking|estacion|funda|mochila|maletin|cargador|bateria|repuesto|protector|pantalla|teclado|raton|bolsa|cartucho|toner|tinta|altavoz|aire acondicionado)\b/i;
  return products.filter((product) => {
    const ctx = normalizeProductContext(product);
    return include.test(ctx) && !exclude.test(ctx);
  });
}

function filterProductsByBrand(products: WCProduct[], brand: string): WCProduct[] {
  const normalizedBrand = brand.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!normalizedBrand) return [];

  return products.filter((product) => {
    const brandContext = [
      product.name || '',
      ...(product.attributes || []).flatMap((attribute) => [
        attribute?.name || '',
        ...(attribute?.options || []),
      ]),
    ]
      .join(' ')
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const escapedBrand = normalizedBrand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escapedBrand}([^a-z0-9]|$)`, 'i').test(brandContext);
  });
}

function ProductShowcase({
  section,
  loading,
}: {
  section: ProductSectionData;
  loading: boolean;
}) {
  return (
    <section className="py-12 md:py-16 relative border-t border-zinc-900 bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6">
        {section.bannerSrc ? (
          <Link href={section.href} className="group relative mb-6 block aspect-[3/1] overflow-hidden rounded-2xl">
            <Image
              src={versionedBannerSrc(section.bannerSrc)}
              alt={section.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="100vw"
            />
          </Link>
        ) : (
          <div className="flex flex-row items-end justify-between mb-6 gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-1">{section.title}</h2>
              <p className="text-sm text-zinc-400 max-w-2xl">{section.description}</p>
            </div>
            <Link
              href={section.href}
              className="shrink-0 text-center px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors text-xs md:text-sm"
            >
              {section.ctaLabel}
            </Link>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-zinc-900 rounded-xl mb-3"></div>
                <div className="h-4 bg-zinc-900 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-zinc-900 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : section.products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {section.products.map((product) => (
              <Link
                key={product.id}
                href={`/producto/${product.slug}`}
                className="group rounded-xl border border-zinc-900 bg-black/40 p-2 transition-all hover:border-blue-500/50 hover:bg-zinc-950"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-white mb-3">
                  {product.on_sale && (
                    <span className="absolute left-2 top-2 z-10 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                      Oferta
                    </span>
                  )}
                  <SafeCardImage product={product} alt={product.name} />
                  <ProductBadges
                    product={product}
                    variant="icons"
                    limit={1}
                    className="absolute right-2 top-2 z-10"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 line-clamp-1 mb-1">{product.categories[0]?.name ?? 'Inforvel'}</p>
                <h3 className="text-xs font-medium mb-2 line-clamp-2 min-h-[2rem] group-hover:text-blue-400 transition-colors">{product.name}</h3>
                <div className="flex flex-wrap items-baseline gap-1.5">
                  {product.on_sale && product.regular_price && (
                    <span className="text-[11px] text-zinc-500 line-through">{product.regular_price}€</span>
                  )}
                  <span className="text-sm md:text-base font-bold text-blue-400">{product.price}€</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-8 text-zinc-400">
            {section.emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}

function HeroProductStrip({ products, loading }: { products: WCProduct[]; loading: boolean }) {
  const items = products.slice(0, 6);

  if (!loading && items.length === 0) return null;

  return (
    <section className="border-t border-zinc-900 bg-black py-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {loading
            ? [...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square rounded-lg bg-zinc-900 mb-2"></div>
                  <div className="h-3 bg-zinc-900 rounded w-3/4"></div>
                </div>
              ))
            : items.map((product) => (
                <Link
                  key={product.id}
                  href={`/producto/${product.slug}`}
                  className="group rounded-lg border border-zinc-900 bg-[#050505] p-2 transition-colors hover:border-blue-500/50"
                >
                  <div className="relative aspect-square rounded-md overflow-hidden bg-white mb-2">
                    <SafeCardImage product={product} alt={product.name} />
                  </div>
                  <p className="text-[11px] leading-tight text-zinc-300 line-clamp-2 mb-1 group-hover:text-blue-300 transition-colors">
                    {product.name}
                  </p>
                  <span className="text-xs font-bold text-blue-400">{product.price}€</span>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = [
    { icon: Truck, label: 'Envío rápido a toda España' },
    { icon: RotateCcw, label: 'Devoluciones en 14 días' },
    { icon: ShieldCheck, label: 'Garantía en todos los productos' },
    { icon: Store, label: 'Recogida en tienda · Córdoba' },
  ];

  return (
    <section className="border-t border-zinc-900 bg-black py-5">
      <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center">
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-sm text-zinc-300">
            <Icon className="w-4 h-4 text-blue-400 shrink-0" />
            {label}
          </div>
        ))}
        <a
          href={GOOGLE_REVIEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-medium text-white hover:text-blue-300 transition-colors"
        >
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
          {testimonialRatingValue}★ en Google · +1.000 clientes
        </a>
      </div>
    </section>
  );
}

// TODO: las imágenes de abajo llevan el lockup "inforvel.online" quemado en
// la propia imagen (no es un overlay del componente, no se puede quitar por
// código). Regenerar sin esa marca en el archivo de diseño y sustituir
// manteniendo el mismo nombre:
//   public/banners/top-home/imagen1.webp
//   public/banners/top-home/imagen2.webp
//   public/banners/top-home/imagen3.webp
interface TopBanner {
  image: string;
  href: string;
  alt: string;
  title?: string;
  subtitle?: string;
}

const topHomeBanners: TopBanner[] = [
  { image: '/banners/top-home/imagen1.webp', href: '/categoria/portatiles', alt: 'Promoción portátiles' },
  { image: '/banners/top-home/imagen2.webp', href: '/categoria/smartphones', alt: 'Promoción smartphones' },
  { image: '/banners/top-home/imagen3.webp', href: '/ofertas', alt: 'Ofertas activas' },
];

function TopHomeBanners() {
  return (
    <section className="border-t border-zinc-900 bg-black py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {topHomeBanners.map((banner) => (
            <Link
              key={banner.image}
              href={banner.href}
              className="group relative aspect-[500/320] overflow-hidden rounded-2xl border border-zinc-900"
            >
              <Image
                src={versionedBannerSrc(banner.image)}
                alt={banner.alt}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              {(banner.title || banner.subtitle) && (
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-4">
                  {banner.title && <h3 className="text-lg font-bold text-white">{banner.title}</h3>}
                  {banner.subtitle && <p className="text-sm text-zinc-200">{banner.subtitle}</p>}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

interface ExpertCard {
  image: string;
  href: string;
  title: string;
}

const expertCards: ExpertCard[] = [
  { image: '/banners/expertos/imagen1.webp', href: '/reparacion-informatica-cordoba', title: 'Nuestro equipo experto te ayuda a elegir' },
  { image: '/banners/expertos/imagen2.webp', href: '/tienda', title: 'Asesoramiento técnico sin compromiso' },
];

function ExpertsSection() {
  return (
    <section className="border-t border-zinc-900 bg-black py-12 md:py-14">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {expertCards.map((card) => (
            <Link
              key={card.image}
              href={card.href}
              className="group relative aspect-[3/2] overflow-hidden rounded-2xl border border-zinc-900"
            >
              <Image
                src={versionedBannerSrc(card.image)}
                alt={card.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// Reseñas reales seleccionadas de lib/testimonials.ts (mismas 14 reseñas que
// alimentan el ratingValue/reviewCount del JSON-LD de SEO). Elegidas por
// variedad (reparación, compra online, cliente empresa) y longitud legible —
// no se ha escrito ni modificado ningún texto.
const featuredTestimonialNames = ['Rafa Vilches', 'Alba Gallego', 'JJ Hosteleria', 'Fran Gómez'];

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function TestimonialsSection() {
  const featured = testimonials.filter((t) => featuredTestimonialNames.includes(t.name));

  if (featured.length === 0) return null;

  return (
    <section className="border-t border-zinc-900 bg-black py-14 md:py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Lo que dicen nuestros clientes</h2>
            <p className="mt-1 text-sm text-zinc-400">Reseñas reales de Google, sin filtrar.</p>
          </div>
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs md:text-sm px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors"
          >
            Ver en Google
          </a>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((t) => (
            <div key={t.name} className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-sm font-semibold text-blue-300">
                  {getInitials(t.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  <div className="flex text-yellow-500">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-yellow-500" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-zinc-400 line-clamp-4">{t.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function KlarnaBanner() {
  return (
    <section className="border-t border-zinc-900 bg-black py-8">
      <div className="max-w-7xl mx-auto px-6">
        <a
          href="https://www.klarna.com/es/"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block aspect-[3/1] overflow-hidden rounded-2xl"
        >
          <Image
            src={versionedBannerSrc('/banners/klarna/imagen1.webp')}
            alt="Compra ahora, paga después con Klarna"
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="100vw"
          />
        </a>
      </div>
    </section>
  );
}

function PromoBanners({
  featuredProducts,
}: {
  featuredProducts: WCProduct[];
}) {
  void featuredProducts;

  return (
    <section className="border-t border-zinc-900 bg-black py-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/ofertas" className="group relative min-h-[170px] overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-600/25 via-orange-500/10 to-zinc-950 p-5">
            <div className="relative z-10 max-w-[65%]">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300">
                <Percent className="h-3.5 w-3.5" />
                Ofertas activas
              </div>
              <h2 className="text-2xl font-black leading-tight">Precios destacados de la semana</h2>
              <p className="mt-2 text-sm text-zinc-300">Portátiles, monitores y componentes seleccionados.</p>
            </div>
          </Link>

          <Link href="/reacondicionados" className="group relative min-h-[170px] overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/25 via-purple-500/10 to-zinc-950 p-5">
            <div className="relative z-10 max-w-[68%]">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-300">
                <Sparkles className="h-3.5 w-3.5" />
                Reacondicionados
              </div>
              <h2 className="text-2xl font-black leading-tight">Tecnología con garantía</h2>
              <p className="mt-2 text-sm text-zinc-300">Equipos revisados para comprar mejor.</p>
            </div>
          </Link>

          <Link href="/tienda" className="group relative min-h-[170px] overflow-hidden rounded-2xl border border-green-500/20 bg-gradient-to-br from-emerald-600/20 via-cyan-500/10 to-zinc-950 p-5">
            <div className="relative z-10 max-w-[68%]">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-green-300">
                <Truck className="h-3.5 w-3.5" />
                Envío rápido
              </div>
              <h2 className="text-2xl font-black leading-tight">Compra online sin vueltas</h2>
              <p className="mt-2 text-sm text-zinc-300">Stock, precio claro y soporte cercano.</p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

function getDiscountPercent(product: WCProduct) {
  const price = parseFloat(product.price);
  const regularPrice = parseFloat(product.regular_price || '');

  if (!price || !regularPrice || regularPrice <= price) {
    return null;
  }

  return Math.round(((regularPrice - price) / regularPrice) * 100);
}

// TODO: mismo caso que TopHomeBanners — el lockup "inforvel.online" está
// quemado en el diseño de estos banners (marca de la semana + Klarna), no es
// un overlay de código. Regenerar sin la marca y sustituir manteniendo el
// mismo nombre de archivo:
//   public/banners/brand-week/laptops/hp.webp
//   public/banners/brand-week/laptops/lenovo.webp
//   public/banners/brand-week/laptops/msi.webp
//   public/banners/brand-week/laptops/apple.webp
//   public/banners/brand-week/smartphones/samsung.webp
//   public/banners/brand-week/smartphones/xiaomi.webp
//   public/banners/brand-week/smartphones/apple.webp
//   public/banners/brand-week/smartphones/motorola.webp
//   public/banners/klarna/imagen1.webp
//   public/banners/expertos/imagen1.webp
//   public/banners/expertos/imagen2.webp
function HpLaptopWeekSection({
  products,
  loading,
  campaign,
}: {
  products: WCProduct[];
  loading: boolean;
  campaign: WeeklyBrandCampaign;
}) {
  return (
    <section className="border-t border-zinc-900 bg-black py-12 md:py-14">
      <div className="max-w-7xl mx-auto px-6">
        {campaign.banner ? (
          <Link href={campaign.href} className="group relative mb-7 block aspect-[3/1] overflow-hidden rounded-2xl">
            <Image
              src={versionedBannerSrc(campaign.banner)}
              alt={campaign.label}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="100vw"
            />
          </Link>
        ) : (
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">{campaign.label}</p>
              <h2 className="text-xl font-bold text-white md:text-2xl">
                {campaign.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">{campaign.description}</p>
            </div>
            <Link
              href={campaign.href}
              className="shrink-0 inline-flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
            >
              {campaign.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="mb-4 aspect-[4/3] rounded-xl bg-zinc-900" />
                <div className="mb-2 h-4 w-5/6 rounded bg-zinc-900" />
                <div className="h-4 w-1/2 rounded bg-zinc-900" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {products.map((product) => {
              const discountPercent = getDiscountPercent(product);
              const rating = parseFloat(product.average_rating) || 0;

              return (
                <Link
                  key={product.id}
                  href={`/producto/${product.slug}`}
                  className="group relative rounded-xl border border-zinc-900 bg-[#050505] p-3 transition-all hover:border-blue-500/50 hover:bg-zinc-950"
                >
                  <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-lg bg-white">
                    <SafeCardImage product={product} alt={product.name} />
                    {discountPercent && (
                      <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-[11px] font-bold text-white">
                        -{discountPercent}%
                      </span>
                    )}
                    <ProductBadges
                      product={product}
                      variant="icons"
                      limit={1}
                      className="absolute right-2 top-2 z-10"
                    />
                  </div>

                  <p className="mb-2 min-h-[2.5rem] text-sm leading-snug text-zinc-300 line-clamp-2 group-hover:text-blue-300">
                    {product.name}
                  </p>

                  <div className="mb-2 flex flex-wrap items-baseline gap-2">
                    <span className="text-xl font-black text-blue-400">{product.price}€</span>
                    {product.regular_price && product.regular_price !== product.price && (
                      <span className="text-xs text-zinc-500 line-through">{product.regular_price}€</span>
                    )}
                  </div>

                  <div className="space-y-1 text-[11px] leading-tight">
                    {rating > 0 && (
                      <p className="text-zinc-400">
                        <span className="font-semibold text-zinc-200">{rating.toFixed(1)}/5</span>
                        <span className="text-yellow-500"> ★ </span>
                        {product.rating_count} opiniones
                      </p>
                    )}
                    <p className="font-semibold text-green-400">Envío rápido y garantía</p>
                    <p className="text-zinc-500">Soporte Inforvel incluido</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-8 text-zinc-400">
            {campaign.emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}

interface HomeProps {
  initialProducts: HomeProductsResponse | null;
  initialCampaigns: WeeklyCampaignSet;
}

function buildInitialCategorySections(
  preloaded: HomeProductsResponse | null,
  campaigns: WeeklyCampaignSet
): ProductSectionData[] {
  if (!preloaded) return categorySections.map(toEmptySection);

  return [
    {
      ...categorySections[0],
      href: '/categoria/portatiles',
      products: takeHomepageProducts(filterLaptopProducts(preloaded.laptops ?? [])),
    },
    {
      ...categorySections[1],
      title: campaigns.smartphones.title,
      description: campaigns.smartphones.description,
      ctaLabel: campaigns.smartphones.ctaLabel,
      emptyMessage: campaigns.smartphones.emptyMessage,
      href: campaigns.smartphones.href,
      bannerSrc: campaigns.smartphones.banner,
      products: takeHomepageProducts(
        filterProductsByBrand(
          filterSmartphoneProducts(preloaded.smartphones ?? []),
          campaigns.smartphones.brand
        )
      ),
    },
  ];
}

export default function Home({ initialProducts, initialCampaigns }: HomeProps) {
  const [categoryProductSections, setCategoryProductSections] = useState<ProductSectionData[]>(
    () => buildInitialCategorySections(initialProducts, initialCampaigns)
  );
  const [bestSellerProducts, setBestSellerProducts] = useState<WCProduct[]>(() =>
    takeHomepageProducts(initialProducts?.bestSellers ?? [])
  );
  const [saleProducts, setSaleProducts] = useState<WCProduct[]>(() =>
    takeHomepageProducts(initialProducts?.sales ?? [])
  );
  const [latestProducts, setLatestProducts] = useState<WCProduct[]>(() =>
    takeHomepageProducts(initialProducts?.latest ?? [])
  );
  const [componentProducts, setComponentProducts] = useState<WCProduct[]>(() =>
    takeHomepageProducts(initialProducts?.components ?? [])
  );
  const [hpLaptopProducts, setHpLaptopProducts] = useState<WCProduct[]>(() =>
    takeHomepageProducts(
      filterProductsByBrand(
        filterLaptopProducts(initialProducts?.weeklyLaptops ?? []),
        initialCampaigns.laptops.brand
      )
    )
  );
  const [weeklyCampaigns, setWeeklyCampaigns] = useState<WeeklyCampaignSet>(initialCampaigns);
  const [loading, setLoading] = useState(!initialProducts);
  const [heroGlow, setHeroGlow] = useState({ x: 50, y: 50 });
  const [isCordobaVisitor, setIsCordobaVisitor] = useState(false);
  const baseUrl = getBaseUrl();

  useEffect(() => {
    async function loadProducts() {
      try {
        let campaignConfig = defaultWeeklyCampaignConfig;
        try {
          const configPayload = await fetchJsonWithTimeout<any>('/api/weekly-campaigns', 8000);
          if (configPayload) {
            campaignConfig = normalizeWeeklyCampaignConfig(configPayload);
          }
        } catch (error) {
          console.warn('Weekly campaigns config fallback to defaults:', error);
        }

        const campaigns = getWeeklyCampaignSet(campaignConfig);
        setWeeklyCampaigns(campaigns);

        const preloaded = await fetchJsonWithTimeout<HomeProductsResponse>(
          `/api/home-products?laptop_brand=${encodeURIComponent(campaigns.laptops.brand)}&smartphone_brand=${encodeURIComponent(campaigns.smartphones.brand)}`,
          12000
        );

        if (preloaded) {
          const weeklySmartphones = takeHomepageProducts(
            filterProductsByBrand(
              filterSmartphoneProducts(preloaded.smartphones ?? []),
              campaigns.smartphones.brand
            )
          );
          const weeklyLaptops = takeHomepageProducts(
            filterProductsByBrand(
              filterLaptopProducts(preloaded.weeklyLaptops ?? []),
              campaigns.laptops.brand
            )
          );

          setCategoryProductSections([
            {
              ...categorySections[0],
              href: '/categoria/portatiles',
              products: takeHomepageProducts(filterLaptopProducts(preloaded.laptops ?? [])),
            },
            {
              ...categorySections[1],
              title: campaigns.smartphones.title,
              description: campaigns.smartphones.description,
              ctaLabel: campaigns.smartphones.ctaLabel,
              emptyMessage: campaigns.smartphones.emptyMessage,
              href: campaigns.smartphones.href,
              bannerSrc: campaigns.smartphones.banner,
              products: weeklySmartphones,
            },
          ]);
          setBestSellerProducts(takeHomepageProducts(preloaded.bestSellers ?? []));
          setSaleProducts(takeHomepageProducts(preloaded.sales ?? []));
          setLatestProducts(takeHomepageProducts(preloaded.latest ?? []));
          setComponentProducts(takeHomepageProducts(preloaded.components ?? []));
          setHpLaptopProducts(weeklyLaptops);
          return;
        }

        const categorySectionsPromise = Promise.all(
          categorySections.map(async (section) => {
            const slug = section.categorySlug;
            if (!slug) {
              return toEmptySection(section);
            }

            if (section.key === 'smartphones') {
              const brandProductsRaw = await fetchJsonWithTimeout<WCProduct[]>(
                `/api/products?per_page=${WEEKLY_BRAND_FETCH_POOL}&category_slug=smartphones&search=${encodeURIComponent(campaigns.smartphones.brand)}&orderby=date&order=desc`
              ) ?? [];
              const products = takeHomepageProducts(
                filterProductsByBrand(filterSmartphoneProducts(brandProductsRaw), campaigns.smartphones.brand)
              );

              return {
                ...section,
                title: campaigns.smartphones.title,
                description: campaigns.smartphones.description,
                ctaLabel: campaigns.smartphones.ctaLabel,
                emptyMessage: campaigns.smartphones.emptyMessage,
                href: campaigns.smartphones.href,
                bannerSrc: campaigns.smartphones.banner,
                products,
              };
            }

            const data = await fetchJsonWithTimeout<CategoryProductsResponse>(
              `/api/categories/${slug}?per_page=${HOMEPAGE_FETCH_POOL}&page=1&minimal=1`
            ) ?? {};
            let products = (data.products ?? []).filter(isDisplayableProduct);
            if (section.key === 'laptops') {
                products = filterLaptopProducts(products).filter(isDisplayableProduct);
                if (products.length < HOMEPAGE_PRODUCT_LIMIT) {
                  const fallbackData = await fetchJsonWithTimeout<CategoryProductsResponse>(
                    `/api/categories/portatiles?per_page=${HOMEPAGE_FETCH_POOL}&page=1&minimal=1`
                  ) ?? {};
                  products = uniqueById([
                    ...products,
                    ...filterLaptopProducts(fallbackData.products ?? []),
                  ]);
                }
            }
            products = takeHomepageProducts(products);

            return {
              ...section,
              href: `/categoria/${slug}`,
              products,
            };
          })
        );

        const bestSellersPromise = fetchJsonWithTimeout<WCProduct[]>(
          `/api/products?per_page=${HOMEPAGE_FETCH_POOL}&orderby=${bestSellerSection.orderby}&order=${bestSellerSection.order}`
        );
        const saleProductsPromise = fetchJsonWithTimeout<WCProduct[]>(`/api/products?per_page=${HOMEPAGE_FETCH_POOL}&on_sale=true`);
        const latestProductsPromise = fetchJsonWithTimeout<WCProduct[]>(`/api/products?per_page=${HOMEPAGE_FETCH_POOL}&orderby=date&order=desc`);
        const componentProductsPromise = fetchJsonWithTimeout<WCProduct[]>(
          `/api/products?per_page=${HOMEPAGE_FETCH_POOL}&category_slug=perifericos&orderby=date&order=desc`
        );
        const hpLaptopsPromise = fetchJsonWithTimeout<WCProduct[]>(
          `/api/products?per_page=${WEEKLY_BRAND_FETCH_POOL}&category_slug=portatiles&search=${encodeURIComponent(campaigns.laptops.brand)}&orderby=date&order=desc`
        );

        const [categorySectionsData, bestSellers, sales, latest, components, hpLaptops] = await Promise.all([
          categorySectionsPromise,
          bestSellersPromise,
          saleProductsPromise,
          latestProductsPromise,
          componentProductsPromise,
          hpLaptopsPromise,
        ]);
        const resolvedLaptopProducts = takeHomepageProducts(
          filterProductsByBrand(
            filterLaptopProducts((hpLaptops ?? []) as WCProduct[]),
            campaigns.laptops.brand
          )
        );

        let resolvedComponentProducts = ((components ?? []) as WCProduct[]).filter(isDisplayableProduct);
        if (resolvedComponentProducts.length < HOMEPAGE_PRODUCT_LIMIT) {
          const componentFallbackTerms = ['ssd', 'memoria ram', 'teclado', 'raton', 'monitor', 'usb'];
          const fallbackBuckets = await Promise.all(
            componentFallbackTerms.map((term) =>
              fetchJsonWithTimeout<WCProduct[]>(
                `/api/products?per_page=8&search=${encodeURIComponent(term)}&orderby=date&order=desc`
              )
            )
          );
          const flattenedFallback = fallbackBuckets
            .flatMap((bucket) => (bucket ?? []) as WCProduct[])
            .filter(isDisplayableProduct);
          resolvedComponentProducts = uniqueById([...resolvedComponentProducts, ...flattenedFallback]);
        }
        resolvedComponentProducts = takeHomepageProducts(resolvedComponentProducts);

        setCategoryProductSections(categorySectionsData);
        setBestSellerProducts(takeHomepageProducts((bestSellers ?? []) as WCProduct[]));
        setSaleProducts(takeHomepageProducts((sales ?? []) as WCProduct[]));
        setLatestProducts(takeHomepageProducts((latest ?? []) as WCProduct[]));
        setComponentProducts(resolvedComponentProducts);
        setHpLaptopProducts(resolvedLaptopProducts);
      } catch (error) {
        console.error('Error loading products:', error);
        if (!initialProducts) {
          setCategoryProductSections(categorySections.map(toEmptySection));
          setBestSellerProducts([]);
          setSaleProducts([]);
          setLatestProducts([]);
          setComponentProducts([]);
          setHpLaptopProducts([]);
        }
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('navigator' in window)) {
      return;
    }

    const cordoba = { latitude: 37.8882, longitude: -4.7794 };

    const updateCordobaState = (position: GeolocationPosition) => {
      const toRadians = (value: number) => (value * Math.PI) / 180;
      const earthRadiusKm = 6371;
      const latDiff = toRadians(position.coords.latitude - cordoba.latitude);
      const lonDiff = toRadians(position.coords.longitude - cordoba.longitude);
      const startLat = toRadians(cordoba.latitude);
      const endLat = toRadians(position.coords.latitude);
      const haversine =
        Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
        Math.cos(startLat) * Math.cos(endLat) *
        Math.sin(lonDiff / 2) * Math.sin(lonDiff / 2);
      const distance = 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

      setIsCordobaVisitor(distance <= 40);
    };

    const permissions = navigator.permissions as Permissions | undefined;
    if (!permissions?.query || !navigator.geolocation) {
      return;
    }

    permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((result) => {
        if (result.state === 'granted') {
          navigator.geolocation.getCurrentPosition(updateCordobaState, () => setIsCordobaVisitor(false), {
            enableHighAccuracy: false,
            maximumAge: 300000,
            timeout: 4000,
          });
        } else {
          setIsCordobaVisitor(false);
        }
      })
      .catch(() => {
        setIsCordobaVisitor(false);
      });
  }, []);

  const homeSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: siteConfig.name,
        url: baseUrl,
        logo: `${baseUrl}/logo.png`,
        email: siteConfig.email,
        telephone: siteConfig.phone,
        contactPoint: [
          {
            '@type': 'ContactPoint',
            telephone: siteConfig.phone,
            contactType: 'customer support',
            areaServed: 'ES',
            availableLanguage: ['es'],
          },
        ],
      },
      {
        '@type': 'ComputerStore',
        '@id': `${baseUrl}/#store`,
        name: siteConfig.name,
        url: baseUrl,
        image: `${baseUrl}/logo.png`,
        telephone: siteConfig.phone,
        email: siteConfig.email,
        parentOrganization: {
          '@id': `${baseUrl}/#organization`,
        },
        address: {
          '@type': 'PostalAddress',
          streetAddress: siteConfig.address.street,
          addressLocality: siteConfig.address.city,
          addressRegion: siteConfig.address.region,
          postalCode: siteConfig.address.postalCode,
          addressCountry: siteConfig.address.country,
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: testimonialRatingValue,
          reviewCount: testimonials.length,
          bestRating: 5,
          worstRating: 1,
        },
        areaServed: ['Cordoba', 'España'],
        sameAs: [baseUrl],
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: siteConfig.name,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${baseUrl}/tienda?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'WebPage',
        '@id': `${baseUrl}/#webpage`,
        url: baseUrl,
        name: 'Inicio | Inforvel',
        isPartOf: {
          '@id': `${baseUrl}/#website`,
        },
        about: {
          '@id': `${baseUrl}/#store`,
        },
        inLanguage: 'es',
        primaryImageOfPage: `${baseUrl}/logo.png`,
      },
      {
        '@type': 'OfferCatalog',
        '@id': `${baseUrl}/#offer-catalog`,
        name: 'Catalogo online Inforvel',
        url: `${baseUrl}/tienda`,
        itemListElement: [
          {
            '@type': 'OfferCatalog',
            name: 'Portatiles',
            url: `${baseUrl}/categoria/portatiles`,
          },
          {
            '@type': 'OfferCatalog',
            name: 'Smartphones',
            url: `${baseUrl}/categoria/smartphones`,
          },
          {
            '@type': 'OfferCatalog',
            name: 'Ofertas',
            url: `${baseUrl}/ofertas`,
          },
          {
            '@type': 'OfferCatalog',
            name: 'Reacondicionados',
            url: `${baseUrl}/reacondicionados`,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${baseUrl}/#faq`,
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <div className="bg-black text-white overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema) }}
      />

      {/* Hero Section */}
      <section
        className="relative pt-28 pb-12 md:pt-36 md:pb-16 overflow-hidden flex flex-col items-center justify-center text-center px-4"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * 100;
          const y = ((event.clientY - rect.top) / rect.height) * 100;
          setHeroGlow({ x, y });
        }}
        onMouseLeave={() => setHeroGlow({ x: 50, y: 50 })}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

        {isCordobaVisitor && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm text-sm text-zinc-400 mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Servicio técnico activo en Córdoba
          </div>
        )}

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto mb-6 leading-tight">
          Informática en Córdoba: Venta y Reparación de Equipos
        </h1>

        <p className="text-base md:text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
          Compra portátiles, smartphones, componentes y accesorios con precios claros, envío rápido y soporte técnico cercano.
          También reparamos tus dispositivos cuando necesitas una solución rápida.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <a href="https://wa.me/34652369650?text=Muy%20buenas%2C%20quisiera%20solicitar%20la%20reparaci%C3%B3n%20de%20mi%20equipo%20inform%C3%A1tico.%20%C2%BFMe%20pod%C3%A9is%20indicar%20disponibilidad%20y%20condiciones%3F%20Gracias."  className="w-full sm:w-auto px-8 py-3 rounded-full bg-white text-black font-medium hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2">
            Solicitar reparación
            <Wrench className="w-4 h-4" />
          </a>
          <Link href="/tienda" className="w-full sm:w-auto px-8 py-3 rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
            Ver tienda
            <ShoppingBag className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <HeroProductStrip products={bestSellerProducts} loading={loading} />

      <TrustStrip />

      <TopHomeBanners />

      <HpLaptopWeekSection products={hpLaptopProducts} loading={loading} campaign={weeklyCampaigns.laptops} />

      <PromoBanners featuredProducts={[...saleProducts, ...bestSellerProducts]} />

      <section className="py-12 md:py-14 border-t border-zinc-900 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Categorías destacadas</h2>
              <p className="mt-1 text-sm text-zinc-400">Entra directo a las familias más compradas de la tienda.</p>
            </div>
            <Link href="/tienda" className="shrink-0 text-xs md:text-sm px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors">
              Ver catálogo completo
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {featuredCategoryItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group relative aspect-[1200/560] overflow-hidden rounded-2xl border border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                <Image
                  src={versionedBannerSrc(item.image)}
                  alt={`${item.title} — ${item.description}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProductShowcase
        loading={loading}
        section={{
          ...bestSellerSection,
          title: 'Descubre los productos más vendidos',
          description: 'Una selección rápida para comprar sin perderte entre todo el catálogo.',
          href: bestSellerSection.hrefFallback,
          products: bestSellerProducts.slice(0, 6),
        }}
      />

      <ProductShowcase
        loading={loading}
        section={{
          key: 'sale-products',
          title: 'Ofertas y precios destacados',
          description: 'Productos rebajados o con precio especialmente competitivo hasta agotar stock.',
          emptyMessage: 'Ahora mismo no hay ofertas activas para mostrar.',
          hrefFallback: '/ofertas',
          ctaLabel: 'Ver ofertas',
          href: '/ofertas',
          products: saleProducts,
        }}
      />

      <ProductShowcase
        loading={loading}
        section={{
          key: 'latest-products',
          title: 'Novedades del catálogo',
          description: 'Últimos productos añadidos para comprar siempre al día.',
          emptyMessage: 'No hay novedades para mostrar ahora mismo.',
          hrefFallback: '/tienda',
          ctaLabel: 'Ver novedades',
          href: '/tienda?orderby=date&order=desc',
          products: latestProducts,
        }}
      />

      {categoryProductSections[0] && (
        <ProductShowcase section={categoryProductSections[0]} loading={loading} />
      )}

      {categoryProductSections[1] && (
        <ProductShowcase section={categoryProductSections[1]} loading={loading} />
      )}

      <ProductShowcase
        loading={loading}
        section={{
          key: 'components-products',
          title: 'Componentes y periféricos',
          description: 'Mejoras para tu equipo: almacenamiento, conectividad y accesorios clave.',
          emptyMessage: 'No hay componentes destacados para mostrar ahora mismo.',
          hrefFallback: '/tienda',
          ctaLabel: 'Ver componentes',
          href: '/tienda?search=ssd',
          products: componentProducts,
        }}
      />

      {/* Brands Marquee */}
      <section className="py-8 border-t border-zinc-900 bg-black overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-8">
          <p className="text-center text-sm uppercase tracking-widest text-zinc-500 font-medium">Trabajamos con las mejores marcas</p>
        </div>
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none"></div>
          {/* Scrolling track */}
          <div className="flex animate-marquee whitespace-nowrap">
            {[...Array(2)].map((_, loopIdx) => (
              <div key={loopIdx} className="flex items-center gap-16 px-8 shrink-0">
                {/* HP */}
                <svg className="h-10 w-auto opacity-50 hover:opacity-100 transition-opacity" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="48" stroke="#0096D6" strokeWidth="3" />
                  <text x="50" y="60" textAnchor="middle" fill="#0096D6" fontSize="36" fontWeight="bold" fontFamily="Arial">hp</text>
                </svg>
                {/* Samsung */}
                <svg className="h-8 w-auto opacity-50 hover:opacity-100 transition-opacity" viewBox="0 0 200 40" fill="none">
                  <text x="100" y="30" textAnchor="middle" fill="#1428A0" fontSize="28" fontWeight="bold" fontFamily="Arial" letterSpacing="4">SAMSUNG</text>
                </svg>
                {/* Apple */}
                <svg className="h-10 w-auto opacity-50 hover:opacity-100 transition-opacity" viewBox="0 0 50 60" fill="none">
                  <path d="M39.5 20.8c-.1-7.1 5.8-10.5 6.1-10.7-3.3-4.8-8.5-5.5-10.3-5.6-4.4-.4-8.6 2.6-10.8 2.6-2.2 0-5.6-2.5-9.2-2.5-4.7.1-9.1 2.8-11.5 7-4.9 8.5-1.3 21.2 3.5 28.1 2.4 3.4 5.2 7.2 8.8 7.1 3.5-.1 4.9-2.3 9.1-2.3 4.3 0 5.5 2.3 9.2 2.2 3.8-.1 6.2-3.5 8.5-6.9 2.7-3.9 3.8-7.8 3.8-8-.1-.1-7.3-2.8-7.4-11.1zM32.6 3.5c1.9-2.4 3.2-5.6 2.9-8.9-2.8.1-6.2 1.9-8.2 4.2-1.8 2.1-3.4 5.4-3 8.6 3.1.3 6.3-1.6 8.2-3.9z" transform="translate(0 10)" fill="#A2AAAD" />
                </svg>
                {/* Intel */}
                <svg className="h-8 w-auto opacity-50 hover:opacity-100 transition-opacity" viewBox="0 0 110 40" fill="none">
                  <text x="55" y="30" textAnchor="middle" fill="#0071C5" fontSize="32" fontWeight="bold" fontFamily="Arial" fontStyle="italic">intel.</text>
                </svg>
                {/* Windows 11 */}
                <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
                    <rect x="1" y="1" width="10" height="10" fill="#0078D4" rx="1" />
                    <rect x="13" y="1" width="10" height="10" fill="#0078D4" rx="1" />
                    <rect x="1" y="13" width="10" height="10" fill="#0078D4" rx="1" />
                    <rect x="13" y="13" width="10" height="10" fill="#0078D4" rx="1" />
                  </svg>
                  <span className="text-lg font-semibold text-[#0078D4] whitespace-nowrap">Windows 11</span>
                </div>
                {/* Corsair */}
                <svg className="h-8 w-auto opacity-50 hover:opacity-100 transition-opacity" viewBox="0 0 160 40" fill="none">
                  <text x="80" y="30" textAnchor="middle" fill="#F1C40F" fontSize="24" fontWeight="bold" fontFamily="Arial" letterSpacing="6">CORSAIR</text>
                </svg>
                {/* Google Chrome */}
                <svg className="h-10 w-10 opacity-50 hover:opacity-100 transition-opacity" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="22" fill="#4285F4" />
                  <path d="M14.5 12.9C17 9.5 20.3 7.5 24 7.5c5.3 0 9.8 3.1 12 7.5H24" fill="#EA4335" />
                  <path d="M12.3 14.5C9.8 18.1 8.5 22 9.2 26.2l6.3-10.9" fill="#FBBC05" />
                  <path d="M24 40.5c-5.3 0-10-2.5-13-6.5l6.3-10.9L24 24" fill="#34A853" />
                  <circle cx="24" cy="24" r="8.5" fill="white" />
                  <circle cx="24" cy="24" r="5.5" fill="#4285F4" />
                </svg>
                {/* Lenovo */}
                <svg className="h-7 w-auto opacity-50 hover:opacity-100 transition-opacity" viewBox="0 0 160 34" fill="none">
                  <text x="80" y="26" textAnchor="middle" fill="#E2231A" fontSize="26" fontWeight="bold" fontFamily="Arial">Lenovo</text>
                </svg>
                {/* ASUS */}
                <svg className="h-7 w-auto opacity-50 hover:opacity-100 transition-opacity" viewBox="0 0 120 34" fill="none">
                  <text x="60" y="26" textAnchor="middle" fill="#00529B" fontSize="24" fontWeight="bold" fontFamily="Arial" letterSpacing="3">ASUS</text>
                </svg>
              </div>
            ))}
          </div>
        </div>
        <style jsx>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 30s linear infinite;
          }
        `}</style>
      </section>

      <KlarnaBanner />

      {/* Sección Maestra de Servicios Locales */}
      <section id="servicios-cordoba" className="py-16 md:py-24 relative border-t border-zinc-900 bg-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Servicios en Córdoba</p>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Especialistas con resultados reales</h2>
              <p className="mt-4 text-zinc-400 max-w-2xl text-lg">
                Desde la <strong>reparación de móviles en Córdoba</strong> hasta el <strong>servicio técnico informático</strong> avanzado.
                Cubrimos todas las necesidades de particulares y empresas.
              </p>
            </div>
            <Link href="/tienda" className="shrink-0 px-6 py-3 rounded-full bg-white text-black font-bold hover:bg-zinc-200 transition-all">
              Ver catálogo completo
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/reparacion-moviles-cordoba" className="group p-6 rounded-2xl border border-zinc-900 bg-zinc-950/50 hover:border-blue-500/50 hover:bg-zinc-900/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-blue-400">Reparación de Móviles</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Pantallas, baterías y placas base en tiempo récord para iPhone, Samsung y Xiaomi.
              </p>
            </Link>

            <Link href="/reparacion-informatica-cordoba" className="group p-6 rounded-2xl border border-zinc-900 bg-zinc-950/50 hover:border-purple-500/50 hover:bg-zinc-900/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Monitor className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-purple-400">Servicio Técnico PC</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Reparación de portátiles, limpieza, formateo y ampliaciones SSD/RAM para máxima velocidad.
              </p>
            </Link>

            <Link href="/portatiles-reacondicionados-cordoba" className="group p-6 rounded-2xl border border-zinc-900 bg-zinc-950/50 hover:border-green-500/50 hover:bg-zinc-900/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-green-400">Portátiles Baratos</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Equipos reacondicionados profesionales con 12 meses de garantía y revisión técnica.
              </p>
            </Link>

            <Link href="/servicios-pymes-empresas-cordoba" className="group p-6 rounded-2xl border border-zinc-900 bg-zinc-950/50 hover:border-red-500/50 hover:bg-zinc-900/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-red-400">Para Empresas</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Mantenimiento informático preventivo, redes seguras y soporte local prioritario en Córdoba.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="como-funciona" className="py-16 relative border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Cómo funciona</h2>
            <p className="text-zinc-400">Un proceso diseñado para tu comodidad y rapidez.</p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-[1px] bg-zinc-900 -z-10 -translate-y-1/2"></div>
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-blue-500/20">
                  {step.number}
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TestimonialsSection />

      {/* Why Us */}
      <section id="nosotros" className="py-16 relative border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Por qué nos eligen</h2>
              <p className="text-zinc-400 mb-8 text-lg">
                En Inforvel no solo vendemos y reparamos; construimos confianza mediante resultados. Nuestro compromiso es tu tranquilidad tecnológica.
              </p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Servicio ultrarrápido</h3>
                    <p className="text-sm text-zinc-400">Diagnosticamos y solucionamos la mayoría de los problemas en tiempo récord. Tu tiempo vale oro.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Técnicos expertos</h3>
                    <p className="text-sm text-zinc-400">Atención directa, sin intermediarios. Explicaciones claras y soluciones honestas a precios competitivos.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <HeartHandshake className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Atención personalizada</h3>
                    <p className="text-sm text-zinc-400">Nos adaptamos a tus necesidades específicas, ofreciendo soporte cercano y resolutivo.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-3xl -z-10 rounded-full"></div>
              <div className="border border-zinc-800 rounded-2xl p-8 bg-zinc-950/50 backdrop-blur-sm">
                <div className="grid grid-cols-2 gap-6 text-center">
                  <div className="p-4">
                    <div className="text-4xl font-bold mb-2">99%</div>
                    <div className="text-sm text-zinc-400">Reparaciones exitosas</div>
                  </div>
                  <div className="p-4">
                    <div className="text-4xl font-bold mb-2">24h</div>
                    <div className="text-sm text-zinc-400">Tiempo medio resolución</div>
                  </div>
                  <div className="p-4">
                    <div className="text-4xl font-bold mb-2">4,6</div>
                    <div className="text-sm text-zinc-400">Estrellas en Google</div>
                  </div>
                  <div className="p-4">
                    <div className="text-4xl font-bold mb-2">+1k</div>
                    <div className="text-sm text-zinc-400">Clientes satisfechos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ExpertsSection />

      {/* Reparación teaser (versión corta; contenido completo en /reparacion-informatica-cordoba) */}
      <section className="border-t border-zinc-900 bg-[#050505] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">¿Se te ha roto el móvil o el ordenador?</h2>
            <p className="mt-2 text-sm text-zinc-400 max-w-xl">
              Técnico directo en Córdoba, presupuesto en 15 minutos y garantía de 12 meses. Reseñas reales de clientes y
              cobertura por barrios en la página del servicio técnico.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <a href="https://wa.me/34652369650?text=Muy%20buenas%2C%20quisiera%20solicitar%20la%20reparaci%C3%B3n%20de%20mi%20equipo%20inform%C3%A1tico.%20%C2%BFMe%20pod%C3%A9is%20indicar%20disponibilidad%20y%20condiciones%3F%20Gracias." className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2">
              Solicitar reparación
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link href="/reparacion-informatica-cordoba" className="px-6 py-2.5 rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors text-sm flex items-center justify-center gap-2">
              Ver servicio técnico
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-zinc-900 bg-[#050505]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-6 md:p-8 mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Inforvel, referencia tecnológica en Córdoba</h2>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
              En <strong>Inforvel</strong> unimos experiencia técnica, atención cercana y soluciones reales para particulares y
              empresas. Si buscas <strong>Reparación de móviles en Córdoba</strong>, <strong>Servicio técnico informático</strong>,
              <strong> Portátiles baratos con garantía</strong> o <strong>Mantenimiento para empresas</strong>, aquí tienes un
              equipo local que responde rápido, explica claro y trabaja con garantías.
            </p>
          </div>

          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tienda online de informática en Córdoba</h2>
            <p className="text-zinc-400 max-w-3xl mx-auto">
              Inforvel está orientada a la venta online de equipos informáticos, ordenadores, portátiles, smartphones,
              componentes y accesorios. Trabajamos Córdoba como mercado local y toda España como canal de venta digital.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-6">
              <h3 className="font-semibold text-lg mb-3">Venta de equipos informáticos</h3>
              <p className="text-sm text-zinc-400">
                Catálogo pensado para usuarios, empresas y estudiantes que buscan comprar tecnología con soporte cercano.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-6">
              <h3 className="font-semibold text-lg mb-3">Compra online con foco local</h3>
              <p className="text-sm text-zinc-400">
                Posicionamos la tienda para Córdoba sin renunciar a la venta online nacional, priorizando producto, precio y confianza.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-6">
              <h3 className="font-semibold text-lg mb-3">Reacondicionados y componentes</h3>
              <p className="text-sm text-zinc-400">
                También impulsamos la compra de componentes, accesorios y equipos reacondicionados con garantía.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {faqItems.map((item) => (
              <div key={item.question} className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5">
                <h3 className="font-semibold mb-2">{item.question}</h3>
                <p className="text-sm text-zinc-400">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
