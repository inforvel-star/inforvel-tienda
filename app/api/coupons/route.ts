import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { wcApi } from '@/lib/woocommerce';

export async function GET(request: NextRequest) {
    const rateLimitError = await checkRateLimit(request, 10, 60_000);
    if (rateLimitError) return rateLimitError;

    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
        }

        const response = await wcApi.get('/coupons', { params: { code } });
        return NextResponse.json(response.data);
    } catch (error) {
        console.error('Error fetching coupon:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
