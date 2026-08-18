import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, createSessionToken } from '@/lib/session';

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: '123' }));
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected) {
    console.error('DASHBOARD_PASSWORD environment variable is not set');
    return NextResponse.json({ error: 'Login is not configured' }, { status: 500 });
  }

  if (typeof password !== 'string' || password !== expected) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  return NextResponse.json({ success: true });
}
