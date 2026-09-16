import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Droplets, MapPin, PlugZap, Smartphone, TimerReset, Truck } from 'lucide-react';
import { absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Reparación de Móviles en Córdoba | Pantalla y Batería | Inforvel',
  description:
    '🛠️ ¿Pantalla rota o batería agotada? Reparación de móviles en Córdoba en tiempo récord. Especialistas en iPhone, Samsung y Xiaomi. ¡Presupuesto gratis por WhatsApp!',
  alternates: {
    canonical: absoluteUrl('/reparacion-moviles-cordoba'),
  },
  openGraph: {
    title: 'Reparación de Móviles en Córdoba | Pantalla y Batería | Inforvel',
    description:
      '🛠️ ¿Pantalla rota o batería agotada? Reparación de móviles en Córdoba en tiempo récord. Especialistas en iPhone, Samsung y Xiaomi. ¡Presupuesto gratis por WhatsApp!',
    url: absoluteUrl('/reparacion-moviles-cordoba'),
    type: 'website',
  },
};

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Reparación de móviles y smartphones',
  provider: {
    '@type': 'LocalBusiness',
    name: 'Inforvel',
    image: 'https://inforvel.online/logo.png',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'El Avellano, Nte. Sierra',
      addressLocality: 'Córdoba',
      postalCode: '14006',
      addressRegion: 'Andalucía',
      addressCountry: 'ES',
    },
    telephone: '+34652369650',
    priceRange: '$$',
    url: 'https://inforvel.online/reparacion-moviles-cordoba',
  },
  areaServed: [
    {
      '@type': 'City',
      name: 'Córdoba',
      sameAs: 'https://www.wikidata.org/wiki/Q5812',
    },
    {
      '@type': 'City',
      name: 'Lucena',
    },
    {
      '@type': 'City',
      name: 'Puente Genil',
    },
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Servicios de Reparación de Telefonía',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Cambio de pantalla iPhone en Córdoba' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Sustitución de batería de móvil' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Reparación de móviles mojados' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Reparación de puerto de carga USB-C' } },
    ],
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://inforvel.online/reparacion-moviles-cordoba',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Cuánto tiempo tardáis en cambiar una pantalla?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'La mayoría de los modelos populares (iPhone y Samsung serie A) se reparan en menos de 60-90 minutos bajo cita previa.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Perderé mis fotos y datos al reparar el móvil?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'En el 95% de las reparaciones de hardware (pantalla y batería) tus datos permanecen intactos. No obstante, siempre recomendamos una copia de seguridad.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Tienen garantía las reparaciones?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí, en Inforvel ofrecemos 12 meses de garantía en todas nuestras reparaciones de hardware, el triple de lo que exige la ley.',
      },
    },
  ],
};

const serviceItems = [
  {
    icon: Smartphone,
    title: 'Cambio de Pantalla',
    text: 'Reparamos cristales rotos y paneles LCD/OLED de todas las marcas.',
  },
  {
    icon: TimerReset,
    title: 'Sustitución de Batería',
    text: '¿Tu móvil se apaga solo? Recupera la autonomía original en menos de 1 hora.',
  },
  {
    icon: PlugZap,
    title: 'Conector de Carga',
    text: 'Si tu móvil no carga o hace mal contacto, lo solucionamos en el acto.',
  },
  {
    icon: Droplets,
    title: 'Móviles Mojados',
    text: 'Recuperación avanzada de terminales con daños por líquidos mediante limpieza por ultrasonidos.',
  },
];

const brands = ['Apple (iPhone)', 'Samsung', 'Xiaomi', 'Oppo', 'Huawei', 'Google Pixel'];

export default function ReparacionMovilesCordobaPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className="mx-auto max-w-7xl px-6 pb-12 pt-28 md:pt-32">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Servicio Técnico Móviles</p>
        <h1 className="max-w-5xl text-4xl font-bold leading-tight md:text-6xl">
          Reparación de Móviles en Córdoba: Tu Smartphone como nuevo hoy mismo
        </h1>
        <p className="mt-5 max-w-4xl text-base text-zinc-300 md:text-lg">
          No te quedes desconectado. En Inforvel reparamos tu móvil con repuestos de máxima calidad, garantía de 12 meses y
          opción de recogida a domicilio en cualquier barrio de Córdoba.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="https://wa.me/34652369650?text=Hola%20Inforvel%2C%20quiero%20consultar%20el%20precio%20de%20una%20reparaci%C3%B3n%20de%20m%C3%B3vil%20en%20C%C3%B3rdoba"
            className="rounded-full bg-green-500 px-6 py-3 text-sm font-semibold text-black hover:bg-green-400"
          >
            Consultar precio reparación
          </a>
          <a
            href="https://maps.google.com/?q=El+Avellano,+Nte.+Sierra,+14006+C%C3%B3rdoba"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-semibold hover:bg-zinc-900"
          >
            Ver dónde estamos
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {serviceItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <Icon className="h-6 w-6 text-blue-400" />
                <h2 className="mt-3 text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm text-zinc-400">{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <h2 className="text-3xl font-bold md:text-4xl">Servicio Técnico de Móviles en todos los barrios de Córdoba</h2>
        <p className="mt-4 max-w-4xl text-sm text-zinc-300 md:text-base">
          No importa si estás en Ciudad Jardín, Levante, El Brillante, Fátima o el Centro. En Inforvel te ofrecemos:
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <Truck className="h-6 w-6 text-blue-400" />
            <h3 className="mt-3 text-lg font-semibold">Recogida Express</h3>
            <p className="mt-2 text-sm text-zinc-400">Si no puedes venir a nuestra ubicación en el Nte. Sierra, vamos nosotros.</p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <MapPin className="h-6 w-6 text-blue-400" />
            <h3 className="mt-3 text-lg font-semibold">Punto de entrega</h3>
            <p className="mt-2 text-sm text-zinc-400">Dirección exacta: El Avellano, Nte. Sierra, 14006 Córdoba.</p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <CheckCircle2 className="h-6 w-6 text-blue-400" />
            <h3 className="mt-3 text-lg font-semibold">Soporte en provincia</h3>
            <p className="mt-2 text-sm text-zinc-400">También damos soporte a Lucena, Cabra y Puente Genil mediante envío mensajería.</p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <h2 className="text-3xl font-bold md:text-4xl">Marcas que reparamos a diario</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {brands.map((brand) => (
            <div
              key={brand}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-center text-sm font-semibold text-zinc-300 grayscale"
            >
              {brand}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <h2 className="text-3xl font-bold md:text-4xl">Preguntas frecuentes</h2>
        <div className="mt-6 space-y-4">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-lg font-semibold">¿Cuánto tiempo tardáis en cambiar una pantalla?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              La mayoría de los modelos populares (iPhone y Samsung serie A) se reparan en menos de 60-90 minutos bajo cita
              previa.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-lg font-semibold">¿Perderé mis fotos y datos al reparar el móvil?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              En el 95% de las reparaciones de hardware (pantalla/batería) tus datos permanecen intactos. No obstante, siempre
              recomendamos una copia de seguridad.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-lg font-semibold">¿Tienen garantía las reparaciones?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Sí, en Inforvel ofrecemos 12 meses de garantía en todas nuestras reparaciones de hardware, el triple de lo que
              exige la ley.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-bold">Inforvel - Reparación de Móviles Córdoba</h2>
          <p className="mt-3 text-sm text-zinc-300">Dirección: El Avellano, Nte. Sierra, 14006 Córdoba</p>
          <p className="mt-1 text-sm text-zinc-300">Teléfono: 652 36 96 50</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="tel:+34652369650"
              className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-semibold hover:bg-zinc-900"
            >
              Llamar ahora
            </a>
            <Link
              href="/reparacion-informatica-cordoba"
              className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-semibold hover:bg-zinc-900"
            >
              Ver servicio técnico completo
            </Link>
            <Link href="/blog" className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-semibold hover:bg-zinc-900">
              Consejos en el blog
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
