import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Cpu, GraduationCap, ShieldCheck, Sparkles, BriefcaseBusiness } from 'lucide-react';
import { absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Portátiles Reacondicionados en Córdoba | Garantía 12 Meses | Inforvel',
  description:
    '💻 Ahorra hasta un 60% en tu próximo ordenador. Portátiles reacondicionados de gama profesional (Lenovo, Dell, HP) revisados y con garantía. ¡Visítanos en Córdoba!',
  alternates: {
    canonical: absoluteUrl('/portatiles-reacondicionados-cordoba'),
  },
  openGraph: {
    title: 'Portátiles Reacondicionados en Córdoba | Garantía 12 Meses | Inforvel',
    description:
      '💻 Ahorra hasta un 60% en tu próximo ordenador. Portátiles reacondicionados de gama profesional (Lenovo, Dell, HP) revisados y con garantía. ¡Visítanos en Córdoba!',
    url: absoluteUrl('/portatiles-reacondicionados-cordoba'),
    type: 'website',
  },
};

const productSchema = {
  '@context': 'https://schema.org',
  '@type': 'IndividualProduct',
  name: 'Portátiles Reacondicionados Inforvel',
  description:
    'Venta de portátiles profesionales reacondicionados de las marcas Lenovo, Dell y HP en Córdoba. Revisados y con 12 meses de garantía.',
  brand: {
    '@type': 'Brand',
    name: 'Inforvel',
  },
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'EUR',
    lowPrice: '199',
    highPrice: '600',
    offerCount: '15',
    areaServed: 'Córdoba',
    availability: 'https://schema.org/InStock',
  },
  manufacturer: 'Inforvel',
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://inforvel.online/portatiles-reacondicionados-cordoba',
  },
  provider: {
    '@type': 'LocalBusiness',
    name: 'Inforvel',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'El Avellano, Nte. Sierra',
      addressLocality: 'Córdoba',
      postalCode: '14006',
      addressCountry: 'ES',
    },
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Tienen garantía?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí, todos nuestros equipos tienen 1 año de garantía directamente con nosotros en nuestro taller de Córdoba.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Puedo ampliar la RAM o el SSD?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Por supuesto. Al ser especialistas, podemos entregarte el portátil con las mejoras que necesites en el momento.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Emitís factura?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí, emitimos factura oficial para empresas, autónomos y particulares.',
      },
    },
  ],
};

export default function PortatilesReacondicionadosCordobaPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className="relative overflow-hidden border-b border-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.22),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(180,83,9,0.2),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-28 md:pt-32">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            INFORMATICA SOSTENIBLE Y ECONOMICA EN CORDOBA
          </p>
          <h1 className="max-w-5xl text-4xl font-bold leading-tight md:text-6xl">
            Portátiles Reacondicionados en Córdoba: Calidad Profesional a Precio de Particular
          </h1>
          <p className="mt-5 max-w-4xl text-base text-zinc-300 md:text-lg">
            ¿Buscas un ordenador potente sin gastar una fortuna? En Inforvel seleccionamos y ponemos a punto portátiles de
            gama alta con garantía de 1 año. Equipos listos para trabajar, estudiar o jugar desde el primer minuto.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/reacondicionados" className="rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold text-black hover:bg-blue-400">
              Ver catálogo disponible
            </Link>
            <a
              href="https://wa.me/34652369650?text=Hola%20Inforvel%2C%20busco%20un%20port%C3%A1til%20reacondicionado%20en%20C%C3%B3rdoba.%20%C2%BFMe%20ayud%C3%A1is%20con%20un%20modelo%20espec%C3%ADfico%3F"
              className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-semibold hover:bg-zinc-900"
            >
              Preguntar por un modelo específico
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <h2 className="text-3xl font-bold md:text-4xl">Mucho más que un ordenador de segunda mano</h2>
        <p className="mt-4 max-w-4xl text-sm text-zinc-300 md:text-base">
          No vendemos equipos usados sin más. Cada portátil pasa por nuestro test de 20 puntos de control:
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <CheckCircle2 className="h-6 w-6 text-green-400" />
            <h3 className="mt-3 text-lg font-semibold">Limpieza Interna</h3>
            <p className="mt-2 text-sm text-zinc-400">Sustitución de pasta térmica y limpieza de ventiladores.</p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <CheckCircle2 className="h-6 w-6 text-green-400" />
            <h3 className="mt-3 text-lg font-semibold">Batería Optimizada</h3>
            <p className="mt-2 text-sm text-zinc-400">Garantizamos un rendimiento óptimo de la autonomía.</p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <CheckCircle2 className="h-6 w-6 text-green-400" />
            <h3 className="mt-3 text-lg font-semibold">Software Limpio</h3>
            <p className="mt-2 text-sm text-zinc-400">Windows original instalado desde cero, sin programas basura.</p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <ShieldCheck className="h-6 w-6 text-blue-400" />
            <h3 className="mt-3 text-lg font-semibold">Garantía Inforvel</h3>
            <p className="mt-2 text-sm text-zinc-400">12 meses de soporte técnico local en Córdoba.</p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <h2 className="text-3xl font-bold md:text-4xl">Categorías recomendadas</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <BriefcaseBusiness className="h-6 w-6 text-blue-400" />
            <h3 className="mt-3 text-xl font-semibold">Gama Profesional (ThinkPad, Latitude)</h3>
            <p className="mt-2 text-sm text-zinc-400">Los tanques del mercado. Durabilidad extrema para oficina o estudios.</p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <GraduationCap className="h-6 w-6 text-blue-400" />
            <h3 className="mt-3 text-xl font-semibold">Equipos para Estudiantes</h3>
            <p className="mt-2 text-sm text-zinc-400">Ligeros, rápidos y económicos. Ideales para bachillerato o universidad.</p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <Cpu className="h-6 w-6 text-blue-400" />
            <h3 className="mt-3 text-xl font-semibold">Potencia Creativa</h3>
            <p className="mt-2 text-sm text-zinc-400">Portátiles con procesadores i7 y 16GB RAM para diseño gráfico o edición.</p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <h2 className="text-3xl font-bold md:text-4xl">Tu tienda de informática reacondicionada en Córdoba</h2>
        <p className="mt-4 max-w-4xl text-sm text-zinc-300 md:text-base">
          Olvida las plataformas de segunda mano con envíos dudosos. Ven a nuestra ubicación en El Avellano (Nte. Sierra) y
          prueba el equipo antes de comprarlo.
        </p>
        <p className="mt-3 text-sm text-zinc-400">
          Informática barata Córdoba, portátiles segunda mano Córdoba, ordenadores reacondicionados Andalucía.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <h2 className="text-3xl font-bold md:text-4xl">Preguntas frecuentes</h2>
        <div className="mt-6 space-y-4">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-lg font-semibold">¿Tienen garantía?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Sí, todos nuestros equipos tienen 1 año de garantía directamente con nosotros en nuestro taller de Córdoba.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-lg font-semibold">¿Puedo ampliar la RAM o el SSD?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Por supuesto. Al ser especialistas, podemos entregarte el portátil con las mejoras que necesites en el momento.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-lg font-semibold">¿Emitís factura?</h3>
            <p className="mt-2 text-sm text-zinc-400">Sí, emitimos factura oficial para empresas, autónomos y particulares.</p>
          </article>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/reacondicionados" className="rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold text-black hover:bg-blue-400">
            Ver catálogo disponible
          </Link>
          <a href="tel:+34652369650" className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-semibold hover:bg-zinc-900">
            Llamar para asesoramiento
          </a>
          <Sparkles className="h-5 w-5 text-amber-300 self-center" />
        </div>
      </section>
    </div>
  );
}
