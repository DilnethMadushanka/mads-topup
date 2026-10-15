import { rtdb } from './firebaseAuth.js';
import { ref as dbRef, onValue as rtdbOnValue } from 'firebase/database';
import { postServerApi, getServerApi, getUserAuthToken } from './serverApi.js';

// Free Fire accounts for sale ("Other Services"). The admin publishes
// listings through the server to siteConfig/ffAccounts; every visitor reads
// that copy live. Buying goes through /api/ff-accounts/buy (wallet payment).

export const FF_ACCOUNT_STATUSES = ['AVAILABLE', 'RESERVED', 'SOLD'];
const CACHE_KEY = 'mads_ff_accounts';

const asList = (v) => (Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []));

export const normalizeFfAccount = (id, raw) => {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    id,
    title: String(r.title || 'Free Fire account'),
    level: Number(r.level) || 0,
    rank: String(r.rank || ''),
    region: String(r.region || ''),
    loginType: String(r.loginType || ''),
    highlights: asList(r.highlights).map(String).filter(Boolean),
    description: String(r.description || ''),
    images: asList(r.images).map(String).filter(Boolean),
    priceLkr: Number(r.priceLkr) || 0,
    oldPriceLkr: Number(r.oldPriceLkr) || 0,
    status: FF_ACCOUNT_STATUSES.includes(r.status) ? r.status : 'AVAILABLE',
    featured: Boolean(r.featured),
    createdAt: String(r.createdAt || ''),
    soldAt: String(r.soldAt || ''),
  };
};

// Available first, then featured, then newest.
const STATUS_ORDER = { AVAILABLE: 0, RESERVED: 1, SOLD: 2 };
export const sortFfAccounts = (list) => [...list].sort((a, b) =>
  (STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
  || (Number(b.featured) - Number(a.featured))
  || String(b.createdAt).localeCompare(String(a.createdAt)));

const normalizeAll = (raw) => sortFfAccounts(
  Object.entries(raw && typeof raw === 'object' ? raw : {})
    .filter(([, v]) => v && typeof v === 'object')
    .map(([id, v]) => normalizeFfAccount(id, v))
);

export const subscribeFfAccounts = (callback) => {
  if (typeof callback !== 'function') return () => {};
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) callback(normalizeAll(JSON.parse(cached)));
  } catch { /* no cache */ }
  if (!rtdb) return () => {};
  try {
    return rtdbOnValue(dbRef(rtdb, 'siteConfig/ffAccounts'), (snap) => {
      const raw = snap.exists() ? snap.val() : {};
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(raw)); } catch { /* storage full */ }
      callback(normalizeAll(raw));
    }, () => {});
  } catch {
    return () => {};
  }
};

// Admin (needs the admin session cookie).
export const saveFfAccount = async (listing) => {
  const { ok, data } = await postServerApi('/api/admin/ff-accounts', { action: 'save', listing });
  return ok ? { success: true, id: data?.id } : { success: false, error: data?.error || 'Could not save the listing.' };
};

export const deleteFfAccount = async (id) => {
  const { ok, data } = await postServerApi('/api/admin/ff-accounts', { action: 'delete', id });
  return ok ? { success: true } : { success: false, error: data?.error || 'Could not remove the listing.' };
};

// Admin: private buyer records, keyed by order id.
export const fetchFfAccountSales = async () => {
  const { ok, data } = await getServerApi('/api/admin/data/ffSales');
  return ok && data?.data && typeof data.data === 'object' ? Object.values(data.data) : [];
};

// Customer: pay for a listing from the MADS wallet.
export const buyFfAccount = async (id) => {
  const token = await getUserAuthToken();
  if (!token) return { success: false, error: 'Please log in to buy an account.' };
  const { ok, data } = await postServerApi('/api/ff-accounts/buy', { id }, token);
  return ok && data?.success ? { success: true, ...data } : { success: false, error: data?.error || 'Could not complete the purchase. Please try again.' };
};
