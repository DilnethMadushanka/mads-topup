// Username/password checks done on the server (the browser used to do them
// itself against the public users list). Server-only.
import crypto from 'crypto';
import { rtdbGet, rtdbPatch, isUserBlocked } from './rtdbAdmin.js';

export const hashPasswordServer = (plain) =>
  'sha256:' + crypto.createHash('sha256').update(String(plain)).digest('hex');

const norm = (v) => String(v || '').trim().toLowerCase();

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Strip fields the browser must never get back from a login.
export const publicProfile = (key, user) => {
  const { password, ...rest } = user || {};
  return { ...rest, uid: key };
};

// Password hashes live in userSecrets/{key} (never readable by browsers),
// not in the public users list. scrypt with a per-user salt; older records
// still holding an unsalted sha256 hash (or plain text) in users/{key} are
// moved over and upgraded on their next successful login.
const SCRYPT_PREFIX = 'scrypt:';
export function hashPasswordScrypt(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(plain), salt, 32).toString('hex');
  return `${SCRYPT_PREFIX}${salt}:${hash}`;
}

function passwordMatches(stored, pw) {
  stored = String(stored || '');
  if (stored.startsWith(SCRYPT_PREFIX)) {
    const [salt, hash] = stored.slice(SCRYPT_PREFIX.length).split(':');
    if (!salt || !hash) return false;
    return safeEqual(crypto.scryptSync(pw, salt, 32).toString('hex'), hash);
  }
  if (stored.startsWith('sha256:')) return safeEqual(stored, hashPasswordServer(pw));
  return stored ? safeEqual(stored, pw) : false;
}

async function storePasswordSecret(key, plain) {
  await rtdbPatch(`userSecrets/${key}`, { password: hashPasswordScrypt(plain), updatedAt: new Date().toISOString() });
  await rtdbPatch(`users/${key}`, { password: null }).catch(() => {});
}

// Wrong passwords are also counted per account (not just per IP), so a
// password can't be guessed by spreading tries across many IPs. Covers the
// website login and the Telegram bot /auth, which both come through here.
const MAX_FAILED_LOGINS = 10;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const failedLogins = new Map(); // account key -> { count, until }
const isLockedOut = (key) => {
  const f = failedLogins.get(key);
  if (!f) return false;
  if (Date.now() > f.until) { failedLogins.delete(key); return false; }
  return f.count >= MAX_FAILED_LOGINS;
};
const recordFailedLogin = (key) => {
  const f = failedLogins.get(key);
  if (!f || Date.now() > f.until) failedLogins.set(key, { count: 1, until: Date.now() + FAILED_LOGIN_WINDOW_MS });
  else f.count += 1;
};

// identifier: email, username, reseller code, security key or record key.
// Returns { success: true, key, user } or { success: false, message, blocked? }.
export async function verifyPasswordLogin(identifier, password) {
  const id = norm(identifier);
  const pw = String(password || '');
  if (!id || !pw) return { success: false, message: 'Please enter username and password!' };

  const [all, secrets] = await Promise.all([rtdbGet('users'), rtdbGet('userSecrets').catch(() => null)]);
  const matches = Object.entries(all && typeof all === 'object' ? all : {}).filter(([key, u]) =>
    u && typeof u === 'object' && (
      norm(key) === id || norm(u.email) === id || norm(u.name || u.username) === id ||
      norm(u.resellerCode) === id || norm(u.securityKey) === id
    ));
  if (!matches.length) {
    return { success: false, message: 'No account found with that username or email. Please check your details or register.' };
  }

  const storedFor = (key, u) => secrets?.[key]?.password || u.password || '';
  const withPassword = matches.filter(([key, u]) => storedFor(key, u));
  if (!withPassword.length) {
    return { success: false, message: 'This account has no password set (it may use Google Sign-In). Please use "Sign in with Google" or reset your password.' };
  }

  if (withPassword.some(([key]) => isLockedOut(key))) {
    return { success: false, message: 'Too many wrong passwords for this account. Please try again in 15 minutes or reset your password.' };
  }

  // A typed value that is itself a stored hash is never accepted (the old
  // browser check let anyone paste the hash from the public users list).
  if (!pw.startsWith('sha256:') && !pw.startsWith(SCRYPT_PREFIX)) {
    for (const [key, u] of withPassword) {
      const stored = storedFor(key, u);
      if (!passwordMatches(stored, pw)) continue;
      if (!String(stored).startsWith(SCRYPT_PREFIX) || u.password) {
        await storePasswordSecret(key, pw).catch(e => console.warn('[Password upgrade warning]:', e.message));
      }
      if (await isUserBlocked(key, u.email)) {
        return { success: false, blocked: true, message: 'Your account has been blocked. Please contact support.' };
      }
      failedLogins.delete(key);
      const { password: _hidden, ...user } = u;
      return { success: true, key, user };
    }
  }
  for (const [key] of withPassword) recordFailedLogin(key);
  return { success: false, message: 'Incorrect password! Please enter your updated password.' };
}

// Set a new password on every record that uses this email.
export async function setPasswordForEmail(email, newPassword) {
  const target = norm(email);
  const all = await rtdbGet('users');
  const keys = Object.entries(all && typeof all === 'object' ? all : {})
    .filter(([, u]) => u && typeof u === 'object' && norm(u.email) === target)
    .map(([key]) => key);
  for (const key of keys) {
    await storePasswordSecret(key, newPassword);
    await rtdbPatch(`users/${key}`, { sessionsValidAfter: Date.now(), updatedAt: new Date().toISOString() });
  }
  return keys.length;
}
