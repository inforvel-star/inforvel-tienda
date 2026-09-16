import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { woocommerce } from '@/lib/woocommerce';

export async function GET(request: NextRequest) {
    const rateLimitError = await checkRateLimit(request, 60, 60_000);
    if (rateLimitError) return rateLimitError;

    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query) {
            return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
        }

        const products = await woocommerce.searchProducts(query);
        return NextResponse.json(products);
    } catch (error) {
        console.error('Error searching products:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
