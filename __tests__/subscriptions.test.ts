import { describe, it, expect } from 'vitest';
import {
  buildStatusSwitch,
  computePricing,
  deriveSubscriptionStatus,
  formatCredits,
  normaliseDateRange,
  resolveUnitPrice
} from '@/lib/subscriptions';

function toUTCString(date: Date | undefined) {
  return date ? date.toISOString() : undefined;
}

describe('normaliseDateRange', () => {
  it('aligns the from date to the start of the day in UTC', () => {
    const input = new Date('2024-01-01T15:30:00Z');
    const result = normaliseDateRange({ fromDate: input, toDate: undefined });
    expect(toUTCString(result.from)).toBe('2024-01-01T00:00:00.000Z');
    expect(result.to).toBeUndefined();
  });

  it('aligns the to date to the end of the day in UTC', () => {
    const input = new Date('2024-02-05T03:45:10Z');
    const result = normaliseDateRange({ fromDate: undefined, toDate: input });
    expect(result.from).toBeUndefined();
    expect(toUTCString(result.to)).toBe('2024-02-05T23:59:59.999Z');
  });
});

describe('deriveSubscriptionStatus', () => {
  const now = Math.floor(Date.now() / 1000);

  it('returns disabled when the flag is set', () => {
    expect(deriveSubscriptionStatus({ disabled: true }, now)).toBe('disabled');
  });

  it('returns pending when expires_at is the literal string pending', () => {
    expect(deriveSubscriptionStatus({ expires_at: 'pending' }, now)).toBe('pending');
  });

  it('returns pending when future expiry exists without device binding', () => {
    expect(deriveSubscriptionStatus({ expires_at: now + 3600, device: null }, now)).toBe('pending');
  });

  it('returns active when expiry is in the future and device attached', () => {
    expect(deriveSubscriptionStatus({ expires_at: now + 3600, device: 'iphone' }, now)).toBe('active');
  });

  it('returns expired when expiry is in the past', () => {
    expect(deriveSubscriptionStatus({ expires_at: now - 10, device: 'iphone' }, now)).toBe('expired');
  });
});

describe('pricing helpers', () => {
  it('computes pricing totals when credits are required', () => {
    const pricing = computePricing(10, 5, false);
    expect(pricing.unitPrice).toBe(10);
    expect(pricing.totalCost).toBe(50);
    expect(pricing.requiresDebit).toBe(true);
  });

  it('treats invalid prices as configuration errors when debit is required', () => {
    const pricing = computePricing('not-a-number', 5, false);
    expect(pricing.unitPrice).toBeNull();
    expect(pricing.totalCost).toBe(0);
    expect(pricing.requiresDebit).toBe(true);
  });

  it('allows bypassing credits without a numeric price', () => {
    const pricing = computePricing('n/a', 3, true);
    expect(pricing.unitPrice).toBeNull();
    expect(pricing.totalCost).toBe(0);
    expect(pricing.requiresDebit).toBe(false);
  });

  it('formats credit balances consistently', () => {
    expect(formatCredits(12)).toBe('12.00');
    expect(formatCredits(12.345)).toBe('12.35');
    expect(formatCredits(null)).toBe('—');
  });

  it('resolves numeric strings to unit prices', () => {
    expect(resolveUnitPrice('15')).toBe(15);
    expect(resolveUnitPrice(' 15.5 ')).toBeCloseTo(15.5);
    expect(resolveUnitPrice('abc')).toBeNull();
  });
});

describe('buildStatusSwitch', () => {
  it('produces a MongoDB $switch document', () => {
    const now = 1234567890;
    const doc = buildStatusSwitch(now);
    expect(doc).toHaveProperty('$switch');
    expect(Array.isArray(doc.$switch?.branches)).toBe(true);
  });
});
