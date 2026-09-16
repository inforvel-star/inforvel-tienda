// Shared gamification utilities – safe to import from both server and client

export const LEVELS = [
    { name: 'Iniciado', min: 0, icon: '🔹' },
    { name: 'Conocedor', min: 400, icon: '🔸' },
    { name: 'Entendido', min: 1200, icon: '💠' },
    { name: 'Experto', min: 4000, icon: '⭐' },
    { name: 'Maestro', min: 7000, icon: '🏆' },
] as const;

export type Level = (typeof LEVELS)[number];

export function getLevel(points: number): { current: Level; next: Level | null } {
    let current: Level = LEVELS[0];
    for (const level of LEVELS) {
        if (points >= level.min) current = level as Level;
        else break;
    }
    const idx = LEVELS.findIndex((l) => l.name === current.name);
    const next = (LEVELS[idx + 1] as Level) ?? null;
    return { current, next };
}
