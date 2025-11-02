import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionFromRequest } from '@/lib/auth';
import { ensureIndexes } from '@/lib/indexes';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const collection = db.collection('keys');
  const now = Math.floor(Date.now() / 1000);

  await ensureIndexes();

  const notDisabled = {
    $or: [{ disabled: { $exists: false } }, { disabled: { $ne: true } }]
  };

  const [total, active, pending, expired] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments({ expires_at: { $gt: now }, ...notDisabled }),
    collection.countDocuments({
      expires_at: { $gt: now },
      device: null,
      ...notDisabled
    }),
    collection.countDocuments({ expires_at: { $lte: now } })
  ]);

  return NextResponse.json({ total, active, pending, expired });
}
