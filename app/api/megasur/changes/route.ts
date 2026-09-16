import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { getMegaSurSnapshots } from '@/lib/megasur/catalog';

export async function GET(request: NextRequest) {
  const rateLimitError = await checkRateLimit(request, 60, 60_000);
  if (rateLimitError) return rateLimitError;

  try {
    const snapshots = await getMegaSurSnapshots();
    return NextResponse.json(snapshots.diff);
  } catch (error: any) {
    console.error('Error fetching MegaSur changes:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
