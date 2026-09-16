'use client';

import { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailFromUrl);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Auto-submit si viene email en la URL
  useEffect(() => {
    if (emailFromUrl && !result) {
      handleUnsubscribe(emailFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUnsubscribe(emailToUse?: string) {
    const targetEmail = emailToUse || email;
    if (!targetEmail.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail.trim() }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, message: 'Error de conexión. Inténtalo de nuevo.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen pb-16 bg-black text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-7 h-7 text-zinc-400" />
          </div>

          <h1 className="text-2xl font-bold mb-3">Baja de newsletter</h1>

          {loading ? (
            <div className="flex items-center justify-center gap-3 text-zinc-400 py-6">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Procesando tu baja...</span>
            </div>
          ) : result?.success ? (
            <>
              <div className="flex items-center justify-center gap-3 text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-6 py-4 mb-6">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="text-sm">{result.message}</span>
              </div>
              <Link
                href="/"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Volver a la tienda
              </Link>
            </>
          ) : result && !result.success ? (
            <>
              <div className="flex items-center justify-center gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-6 py-4 mb-6">
                <XCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm">{result.message}</span>
              </div>
              <p className="text-zinc-500 text-sm mb-4">
                Introduce tu email para darte de baja:
              </p>
              <form
                onSubmit={(e) => { e.preventDefault(); handleUnsubscribe(); }}
                className="flex flex-col gap-3"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
                >
                  Darme de baja
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="text-zinc-400 mb-6">
                Introduce tu email para dejar de recibir emails de ofertas.
              </p>
              <form
                onSubmit={(e) => { e.preventDefault(); handleUnsubscribe(); }}
                className="flex flex-col gap-3"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
                >
                  Darme de baja
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BajaNewsletterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    }>
      <UnsubscribeForm />
    </Suspense>
  );
}
