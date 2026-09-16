import Link from 'next/link';
import { Home, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Página no encontrada | Inforvel' },
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen pt-20 pb-16 flex items-center justify-center bg-black">
      <div className="text-center max-w-lg px-4">
        <div className="text-[120px] md:text-[160px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-zinc-400 to-zinc-800 mb-4 select-none">
          404
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Página no encontrada
        </h1>

        <p className="text-zinc-400 mb-8 text-lg">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" asChild className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Ir al inicio
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="w-full sm:w-auto border-zinc-800 hover:bg-zinc-900">
            <Link href="/tienda">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Ver tienda
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
