import { SessionPayload } from './auth';

const READ_ALL_PERMISSIONS = new Set(['keys:read_all', 'subscriptions:read_all']);
const MANAGE_ALL_PERMISSIONS = new Set([
  'keys:manage_all',
  'subscriptions:manage_all'
]);
const DEVICE_PERMISSIONS = new Set(['devices:manage_all']);

export function canManageDevices(session: SessionPayload): boolean {
  const permissions = Array.isArray(session.permissions) ? session.permissions : [];
  return isAdmin(session) || permissions.some((permission) => DEVICE_PERMISSIONS.has(permission));
}

export function hasPermission(session: SessionPayload, permission: string): boolean {
  return Array.isArray(session.permissions) && session.permissions.includes(permission);
}

export function isAdmin(session: SessionPayload): boolean {
  return session.role === 'admin';
}

export function canViewAllSubscriptions(session: SessionPayload): boolean {
  const permissions = Array.isArray(session.permissions) ? session.permissions : [];
  return isAdmin(session) || permissions.some((permission) => READ_ALL_PERMISSIONS.has(permission));
}

export function canManageAllSubscriptions(session: SessionPayload): boolean {
  const permissions = Array.isArray(session.permissions) ? session.permissions : [];
  return isAdmin(session) || permissions.some((permission) => MANAGE_ALL_PERMISSIONS.has(permission));
}

export function canCreateWithoutCredits(session: SessionPayload): boolean {
  return hasPermission(session, 'create_keys_nocredit');
}

export function canManageSubscription(session: SessionPayload, owner?: string | null): boolean {
  return canManageAllSubscriptions(session) || owner === session.sub;
}
