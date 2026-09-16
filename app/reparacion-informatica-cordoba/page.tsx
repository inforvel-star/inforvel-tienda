import type { Metadata } from 'next';
import Link from 'next/link';
import { Home, ShieldCheck, Wrench, Cpu, Smartphone, Gamepad2, Wind, CheckCircle2 } from 'lucide-react';
import { TechnicalServiceLeadForm } from '@/components/services/TechnicalServiceLeadForm';
import { absoluteUrl } from '@/lib/seo';
import { testimonials, testimonialRatingValue } from '@/lib/testimonials';

export const metadata: Metadata = {
  title: 'Reparación de Ordenadores y Móviles en Córdoba | Inforvel',
  description:
    '¿Tu PC o móvil va lento? 🛠️ Servicio técnico en Córdoba con reparación a domicilio. Garantía de 12 meses en hardware y software. ¡Presupuesto gratis por WhatsApp!',
  alternates: {
    canonical: absoluteUrl('/reparacion-informatica-cordoba'),
  },
  openGraph: {
    title: 'Reparación de Ordenadores y Móviles en Córdoba | Inforvel',
    description:
      '¿Tu PC o móvil va lento? 🛠️ Servicio técnico en Córdoba con reparación a domicilio. Garantía de 12 meses en hardware y software. ¡Presupuesto gratis por WhatsApp!',
    url: absoluteUrl('/reparacion-informatica-cordoba'),
    type: 'website',
  },
};

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Reparación de ordenadores y móviles',
  provider: {
    '@type': 'LocalBusiness',
    name: 'Inforvel',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'El Avellano, Nte. Sierra',
      postalCode: '14006',
      addressLocality: 'Córdoba',
      addressRegion: 'Andalucía',
      addressCountry: 'ES',
    },
    telephone: '+34 652 36 96 50',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: testimonialRatingValue,
      reviewCount: testimonials.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: testimonials.slice(0, 10).map((item) => ({
      '@type': 'Review',
      reviewBody: item.text,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: item.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: {
        '@type': 'Person',
        name: item.name,
      },
    })),
  },
  areaServed: 'Córdoba',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Servicios Técnicos',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Cambio de pantalla móvil' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Instalación de disco SSD' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Reparación de placa base' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Reparación de consolas' } },
    ],
  },
};

export default function ServicioTecnicoCordobaPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />

      <section className="mx-auto max-w-7xl px-6 pb-12 pt-28 md:pt-32">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Servicio Técnico Inforvel</p>
        <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
          Servicio Técnico Informático en Córdoba | Reparación de Ordenadores y Móviles
        </h1>
        <p className="mt-5 max-w-3xl text-base text-zinc-300 md:text-lg">
          Soluciones rápidas, garantía real de 12 meses y asistencia de técnico a domicilio en Córdoba para que no tengas que moverte.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="https://wa.me/34652369650?text=Hola%20Inforvel%2C%20necesito%20servicio%20t%C3%A9cnico%20a%20domicilio%20en%20C%C3%B3rdoba"
            className="rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold text-black hover:bg-blue-400"
          >
            Contactar por WhatsApp
          </a>
          <Link href="tel:+34652369650" className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-semibold hover:bg-zinc-900">
            Llamar ahora
          </Link>
        </div>
        <p className="mt-4 text-sm font-semibold text-zinc-200">
          ⭐⭐⭐⭐⭐ 4.6/5 en Google | +1,000 reparaciones con éxito en Córdoba
        </p>
        <p className="mt-2 text-sm text-zinc-400">Respuesta en &lt;15 min.</p>
        <p className="mt-2 text-sm text-zinc-400">
          Damos soporte en toda la capital y provincia (Lucena, Cabra, Puente Genil y alrededores).
        </p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-14 md:grid-cols-3">
        <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <Wrench className="h-6 w-6 text-blue-400" />
          <h2 className="mt-3 text-lg font-semibold">Técnicos Certificados</h2>
          <p className="mt-2 text-sm text-zinc-400">Expertos en hardware, electrónica y microsoldadura.</p>
        </article>
        <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <Home className="h-6 w-6 text-blue-400" />
          <h2 className="mt-3 text-lg font-semibold">Reparación a Domicilio</h2>
          <p className="mt-2 text-sm text-zinc-400">Recogida y entrega en Córdoba en 24h para ahorrar tiempo.</p>
        </article>
        <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <ShieldCheck className="h-6 w-6 text-blue-400" />
          <h2 className="mt-3 text-lg font-semibold">Garantía Inforvel</h2>
          <p className="mt-2 text-sm text-zinc-400">12 meses de cobertura total en la reparación realizada.</p>
        </article>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <h2 className="text-3xl font-bold md:text-4xl">Nuestros Servicios de Reparación</h2>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="flex items-center gap-2 text-2xl font-semibold"><Cpu className="h-5 w-5 text-blue-400" />Reparación de Ordenadores y Portátiles en Córdoba</h3>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              <li><CheckCircle2 className="mr-2 inline h-4 w-4 text-green-400" />Reparación de PC y portátiles en Córdoba: encendido, pantallas azules y lentitud.</li>
              <li><CheckCircle2 className="mr-2 inline h-4 w-4 text-green-400" />Ampliaciones con SSD y RAM para multiplicar el rendimiento.</li>
              <li><CheckCircle2 className="mr-2 inline h-4 w-4 text-green-400" />Limpieza de virus, formateo y configuración de Windows 11/10.</li>
              <li><CheckCircle2 className="mr-2 inline h-4 w-4 text-green-400" />Mantenimiento pro: pasta térmica y limpieza interna.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="flex items-center gap-2 text-2xl font-semibold"><Smartphone className="h-5 w-5 text-blue-400" />Reparación de Móviles y Tablets en Córdoba</h3>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              <li><CheckCircle2 className="mr-2 inline h-4 w-4 text-green-400" />Cambio de pantalla y batería en iPhone, Samsung, Xiaomi y Huawei.</li>
              <li><CheckCircle2 className="mr-2 inline h-4 w-4 text-green-400" />Reparación de conectores de carga con tiempos rápidos.</li>
              <li><CheckCircle2 className="mr-2 inline h-4 w-4 text-green-400" />Diagnóstico avanzado de placa base para equipos mojados o sin encendido.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="flex items-center gap-2 text-2xl font-semibold"><Gamepad2 className="h-5 w-5 text-blue-400" />Reparación de Consolas y Electrónica en Córdoba</h3>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              <li><CheckCircle2 className="mr-2 inline h-4 w-4 text-green-400" />Reparación HDMI, joystick drift y ventilación en PS5, Xbox y Switch.</li>
              <li><CheckCircle2 className="mr-2 inline h-4 w-4 text-green-400" />Recuperación de datos en discos duros y memorias USB dañadas.</li>
              <li><CheckCircle2 className="mr-2 inline h-4 w-4 text-green-400" />Diagnóstico de televisores y periféricos: imagen, sonido y conectividad.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="flex items-center gap-2 text-2xl font-semibold"><Wind className="h-5 w-5 text-blue-400" />Servidores e Instalaciones de Cableado LAN</h3>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              <li><CheckCircle2 className="mr-2 inline h-4 w-4 text-green-400" />Montaje y mantenimiento de servidores para pymes y oficinas en Córdoba.</li>
              <li><CheckCircle2 className="mr-2 inline h-4 w-4 text-green-400" />Instalación y certificación básica de cableado LAN para estabilidad de red.</li>
              <li><CheckCircle2 className="mr-2 inline h-4 w-4 text-green-400" />Optimización de red local: switches, routers y puntos de acceso.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <h2 className="text-3xl font-bold md:text-4xl">¿Cómo trabajamos?</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Paso 1</p>
            <h3 className="mt-2 text-xl font-semibold">Contacto Directo</h3>
            <p className="mt-2 text-sm text-zinc-400">Escríbenos por WhatsApp o rellena el formulario.</p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Paso 2</p>
            <h3 className="mt-2 text-xl font-semibold">Presupuesto Sin Compromiso</h3>
            <p className="mt-2 text-sm text-zinc-400">Diagnosticamos la avería y te damos un precio cerrado sin sorpresas.</p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Paso 3</p>
            <h3 className="mt-2 text-xl font-semibold">Solución en 24/48h</h3>
            <p className="mt-2 text-sm text-zinc-400">Reparamos en taller o a domicilio según el tipo de equipo.</p>
          </article>
        </div>
      </section>

      <section className="border-t border-zinc-900 py-16">
        <div className="mx-auto max-w-7xl px-6 mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Lo que dicen de nosotros</h2>
          <p className="text-zinc-400">Basado en reseñas reales de Google.</p>
        </div>
        <div className="mx-auto max-w-7xl px-6">
          <div
            className="flex gap-3 md:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {testimonials.map((testimonial, index) => (
              <div key={index} className="min-w-[200px] max-w-[200px] md:min-w-[300px] md:max-w-[300px] flex-shrink-0 snap-start p-4 md:p-6 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs md:text-sm font-bold flex-shrink-0">
                    {testimonial.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-xs md:text-sm truncate">{testimonial.name}</p>
                    <p className="text-[10px] md:text-xs text-zinc-500">Reseña de Google</p>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-2 md:mb-3">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-xs md:text-sm ${i < testimonial.rating ? 'text-yellow-500' : 'text-zinc-700'}`}>★</span>
                  ))}
                </div>
                <p className="text-xs md:text-sm text-zinc-300 leading-relaxed line-clamp-4 md:line-clamp-none">{testimonial.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900 py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8">
            <h2 className="text-2xl font-bold md:text-3xl">Soporte local real en Córdoba, no solo una tienda online</h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400 md:text-base">
              Estamos cerca de El Tablero y la Zona Norte, dando soporte técnico a clientes de Santa Rosa,
              Valdeolleros, El Brillante, Ciudad Jardín, Fátima y Centro. También atendemos Lucena, Cabra y Puente Genil.
              Esta cercanía nos permite ofrecer diagnóstico rápido, recogida cuando hace falta y seguimiento directo sin
              intermediarios.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900 py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8">
              <h2 className="text-2xl font-bold md:text-3xl">¿Por qué reparar en Inforvel en lugar de una gran superficie?</h2>
              <p className="mt-4 text-sm text-zinc-400 md:text-base">
                En Inforvel hablas con técnico directo, sin derivaciones ni esperas largas. Nuestro objetivo es que entiendas
                qué le pasa a tu equipo y cuánto cuesta arreglarlo desde el primer contacto.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8">
              <ul className="space-y-4 text-sm text-zinc-300 md:text-base">
                <li>
                  <strong className="text-white">Garantía local de 12 meses:</strong> cobertura clara y soporte cercano en Córdoba.
                </li>
                <li>
                  <strong className="text-white">Presupuesto en 15 minutos:</strong> valoración inicial ágil para decidir sin perder tiempo.
                </li>
                <li>
                  <strong className="text-white">Técnico directo:</strong> diagnóstico honesto, sin intermediarios ni ventas forzadas.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <TechnicalServiceLeadForm />
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <h2 className="text-3xl font-bold md:text-4xl">Preguntas frecuentes sobre reparación en Córdoba</h2>
        <div className="mt-6 space-y-4">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-lg font-semibold">¿Cuánto tarda la reparación?</h3>
            <p className="mt-2 text-sm text-zinc-400">Generalmente 24/48h, según tipo de avería y disponibilidad de repuesto.</p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-lg font-semibold">¿Perderé mis datos?</h3>
            <p className="mt-2 text-sm text-zinc-400">Priorizamos siempre la integridad de tu información y te avisamos antes de cualquier acción sensible.</p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-lg font-semibold">¿Cobráis desplazamiento en Córdoba?</h3>
            <p className="mt-2 text-sm text-zinc-400">Depende de la zona y del servicio solicitado. Te indicamos tarifa exacta en el presupuesto previo.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
