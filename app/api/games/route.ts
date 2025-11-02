import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { canManageAllSubscriptions, canViewAllSubscriptions } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const resellers = db.collection('resellers');
  const gamesCollection = db.collection('games');

  const reseller = await resellers.findOne<{ allowed_games?: string[] }>({ _id: session.sub }, {
    projection: { allowed_games: 1 }
  });

  const canViewAll = canViewAllSubscriptions(session) || canManageAllSubscriptions(session);
  const allowedGames = Array.isArray(reseller?.allowed_games) ? reseller?.allowed_games : [];
  const query = canViewAll || allowedGames.length === 0 ? {} : { uid: { $in: allowedGames } };

  const games = await gamesCollection
    .find(query)
    .sort({ name: 1 })
    .project({
      uid: 1,
      name: 1,
      devices: 1,
      durations: 1,
      price: 1,
      active: 1
    })
    .toArray();

  return NextResponse.json({
    games: games.map((game) => ({
      uid: game.uid ?? null,
      name: typeof game.name === 'string' ? game.name : typeof game._id === 'string' ? game._id : game.uid,
      devices: Array.isArray(game.devices) ? game.devices : [],
      durations: Array.isArray(game.durations) ? game.durations : [],
      price: typeof game.price === 'object' && game.price !== null ? game.price : {},
      active: game.active !== false
    }))
  });
}
