import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionFromRequest } from '@/lib/auth';
import { ensureIndexes } from '@/lib/indexes';

const NUMERIC_TYPES = ['int', 'long', 'double', 'decimal'];

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const collection = db.collection('keys');
  const now = Math.floor(Date.now() / 1000);

  await ensureIndexes();

  const notDisabled = { $or: [{ disabled: { $exists: false } }, { disabled: { $ne: true } }] };

  const numericExpiresExpr = { $expr: { $in: [{ $type: '$expires_at' }, NUMERIC_TYPES] } };
  const activeFilter = {
    ...notDisabled,
    ...numericExpiresExpr,
    expires_at: { $gt: now }
  };

  const pendingFilter = {
    $or: [
      { expires_at: 'pending', ...notDisabled },
      {
        ...notDisabled,
        ...numericExpiresExpr,
        expires_at: { $gt: now },
        $or: [{ device: null }, { device: { $exists: false } }]
      }
    ]
  };

  const expiredFilter = {
    ...numericExpiresExpr,
    expires_at: { $lte: now }
  };

  const [total, active, pending, expired] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments(activeFilter),
    collection.countDocuments(pendingFilter),
    collection.countDocuments(expiredFilter)
  ]);

  return NextResponse.json({ total, active, pending, expired });
}
