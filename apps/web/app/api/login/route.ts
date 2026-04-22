import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const expectedPassword = process.env.APP_PASSWORD;

  if (!expectedPassword) {
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

  const response = NextResponse.json({ ok: true });
  response.cookies.set('radar_session', 'authenticated', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return response;
}