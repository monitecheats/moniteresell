import type { Document } from 'mongodb';
import type { SubscriptionsQuery } from '@/lib/schemas';

type DateRange = { from?: Date; to?: Date };

type SubscriptionLike = {
  expires_at?: unknown;
  disabled?: unknown;
  device?: unknown;
};

export const MONGO_NUMERIC_TYPES = ['int', 'long', 'double', 'decimal'] as const;

export function normaliseDateRange(query: Pick<SubscriptionsQuery, 'fromDate' | 'toDate'>): DateRange {
  const from = query.fromDate ? new Date(query.fromDate) : undefined;
  const to = query.toDate ? new Date(query.toDate) : undefined;
  if (Number.isNaN(from?.getTime?.())) {
    return { to: sanitiseDateEnd(to) };
  }
  if (Number.isNaN(to?.getTime?.())) {
    return { from: sanitiseDateStart(from) };
  }
  return {
    from: sanitiseDateStart(from),
    to: sanitiseDateEnd(to)
  };
}

function sanitiseDateStart(date?: Date): Date | undefined {
  if (!date) return undefined;
  const clone = new Date(date);
  clone.setUTCHours(0, 0, 0, 0);
  return clone;
}

function sanitiseDateEnd(date?: Date): Date | undefined {
  if (!date) return undefined;
  const clone = new Date(date);
  clone.setUTCHours(23, 59, 59, 999);
  return clone;
}

export function buildStatusSwitch(now: number): Document {
  return {
    $switch: {
      branches: [
        {
          case: { $eq: ['$disabled', true] },
          then: 'disabled'
        },
        {
          case: { $eq: ['$expires_at', 'pending'] },
          then: 'pending'
        },
        {
          case: {
            $and: [
              { $ne: ['$expires_numeric', null] },
              { $gt: ['$expires_numeric', now] },
              { $eq: ['$has_device', false] },
              { $ne: ['$disabled', true] }
            ]
          },
          then: 'pending'
        },
        {
          case: {
            $and: [
              { $ne: ['$expires_numeric', null] },
              { $lte: ['$expires_numeric', now] }
            ]
          },
          then: 'expired'
        },
        {
          case: {
            $and: [
              { $ne: ['$expires_numeric', null] },
              { $gt: ['$expires_numeric', now] },
              { $ne: ['$disabled', true] }
            ]
          },
          then: 'active'
        }
      ],
      default: 'pending'
    }
  } satisfies Document;
}

export function deriveSubscriptionStatus(record: SubscriptionLike, nowSeconds: number):
  | 'disabled'
  | 'pending'
  | 'expired'
  | 'active' {
  if (record.disabled === true) {
    return 'disabled';
  }
  if (record.expires_at === 'pending') {
    return 'pending';
  }
  const expiresNumeric = toNumeric(record.expires_at);
  const hasDevice = record.device != null;
  if (expiresNumeric != null && expiresNumeric > nowSeconds && !hasDevice) {
    return 'pending';
  }
  if (expiresNumeric != null && expiresNumeric <= nowSeconds) {
    return 'expired';
  }
  if (expiresNumeric != null && expiresNumeric > nowSeconds) {
    return 'active';
  }
  return 'pending';
}

function toNumeric(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
  }
  if (value instanceof Date) {
    return Math.floor(value.getTime() / 1000);
  }
  return null;
}

export function resolveUnitPrice(rawPrice: unknown): number | null {
  if (typeof rawPrice === 'number') {
    return Number.isFinite(rawPrice) ? rawPrice : null;
  }
  if (typeof rawPrice === 'string') {
    const numeric = Number(rawPrice.trim());
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

export function computePricing(
  rawPrice: unknown,
  quantity: number,
  bypassCredits: boolean
): { unitPrice: number | null; totalCost: number; requiresDebit: boolean } {
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  const unitPrice = resolveUnitPrice(rawPrice);
  if (bypassCredits) {
    return { unitPrice, totalCost: 0, requiresDebit: false };
  }
  if (unitPrice == null || unitPrice < 0) {
    return { unitPrice: null, totalCost: 0, requiresDebit: true };
  }
  return { unitPrice, totalCost: unitPrice * safeQuantity, requiresDebit: true };
}

export function formatCredits(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return formatter.format(value);
}

export function isMongoNumericType(type: unknown): boolean {
  if (typeof type === 'string') {
    return MONGO_NUMERIC_TYPES.includes(type as (typeof MONGO_NUMERIC_TYPES)[number]);
  }
  return false;
}
