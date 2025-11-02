import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { loginSchema } from '@/lib/schemas';
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
  verifyTotpWithBackups,
  SessionPayload
} from '@/lib/auth';
import { isRateLimited, resetRateLimit } from '@/lib/rate-limit';
import { validateCsrf } from '@/lib/csrf';
import { audit, security } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const csrfError = validateCsrf(request);
    if (csrfError) {
      return csrfError;
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.ip ?? 'unknown';

    const json = await request.json();
    const parsed = loginSchema.safeParse(json);
    if (!parsed.success) {
      security('login.invalid_credentials', { ip });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const { username, password, totp } = parsed.data;
    const rateLimitKey = `${ip}:${username}`;

    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    const db = await getDb();
    const reseller = await db.collection('resellers').findOne<{ [key: string]: unknown }>({ _id: username });

    if (!reseller || reseller.disabled === true) {
      security('login.invalid_credentials', {
        username,
        ip,
        reason: reseller ? 'disabled' : 'not_found'
      });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const passwordHash = reseller.password as string;
    const isPasswordValid = await verifyPassword(password, passwordHash);

    if (!isPasswordValid) {
      security('login.invalid_credentials', { username, ip, reason: 'password' });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const totpConfig = reseller.totp as
      | { enabled?: boolean; secret?: string; backup_hashes?: string[] }
      | undefined;
    if (totpConfig?.enabled) {
      if (!totp) {
        return NextResponse.json({ error: 'TOTP required', totpRequired: true }, { status: 401 });
      }

      const backupHashes = Array.isArray(totpConfig.backup_hashes)
        ? (totpConfig.backup_hashes as string[])
        : undefined;
      const totpResult = verifyTotpWithBackups(totp, totpConfig.secret, backupHashes);
      if (!totpResult.valid) {
        security('login.invalid_totp', { username, ip });
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      if (totpResult.usedBackup) {
        await db
          .collection('resellers')
          .updateOne({ _id: username }, { $pull: { 'totp.backup_hashes': totpResult.usedBackup } });
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

    audit('login.success', {
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
