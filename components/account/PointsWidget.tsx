'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, TrendingUp } from 'lucide-react';

interface Level {
    name: string;
    min: number;
    icon: string;
}

interface PointsData {
    points: number;
    current: Level;
    next: Level | null;
}

const LEVEL_COLORS: Record<string, string> = {
    Iniciado: 'from-zinc-400 to-zinc-500',
    Conocedor: 'from-emerald-400 to-emerald-600',
    Entendido: 'from-blue-400 to-blue-600',
    Experto: 'from-violet-400 to-violet-600',
    Maestro: 'from-yellow-400 to-amber-500',
};

const LEVEL_GLOW: Record<string, string> = {
    Iniciado: 'shadow-zinc-500/25',
    Conocedor: 'shadow-emerald-500/25',
    Entendido: 'shadow-blue-500/25',
    Experto: 'shadow-violet-500/25',
    Maestro: 'shadow-yellow-500/25',
};

function getProgressPercent(points: number, current: Level, next: Level | null): number {
    if (!next) return 100;
    const range = next.min - current.min;
    const earned = points - current.min;
    return Math.min(100, Math.round((earned / range) * 100));
}

export function PointsWidget({ userId }: { userId: string | number }) {
    const [data, setData] = useState<PointsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        fetch(`/api/points?customerId=${userId}`, {
            cache: 'no-store',
        })
            .then((r) => r.json())
            .then((d) => {
                if (!d.error) setData(d);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) {
        return (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-1/3 mb-3" />
                <div className="h-2 bg-zinc-800 rounded w-full mb-2" />
                <div className="h-2 bg-zinc-800 rounded w-2/3" />
            </div>
        );
    }

    if (!data) return null;

    const { points, current, next } = data;
    const percent = getProgressPercent(points, current, next);
    const gradient = LEVEL_COLORS[current.name] || LEVEL_COLORS.Iniciado;
    const glow = LEVEL_GLOW[current.name] || LEVEL_GLOW.Iniciado;

    return (
        <div className={`bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-lg ${glow}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-semibold text-white">Mis Puntos</span>
                </div>
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${gradient}`}>
                    {current.icon} {current.name}
                </div>
            </div>

            {/* Points counter */}
            <div className="flex items-end gap-1 mb-4">
                <span className="text-3xl font-bold text-white">{points.toLocaleString('es-ES')}</span>
                <span className="text-zinc-400 text-sm mb-0.5">puntos</span>
            </div>

            {/* Progress bar */}
            {next && (
                <div className="mb-3">
                    <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                        <span>{current.name} ({current.min.toLocaleString('es-ES')})</span>
                        <span>{next.name} ({next.min.toLocaleString('es-ES')})</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-700`}
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <p className="text-xs text-zinc-500 mt-1.5 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {(next.min - points).toLocaleString('es-ES')} puntos para {next.icon} {next.name}
                    </p>
                </div>
            )}

            {!next && (
                <p className="text-xs text-yellow-400 font-medium flex items-center gap-1 mb-2">
                    🏆 ¡Has alcanzado el nivel máximo! ¡Eres un Maestro de Inforvel!
                </p>
            )}

            {/* Link */}
            <Link
                href="/sistema-de-puntos"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline-offset-2 hover:underline"
            >
                ¿Cómo funciona el sistema de puntos?
            </Link>
        </div>
    );
}
