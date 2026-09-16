// components/LegalPage.tsx
import Link from "next/link";

interface LegalPageProps {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
            ← Volver al inicio
          </Link>
          <span className="text-xs text-gray-400">inforvel.online</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Title bar */}
          <div className="bg-gray-900 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {lastUpdated && (
              <p className="text-gray-400 text-sm mt-1">
                Última actualización: {lastUpdated}
              </p>
            )}
          </div>

          {/* Body */}
          <div className="px-8 py-8 prose prose-gray max-w-none text-sm leading-relaxed">
            {children}
          </div>
        </div>

        {/* Footer links */}
        <nav className="mt-8 flex flex-wrap gap-4 text-xs text-gray-500 justify-center">
          <Link href="/aviso-legal" className="hover:text-gray-800 hover:underline">Aviso Legal</Link>
          <span className="text-gray-300">|</span>
          <Link href="/politica-privacidad" className="hover:text-gray-800 hover:underline">Política de Privacidad</Link>
          <span className="text-gray-300">|</span>
          <Link href="/politica-cookies" className="hover:text-gray-800 hover:underline">Política de Cookies</Link>
          <span className="text-gray-300">|</span>
          <Link href="/condiciones-generales" className="hover:text-gray-800 hover:underline">Condiciones Generales</Link>
          <span className="text-gray-300">|</span>
          <Link href="/desistimiento" className="hover:text-gray-800 hover:underline">Derecho de Desistimiento</Link>
        </nav>
      </main>
    </div>
  );
}

// Reusable section components
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2 mb-4">
        {title}
      </h2>
      <div className="text-gray-700 space-y-3">{children}</div>
    </section>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1 text-gray-700">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-md px-5 py-4 text-blue-900 text-sm">
      {children}
    </div>
  );
}
