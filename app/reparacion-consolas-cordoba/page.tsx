import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo';
import { AirVent, Disc3, Gamepad2, HdmiPort, MapPin, ShieldCheck, Wrench } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Reparación de Consolas en Córdoba | PS5, Xbox, Switch | Inforvel',
  description:
    '🎮 ¿Tu consola no enciende o tiene drift? Reparación de PlayStation, Xbox y Nintendo Switch en Córdoba. Servicio rápido, garantía de 12 meses y técnicos expertos.',
  alternates: {
    canonical: absoluteUrl('/reparacion-consolas-cordoba'),
  },
  openGraph: {
    title: 'Reparación de Consolas en Córdoba | PS5, Xbox, Switch | Inforvel',
    description:
      '🎮 ¿Tu consola no enciende o tiene drift? Reparación de PlayStation, Xbox y Nintendo Switch en Córdoba. Servicio rápido, garantía de 12 meses y técnicos expertos.',
    url: absoluteUrl('/reparacion-consolas-cordoba'),
    type: 'website',
  },
};

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Reparación de videoconsolas',
  provider: {
    '@type': 'LocalBusiness',
    name: 'Inforvel',
    image: 'https://inforvel.online/logo.png',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'El Avellano, Nte. Sierra',
      addressLocality: 'Córdoba',
      postalCode: '14006',
      addressCountry: 'ES',
    },
    telephone: '+34652369650',
  },
  areaServed: 'Córdoba',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Servicios de Reparación de Consolas',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Reparación puerto HDMI PS5 en Córdoba',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Limpieza y cambio pasta térmica consolas',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Arreglar drift mando Nintendo Switch',
        },
      },
    ],
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Cuánto tardáis en reparar el HDMI de una PS5?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Normalmente entre 48 y 72 horas, dependiendo de la carga de trabajo en nuestro taller de Córdoba.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Reparáis el drift de los mandos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí, sustituimos los módulos analógicos para que el mando funcione como nuevo sin tener que comprar uno nuevo.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Se pierden mis partidas guardadas?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'En reparaciones de hardware (puertos, limpieza y botones) tus datos están 100% seguros.',
      },
    },
  ],
};

export default function ReparacionConsolasCordobaPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className="relative overflow-hidden border-b border-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_52%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.16),transparent_48%)]" />
        <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-28 md:pt-32">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-green-300">GAME OVER A LAS AVERIAS</p>
          <h1 className="max-w-5xl text-4xl font-bold leading-tight md:text-6xl">
            Reparación de Consolas en Córdoba: Especialistas en Next-Gen y Retro
          </h1>
          <p className="mt-5 max-w-4xl text-base text-zinc-300 md:text-lg">
            No des por perdida tu partida. En Inforvel somos expertos en solucionar fallos de lectura, sobrecalentamiento y
            conectividad en PS5, Xbox Series, Nintendo Switch y consolas clásicas. Reparaciones profesionales con garantía local.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://wa.me/34652369650?text=Hola%20Inforvel%2C%20quiero%20consultar%20una%20aver%C3%ADa%20de%20consola%20en%20C%C3%B3rdoba"
              className="rounded-full bg-green-500 px-6 py-3 text-sm font-semibold text-black hover:bg-green-400"
            >
              Consultar avería por WhatsApp
            </a>
            <a
              href="https://wa.me/34652369650?text=Hola%20Inforvel%2C%20quiero%20ver%20tarifas%20de%20limpieza%20de%20consola"
              className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-semibold hover:bg-zinc-900"
            >
              Ver tarifas de limpieza
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <h2 className="text-3xl font-bold md:text-4xl">Solucionamos los fallos más frecuentes</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <HdmiPort className="h-6 w-6 text-blue-400" />
            <h3 className="mt-3 text-xl font-semibold">Puerto HDMI y Vídeo</h3>
            <p className="mt-2 text-sm text-zinc-400">
              ¿Tu consola enciende pero no da imagen? Sustituimos puertos HDMI dañados en PS4, PS5 y Xbox con soldadura de
              precisión.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <Gamepad2 className="h-6 w-6 text-blue-400" />
            <h3 className="mt-3 text-xl font-semibold">Drift y Botones</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Reparamos el molesto movimiento solo de tus mandos de Switch o DualSense para que recuperes el control total.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <AirVent className="h-6 w-6 text-blue-400" />
            <h3 className="mt-3 text-xl font-semibold">Mantenimiento y Ruido</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Si tu consola suena como una turbina de avión, realizamos limpieza integral y cambio de pasta térmica o metal
              líquido en PS5.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <Disc3 className="h-6 w-6 text-blue-400" />
            <h3 className="mt-3 text-xl font-semibold">Lector y Almacenamiento</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Cambios de lente, reparación de bandejas atascadas o ampliación de discos SSD para que no te falte espacio.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14">
        <h2 className="text-3xl font-bold md:text-4xl">Tu centro de reparación gamer en el Nte. Sierra</h2>
        <p className="mt-4 max-w-4xl text-sm text-zinc-300 md:text-base">
          Olvida enviar tu consola a servicios oficiales fuera de Córdoba y esperar semanas. En Inforvel (zona El Avellano)
          tratamos tu equipo con el cuidado que merece un gamer.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <Wrench className="h-6 w-6 text-green-400" />
            <p className="mt-3 text-sm text-zinc-300">Diagnóstico gratuito de la avería.</p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <ShieldCheck className="h-6 w-6 text-green-400" />
            <p className="mt-3 text-sm text-zinc-300">Repuestos originales o compatibles de alta calidad.</p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <MapPin className="h-6 w-6 text-green-400" />
            <p className="mt-3 text-sm text-zinc-300">Ubicación fácil en Córdoba capital con opción de recogida a domicilio.</p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <h2 className="text-3xl font-bold md:text-4xl">Preguntas frecuentes</h2>
        <div className="mt-6 space-y-4">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-lg font-semibold">¿Cuánto tardáis en reparar el HDMI de una PS5?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Normalmente entre 48 y 72 horas, dependiendo de la carga de trabajo en nuestro taller de Córdoba.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-lg font-semibold">¿Reparáis el drift de los mandos?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Sí, sustituimos los módulos analógicos para que el mando funcione como nuevo sin tener que comprar uno nuevo.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-lg font-semibold">¿Se pierden mis partidas guardadas?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              En reparaciones de hardware (puertos, limpieza y botones) tus datos están 100% seguros.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
