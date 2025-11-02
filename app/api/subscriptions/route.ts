import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { Document } from 'mongodb';
import { getClient, getDb } from '@/lib/mongodb';
import { getSessionFromRequest } from '@/lib/auth';
import { ensureIndexes } from '@/lib/indexes';
import { createSubscriptionSchema, subscriptionsQuerySchema, type SubscriptionsQuery } from '@/lib/schemas';
import { canCreateWithoutCredits, canViewAllSubscriptions } from '@/lib/rbac';
import { escapeRegex } from '@/lib/utils';
import { validateCsrf } from '@/lib/csrf';
import { audit } from '@/lib/logger';
import { isRateLimited } from '@/lib/rate-limit';
import { buildStatusSwitch, computePricing, normaliseDateRange, MONGO_NUMERIC_TYPES } from '@/lib/subscriptions';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = subscriptionsQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const query = parsed.data as SubscriptionsQuery;
  const { from: fromDate, to: toDate } = normaliseDateRange(query);
  const db = await getDb();
  const collection = db.collection('keys');

  await ensureIndexes();

  const baseMatch: Document = {};
  if (!canViewAllSubscriptions(session)) {
    baseMatch.generated_by = session.sub;
  }
  if (query.game_uid) {
    baseMatch.game_uid = query.game_uid;
  }
  if (query.q) {
    baseMatch._id = { $regex: `^${escapeRegex(query.q)}`, $options: 'i' };
  }
  if (fromDate || toDate) {
    baseMatch.created_at = {};
    if (fromDate) {
      (baseMatch.created_at as Document).$gte = fromDate;
    }
    if (toDate) {
      (baseMatch.created_at as Document).$lte = toDate;
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;

  const sortMap: Record<string, Document> = {
    created_at_desc: { created_at: -1, _id: -1 },
    created_at_asc: { created_at: 1, _id: 1 },
    expires_at_desc: { expires_numeric: -1, _id: -1 },
    expires_at_asc: { expires_numeric: 1, _id: 1 }
  };
  const sortStage = sortMap[query.sort] ?? sortMap.created_at_desc;

  const pipeline: Document[] = [
    { $match: baseMatch },
    {
      $addFields: {
        expires_numeric: {
          $cond: [{ $in: [{ $type: '$expires_at' }, MONGO_NUMERIC_TYPES] }, { $toLong: '$expires_at' }, null]
        },
        has_device: {
          $cond: [{ $ifNull: ['$device', false] }, true, false]
        }
      }
    },
    {
      $addFields: {
        status: buildStatusSwitch(now)
      }
    }
  ];

  if (query.status !== 'all') {
    pipeline.push({ $match: { status: query.status } });
  }

  pipeline.push({ $sort: sortStage });
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: pageSize }],
      total: [{ $count: 'count' }]
    }
  });

  const [result] = await collection.aggregate(pipeline).toArray();
  const total = result?.total?.[0]?.count ?? 0;
  const data = (result?.data ?? []) as Document[];

  const items = data.map((item) => ({
    id: item._id,
    status: item.status,
    game: item.game ?? null,
    game_uid: item.game_uid ?? null,
    device: item.device ?? null,
    iphone_id: item.iphone_id ?? null,
    android_id: item.android_id ?? null,
    expires_at: item.expires_at,
    created_at: item.created_at instanceof Date ? item.created_at.toISOString() : null,
    updated_at: item.updated_at instanceof Date ? item.updated_at.toISOString() : null,
    generated_by: item.generated_by ?? null
  }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return NextResponse.json({
    page,
    pageSize,
    total,
    totalPages,
    items
  });
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const csrfError = validateCsrf(request);
  if (csrfError) {
    return csrfError;
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.ip ?? 'unknown';
  const rateLimitKey = `create-subscription:${session.sub}:${ip}`;
  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  const body = await request.json();
  const parsed = createSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { gameUid, device, duration, quantity } = parsed.data;
  const db = await getDb();
  const resellers = db.collection('resellers');
  const games = db.collection('games');
  const keys = db.collection('keys');

  const resellerDoc = await resellers.findOne<{ [key: string]: unknown }>({ _id: session.sub });
  if (!resellerDoc) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const allowedGames = Array.isArray(resellerDoc.allowed_games) ? (resellerDoc.allowed_games as string[]) : [];
  const canBypassGameRestrictions = canViewAllSubscriptions(session);
  if (!canBypassGameRestrictions && !allowedGames.includes(gameUid)) {
    return NextResponse.json({ error: 'Game is not allowed for this reseller' }, { status: 403 });
  }

  const game = await games.findOne<{ [key: string]: unknown }>(
    canBypassGameRestrictions ? { uid: gameUid } : { uid: gameUid, active: { $ne: false } }
  );
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const devices = Array.isArray(game.devices) ? (game.devices as string[]) : [];
  if (devices.length > 0 && !devices.includes(device)) {
    return NextResponse.json({ error: 'Device is not supported for this product' }, { status: 400 });
  }

  const durations = Array.isArray(game.durations) ? (game.durations as string[]) : [];
  if (durations.length > 0 && !durations.includes(duration)) {
    return NextResponse.json({ error: 'Duration is not supported for this product' }, { status: 400 });
  }

  const priceTable = (game.price ?? {}) as Record<string, unknown>;
  const rawPrice = priceTable[duration];
  const pricing = computePricing(rawPrice, quantity, canCreateWithoutCredits(session));
  if (pricing.requiresDebit && pricing.unitPrice == null) {
    return NextResponse.json({ error: 'Price not configured for this duration' }, { status: 400 });
  }

  const totalCost = pricing.requiresDebit ? pricing.totalCost : 0;
  const client = await getClient();
  const mongoSession = client.startSession();

  const now = new Date();
  const createdKeys: string[] = [];
  let updatedCredits = typeof resellerDoc.credits === 'number' ? (resellerDoc.credits as number) : 0;

  try {
    await mongoSession.withTransaction(async () => {
      if (totalCost > 0) {
        const debit = await resellers.findOneAndUpdate(
          { _id: session.sub, credits: { $gte: totalCost } },
          { $inc: { credits: -totalCost } },
          { returnDocument: 'after', session: mongoSession }
        );
        if (!debit.value) {
          throw new Error('INSUFFICIENT_CREDITS');
        }
        updatedCredits = typeof debit.value.credits === 'number' ? (debit.value.credits as number) : 0;
      } else {
        const current = await resellers.findOne<{ credits?: number }>(
          { _id: session.sub },
          { session: mongoSession, projection: { credits: 1 } }
        );
        updatedCredits = typeof current?.credits === 'number' ? current.credits : updatedCredits;
      }

      const docs = Array.from({ length: quantity }).map(() => {
        const id = crypto.randomUUID().replace(/-/g, '').toUpperCase();
        createdKeys.push(id);
        return {
          _id: id,
          device,
          expires_at: 'pending',
          duration,
          created_at: now,
          updated_at: now,
          game: typeof game._id === 'string' ? (game._id as string) : (game as { name?: string }).name ?? null,
          game_uid: gameUid,
          generated_by: session.sub,
          created_by_name: session.name ?? session.sub
        };
      });

      await keys.insertMany(docs, { session: mongoSession });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }
    console.error('Failed to create subscriptions', error);
    return NextResponse.json({ error: 'Unable to create subscriptions' }, { status: 500 });
  } finally {
    await mongoSession.endSession();
  }

  audit('subscriptions.created', {
    user: session.sub,
    quantity,
    game: gameUid,
    device,
    cost: totalCost
  });

  return NextResponse.json({
    ok: true,
    created: createdKeys,
    credits: updatedCredits
  });
}
