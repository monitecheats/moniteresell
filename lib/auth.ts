import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { z } from 'zod';

export const SESSION_COOKIE_NAME = 'monite_session';
const SESSION_EXPIRATION_SECONDS = 60 * 60 * 12; // 12 hours

authenticator.options = {
  step: 30,
  window: 1
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET environment variable');
  }
  return secret;
}

export function hashLegacyPassword(password: string): string {
  return crypto.createHash('sha256').update(password, 'utf8').digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (/^[a-f0-9]{64}$/i.test(hash)) {
    return hashLegacyPassword(password) === hash;
  }
  return bcrypt.compare(password, hash);
}

function normalizeTotpSecret(secret: string | undefined): string | null {
  if (!secret) {
    return null;
  }
  const normalized = secret.replace(/\s+/g, '').toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

export function verifyTotp(token: string, secret: string): boolean {
  const normalizedSecret = normalizeTotpSecret(secret);
  if (!normalizedSecret) {
    return false;
  }
  try {
    return authenticator.check(token, normalizedSecret);
  } catch (error) {
    console.warn('Failed to verify TOTP token', error);
    return false;
  }
}

export function verifyTotpWithBackups(
  token: string,
  secret?: string,
  backupHashes?: string[]
): { valid: boolean; usedBackup?: string } {
  const trimmedToken = token.trim();
  if (trimmedToken.length === 0) {
    return { valid: false };
  }

  if (secret && verifyTotp(trimmedToken, secret)) {
    return { valid: true };
  }

  if (backupHashes?.length) {
    const tokenHash = hashLegacyPassword(trimmedToken);
    const match = backupHashes.find((entry) => entry?.toLowerCase() === tokenHash);
    if (match) {
      return { valid: true, usedBackup: match };
    }
  }

  return { valid: false };
}

export type SessionPayload = {
  sub: string;
  role: string;
  name: string;
  permissions: string[];
  email?: string;
};

export function createSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: SESSION_EXPIRATION_SECONDS
  });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionPayload;
  } catch (error) {
    return null;
  }
}

export function setSessionCookie(token: string): void {
  const cookieStore = cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRATION_SECONDS,
    path: '/'
  });
}

export function clearSessionCookie(): void {
  const cookieStore = cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });
}

export function getSessionFromRequest(request: NextRequest): SessionPayload | null {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}

export const csrfTokenSchema = z.object({
  csrfToken: z.string().min(16)
});

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
