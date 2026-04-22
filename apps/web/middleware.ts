import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function isValidSession(cookieValue: string | undefined, secret: string) {
  if (!cookieValue) return false;

  const [payload, sig] = cookieValue.split('.');
  if (!payload || !sig) return false;

  const expected = sign(payload, secret);
  return sig === expected && payload === 'authenticated';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) {
    return new NextResponse('Missing APP_SESSION_SECRET', { status: 500 });
  }

  const sessionCookie = request.cookies.get('radar_session')?.value;

  if (!isValidSession(sessionCookie, secret)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};