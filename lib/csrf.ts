import { NextRequest, NextResponse } from 'next/server';
import { CSRF_COOKIE_NAME } from './auth';

export function validateCsrf(request: NextRequest): NextResponse | null {
  const headerToken = request.headers.get('x-csrf-token');
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  return null;
}
