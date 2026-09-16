import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { getLevel } from '@/lib/gamification';
import { authenticateRequest } from '@/lib/server/auth';
const WC_KEY = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;
const WC_AUTH = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

const WC_URL = process.env.NEXT_PUBLIC_WC_URL;

function parsePoints(raw: unknown): number | null {
    const parsed = Number.parseInt(String(raw ?? ''), 10);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
}

// GET /api/points?customerId=123
export async function GET(request: NextRequest) {
    const rateLimitError = await checkRateLimit(request, 30, 60_000);
    if (rateLimitError) return rateLimitError;

    const auth = await authenticateRequest(request);
    if (!auth?.customerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
        return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    const requestedCustomerId = parseInt(customerId, 10);
    if (!requestedCustomerId || requestedCustomerId !== auth.customerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const res = await fetch(`${WC_URL}/wp-json/wc/v3/customers/${requestedCustomerId}`, {
            headers: { Authorization: WC_AUTH },
        });

        if (!res.ok) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        const customer = await res.json();
        const pointsMeta = customer.meta_data?.find((m: any) => m.key === '_inforvel_points');
        let points = parsePoints(pointsMeta?.value);

        // Auto-repair for legacy/new customers where provider did not persist meta_data on create.
        if (points === null) {
            points = 100;
            await fetch(`${WC_URL}/wp-json/wc/v3/customers/${requestedCustomerId}`, {
                method: 'PUT',
                headers: { Authorization: WC_AUTH, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meta_data: [{ key: '_inforvel_points', value: '100' }],
                }),
            }).catch(() => undefined);
        }

        const { current, next } = getLevel(points);

        return NextResponse.json({ points, current, next });
    } catch (error) {
        console.error('Error fetching points:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/points  { customerId, points, reason }
export async function POST(request: NextRequest) {
    const rateLimitError = await checkRateLimit(request, 20, 60_000);
    if (rateLimitError) return rateLimitError;

    try {
        const internalToken = request.headers.get('x-internal-token');
        if (!process.env.POINTS_API_TOKEN || internalToken !== process.env.POINTS_API_TOKEN) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { customerId, points, reason } = await request.json();

        if (!customerId || !points) {
            return NextResponse.json({ error: 'customerId and points are required' }, { status: 400 });
        }

        // Read current points first
        const getRes = await fetch(`${WC_URL}/wp-json/wc/v3/customers/${customerId}`, {
            headers: { Authorization: WC_AUTH },
        });

        if (!getRes.ok) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        const customer = await getRes.json();
        const currentPoints = parseInt(
            customer.meta_data?.find((m: any) => m.key === '_inforvel_points')?.value || '0'
        );
        const newPoints = currentPoints + points;

        // Update customer meta
        const updateRes = await fetch(`${WC_URL}/wp-json/wc/v3/customers/${customerId}`, {
            method: 'PUT',
            headers: { Authorization: WC_AUTH, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                meta_data: [{ key: '_inforvel_points', value: String(newPoints) }],
            }),
        });

        if (!updateRes.ok) {
            return NextResponse.json({ error: 'Failed to update points' }, { status: 500 });
        }

        const { current, next } = getLevel(newPoints);

        return NextResponse.json({
            success: true,
            points: newPoints,
            awarded: points,
            reason: reason || 'general',
            current,
            next,
        });
    } catch (error) {
        console.error('Error updating points:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
