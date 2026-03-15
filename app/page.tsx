'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Wrench, ShoppingBag, Zap, ShieldCheck, HeartHandshake,
  ArrowRight, Cpu, Twitter, Instagram, Linkedin, Phone,
  Smartphone, Laptop, HardDrive, Package
} from 'lucide-react';
import { woocommerce, WCProduct } from '@/lib/woocommerce';

interface Service {
  icon: string;
  title: string;
  description: string;
}

interface Step {
  number: number;
  title: string;
  description: string;
}

interface Testimonial {
  name: string;
  text: string;
  rating: number;
}

const services: Service[] = [
  { icon: 'smartphone', title: 'Reparación de móviles', description: 'Pantallas, baterías, cámaras y más' },
  { icon: 'laptop', title: 'Reparación de ordenadores', description: 'PC y portátiles. Hardware y software' },
  { icon: 'hard-drive', title: 'Instalación de SSD', description: 'Mejora el rendimiento de tu equipo' },
  { icon: 'package', title: 'Mantenimiento preventivo', description: 'Limpieza y optimización completa' },
  { icon: 'cpu', title: 'Montaje de equipos', description: 'PC gaming y workstation a medida' },
  { icon: 'zap', title: 'Recuperación de datos', description: 'Rescata tu información perdida' },
];

const steps: Step[] = [
  { number: 1, title: 'Contacta', description: 'Llámanos o escríbenos' },
  { number: 2, title: 'Diagnóstico', description: 'Evaluamos el problema' },
  { number: 3, title: 'Reparación', description: 'Solucionamos rápido' },
  { number: 4, title: 'Listo', description: 'Dispositivo como nuevo' },
];

const testimonials: Testimonial[] = [
  { name: 'María García', text: 'Excelente servicio. Repararon mi portátil en menos de 24h. Muy profesionales.', rating: 5 },
  { name: 'Carlos Ruiz', text: 'Cambio de SSD increíble. Mi PC va 10 veces más rápido. 100% recomendable.', rating: 5 },
  { name: 'Laura Sánchez', text: 'Trato cercano y precios justos. Volveré sin duda para futuras reparaciones.', rating: 5 },
  { name: 'Javier López', text: 'Me montaron un PC gaming espectacular. Cumplió todas mis expectativas.', rating: 5 },
  { name: 'Ana Martínez', text: 'Recuperaron todos mis archivos de un disco dañado. ¡Increíble trabajo!', rating: 5 },
  { name: 'Pedro Fernández', text: 'Rapidez y profesionalidad. Manu es un crack en lo que hace.', rating: 5 },
];

