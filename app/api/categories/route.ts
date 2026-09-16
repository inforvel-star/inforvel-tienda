import { NextResponse } from 'next/server';
import { wcApi } from '@/lib/woocommerce';

function tryParseJsonFromText(text: string) {
  // Find the first JSON array or object bracket
  const startIdx = Math.min(
    ...['[', '{']
      .map((ch) => {
        const i = text.indexOf(ch);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      })
  );
  if (startIdx === Number.MAX_SAFE_INTEGER) return null;
  const candidate = text.slice(startIdx);
  try {
    return JSON.parse(candidate);
  } catch (e) {
    return null;
  }
}

export async function GET() {
  try {
    // Use per_page=100 (WooCommerce often limits per_page to 100)
    const resp = await wcApi.get('/products/categories', { params: { per_page: 100 }, responseType: 'text' });
    const text = resp.data as string;
    const parsed = tryParseJsonFromText(text);
    if (parsed) return NextResponse.json(parsed);
    // if parsing failed, return first part of the raw body for debugging
    const snippet = text.slice(0, 2000);
    console.error('Unable to parse categories JSON, response snippet:', snippet);
    return NextResponse.json({ error: 'Unable to parse categories from WooCommerce response', snippet }, { status: 502 });
  } catch (err: any) {
    console.error('Error fetching categories server-side:', err);
    // If axios error, include status and response snippet for debugging
    const status = err?.response?.status;
    const respData = err?.response?.data;
    let snippet = '';
    try {
      if (typeof respData === 'string') snippet = respData.slice(0, 2000);
      else if (respData) snippet = JSON.stringify(respData).slice(0, 2000);
    } catch (e) {
      snippet = String(respData).slice(0, 2000);
    }
    return NextResponse.json({ error: 'Error fetching categories', status: status || 500, snippet }, { status: 500 });
  }
}
