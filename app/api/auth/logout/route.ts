import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getSessionFromRequest } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { audit } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) {
    return csrfError;
  }

  const session = getSessionFromRequest(request);
  clearSessionCookie();
  if (session) {
    audit('logout.success', { user: session.sub });
  }
  return NextResponse.json({ ok: true });
}
