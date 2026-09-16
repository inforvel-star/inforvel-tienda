import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/server/session';

export async function POST() {
  const res = NextResponse.json({ success: true });
  clearAuthCookie(res);
  return res;
}
