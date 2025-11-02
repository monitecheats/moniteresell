import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateCsrfToken } from '@/lib/auth';

const CSRF_COOKIE = 'monite_csrf';

export async function GET() {
  const token = generateCsrfToken();
  const cookieStore = cookies();
  cookieStore.set({
    name: CSRF_COOKIE,
    value: token,
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 30,
    path: '/'
  });

  return NextResponse.json({ csrfToken: token });
}
