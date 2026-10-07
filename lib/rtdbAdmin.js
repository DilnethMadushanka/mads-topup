// Server-only Firebase Realtime Database REST helpers.
//
// Every server-side read/write goes through rtdbUrl(), which appends the
// database secret (FIREBASE_DB_SECRET) as the `auth` parameter. Requests
// carrying the secret bypass database.rules.json, so the rules can lock
// money fields (walletBalance, walletUsdt, isReseller, ...) against browser
// writes while the server keeps full access. Never import this file from
// browser code — the secret must stay on the server.

// Read lazily: server.js loads .env after its imports have been evaluated.
const dbBaseUrl = () => process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || "https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app";
const dbSecret = () => (process.env.FIREBASE_DB_SECRET || '').trim();

let warnedNoSecret = false;

// path: e.g. "users/abc" (no leading slash, no .json). Each segment is
// URL-encoded. query: extra query-string params.
export function rtdbUrl(path, query = {}) {
  const cleanPath = String(path || '')
    .split('/')
    .filter(Boolean)
    .map(seg => encodeURIComponent(seg))
    .join('/');
  const params = new URLSearchParams();
  const secret = dbSecret();
  if (secret) {
    params.set('auth', secret);
  } else if (!warnedNoSecret) {
    warnedNoSecret = true;
    console.warn('[rtdbAdmin] FIREBASE_DB_SECRET is not set — server database writes will be rejected once the locked database rules are published.');
  }
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) params.set(k, String(v));
  }
  const qs = params.toString();
  return `${dbBaseUrl()}/${cleanPath}.json${qs ? `?${qs}` : ''}`;
}

export async function rtdbGet(path) {
  const res = await fetch(rtdbUrl(path));
  if (!res.ok) throw new Error(`RTDB read ${path} failed: HTTP ${res.status}`);
  return res.json();
}

async function rtdbWrite(method, path, body) {
  const res = await fetch(rtdbUrl(path), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`RTDB ${method} ${path} failed: HTTP ${res.status}`);
  return res.json();
}

export const rtdbPut = (path, body) => rtdbWrite('PUT', path, body);
export const rtdbPatch = (path, body) => rtdbWrite('PATCH', path, body);

// Compare-and-set loop using RTDB REST conditional requests (ETag /
// if-match). update(current) returns the new value, or undefined to abort
// without writing. Returns { committed, value }.
export async function rtdbTransaction(path, update, maxAttempts = 8) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const getRes = await fetch(rtdbUrl(path), { headers: { 'X-Firebase-ETag': 'true' } });
    if (!getRes.ok) throw new Error(`RTDB read ${path} failed: HTTP ${getRes.status}`);
    const etag = getRes.headers.get('etag');
    const current = await getRes.json();

    const next = update(current);
    if (next === undefined) return { committed: false, value: current };

    const putRes = await fetch(rtdbUrl(path), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'if-match': etag },
      body: JSON.stringify(next)
    });
    if (putRes.ok) return { committed: true, value: next };
    if (putRes.status !== 412) throw new Error(`RTDB write ${path} failed: HTTP ${putRes.status}`);
    // 412 Precondition Failed: someone else wrote first — re-read and retry.
  }
  throw new Error(`RTDB transaction on ${path} kept conflicting; gave up.`);
}

const lower = (v) => String(v || '').trim().toLowerCase();
const upper = (v) => String(v || '').trim().toUpperCase();

// Find a user's RTDB key by uid, email, reseller code or security key.
// Prefers an exact key match; among email matches prefers the record that
// actually holds a balance (some accounts have duplicate records).
export async function findUserKey(identifier) {
  const id = String(identifier || '').trim();
  if (!id) return null;

  try {
    const direct = await rtdbGet(`users/${id}`);
    if (direct && typeof direct === 'object') return id;
  } catch (_) {}

  const all = await rtdbGet('users');
  if (!all || typeof all !== 'object') return null;
  const idLower = lower(id);
  const idUpper = upper(id);
  let best = null;
  let bestBalance = -1;
  for (const [key, u] of Object.entries(all)) {
    if (!u || typeof u !== 'object') continue;
    const match =
      upper(key) === idUpper ||
      (u.uid && upper(u.uid) === idUpper) ||
      (u.email && lower(u.email) === idLower) ||
      (u.resellerCode && upper(u.resellerCode) === idUpper) ||
      (u.securityKey && upper(u.securityKey) === idUpper);
    if (!match) continue;
    const bal = (parseFloat(u.walletBalance) || 0) + (parseFloat(u.walletUsdt) || 0);
    if (bal > bestBalance) {
      best = key;
      bestBalance = bal;
    }
  }
  return best;
}

