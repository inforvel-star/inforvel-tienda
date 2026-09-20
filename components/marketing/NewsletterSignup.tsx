'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const subscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      setResult(data);
      if (data.success) setEmail('');
    } catch {
      setResult({ success: false, message: 'Error de conexión. Inténtalo de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/15 via-purple-500/10 to-pink-500/10 px-6 py-8 sm:px-10">
      <div className="grid items-center gap-6 lg:grid-cols-[1fr_420px]">
        <div>
          <div className="mb-3 flex items-center gap-2 text-blue-300"><Mail className="h-5 w-5" /><span className="text-sm font-semibold">Ofertas para clientes Inforvel</span></div>
          <h2 className="text-2xl font-bold">Guarda tu intención de compra</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">Recibe acceso prioritario a descuentos reales y avisos de bajadas de precio. Sin spam.</p>
        </div>
        {result?.success ? (
          <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 px-5 py-4 text-sm text-green-400">
            <CheckCircle2 className="h-5 w-5 shrink-0" />{result.message}
          </div>
        ) : (
          <div>
            <form onSubmit={subscribe} className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="newsletter-email" className="sr-only">Email para recibir ofertas</label>
              <input id="newsletter-email" name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" className="min-h-[46px] flex-1 rounded-xl border border-zinc-700 bg-zinc-950/80 px-4 text-white outline-none focus:border-blue-500" />
              <button type="submit" disabled={loading} className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Quiero recibir ofertas
              </button>
            </form>
            {result && !result.success && <p className="mt-2 text-sm text-red-400">{result.message}</p>}
            <p className="mt-2 text-xs text-zinc-500">
              Al suscribirte aceptas nuestra{' '}
              <Link href="/politica-privacidad" className="underline hover:text-zinc-300">
                política de privacidad
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
