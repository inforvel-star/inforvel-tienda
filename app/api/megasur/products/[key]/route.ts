import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { getMegaSurProductByKey } from '@/lib/megasur/catalog';

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  const rateLimitError = await checkRateLimit(request, 120, 60_000);
  if (rateLimitError) return rateLimitError;

  try {
    const product = await getMegaSurProductByKey(decodeURIComponent(params.key));

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Error fetching MegaSur product:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
