import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { woocommerce } from '@/lib/woocommerce';
import { authenticateRequest } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
    const rateLimitError = await checkRateLimit(request, 30, 60_000);
    if (rateLimitError) return rateLimitError;

    try {
        const auth = await authenticateRequest(request);
        if (!auth?.customerId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get('customerId');
        const requestedCustomerId = customerId ? parseInt(customerId, 10) : auth.customerId;

        if (!requestedCustomerId || requestedCustomerId !== auth.customerId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const orders = await woocommerce.getOrders(requestedCustomerId);

        return NextResponse.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
