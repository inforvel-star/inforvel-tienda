import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

const WC_URL = process.env.NEXT_PUBLIC_WC_URL;
const WC_KEY = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;

export async function POST(request: NextRequest) {
  // Rate limit: 3 registros por IP por minuto
  const rateLimitError = await checkRateLimit(request, 3, 60_000);
  if (rateLimitError) return rateLimitError;

  try {
    const { email, password, firstName, lastName } = await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Create customer via WooCommerce REST API
    const wcResponse = await fetch(`${WC_URL}/wp-json/wc/v3/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64'),
      },
      body: JSON.stringify({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        username: email,
        meta_data: [
          { key: '_inforvel_points', value: '100' },
        ],
      }),
    });

    const data = await wcResponse.json();

    if (!wcResponse.ok) {
      // WooCommerce returns specific error codes
      const message = data?.message || 'Error al crear la cuenta';
      // Common: "registration-error-email-exists"
      if (message.includes('existe') || message.includes('exists') || data?.code === 'registration-error-email-exists') {
        return NextResponse.json(
          { error: 'Ya existe una cuenta con ese email' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const createdCustomerId = Number(data?.id || 0);
    if (createdCustomerId > 0) {
      await fetch(`${WC_URL}/wp-json/wc/v3/customers/${createdCustomerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64'),
        },
        body: JSON.stringify({
          meta_data: [{ key: '_inforvel_points', value: '100' }],
        }),
      }).catch(() => undefined);
    }

    return NextResponse.json({
      success: true,
      user_id: data.id,
      message: 'Cuenta creada correctamente',
    });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Error al crear la cuenta. Inténtalo de nuevo.' },
      { status: 500 }
    );
  }
}
