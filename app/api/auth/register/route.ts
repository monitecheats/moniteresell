import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { registerSchema } from '@/lib/schemas';
import { hashPassword } from '@/lib/auth';

const CSRF_COOKIE = 'monite_csrf';

export async function POST(request: NextRequest) {
  try {
    const csrfHeader = request.headers.get('x-csrf-token');
    const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value;
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const json = await request.json();
    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { username, email, password } = parsed.data;

    const db = await getDb();
    const existing = await db.collection('resellers').findOne({ _id: username });
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    await db.collection('resellers').insertOne({
      _id: username,
      password: passwordHash,
      email,
      email_verified: false,
      name: username,
      role: 'reseller',
      permissions: [],
      created_at: new Date()
    });

    console.info('New reseller registered', { username });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Register error', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
