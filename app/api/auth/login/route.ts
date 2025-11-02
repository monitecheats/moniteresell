import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { loginSchema } from '@/lib/schemas';
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
  verifyTotp,
  SessionPayload
} from '@/lib/auth';
import { isRateLimited, resetRateLimit } from '@/lib/rate-limit';

const CSRF_COOKIE = 'monite_csrf';

export async function POST(request: NextRequest) {
  try {
    const csrfHeader = request.headers.get('x-csrf-token');
    const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value;
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const json = await request.json();
    const parsed = loginSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const { username, password, totp } = parsed.data;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.ip ?? 'unknown';
    const rateLimitKey = `${ip}:${username}`;

    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    const db = await getDb();
    const reseller = await db.collection('resellers').findOne<{ [key: string]: unknown }>({ _id: username });

    if (!reseller || reseller.disabled === true) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const passwordHash = reseller.password as string;
    const isPasswordValid = await verifyPassword(password, passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const totpConfig = reseller.totp as { enabled?: boolean; secret?: string } | undefined;
    if (totpConfig?.enabled) {
      if (!totp) {
        return NextResponse.json({ error: 'TOTP required', totpRequired: true }, { status: 401 });
      }

      const isTotpValid = totpConfig.secret ? verifyTotp(totp, totpConfig.secret) : false;
      if (!isTotpValid) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    }

    const payload: SessionPayload = {
      sub: reseller._id as string,
      role: (reseller.role as string) ?? 'reseller',
      name: (reseller.name as string) ?? reseller._id,
      permissions: (Array.isArray(reseller.permissions) ? (reseller.permissions as string[]) : []) ?? [],
      email: typeof reseller.email === 'string' ? reseller.email : undefined
    };

    const token = createSessionToken(payload);
    setSessionCookie(token);
    resetRateLimit(rateLimitKey);

    console.info('Successful login', {
      user: payload.sub,
      role: payload.role,
      ip,
      userAgent: request.headers.get('user-agent') ?? 'unknown'
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Login error', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