export default function Home() {
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await woocommerce.getProducts({ per_page: 8 });
        setProducts(data);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const getIcon = (iconName: string) => {
    const icons: any = {
      smartphone: Smartphone,
      laptop: Laptop,
      'hard-drive': HardDrive,
      package: Package,
      cpu: Cpu,
      zap: Zap,
    };
    const IconComponent = icons[iconName] || Package;
    return <IconComponent className="w-6 h-6" />;
  };

  return (
    <div className="bg-black text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden flex flex-col items-center justify-center min-h-screen text-center px-4">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm text-sm text-zinc-400 mb-8 animate-fade-in-up">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Servicio técnico activo en tu zona
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto mb-6 leading-tight">
          Tu solución tecnológica <br className="hidden md:block" />
        <span className="
  text-transparent bg-clip-text 
  bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400
  gradient-hover
">
  rápida y profesional
</span>
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
          Expertos en reparación de dispositivos y venta de equipamiento premium.
          Solucionamos tus problemas hoy mismo.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <a href="tel:+34652369650" className="w-full sm:w-auto px-8 py-3 rounded-full bg-white text-black font-medium hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2">
            Solicitar reparación
            <Wrench className="w-4 h-4" />
          </a>
          <Link href="/tienda" className="w-full sm:w-auto px-8 py-3 rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
            Ver tienda
            <ShoppingBag className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Services */}
      <section id="servicios" className="py-24 relative border-t border-zinc-900 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Servicios Especializados</h2>
            <p className="text-zinc-400">Diagnóstico preciso y soluciones rápidas para devolverle la vida a tus dispositivos tecnológicos.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <div key={index} className="group p-6 rounded-2xl border border-zinc-900 bg-zinc-950/50 hover:border-blue-500/50 transition-all duration-300 hover:bg-zinc-900/50">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 group-hover:bg-blue-500/10 group-hover:border-blue-500/50 transition-all">
                  {getIcon(service.icon)}
                </div>
                <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                <p className="text-sm text-zinc-400">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="como-funciona" className="py-24 relative border-t border-zinc-900">
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

      {/* Store Section */}
      <section id="tienda" className="py-24 relative border-t border-zinc-900 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Tienda Inforvel</h2>
              <p className="text-zinc-400 max-w-md">Equipos, componentes y accesorios de última generación cuidadosamente seleccionados.</p>
            </div>
            <Link href="/tienda" className="mt-6 md:mt-0 px-6 py-2 rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors text-sm">
              Ver catálogo completo
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-zinc-900 rounded-xl mb-4"></div>
                  <div className="h-4 bg-zinc-900 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-zinc-900 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.slice(0, 8).map((product) => (
                <Link
                  key={product.id}
                  href={`/producto/${product.slug}`}
                  className="group"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden border border-zinc-900 bg-zinc-950 mb-4 group-hover:border-blue-500/50 transition-all">
                    <Image
                      src={product.images[0]?.src || '/placeholder.png'}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h3 className="font-medium mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">{product.name}</h3>
                  <p className="text-xl font-bold text-blue-400">{product.price}€</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why Us */}
      <section id="nosotros" className="py-24 relative border-t border-zinc-900">
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
                    <h3 className="font-medium text-lg mb-1">Técnico experto (Manu)</h3>
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
                    <div className="text-4xl font-bold mb-2">5.0</div>
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

      {/* Testimonials */}
      <section id="testimonios" className="py-24 relative border-t border-zinc-900 bg-[#050505] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Lo que dicen de nosotros</h2>
          <p className="text-zinc-400">Basado en reseñas reales de Google.</p>
        </div>

        <div className="flex gap-6 px-6 overflow-x-auto scrollbar-hide">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="min-w-[350px] p-6 rounded-xl border border-zinc-900 bg-zinc-950/50">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="text-yellow-500">★</span>
                ))}
              </div>
              <p className="text-sm text-zinc-300 mb-4">{testimonial.text}</p>
              <p className="font-medium">{testimonial.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative border-t border-zinc-900 text-center px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-900/10 pointer-events-none"></div>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Arregla tu dispositivo hoy mismo</h2>
          <p className="text-lg text-zinc-400 mb-10">No dejes que un problema técnico frene tu ritmo. Contacta ahora y obtén un diagnóstico rápido y profesional.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="tel:+34652369650" className="w-full sm:w-auto px-8 py-3 rounded-full bg-white text-black font-medium hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              Solicitar reparación
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link href="/tienda" className="w-full sm:w-auto px-8 py-3 rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
              Ver tienda
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-black pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Cpu className="text-white w-3 h-3" />
                </div>
                <span className="font-bold tracking-tight">Inforvel.online</span>
              </div>
              <p className="text-sm text-zinc-400 mb-6">Tu aliado tecnológico. Reparaciones rápidas y componentes premium al mejor precio.</p>
              <div className="flex gap-4 text-zinc-400">
                <a href="#" className="hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
                <a href="#" className="hover:text-white transition-colors"><Instagram className="w-5 h-5" /></a>
                <a href="#" className="hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></a>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-4">Servicios</h4>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li><a href="#servicios" className="hover:text-white transition-colors">Reparación móviles</a></li>
                <li><a href="#servicios" className="hover:text-white transition-colors">Reparación ordenadores</a></li>
                <li><a href="#servicios" className="hover:text-white transition-colors">Instalación SSD</a></li>
                <li><a href="#servicios" className="hover:text-white transition-colors">Mantenimiento</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-4">Tienda</h4>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li><Link href="/tienda" className="hover:text-white transition-colors">Ordenadores</Link></li>
                <li><Link href="/tienda" className="hover:text-white transition-colors">Componentes</Link></li>
                <li><Link href="/tienda" className="hover:text-white transition-colors">Consumibles</Link></li>
                <li><Link href="/tienda" className="hover:text-white transition-colors">Accesorios</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-4">Empresa</h4>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li><a href="tel:+34652369650" className="hover:text-white transition-colors">Contacto</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Términos y condiciones</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacidad</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-zinc-400">
            <p>&copy; 2026 Inforvel.online. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
