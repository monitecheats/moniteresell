import { getDb } from './mongodb';

let ensured = false;

export async function ensureIndexes(): Promise<void> {
  if (ensured) {
    return;
  }
  const db = await getDb();
  await Promise.all([
    db.collection('keys').createIndex({ expires_at: 1 }),
    db.collection('keys').createIndex({ disabled: 1 }, { sparse: true }),
    db.collection('keys').createIndex({ device: 1 }, { sparse: true }),
    db.collection('keys').createIndex({ game_uid: 1 }, { sparse: true }),
    db.collection('keys').createIndex({ generated_by: 1 }, { sparse: true }),
    db.collection('devices').createIndex({ udid: 1 }, { unique: true }),
    db.collection('games').createIndex({ uid: 1 }, { unique: true })
  ]).catch((error) => {
    console.error('Failed to ensure indexes', error);
  });
  ensured = true;
}
