import 'server-only';
import crypto from 'crypto';

// Single shared-password auth (no per-user accounts). The session cookie is a
// signed, expiring token — not a lookup key — so no session store is needed.
export const SESSION_COOKIE = 'dashboard_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET environment variable is not set');
  return secret;
}

function sign(value: string): string {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');
}

export function createSessionToken(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof exp === 'number' && Date.now() < exp;
  } catch {
    return false;
  }
}
