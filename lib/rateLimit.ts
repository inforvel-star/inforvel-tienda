import { NextRequest, NextResponse } from 'next/server';
import { createClient, RedisClientType } from 'redis';

// Rate limiter en memoria (por IP)
// Para producción con múltiples instancias, usar Redis o Upstash
interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
let redisClient: RedisClientType | null = null;
let redisInitAttempted = false;

function isValidIp(value: string): boolean {
    const candidate = value.trim();
    if (!candidate) return false;
    const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    const ipv6 = /^[0-9a-f:]+$/i;
    return ipv4.test(candidate) || ipv6.test(candidate);
}

function extractClientIp(request: NextRequest): string {
    const ipFromRuntime = (request as any).ip;
    if (typeof ipFromRuntime === 'string' && isValidIp(ipFromRuntime)) {
        return ipFromRuntime;
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp && isValidIp(realIp)) {
        return realIp.trim();
    }

    // Do not trust user-controlled forwarding chains by default.
    // Enable only when a trusted reverse proxy sanitizes this header.
    const trustForwardedFor = process.env.TRUST_X_FORWARDED_FOR === 'true';
    if (trustForwardedFor) {
        const forwarded = request.headers.get('x-forwarded-for');
        if (forwarded) {
            const firstHop = forwarded.split(',')[0]?.trim();
            if (firstHop && isValidIp(firstHop)) {
                return firstHop;
            }
        }
    }

    return '127.0.0.1';
}

async function getRedisClient(): Promise<RedisClientType | null> {
    if (redisClient?.isOpen) return redisClient;
    if (redisInitAttempted) return null;
    redisInitAttempted = true;

    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || '';
    if (!redisUrl) {
        return null;
    }

    try {
        redisClient = createClient({ url: redisUrl });
        redisClient.on('error', () => {
            // Keep API responsive even if Redis is flaky.
        });
        await redisClient.connect();
        return redisClient;
    } catch {
        redisClient = null;
        return null;
    }
}

// Limpieza periódica del mapa para evitar memory leaks
setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
        if (now > entry.resetAt) store.delete(key);
    });
}, 60_000);

/**
 * Verifica el rate limit para una IP y ruta dada.
 * @param request - La petición entrante
 * @param limit - Número máximo de peticiones permitidas en la ventana
 * @param windowMs - Duración de la ventana en milisegundos (default: 60 segundos)
 * @returns NextResponse con 429 si se supera el límite, o null si está dentro del límite
 */
export async function checkRateLimit(
    request: NextRequest,
    limit: number,
    windowMs: number = 60_000
): Promise<NextResponse | null> {
    const ip = extractClientIp(request);
    const route = request.nextUrl.pathname;
    const method = request.method || 'GET';
    const key = `${ip}:${method}:${route}`;
    const now = Date.now();
    const redisKey = `rl:${key}`;

    const redis = await getRedisClient();
    if (redis) {
        try {
            const count = await redis.incr(redisKey);
            if (count === 1) {
                await redis.pExpire(redisKey, windowMs);
            }

            const ttlMs = await redis.pTTL(redisKey);
            const resetAt = now + (ttlMs > 0 ? ttlMs : windowMs);

            if (count > limit) {
                const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
                return NextResponse.json(
                    {
                        error: 'Demasiadas peticiones. Inténtalo de nuevo en unos segundos.',
                        retryAfter,
                    },
                    {
                        status: 429,
                        headers: {
                            'Retry-After': String(retryAfter),
                            'X-RateLimit-Limit': String(limit),
                            'X-RateLimit-Remaining': '0',
                            'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
                        },
                    }
                );
            }

            return null;
        } catch {
            // If Redis fails mid-flight, gracefully fallback to in-memory.
        }
    }

    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
        // Primera petición o ventana expirada: resetear
        store.set(key, { count: 1, resetAt: now + windowMs });
        return null;
    }

    if (entry.count >= limit) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return NextResponse.json(
            {
                error: 'Demasiadas peticiones. Inténtalo de nuevo en unos segundos.',
                retryAfter,
            },
            {
                status: 429,
                headers: {
                    'Retry-After': String(retryAfter),
                    'X-RateLimit-Limit': String(limit),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
                },
            }
        );
    }

    // Incrementar contador
    entry.count += 1;
    store.set(key, entry);
    return null;
}