// True when any user record belonging to this uid or email is BLOCKED. A
// person can have more than one record (Google + username login, duplicate
// signups), and the admin's Block button only marks one of them, so every
// record matching the uid or the email is checked.
export async function isUserBlocked(uid, email) {
  const uidUpper = upper(uid);
  const emailLower = lower(email);
  if (!uidUpper && !emailLower) return false;
  if (uid) {
    try {
      const direct = await rtdbGet(`users/${uid}`);
      if (direct && typeof direct === 'object' && direct.status === 'BLOCKED') return true;
    } catch (_) {}
  }
  const all = await rtdbGet('users');
  if (!all || typeof all !== 'object') return false;
  for (const [key, u] of Object.entries(all)) {
    if (!u || typeof u !== 'object' || u.status !== 'BLOCKED') continue;
    if (uidUpper && (upper(key) === uidUpper || upper(u.uid) === uidUpper)) return true;
    if (emailLower && lower(u.email) === emailLower) return true;
  }
  return false;
}

const round2 = (n) => parseFloat((Number(n) || 0).toFixed(2));
const round6 = (n) => parseFloat((Number(n) || 0).toFixed(6));

// Atomically add (or with negative amounts, subtract, floored at 0) to a
// user's wallet. Returns { newBalanceLkr, newBalanceUsdt }.
export async function adjustWallet(key, deltaLkr = 0, deltaUsdt = 0) {
  const { committed, value } = await rtdbTransaction(`users/${key}`, (cur) => {
    const base = cur && typeof cur === 'object' ? cur : { uid: key };
    return {
      ...base,
      walletBalance: Math.max(0, round2((parseFloat(base.walletBalance) || 0) + (Number(deltaLkr) || 0))),
      walletUsdt: Math.max(0, round6((parseFloat(base.walletUsdt) || 0) + (Number(deltaUsdt) || 0))),
      updatedAt: new Date().toISOString()
    };
  });
  if (!committed) throw new Error('Wallet update was not saved.');
  return { newBalanceLkr: value.walletBalance, newBalanceUsdt: value.walletUsdt };
}

// Atomically spend priceLkr from a user's wallet: LKR first, else USDT at
// the fixed 305 LKR/USDT rate. Refuses blocked accounts. Returns
// { success, reason?, newBalanceLkr, newBalanceUsdt, usedCurrency }.
export async function spendWallet(key, priceLkr) {
  let outcome = { success: false, reason: 'User wallet not found' };
  await rtdbTransaction(`users/${key}`, (cur) => {
    if (!cur || typeof cur !== 'object') {
      outcome = { success: false, reason: 'User wallet not found' };
      return undefined;
    }
    if (cur.status === 'BLOCKED') {
      outcome = { success: false, reason: 'Your account has been blocked. Please contact support.' };
      return undefined;
    }
    const lkr = parseFloat(cur.walletBalance) || 0;
    const usdt = parseFloat(cur.walletUsdt) || 0;
    let newLkr = lkr;
    let newUsdt = usdt;
    let usedCurrency;
    if (lkr >= priceLkr) {
      newLkr = round2(lkr - priceLkr);
      usedCurrency = 'LKR';
    } else if (usdt * 305 >= priceLkr) {
      newUsdt = Math.max(0, round6(usdt - priceLkr / 305));
      usedCurrency = 'USDT';
    } else {
      outcome = { success: false, reason: `Insufficient wallet balance. Required: Rs. ${priceLkr.toFixed(2)}, Available: Rs. ${lkr.toFixed(2)} LKR / $${usdt.toFixed(2)} USDT` };
      return undefined;
    }
    outcome = { success: true, newBalanceLkr: newLkr, newBalanceUsdt: newUsdt, usedCurrency };
    return { ...cur, walletBalance: newLkr, walletUsdt: newUsdt, updatedAt: new Date().toISOString() };
  });
  return outcome;
}
