import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  CloudCog,
  CreditCard,
  Headset,
  Laptop,
  Network,
  Server,
  ShieldCheck,
  TimerReset,
  Wrench,
} from 'lucide-react';
import { absoluteUrl } from '@/lib/seo';

const pageUrl = '/servicios-pymes-empresas-cordoba';
const whatsappAudit = 'https://wa.me/34652369650?text=Hola%20Inforvel%2C%20quiero%20solicitar%20un%20diagn%C3%B3stico%20tecnol%C3%B3gico%20para%20mi%20empresa%20en%20C%C3%B3rdoba.';
const whatsappPlan = 'https://wa.me/34652369650?text=Hola%20Inforvel%2C%20quiero%20recibir%20una%20propuesta%20de%20soporte%20inform%C3%A1tico%20para%20mi%20empresa.';

export const metadata: Metadata = {
  title: 'Servicios Informáticos para PYMES y Empresas en Córdoba',
  description:
    'Soporte informático para pymes, autónomos y empresas en Córdoba: mantenimiento, ciberseguridad, backups, redes, servidores, CCTV, TPV y equipamiento profesional.',
  alternates: { canonical: absoluteUrl(pageUrl) },
  openGraph: {
    title: 'Inforvel Empresas | Tecnología que mantiene tu negocio en marcha',
    description:
      'Soporte técnico continuo, redes, seguridad, videovigilancia, TPV y equipamiento para empresas en Córdoba.',
    url: absoluteUrl(pageUrl),
    type: 'website',
  },
};

const services = [
  {
    icon: Wrench,
    title: 'Mantenimiento informático preventivo',
    text: 'Soporte remoto y presencial para anticiparnos a los fallos, reducir incidencias y mantener cada puesto de trabajo productivo.',
  },
  {
    icon: ShieldCheck,
    title: 'Seguridad y backups automáticos',
    text: 'Auditoría de riesgos y copias cifradas locales y en la nube para que la información crítica pueda recuperarse cuando más importa.',
  },
  {
    icon: Network,
    title: 'Redes, servidores y teletrabajo seguro',
    text: 'Unificamos redes, WiFi, servidores, VPN y accesos para que el equipo trabaje con estabilidad dentro y fuera de la oficina.',
  },
  {
    icon: Laptop,
    title: 'Equipamiento de oficina llave en mano',
    text: 'Suministramos, configuramos y dejamos operativos ordenadores, monitores, impresoras y periféricos adaptados a cada puesto.',
  },
  {
    icon: Camera,
    title: 'Videovigilancia CCTV e IP',
    text: 'Diseñamos e instalamos sistemas de cámaras, grabación y acceso remoto para proteger instalaciones y tener control visual del negocio.',
  },
  {
    icon: CreditCard,
    title: 'Instalación y configuración de TPV',
    text: 'Preparamos terminales, impresoras, lectores y conectividad para que el punto de venta funcione de forma ágil y fiable.',
  },
];

const faqItems = [
  {
    question: '¿Ofrecéis soporte remoto y presencial en Córdoba?',
    answer: 'Sí. Resolvemos incidencias de software y configuración mediante asistencia remota segura y nos desplazamos a empresas de Córdoba capital cuando la intervención debe realizarse en las instalaciones.',
  },
  {
    question: '¿Podéis instalar cámaras de videovigilancia y sistemas TPV?',
    answer: 'Sí. Diseñamos e instalamos soluciones CCTV e IP, grabación y acceso remoto, además de terminales TPV, impresoras, lectores y la conectividad necesaria para el punto de venta.',
  },
  {
    question: '¿Trabajáis con autónomos y empresas pequeñas?',
    answer: 'Sí. Adaptamos el alcance a cada negocio, desde un autónomo con un único equipo hasta oficinas con múltiples puestos, redes, servidores y sedes conectadas.',
  },
  {
    question: '¿Hay compromiso de permanencia?',
    answer: 'Cada propuesta indica claramente el alcance y las condiciones. Podemos trabajar mediante intervenciones concretas o planes continuos, sin imponer servicios que la empresa no necesita.',
  },
];

const businessSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Servicios informáticos para PYMES, autónomos y empresas en Córdoba',
  serviceType: 'Soporte informático empresarial, redes, CCTV, TPV y ciberseguridad',
  url: absoluteUrl(pageUrl),
  areaServed: { '@type': 'AdministrativeArea', name: 'Córdoba' },
  provider: {
    '@type': 'LocalBusiness',
    name: 'Inforvel',
    telephone: '+34652369650',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'El Avellano, Nte. Sierra',
      postalCode: '14006',
      addressLocality: 'Córdoba',
      addressCountry: 'ES',
    },
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Inicio',
      item: absoluteUrl('/'),
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Servicios para PYMES y empresas',
      item: absoluteUrl(pageUrl),
    },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export default function ServiciosPymesEmpresasPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className="relative isolate overflow-hidden border-b border-zinc-900">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_54%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent_46%)]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-16 pt-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:pb-24 lg:pt-24">
          <div>
            <nav aria-label="Migas de pan" className="mb-5 flex items-center gap-2 text-xs text-zinc-500">
              <Link href="/" className="transition-colors hover:text-white">Inicio</Link>
              <span aria-hidden="true">/</span>
              <span>Servicios para PYMES y empresas</span>
            </nav>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">
              <Building2 className="h-4 w-4" />
              Inforvel Empresas · Córdoba
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Tu negocio no puede detenerse por un problema informático
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-zinc-300 lg:text-xl">
              Soporte tecnológico para <strong className="text-white">pymes, autónomos y empresas de Córdoba</strong> que necesitan continuidad, datos protegidos y un equipo técnico que responda cuando hace falta.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href={whatsappAudit} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 font-bold text-black transition hover:bg-zinc-200">
                Solicitar diagnóstico tecnológico
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href={whatsappPlan} className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-6 py-3.5 font-semibold transition hover:border-zinc-700 hover:bg-zinc-800">
                Recibir una propuesta a medida
              </a>
            </div>
          </div>

          <aside className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-green-400">Tecnología bajo control</p>
            <div className="mt-6 space-y-5">
              {[
                ['Respuesta local', 'Atención remota y desplazamiento en Córdoba capital.'],
                ['Continuidad operativa', 'Prevención, monitorización y recuperación ante incidencias.'],
                ['Un único interlocutor', 'Hardware, redes, seguridad, TPV y videovigilancia coordinados.'],
              ].map(([title, text]) => (
                <div key={title} className="flex gap-3 border-b border-zinc-900 pb-5 last:border-0 last:pb-0">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-400">¿Te resulta familiar?</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Problemas tecnológicos que cuestan tiempo y dinero</h2>
          <p className="mt-4 text-zinc-400">No necesitas incorporar un departamento informático para trabajar con la tranquilidad de tener uno.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            ['Equipos lentos', 'Los ordenadores frenan al equipo y las tareas sencillas consumen demasiado tiempo.'],
            ['Datos en riesgo', 'No sabes si las copias funcionan ni cuánto tardarías en recuperar la actividad.'],
            ['Sin soporte inmediato', 'Cuando algo falla, nadie conoce tu instalación ni puede darte una respuesta clara.'],
            ['Seguridad incierta', 'Contraseñas, accesos, correo y dispositivos crecen sin una estrategia común.'],
          ].map(([title, text], index) => (
            <article key={title} className="rounded-xl border border-zinc-900 bg-zinc-950/50 p-6">
              <span className="text-sm font-black text-blue-400">0{index + 1}</span>
              <h3 className="mt-4 text-xl font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-[#050505]">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-400">Servicios corporativos</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Una infraestructura fiable, segura y preparada para crecer</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-zinc-400">Desde un autónomo con un puesto hasta una empresa con varias áreas, diseñamos una solución proporcionada y documentada.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map(({ icon: Icon, title, text }) => (
              <article key={title} className="group rounded-2xl border border-zinc-900 bg-zinc-950/50 p-7 transition hover:-translate-y-1 hover:border-blue-500/50">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-green-400">Por qué Inforvel Empresas</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Solvencia técnica con atención cercana</h2>
            <p className="mt-5 leading-relaxed text-zinc-400">Hablamos de objetivos de negocio, prioridades y riesgos. Después proponemos una solución comprensible, medible y sin costes ocultos.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: TimerReset, title: 'Soporte express en Córdoba', text: 'Respuesta ágil, asistencia remota y desplazamiento en Córdoba capital según la prioridad de la incidencia.' },
              { icon: BadgeCheck, title: 'Presupuestos cerrados', text: 'Alcance, materiales y costes explicados antes de empezar. Sin sorpresas en la factura.' },
              { icon: Server, title: 'Visión integral', text: 'Coordinamos equipos, servidores, redes, copias, cámaras y TPV para evitar soluciones aisladas.' },
              { icon: CloudCog, title: 'Experiencia técnica demostrada', text: 'Reparación avanzada de hardware y microsoldadura con garantía por escrito: una capacidad que muchos soportes externalizan.' },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-xl border border-zinc-900 bg-zinc-950/50 p-6">
                <Icon className="h-6 w-6 text-green-400" />
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900 bg-[#050505]">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-400">Preguntas frecuentes</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Información clara antes de empezar</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {faqItems.map((item) => (
              <article key={item.question} className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-6">
                <h3 className="text-lg font-semibold">{item.question}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900 bg-gradient-to-b from-transparent to-blue-900/10">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center md:py-24">
          <Headset className="mx-auto h-9 w-9 text-blue-400" />
          <h2 className="mt-5 text-3xl font-black md:text-5xl">Convierte la informática en una ventaja, no en una preocupación</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-300">Cuéntanos cómo trabaja tu empresa y te propondremos el siguiente paso con claridad, sin compromiso y sin tecnicismos innecesarios.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={whatsappAudit} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 font-bold text-black transition hover:bg-zinc-200">
              Solicitar diagnóstico tecnológico
              <ArrowRight className="h-4 w-4" />
            </a>
            <a href={whatsappPlan} className="inline-flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 px-6 py-3.5 font-semibold transition hover:bg-zinc-800">
              Recibir una propuesta a medida
            </a>
          </div>
          <p className="mt-6 text-sm text-zinc-500">Atención a autónomos, pequeñas, medianas y grandes empresas de Córdoba.</p>
        </div>
      </section>
    </div>
  );
}
