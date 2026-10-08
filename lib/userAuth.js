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

// identifier: email, username, reseller code, security key or record key.
// Returns { success: true, key, user } or { success: false, message, blocked? }.
export async function verifyPasswordLogin(identifier, password) {
  const id = norm(identifier);
  const pw = String(password || '');
  if (!id || !pw) return { success: false, message: 'Please enter username and password!' };

  const all = await rtdbGet('users');
  const matches = Object.entries(all && typeof all === 'object' ? all : {}).filter(([key, u]) =>
    u && typeof u === 'object' && (
      norm(key) === id || norm(u.email) === id || norm(u.name || u.username) === id ||
      norm(u.resellerCode) === id || norm(u.securityKey) === id
    ));
  if (!matches.length) {
    return { success: false, message: 'No account found with that username or email. Please check your details or register.' };
  }

  const withPassword = matches.filter(([, u]) => u.password);
  if (!withPassword.length) {
    return { success: false, message: 'This account has no password set (it may use Google Sign-In). Please use "Sign in with Google" or reset your password.' };
  }

  // A typed value that is itself a stored hash is never accepted (the old
  // browser check let anyone paste the hash from the public users list).
  if (!pw.startsWith('sha256:')) {
    const inputHash = hashPasswordServer(pw);
    for (const [key, u] of withPassword) {
      const stored = String(u.password);
      let ok = false;
      if (stored.startsWith('sha256:')) {
        ok = safeEqual(stored, inputHash);
      } else if (safeEqual(stored, pw)) {
        ok = true;
        // Legacy plain-text password: store the hash instead.
        await rtdbPatch(`users/${key}`, { password: inputHash }).catch(() => {});
      }
      if (!ok) continue;
      if (await isUserBlocked(key, u.email)) {
        return { success: false, blocked: true, message: 'Your account has been blocked. Please contact support.' };
      }
      return { success: true, key, user: u };
    }
  }
  return { success: false, message: 'Incorrect password! Please enter your updated password.' };
}

// Set a new password on every record that uses this email.
export async function setPasswordForEmail(email, newPassword) {
  const target = norm(email);
  const all = await rtdbGet('users');
  const keys = Object.entries(all && typeof all === 'object' ? all : {})
    .filter(([, u]) => u && typeof u === 'object' && norm(u.email) === target)
    .map(([key]) => key);
  const hashed = hashPasswordServer(newPassword);
  for (const key of keys) {
    await rtdbPatch(`users/${key}`, { password: hashed, sessionsValidAfter: Date.now(), updatedAt: new Date().toISOString() });
  }
  return keys.length;
}
