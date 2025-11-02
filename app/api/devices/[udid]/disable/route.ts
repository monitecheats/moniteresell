import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { validateCsrf } from '@/lib/csrf';
import { deviceActionParamsSchema } from '@/lib/schemas';
import { canManageAllSubscriptions, canManageDevices } from '@/lib/rbac';
import { audit } from '@/lib/logger';

export async function POST(request: NextRequest, { params }: { params: { udid: string } }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canManageDevices(session) && !canManageAllSubscriptions(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const csrfError = validateCsrf(request);
  if (csrfError) {
    return csrfError;
  }

  const parsed = deviceActionParamsSchema.safeParse({ udid: params.udid });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid device identifier' }, { status: 400 });
  }

  const db = await getDb();
  const devices = db.collection('devices');
  const device = await devices.findOne<{ [key: string]: unknown }>({ udid: parsed.data.udid });
  if (!device) {
    return NextResponse.json({ error: 'Device not found' }, { status: 404 });
  }

  const now = new Date();
  await devices.updateOne(
    { udid: parsed.data.udid },
    {
      $set: { disabled: true, updated_at: now, disabled_at: now, disabled_by: session.sub }
    }
  );

  audit('device.disabled', { user: session.sub, udid: parsed.data.udid });

  return NextResponse.json({ ok: true });
}
