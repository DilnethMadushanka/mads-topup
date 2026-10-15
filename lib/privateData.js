// Server-side reads of the database nodes browsers can no longer read
// (users, orders, deposits, reseller applications, support tickets).
// Browsers ask the server instead, and only get their own records, or
// everything when the request carries an admin session. Server-only.
import { rtdbGet, rtdbUrl } from './rtdbAdmin.js';

// Whole-node reads are shared between requests for a few seconds, so many
// open tabs polling at once cost one database read, not one each.
const nodeCache = new Map(); // path -> { at, promise }
export function readNode(path, ttlMs = 4000) {
  const hit = nodeCache.get(path);
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise;
  const promise = rtdbGet(path).then(v => (v && typeof v === 'object' ? v : {}));
  nodeCache.set(path, { at: Date.now(), promise });
  promise.catch(() => nodeCache.delete(path));
  return promise;
}
export const forgetNode = (path) => nodeCache.delete(path);

const lower = (v) => String(v || '').trim().toLowerCase();

// Same check as rtdbAdmin.isUserBlocked (any record with this uid or email
// marked BLOCKED), but on a users list cached for a minute: this runs on
// every profile poll. Orders and top-ups still do the live check.
export async function isBlockedCached(uid, email) {
  const all = await readNode('users', 60000);
  const id = String(uid || '').toUpperCase();
  const mail = lower(email);
  if (!id && !mail) return false;
  return Object.entries(all).some(([key, u]) => u && typeof u === 'object' && u.status === 'BLOCKED' && (
    (id && (key.toUpperCase() === id || String(u.uid || '').toUpperCase() === id)) ||
    (mail && lower(u.email) === mail)
  ));
}

// A user record without its password hash (older records still carry one).
export const stripUser = (key, u) => {
  if (!u || typeof u !== 'object') return null;
  const { password, ...rest } = u;
  return { ...rest, uid: rest.uid || key };
};

// Admin views: the full node, with password hashes removed from users.
export const ADMIN_NODES = ['users', 'orders', 'manual_payments', 'reseller_applications', 'supportTickets', 'promoVouchers'];
export async function readAdminNode(node) {
  if (node === 'promoVouchers') {
    const list = await rtdbGet(node);
    return Array.isArray(list) ? list.filter(Boolean) : Object.values(list || {});
  }
  const data = await readNode(node, 2500);
  if (node !== 'users') return data;
  const out = {};
  for (const [key, u] of Object.entries(data)) {
    const clean = stripUser(key, u);
    if (clean) out[key] = clean;
  }
  return out;
}

// Records whose `child` equals `value`, using the database index
// (".indexOn" in database.rules.json), so a customer's poll downloads only
// their own records. Until the new rules (with the index) are published the
// query fails, and the whole node is read instead (cached for 30 seconds).
let warnedNoIndex = false;
async function recordsWhere(node, child, value) {
  if (!value) return {};
  try {
    const res = await fetch(rtdbUrl(node, { orderBy: JSON.stringify(child), equalTo: JSON.stringify(value) }));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Re-check the match, so a wrong reply can never hand out other records.
    return Object.fromEntries(Object.entries(data && typeof data === 'object' ? data : {})
      .filter(([, r]) => r && typeof r === 'object' && r[child] === value));
  } catch (e) {
    if (!warnedNoIndex) {
      warnedNoIndex = true;
      console.warn(`[privateData] Indexed read of ${node} failed (${e.message}); publish database.rules.json to add the index. Reading the whole list for now.`);
    }
    const all = await readNode(node, 30000);
    return Object.fromEntries(Object.entries(all).filter(([, r]) => r && typeof r === 'object' && r[child] === value));
  }
}

