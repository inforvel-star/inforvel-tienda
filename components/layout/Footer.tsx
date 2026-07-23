import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Facebook, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { WCCategory } from '@/lib/woocommerce';

interface FooterProps {
  categories?: WCCategory[];
}

export function Footer({ categories = [] }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-900 bg-black pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded overflow-hidden flex items-center justify-center bg-transparent">
                <Image src="/logo.png" alt="Inforvel" width={20} height={20} className="object-contain" />
              </div>
              <span className="font-bold tracking-tight">Inforvel | Informática y Reparación de Ordenadores</span>
            </div>
            <p className="text-sm text-zinc-400 mb-6">
              Tienda de informática en Córdoba
            </p>
            <p className="text-sm text-zinc-400 mb-2">
              Dirección: El Avellano, Nte. Sierra, 14006 Córdoba
            </p>
            <p className="text-sm text-zinc-400 mb-6">Provincia: Córdoba</p>
            <div className="flex gap-4 text-zinc-400">
              <a href="https://www.instagram.com/INFORVEL" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Instagram de Inforvel">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://www.facebook.com/people/Inforvelonline/61556033247281/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Facebook de Inforvel">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-4">Servicios</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li>
                <a href="/reparacion-moviles-cordoba" className="hover:text-white transition-colors">
                  Reparación móviles
                </a>
              </li>
              <li>
                <a href="/#servicios" className="hover:text-white transition-colors">
                  Reparación ordenadores
                </a>
              </li>
              <li>
                <a href="https://inforvel.online/blog/como-instalar-un-ssd-en-torre-y-portatil-inforvel-cordoba" className="hover:text-white transition-colors">
                  Instalación SSD
                </a>
              </li>
              <li>
                <a href="https://www.inforvel.online/blog/mantenimiento-de-ordenadores-como-mantener-tu-pc-a-punto-inforvel-cordoba" className="hover:text-white transition-colors">
                  Mantenimiento
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">Comunidad</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li>
                <a href="tel:+34652369650" className="hover:text-white transition-colors">
                  Teléfono: 652 36 96 50
                </a>
              </li>
              <li>
                <a href="mailto:inforvel@inforvel.online" className="hover:text-white transition-colors">
                  inforvel@inforvel.online
                </a>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">Información Legal</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li>
                <Link href="/aviso-legal" className="hover:text-white transition-colors">
                  Aviso Legal
                </Link>
              </li>
              <li>
                <Link href="/politica-privacidad" className="hover:text-white transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link href="/politica-cookies" className="hover:text-white transition-colors">
                  Política de Cookies
                </Link>
              </li>
              <li>
                <Link href="/condiciones-generales" className="hover:text-white transition-colors">
                  Condiciones Generales
                </Link>
              </li>
              <li>
                <Link href="/desistimiento" className="hover:text-white transition-colors">
                  Devoluciones
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-900 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm text-zinc-400">&copy; {currentYear} Inforvel.online. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">Pagos seguros con:</span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="w-[80px] h-[40px] rounded-2xl border border-white/20 bg-gradient-to-b from-zinc-700/50 via-zinc-900 to-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_18px_rgba(255,255,255,0.06)] flex flex-col items-center justify-center text-white">
                  <CreditCard className="w-4 h-4 mb-1" />
                  <span className="text-[10px] font-semibold leading-none">Tarjeta</span>
                </div>
                <div className="w-[80px] h-[40px] rounded-2xl border border-white/20 bg-gradient-to-b from-zinc-700/50 via-zinc-900 to-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_18px_rgba(255,255,255,0.06)] flex flex-col items-center justify-center">
                  <span className="text-[18px] font-black italic leading-none text-[#0070ba]">PayPal</span>
                </div>
                <div className="w-[80px] h-[40px] rounded-2xl border border-white/20 bg-gradient-to-b from-zinc-700/50 via-zinc-900 to-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_18px_rgba(255,255,255,0.06)] flex flex-col items-center justify-center">
                  <span className="text-[17px] font-black leading-none text-[#ff8ab3]">Klarna.</span>
                </div>
                <div className="w-[80px] h-[40px] rounded-2xl border border-white/20 bg-gradient-to-b from-zinc-700/50 via-zinc-900 to-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_18px_rgba(255,255,255,0.06)] flex flex-col items-center justify-center text-white">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Wallet className="w-4 h-4 text-white" />
                    <span className="text-[14px] font-bold leading-none">G Pay</span>
                  </div>
                  <span className="text-[9px] text-zinc-300 leading-none">Google Pay</span>
                </div>
                {/* Apple Pay removed */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
