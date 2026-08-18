import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/auth/login')) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
};
