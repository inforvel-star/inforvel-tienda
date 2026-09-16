import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/rateLimit';

const WC_URL = process.env.NEXT_PUBLIC_WC_URL;

async function proxyToWordPress(method: 'GET' | 'POST' | 'DELETE', token: string, body?: unknown) {
  return fetch(`${WC_URL}/wp-json/inforvel/v1/cart`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
}

export async function GET(request: NextRequest) {
  const rateLimitError = await checkRateLimit(request, 60, 60_000);
  if (rateLimitError) return rateLimitError;

  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await proxyToWordPress('GET', auth.token);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const rateLimitError = await checkRateLimit(request, 60, 60_000);
  if (rateLimitError) return rateLimitError;

  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const res = await proxyToWordPress('POST', auth.token, body);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(request: NextRequest) {
  const rateLimitError = await checkRateLimit(request, 30, 60_000);
  if (rateLimitError) return rateLimitError;

  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await proxyToWordPress('DELETE', auth.token);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