// The caller's own orders: matched on the account key (uid). A Google
// account's verified email also matches, since some orders only carry it.
export async function ordersForUser(user) {
  const uid = String(user?.uid || '');
  const email = user?.emailVerified ? String(user.email || '').trim() : '';
  const parts = await Promise.all([
    recordsWhere('orders', 'userId', uid),
    recordsWhere('orders', 'userEmail', uid),
    email ? recordsWhere('orders', 'userEmail', email) : {},
    email && email !== lower(email) ? recordsWhere('orders', 'userEmail', lower(email)) : {}
  ]);
  const merged = Object.assign({}, ...parts);
  return Object.entries(merged).map(([key, o]) => ({ ...o, key }));
}

export async function ticketsForUser(user) {
  const uid = String(user?.uid || '');
  const email = user?.emailVerified ? String(user.email || '').trim() : '';
  const parts = await Promise.all([
    recordsWhere('supportTickets', 'userId', uid),
    email ? recordsWhere('supportTickets', 'userEmail', email) : {},
    email && email !== lower(email) ? recordsWhere('supportTickets', 'userEmail', lower(email)) : {}
  ]);
  return Object.values(Object.assign({}, ...parts));
}

// The newest reseller application filed by this account, if any.
export async function resellerApplicationFor(uid) {
  if (!uid) return null;
  const all = await readNode('reseller_applications', 10000);
  let best = null;
  for (const [id, a] of Object.entries(all)) {
    if (!a || typeof a !== 'object') continue;
    if (String(a.userId || a.uid || '') !== String(uid) && String(a.approvedKey || '') !== String(uid)) continue;
    if (!best || String(a.submittedAt || '') > String(best.submittedAt || '')) best = { ...a, id };
  }
  if (!best) return null;
  return {
    id: best.id,
    status: best.status || 'PENDING',
    resellerCode: best.resellerCode || '',
    securityKey: best.securityKey || '',
    storeName: best.storeName || '',
    submittedAt: best.submittedAt || ''
  };
}

// Public leaderboard: names, avatars and totals of completed orders only.
// Never includes emails, uids or phone numbers.
const AVATAR_MAX = 150000;
export async function buildLeaderboard(period = 'month', limit = 50) {
  const [orders, users] = await Promise.all([readNode('orders', 30000), readNode('users', 30000)]);
  const byUid = {};
  const byEmail = {};
  for (const [key, u] of Object.entries(users)) {
    if (!u || typeof u !== 'object') continue;
    byUid[key] = u;
    if (u.uid) byUid[u.uid] = u;
    if (u.email) byEmail[lower(u.email)] = u;
  }

  const flat = [];
  for (const entry of Object.values(orders)) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.id || entry.gameId) flat.push(entry);
    else Object.values(entry).forEach(o => { if (o && typeof o === 'object' && (o.id || o.gameId)) flat.push(o); });
  }

  const now = new Date();
  const spend = {};
  for (const o of flat) {
    if (o.status !== 'COMPLETED') continue;
    if (period === 'month' && o.createdAt) {
      const d = new Date(o.createdAt);
      if (!isNaN(d) && (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth())) continue;
    }
    const amount = parseFloat(o.priceLkr || 0);
    if (!(amount > 0)) continue;
    const uid = o.userId || o.userUid || '';
    const email = lower(o.userEmail);
    const info = (uid && byUid[uid]) || (email && byEmail[email]) || null;
    const key = (info && (info.uid || uid)) || uid || email;
    if (!key || key === 'guest') continue;
    if (!spend[key]) spend[key] = { name: '', avatar: '', totalLkr: 0, orderCount: 0 };
    const row = spend[key];
    row.totalLkr += amount;
    row.orderCount += 1;
    const name = info?.name || o.userName || o.ign || '';
    if (name && !String(name).includes('@')) row.name = String(name).slice(0, 40);
    const avatar = info?.avatar || o.userAvatar || '';
    if (avatar && String(avatar).length <= AVATAR_MAX) row.avatar = avatar;
  }

  return Object.values(spend)
    .map(r => ({ ...r, name: r.name || 'Gamer', totalLkr: Math.round(r.totalLkr) }))
    .sort((a, b) => b.totalLkr - a.totalLkr)
    .slice(0, limit)
    .map((r, i) => ({ ...r, key: `rank-${i + 1}` }));
}
