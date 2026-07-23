'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api/auth';
import { useCartStore } from '@/lib/store/cartStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Cpu, Loader as Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const { syncCartOnLogin } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authAPI.login(email, password);

      if (!response.success) {
        toast.error(response.message || 'Error al iniciar sesión');
        return;
      }

      toast.success(`Bienvenido ${response.user_display_name || 'de nuevo'}`);

      await syncCartOnLogin();

      router.push('/cuenta');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 flex items-center justify-center bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-blue-500/5" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md px-4 relative z-10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl text-white">Inforvel</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2 text-white">Inicia sesión</h1>
          <p className="text-zinc-400">
            Accede a tu cuenta para gestionar tus pedidos
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 shadow-xl shadow-black/50">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-zinc-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="mt-1.5 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-zinc-200">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500/20"
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-zinc-400">¿No tienes cuenta? </span>
            <Link
              href="/registro"
              className="text-blue-400 font-medium hover:text-blue-300 transition-colors"
            >
              Regístrate
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-500">
              Tu carrito se sincronizará automáticamente al iniciar sesión
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
