import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { listMegaSurProducts } from '@/lib/megasur/catalog';

export async function GET(request: NextRequest) {
  const rateLimitError = await checkRateLimit(request, 120, 60_000);
  if (rateLimitError) return rateLimitError;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = searchParams.has('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : null;
    const offset = searchParams.has('offset')
      ? parseInt(searchParams.get('offset')!, 10)
      : null;

    const data = await listMegaSurProducts({ search, limit, offset });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching MegaSur products:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
