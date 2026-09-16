import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';

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

export async function GET(request: NextRequest) {
    const auth = await authenticateRequest(request);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let avatarUrl: string | null = null;
    try {
        const customerRes = await fetch(
            `${WC_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(auth.email)}&role=all`,
            {
                headers: { Authorization: WC_AUTH },
                cache: 'no-store',
            }
        );
        if (customerRes.ok) {
            const customers = await customerRes.json();
            const customer = customers?.[0];
            avatarUrl = extractAvatarUrl(customer?.meta_data);
        }
    } catch {
        // non-critical
    }

    return NextResponse.json({
        email: auth.email,
        avatar_url: avatarUrl,
        customer_id: auth.customerId,
    });
}
