import { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/server/session';

const WC_URL = process.env.NEXT_PUBLIC_WC_URL;
const WC_KEY = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;
const WC_AUTH = 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

interface AuthContext {
  token: string;
  email: string;
  customerId: number | null;
}

function getTokenFromRequest(request: NextRequest): string | null {
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken?.trim()) {
    return cookieToken.trim();
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  const legacyHeader = request.headers.get('x-auth-token');
  if (legacyHeader) {
    return legacyHeader.trim();
  }

  return null;
}

function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const raw = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractEmailFromPayload(payload: Record<string, any> | null): string | null {
  if (!payload) return null;

  const direct = typeof payload.email === 'string' ? payload.email : null;
  const nested =
    typeof payload?.data?.user?.email === 'string'
      ? payload.data.user.email
      : null;

  const value = direct || nested;
  return value ? String(value).trim().toLowerCase() : null;
}

async function resolveEmailFromToken(token: string): Promise<string | null> {
  if (!WC_URL) return null;

  const validateRes = await fetch(`${WC_URL}/wp-json/jwt-auth/v1/token/validate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!validateRes.ok) {
    return null;
  }

  // 1) Try JWT payload first (already validated).
  const payloadEmail = extractEmailFromPayload(parseJwtPayload(token));
  if (payloadEmail) {
    return payloadEmail;
  }

  // 2) Try validate response fields.
  try {
    const validateData = await validateRes.json();
    const responseEmail =
      validateData?.data?.user_email ||
      validateData?.data?.email ||
      validateData?.email;

    if (typeof responseEmail === 'string' && responseEmail.trim()) {
      return responseEmail.trim().toLowerCase();
    }
  } catch {
    // no-op
  }

  // 3) Fallback to /users/me.
  try {
    const meRes = await fetch(`${WC_URL}/wp-json/wp/v2/users/me?context=edit`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (meRes.ok) {
      const me = await meRes.json();
      if (typeof me?.email === 'string' && me.email.trim()) {
        return me.email.trim().toLowerCase();
      }
    }
  } catch {
    // no-op
  }

  return null;
}

async function resolveCustomerIdByEmail(email: string): Promise<number | null> {
  if (!WC_URL || !email) return null;

  const customerRes = await fetch(
    `${WC_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}&role=all`,
    {
      headers: { Authorization: WC_AUTH },
      cache: 'no-store',
    }
  );

  if (!customerRes.ok) {
    return null;
  }

  const customers = await customerRes.json();
  const id = Number(customers?.[0]?.id ?? 0);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function authenticateRequest(request: NextRequest): Promise<AuthContext | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const email = await resolveEmailFromToken(token);
  if (!email) return null;

  const customerId = await resolveCustomerIdByEmail(email);
  return { token, email, customerId };
}
