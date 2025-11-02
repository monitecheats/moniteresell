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
    db.collection('keys').createIndex({ device: 1 }, { sparse: true })
  ]).catch((error) => {
    console.error('Failed to ensure indexes', error);
  });
  ensured = true;
}
