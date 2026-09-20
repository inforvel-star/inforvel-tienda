import Link from 'next/link';
import type { Metadata } from 'next';
import { Trophy, Star, Zap, TrendingUp, Shield, Info } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Sistema de Puntos y Recompensas',
    description:
        'Descubre cómo ganar y canjear puntos Inforvel: niveles, recompensas y ventajas por tus compras y participación.',
};

const LEVELS = [
    {
        name: 'Iniciado',
        min: 0,
        max: 399,
        icon: '🔹',
        color: 'border-zinc-500 bg-zinc-500/10',
        badge: 'bg-zinc-700 text-zinc-200',
        description: '¡Bienvenido! Has dado tus primeros pasos en la comunidad Inforvel.',
    },
    {
        name: 'Conocedor',
        min: 400,
        max: 1199,
        icon: '🔸',
        color: 'border-emerald-500 bg-emerald-500/10',
        badge: 'bg-emerald-700 text-emerald-100',
        description: '¡Sigues progresando! La comunidad empieza a reconocer tus aportaciones.',
    },
    {
        name: 'Entendido',
        min: 1200,
        max: 3999,
        icon: '💠',
        color: 'border-blue-500 bg-blue-500/10',
        badge: 'bg-blue-700 text-blue-100',
        description: '¡Sin duda sabes de lo que hablas! Eres todo un entendido de la tecnología.',
    },
    {
        name: 'Experto',
        min: 4000,
        max: 6999,
        icon: '⭐',
        color: 'border-violet-500 bg-violet-500/10',
        badge: 'bg-violet-700 text-violet-100',
        description: '¡Has llegado a ser todo un referente tecnológico en Inforvel!',
    },
    {
        name: 'Maestro',
        min: 7000,
        max: null,
        icon: '🏆',
        color: 'border-yellow-500 bg-yellow-500/10',
        badge: 'bg-yellow-600 text-yellow-100',
        description: '¡No hay duda que nada se te resiste! Dominas el mundo de la tecnología.',
    },
];

export default function SistemaPuntosPage() {
    return (
        <div className="min-h-screen bg-black pt-24 pb-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">

                {/* Hero */}
                <div className="text-center mb-14">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium mb-6">
                        <Trophy className="w-4 h-4" />
                        Sistema de Puntos Inforvel
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                        ¿Cómo funcionan los{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
                            puntos?
                        </span>
                    </h1>
                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                        El sistema de puntos de Inforvel te permite subir de nivel, ganar reconocimiento
                        y obtener ventajas exclusivas como cliente fiel.
                    </p>
                </div>

                {/* Levels grid */}
                <section className="mb-14">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-400" />
                        Insignias y niveles
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {LEVELS.map((level) => (
                            <div
                                key={level.name}
                                className={`rounded-xl border p-5 transition-all ${level.color}`}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-2xl">{level.icon}</span>
                                    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${level.badge}`}>
                                        {level.name}
                                    </span>
                                </div>
                                <p className="text-zinc-300 text-sm mb-2">{level.description}</p>
                                <p className="text-zinc-500 text-xs font-mono">
                                    {level.min.toLocaleString('es-ES')} pts
                                    {level.max ? ` – ${level.max.toLocaleString('es-ES')} pts` : ' en adelante'}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* How to earn */}
                <section className="mb-14">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-blue-400" />
                        Cómo ganar puntos
                    </h2>
                    <div className="space-y-4">
                        {[
                            {
                                title: 'Registro en Inforvel',
                                desc: 'Al crear tu cuenta recibirás automáticamente un bono de bienvenida.',
                                points: '+100 pts',
                                color: 'text-emerald-400',
                            },
                            {
                                title: 'Valorar productos (compra verificada)',
                                desc: 'Opinión con texto (+25 pts), valoración general (+5 pts), imagen (+30 pts), valoración técnica (+10 pts).',
                                points: 'Hasta +70 pts',
                                color: 'text-blue-400',
                            },
                            {
                                title: 'Votos útiles en tus opiniones',
                                desc: 'Cada vez que otro usuario marque tu reseña como útil, acumulas más puntos.',
                                points: '+100 pts / voto',
                                color: 'text-violet-400',
                            },
                        ].map((item) => (
                            <div
                                key={item.title}
                                className="flex items-start justify-between gap-4 bg-zinc-950 border border-zinc-800 rounded-xl p-5"
                            >
                                <div>
                                    <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                                    <p className="text-zinc-400 text-sm">{item.desc}</p>
                                </div>
                                <span className={`text-sm font-bold whitespace-nowrap ${item.color}`}>
                                    {item.points}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Devaluation table */}
                <section className="mb-14">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-400" />
                        Devaluación de puntos
                    </h2>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                                    <th className="text-left px-5 py-3 text-zinc-400 font-medium">Tipo de contenido</th>
                                    <th className="text-center px-5 py-3 text-zinc-400 font-medium">A los 3 meses</th>
                                    <th className="text-center px-5 py-3 text-zinc-400 font-medium">A los 6 meses</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60">
                                {[
                                    ['Imágenes', '−15 pts', '−10 pts'],
                                    ['Valoraciones técnicas', '−5 pts', '−1 pt'],
                                    ['Opinión con texto', '−10 pts', '−5 pts'],
                                    ['Valoración general', '−3 pts', '−1 pt'],
                                    ['Voto útil recibido', '−50 pts', '−10 pts'],
                                ].map(([type, three, six]) => (
                                    <tr key={type} className="hover:bg-zinc-900/30 transition-colors">
                                        <td className="px-5 py-3 text-zinc-300">{type}</td>
                                        <td className="px-5 py-3 text-center text-orange-400 font-mono">{three}</td>
                                        <td className="px-5 py-3 text-center text-red-400 font-mono">{six}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-zinc-500 text-xs mt-3 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        Los puntos del bono de registro y los puntos de bienvenida no se devalúan nunca. Nunca te quedarás a 0 puntos.
                    </p>
                </section>

                {/* Legal note */}
                <section className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-zinc-400" />
                        Cambio de reglas
                    </h2>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        Inforvel se reserva el derecho a modificar el sistema de puntuación cuando lo considere
                        necesario para mejorar la experiencia de la comunidad. Estos cambios{' '}
                        <strong className="text-white">nunca afectarán negativamente</strong> a los puntos ya acumulados
                        por los usuarios antes de la aplicación de dichos cambios.
                    </p>
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                        <Link
                            href="/cuenta"
                            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                        >
                            ← Ver mis puntos actuales
                        </Link>
                    </div>
                </section>

            </div>
        </div>
    );
}
