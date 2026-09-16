import { NextResponse } from 'next/server';

const WC_URL = process.env.NEXT_PUBLIC_WC_URL;

export async function GET() {
  if (!WC_URL) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_WC_URL' }, { status: 500 });
  }

  try {
    const endpoint = `${WC_URL.replace(/\/$/, '')}/wp-json/dmi-sync/v1/weekly-campaigns`;
    const response = await fetch(endpoint, { cache: 'no-store' });

    if (!response.ok) {
      const payload = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch weekly campaigns', status: response.status, payload: payload.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = await response.json();
    const result = NextResponse.json(data);
    result.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return result;
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch weekly campaigns', detail: error?.message || 'unknown error' },
      { status: 502 }
    );
  }
}
