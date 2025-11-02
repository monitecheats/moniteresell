import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const reseller = await db
    .collection('resellers')
    .findOne<{ [key: string]: unknown }>({ _id: session.sub }, {
      projection: {
        allowed_games: 1,
        credits: 1,
        permissions: 1,
        role: 1,
        name: 1,
        email: 1
      }
    });

  return NextResponse.json({
    user: {
      ...session,
      role: (reseller?.role as string) ?? session.role,
      permissions: Array.isArray(reseller?.permissions)
        ? (reseller?.permissions as string[])
        : session.permissions,
      email: typeof reseller?.email === 'string' ? (reseller?.email as string) : session.email,
      name: typeof reseller?.name === 'string' ? (reseller?.name as string) : session.name,
      allowed_games: Array.isArray(reseller?.allowed_games) ? (reseller?.allowed_games as string[]) : [],
      credits: typeof reseller?.credits === 'number' ? (reseller?.credits as number) : 0
    }
  });
}
