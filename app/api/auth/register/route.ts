import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { registerSchema } from '@/lib/schemas';
import { hashPassword } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { audit } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const csrfError = validateCsrf(request);
    if (csrfError) {
      return csrfError;
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
      allowed_games: [],
      credits: 0,
      created_at: new Date()
    });

    audit('reseller.registered', { username });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Register error', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
