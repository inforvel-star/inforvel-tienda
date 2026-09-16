import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { setAuthCookie } from '@/lib/server/session';

const WC_URL = process.env.NEXT_PUBLIC_WC_URL;
const WC_KEY = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;
const WC_AUTH = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');
const AVATAR_META_KEY = 'inforvel_avatar_url';

function extractAvatarUrl(metaData: any[]): string | null {
    const matches = Array.isArray(metaData)
        ? metaData.filter((m: any) => m?.key === AVATAR_META_KEY)
        : [];
    for (let i = matches.length - 1; i >= 0; i -= 1) {
        const value = matches[i]?.value;
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return null;
}

export async function POST(request: NextRequest) {
    // Strict rate limit: 10 login attempts per minute per IP
    const rateLimitError = await checkRateLimit(request, 10, 60_000);
    if (rateLimitError) return rateLimitError;

    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { success: false, message: 'Email y contraseña son obligatorios' },
                { status: 400 }
            );
        }

        const response = await fetch(`${WC_URL}/wp-json/jwt-auth/v1/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok || !data.token) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Credenciales inválidas. Comprueba tu email y contraseña.',
                },
                { status: 401 }
            );
        }

        // Look up customer ID by email
        let customerId: number | null = null;
        let avatarUrl: string | null = null;
        try {
            const customerRes = await fetch(
                `${WC_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(data.user_email)}&role=all`,
                { headers: { Authorization: WC_AUTH } }
            );
            if (customerRes.ok) {
                const customers = await customerRes.json();
                const customer = customers[0];
                customerId = customer?.id ?? null;
                avatarUrl = extractAvatarUrl(customer?.meta_data);
            }
        } catch {
            // Non-critical: widget just won't show if ID not found
        }

        const res = NextResponse.json({
            success: true,
            user_email: data.user_email,
            user_nicename: data.user_nicename,
            user_display_name: data.user_display_name,
            avatar_url: avatarUrl,
            customer_id: customerId,
        });
        setAuthCookie(res, data.token);
        return res;
    } catch (error) {
        console.error('Login proxy error:', error);
        return NextResponse.json(
            { success: false, message: 'Error interno. Inténtalo de nuevo.' },
            { status: 500 }
        );
    }
}
