import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { checkRateLimit } from '@/lib/rateLimit';

interface LeadPayload {
  name?: string;
  phone?: string;
  locality?: string;
  issue?: string;
}

const ALLOWED_LOCALITIES = ['Córdoba Capital', 'Provincia', 'Fuera de Córdoba'];
const PHONE_REGEX = /^[0-9+\s()-]{9,20}$/;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  // Rate limit: 5 solicitudes de presupuesto por IP cada 5 minutos
  const rateLimitError = await checkRateLimit(request, 5, 5 * 60_000);
  if (rateLimitError) return rateLimitError;

  try {
    const body = (await request.json()) as LeadPayload;

    if (typeof body?.name !== 'string' || typeof body?.phone !== 'string' || typeof body?.issue !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Datos incompletos para enviar la solicitud.' },
        { status: 400 }
      );
    }

    const name = body.name.trim();
    const phone = body.phone.trim();
    const locality = String(body?.locality || '').trim();
    const issue = body.issue.trim();

    if (
      name.length < 3 ||
      name.length > 100 ||
      !PHONE_REGEX.test(phone) ||
      issue.length < 7 ||
      issue.length > 2000 ||
      (locality && !ALLOWED_LOCALITIES.includes(locality))
    ) {
      return NextResponse.json(
        { success: false, message: 'Datos incompletos para enviar la solicitud.' },
        { status: 400 }
      );
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpSecure = String(process.env.SMTP_SECURE || 'true') === 'true';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const toEmail = process.env.SERVICE_LEADS_TO || 'inforvel@inforvel.online';
    const fromEmail = process.env.SERVICE_LEADS_FROM || smtpUser || 'inforvel@inforvel.online';

    if (!smtpHost || !smtpUser || !smtpPass || !isValidEmail(toEmail) || !isValidEmail(fromEmail)) {
      console.error('Service leads SMTP config missing or invalid');
      return NextResponse.json(
        {
          success: false,
          message:
            'No se ha podido enviar por email en este momento. Escríbenos por WhatsApp y te atendemos al instante.',
        },
        { status: 503 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const subject = `Nueva solicitud servicio técnico - ${locality || 'Sin localidad'}`;
    const text = [
      'Nueva solicitud de presupuesto (Servicio Técnico Córdoba)',
      '',
      `Nombre: ${name}`,
      `Teléfono: ${phone}`,
      `Localidad: ${locality || 'No indicada'}`,
      `Dispositivo y avería: ${issue}`,
      '',
      `Fecha: ${new Date().toISOString()}`,
    ].join('\n');

    await transporter.sendMail({
      from: `Inforvel Web <${fromEmail}>`,
      to: toEmail,
      replyTo: fromEmail,
      subject,
      text,
    });

    return NextResponse.json({ success: true, message: 'Solicitud enviada correctamente.' });
  } catch (error) {
    console.error('Service leads email error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          'No se ha podido enviar por email en este momento. Escríbenos por WhatsApp y te atendemos al instante.',
      },
      { status: 500 }
    );
  }
}
