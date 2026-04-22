import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const expectedPassword = process.env.APP_PASSWORD;
  const secret = process.env.APP_SESSION_SECRET;

  if (!expectedPassword || !secret) {
    return NextResponse.json(
      { error: 'Server not configured' },
      { status: 500 }
    );
  }

  if (password !== expectedPassword) {
    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    );
  }

  const payload = 'authenticated';
  const cookieValue = `${payload}.${sign(payload, secret)}`;

  const response = NextResponse.json({ ok: true });
  response.cookies.set('radar_session', cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return response;
}