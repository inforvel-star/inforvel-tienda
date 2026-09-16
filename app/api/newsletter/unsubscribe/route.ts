import { NextResponse } from 'next/server';

const WC_URL = process.env.NEXT_PUBLIC_WC_URL;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await fetch(`${WC_URL}/wp-json/inforvel/v1/newsletter/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return NextResponse.json(
      { success: false, message: 'Error al conectar con el servidor.' },
      { status: 500 }
    );
  }
}
