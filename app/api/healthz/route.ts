import { NextResponse } from 'next/server';
import { getClient, getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await getClient();
    await client.db().admin().command({ ping: 1 });
    const db = await getDb();
    const stats = await db.stats();

    return NextResponse.json({
      status: 'ok',
      db: {
        name: db.databaseName,
        collections: stats.collections
      },
      version: process.env.npm_package_version ?? 'unknown'
    });
  } catch (error) {
    console.error('Health check failed', error);
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
