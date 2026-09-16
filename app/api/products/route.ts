import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { woocommerce } from '@/lib/woocommerce';
import { wcApi } from '@/lib/woocommerce';

let categoryIdCacheBySlug: { expiresAt: number; data: Record<string, string> } | null = null;

async function getCategoryIdBySlug(slug: string): Promise<string | null> {
    // Fast and exact path first.
    const exact = await wcApi.get('/products/categories', { params: { slug, per_page: 1 } });
    const exactData = Array.isArray(exact.data) ? exact.data : [];
    const exactId = exactData[0]?.id;
    if (exactId) {
        return String(exactId);
    }

    // Fallback cache map for repeated lookups / broad category trees.
    const now = Date.now();
    if (!categoryIdCacheBySlug || categoryIdCacheBySlug.expiresAt <= now) {
        const categories: any[] = [];
        let page = 1;
        let totalPages = 1;

        do {
            const response = await wcApi.get('/products/categories', { params: { per_page: 100, page } });
            const batch = Array.isArray(response.data) ? response.data : [];
            categories.push(...batch);
            totalPages = Number.parseInt(response.headers['x-wp-totalpages'] ?? '1', 10) || 1;
            page += 1;
        } while (page <= totalPages);

        const data: Record<string, string> = {};
        for (const category of categories) {
            const categorySlug = String(category?.slug ?? '').trim();
            const categoryId = String(category?.id ?? '').trim();
            if (categorySlug && categoryId) {
                data[categorySlug] = categoryId;
            }
        }
        categoryIdCacheBySlug = {
            data,
            expiresAt: now + 5 * 60 * 1000,
        };
    }

    return categoryIdCacheBySlug.data[slug] ?? null;
}

export async function GET(request: NextRequest) {
    const rateLimitError = await checkRateLimit(request, 60, 60_000);
    if (rateLimitError) return rateLimitError;

    try {
        const { searchParams } = new URL(request.url);
        const params: any = {};

        if (searchParams.has('per_page')) params.per_page = parseInt(searchParams.get('per_page')!);
        if (searchParams.has('page')) params.page = parseInt(searchParams.get('page')!);
        if (searchParams.has('category')) params.category = searchParams.get('category');
        if (searchParams.has('category_slug')) {
            const categorySlug = searchParams.get('category_slug')!;
            const categoryId = await getCategoryIdBySlug(categorySlug);
            // Fail-closed: if caller requested a specific category slug and it cannot be
            // resolved, return no products instead of broad/global results.
            if (!categoryId) {
                const emptyResponse = NextResponse.json([]);
                emptyResponse.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
                return emptyResponse;
            }
            params.category = categoryId;
        }
        if (searchParams.has('search')) params.search = searchParams.get('search');
        if (searchParams.has('orderby')) params.orderby = searchParams.get('orderby');
        if (searchParams.has('order')) params.order = searchParams.get('order') as 'asc' | 'desc';
        if (searchParams.has('featured')) params.featured = searchParams.get('featured') === 'true';
        if (searchParams.has('on_sale')) params.on_sale = searchParams.get('on_sale') === 'true';
        if (searchParams.has('slug')) params.slug = searchParams.get('slug');
        if (searchParams.get('view') === 'store') {
            params._fields = [
                'id', 'name', 'sku', 'slug', 'price', 'regular_price', 'sale_price', 'on_sale',
                'stock_status', 'stock_quantity', 'images', 'categories', 'attributes',
                'inforvel_badges', 'meta_data',
            ].join(',');
        }

        const products = await woocommerce.getProducts(params);
        const response = NextResponse.json(products);
        response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
        return response;
    } catch (error) {
        console.error('Error fetching products via API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
