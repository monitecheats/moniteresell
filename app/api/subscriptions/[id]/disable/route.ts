import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { validateCsrf } from '@/lib/csrf';
import { subscriptionIdSchema } from '@/lib/schemas';
import { canManageSubscription } from '@/lib/rbac';
import { audit } from '@/lib/logger';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const csrfError = validateCsrf(request);
  if (csrfError) {
    return csrfError;
  }

  const parsed = subscriptionIdSchema.safeParse({ id: params.id });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid subscription id' }, { status: 400 });
  }

  const db = await getDb();
  const keys = db.collection('keys');
  const subscription = await keys.findOne<{ [key: string]: unknown }>({ _id: parsed.data.id });
  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  if (!canManageSubscription(session, typeof subscription.generated_by === 'string' ? (subscription.generated_by as string) : null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  await keys.updateOne(
    { _id: parsed.data.id },
    {
      $set: { disabled: true, updated_at: now, disabled_at: now, disabled_by: session.sub }
    }
  );

  audit('subscription.disabled', { user: session.sub, subscription: parsed.data.id });

  return NextResponse.json({ ok: true });
}
