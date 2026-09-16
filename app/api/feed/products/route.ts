import { NextResponse } from 'next/server';
import { woocommerce } from '@/lib/woocommerce';

// Cache the feed for 24 hours (86400 seconds)
export const revalidate = 86400;

export async function GET() {
    try {
        let allProducts: any[] = [];
        let page = 1;
        let hasMore = true;

        // Fetch all products across multiple pages
        while (hasMore) {
            const products = await woocommerce.getProducts({
                per_page: 100,
                page: page,
            });

            if (products && products.length > 0) {
                allProducts = [...allProducts, ...products];
                page++;
                // If we got less than 100, we've reached the end
                if (products.length < 100) {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }

            // Safety break to prevent infinite loops in case of API issues
            if (page > 20) break;
        }

        // Format data for AI consumption
        const feed = allProducts.map((p) => ({
            id: p.id,
            nombre: p.name,
            precio: `${p.price}€`,
            estado_stock: p.stock_status === 'instock' ? 'Disponible' : 'Agotado',
            categoria: p.categories?.map((c: any) => c.name).join(', ') || 'General',
            descripcion_corta: p.short_description?.replace(/<[^>]*>/g, '').trim() || '',
            url: `https://inforvel.online/producto/${p.slug}`,
        }));

        return NextResponse.json({
            ultima_actualizacion: new Date().toISOString(),
            total_productos: feed.length,
            productos: feed,
        });
    } catch (error) {
        console.error('Error generating AI product feed:', error);
        return NextResponse.json(
            { error: 'Error al generar el feed de productos' },
            { status: 500 }
        );
    }
}
