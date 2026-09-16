import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/rateLimit';

const WC_URL = process.env.NEXT_PUBLIC_WC_URL;

async function proxyAddressById(
  method: 'PUT' | 'DELETE',
  token: string,
  id: string,
  body?: unknown
) {
  return fetch(`${WC_URL}/wp-json/inforvel/v1/addresses/${encodeURIComponent(id)}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitError = await checkRateLimit(request, 20, 60_000);
  if (rateLimitError) return rateLimitError;

  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = String(params.id || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'Invalid address id' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const res = await proxyAddressById('PUT', auth.token, id, body);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitError = await checkRateLimit(request, 20, 60_000);
  if (rateLimitError) return rateLimitError;

  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = String(params.id || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'Invalid address id' }, { status: 400 });
  }

  const res = await proxyAddressById('DELETE', auth.token, id);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
