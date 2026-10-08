// Signed login sessions for username/password and reseller logins (Google
// logins use Firebase ID tokens instead). Server-only.
//
// Token: MADS1.<base64url JSON payload>.<base64url HMAC-SHA256>
// The key is SESSION_SECRET, or one derived from FIREBASE_DB_SECRET so no
// extra setup is needed. Without either, sessions can't be issued.
import crypto from 'crypto';

const PREFIX = 'MADS1';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function sessionKey() {
  const explicit = (process.env.SESSION_SECRET || '').trim();
  if (explicit) return explicit;
  const dbSecret = (process.env.FIREBASE_DB_SECRET || '').trim();
  if (dbSecret) return crypto.createHmac('sha256', dbSecret).update('mads-session-v1').digest('hex');
  return null;
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const sign = (key, data) => crypto.createHmac('sha256', key).update(data).digest('base64url');

export const isSessionToken = (token) => typeof token === 'string' && token.startsWith(`${PREFIX}.`);

export function signSession({ uid, email }) {
  const key = sessionKey();
  if (!key || !uid) return null;
  const now = Date.now();
  const payload = b64url(JSON.stringify({ uid: String(uid), email: String(email || ''), iat: now, exp: now + SESSION_TTL_MS }));
  return `${PREFIX}.${payload}.${sign(key, `${PREFIX}.${payload}`)}`;
}

// Returns { uid, email } for a valid, unexpired token, otherwise null.
export function verifySession(token) {
  const key = sessionKey();
  if (!key || !isSessionToken(token)) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const expected = Buffer.from(sign(key, `${parts[0]}.${parts[1]}`));
  const given = Buffer.from(parts[2]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!data.uid || !data.exp || Date.now() > data.exp) return null;
    return { uid: data.uid, email: data.email || '' };
  } catch (_) {
    return null;
  }
}
