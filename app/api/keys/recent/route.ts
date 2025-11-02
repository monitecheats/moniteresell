import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSessionFromRequest } from '@/lib/auth';
import { recentKeysQuerySchema } from '@/lib/schemas';
import { ensureIndexes } from '@/lib/indexes';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const parsed = recentKeysQuerySchema.safeParse(query);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const { limit, game_uid, device } = parsed.data;

  const db = await getDb();
  const collection = db.collection('keys');

  await ensureIndexes();

  const match: Record<string, unknown> = {
    $or: [{ disabled: { $exists: false } }, { disabled: { $ne: true } }]
  };

  if (game_uid) {
    match.game_uid = game_uid;
  }

  if (device) {
    match.device = device;
  }

  const results = await collection
    .find(match)
    .sort({ updated_at: -1, created_at: -1 })
    .limit(limit)
    .toArray();

  const keys = results.map((item) => ({
    id: item._id,
    device: item.device ?? null,
    expires_at: item.expires_at,
    duration: item.duration ?? null,
    created_at: item.created_at instanceof Date ? item.created_at.toISOString() : null,
    updated_at: item.updated_at instanceof Date ? item.updated_at.toISOString() : null,
    game: item.game ?? null,
    game_uid: item.game_uid ?? null
  }));

  return NextResponse.json({ keys });
}
