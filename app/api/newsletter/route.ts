import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

const WC_URL = process.env.NEXT_PUBLIC_WC_URL;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  // Rate limit: 5 altas de newsletter por IP cada 5 minutos
  const rateLimitError = await checkRateLimit(request, 5, 5 * 60_000);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Introduce un email válido.' },
        { status: 400 }
      );
    }

    const res = await fetch(`${WC_URL}/wp-json/inforvel/v1/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json(
      { success: false, message: 'Error al conectar con el servidor.' },
      { status: 500 }
    );
  }
}
