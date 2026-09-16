'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [isReopen, setIsReopen] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const openPreferences = () => {
      const rawConfig = localStorage.getItem('cookie_config');
      const consent = localStorage.getItem('cookie_consent');
      let config: { analytics?: boolean; marketing?: boolean } | null = null;
      try {
        config = rawConfig ? JSON.parse(rawConfig) : null;
      } catch {
        config = null;
      }
      setAnalytics(config?.analytics ?? consent === 'all');
      setMarketing(config?.marketing ?? consent === 'all');
      setIsReopen(true);
      setShowConfig(true);
      setVisible(true);
    };
    window.addEventListener('open-cookie-preferences', openPreferences);
    return () => window.removeEventListener('open-cookie-preferences', openPreferences);
  }, []);

  const saveConsent = (type: string) => {
    localStorage.setItem('cookie_consent', type);
    localStorage.setItem('cookie_consent_date', new Date().toISOString());
    setVisible(false);
    window.dispatchEvent(new Event('cookie-consent-updated'));
    // Changing an existing choice can mean revoking consent for a tracker
    // that has already loaded. There is no reliable way to unload a
    // third-party script once it has run, so reload to guarantee the new
    // preference actually takes effect (only when reopened from the footer;
    // a first-time decision has nothing to unwind yet).
    if (isReopen) {
      window.location.reload();
    }
  };

  const handleAcceptAll = () => saveConsent('all');
  const handleReject = () => saveConsent('essential');
  const handleSaveConfig = () => {
    const config = { analytics, marketing };
    localStorage.setItem('cookie_config', JSON.stringify(config));
    saveConsent('custom');
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-fade-in" />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white text-black rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Preferencia de cookies</h2>

            {!showConfig ? (
              <>
                <p className="text-sm text-zinc-600 mb-4 leading-relaxed">
                  En Inforvel utilizamos cookies propias y de terceros con distintas finalidades.
                  Puedes aceptar todas las cookies pulsando en el botón &quot;Aceptar Todas&quot;,
                  rechazar todas las cookies opcionales pulsando en el botón &quot;Rechazar Cookies&quot;
                  o configurarlas pulsando en el botón &quot;Configuración de cookies&quot;.
                </p>
                <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
                  Ten en cuenta que rechazar las cookies puede afectar a tu experiencia de compra.
                  Para más información sobre nuestras cookies puedes visitar nuestra{' '}
                  <Link href="/politica-cookies" className="text-blue-600 hover:underline font-medium">
                    Política de Cookies
                  </Link>.
                </p>
              </>
            ) : (
              <div className="mb-6 space-y-4">
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Configura qué cookies deseas permitir. Las cookies esenciales son necesarias
                  para el funcionamiento del sitio y no se pueden desactivar.
                </p>

                {/* Essential - always on */}
                <div className="flex items-center justify-between p-3 bg-zinc-100 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Cookies esenciales</p>
                    <p className="text-xs text-zinc-500">Necesarias para el funcionamiento (carrito, sesión)</p>
                  </div>
                  <div className="w-10 h-6 bg-blue-500 rounded-full relative cursor-not-allowed">
                    <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow" />
                  </div>
                </div>

                {/* Analytics */}
                <label className="flex items-center justify-between p-3 bg-zinc-100 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-sm">Cookies analíticas</p>
                    <p className="text-xs text-zinc-500">Nos ayudan a entender cómo usas el sitio</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnalytics(!analytics)}
                    className={`w-10 h-6 rounded-full relative transition-colors ${analytics ? 'bg-blue-500' : 'bg-zinc-300'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${analytics ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </label>

                {/* Marketing */}
                <label className="flex items-center justify-between p-3 bg-zinc-100 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-sm">Cookies de marketing</p>
                    <p className="text-xs text-zinc-500">Permiten mostrarte anuncios relevantes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMarketing(!marketing)}
                    className={`w-10 h-6 rounded-full relative transition-colors ${marketing ? 'bg-blue-500' : 'bg-zinc-300'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${marketing ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </label>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {!showConfig ? (
                <>
                  <button
                    onClick={() => setShowConfig(true)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    Configuración de cookies
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Rechazar Cookies
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Aceptar Todas
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowConfig(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Guardar preferencias
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
