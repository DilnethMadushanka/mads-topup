// Server-only helpers for MooGold eVoucher products (category 2), such as
// Garena Shells: the order returns a PIN code instead of crediting a player
// account. PIN codes are as good as cash, so they are kept out of the public
// `orders` / `moogoldProcessedOrders` nodes and stored under the private
// `userVouchers/{uid}/{partnerOrderId}` node, readable only by the server.
import crypto from 'crypto';
import { rtdbGet, rtdbPut } from './rtdbAdmin.js';

const MOOGOLD_BASE_URL = 'https://moogold.com/wp-json/v1/api';

// Signed POST to MooGold. payload is the full request body including `path`.
export async function moogoldRequest(apiPath, payload, timeoutMs = 8000) {
  const partnerId = process.env.MOONGOLD_PARTNER_ID || process.env.VITE_MOONGOLD_PARTNER_ID || '';
  const secretKey = process.env.MOONGOLD_SECRET_KEY || process.env.VITE_MOONGOLD_SECRET_KEY || '';
  const payloadStr = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const authSignature = crypto.createHmac('sha256', secretKey).update(payloadStr + timestamp + apiPath).digest('hex');
  const basicAuth = 'Basic ' + Buffer.from(`${partnerId}:${secretKey}`).toString('base64');

  const res = await fetch(`${MOOGOLD_BASE_URL}/${apiPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': basicAuth,
      'auth': authSignature,
      'timestamp': timestamp.toString(),
      'User-Agent': 'Mozilla/5.0'
    },
    body: payloadStr,
    signal: AbortSignal.timeout(timeoutMs)
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) {}
  return { ok: res.ok, status: res.status, json, text };
}

// Pulls every voucher code out of an order_detail response. MooGold sends
// voucher_code per item, either as a string or as an array of strings.
export function extractVoucherCodes(detail) {
  const items = Array.isArray(detail?.item) ? detail.item : (Array.isArray(detail?.items) ? detail.items : []);
  const codes = [];
  for (const item of items) {
    const raw = item?.voucher_code;
    const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    for (const c of list) {
      const s = String(c || '').trim();
      if (s) codes.push(s);
    }
  }
  return codes;
}

// Strips voucher codes from a MooGold response before it is stored anywhere
// public or logged.
export function redactVoucherCodes(value) {
  if (Array.isArray(value)) return value.map(redactVoucherCodes);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === 'voucher_code' ? '[redacted]' : redactVoucherCodes(v);
    }
    return out;
  }
  return value;
}

const FAILED_STATUSES = ['refunded', 'cancelled', 'canceled', 'failed', 'incorrect-details'];

// Asks MooGold for the order's voucher codes, retrying while the order is
// still processing. Returns { codes, status }.
export async function fetchVoucherCodes(moogoldOrderId, { attempts = 4, delayMs = 2500 } = {}) {
  let status = '';
  if (!moogoldOrderId) return { codes: [], status };
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, delayMs));
    try {
      const { json } = await moogoldRequest('order/order_detail', { path: 'order/order_detail', order_id: Number(moogoldOrderId) || String(moogoldOrderId) }, 6000);
      status = String(json?.order_status || json?.status || '').toLowerCase();
      const codes = extractVoucherCodes(json);
      if (codes.length) return { codes, status };
      if (FAILED_STATUSES.includes(status)) return { codes: [], status };
    } catch (e) {
      console.warn(`[MooGold Voucher] order_detail ${moogoldOrderId} failed:`, e.message);
    }
  }
  return { codes: [], status };
}

const safeKey = (v) => String(v || '').replace(/[.#$\[\]\/]/g, '_').slice(0, 120);

export async function saveUserVoucher(uid, partnerOrderId, record) {
  if (!uid || !partnerOrderId) return;
  try {
    await rtdbPut(`userVouchers/${safeKey(uid)}/${safeKey(partnerOrderId)}`, record);
  } catch (e) {
    console.error('[MooGold Voucher] save failed:', e.message);
  }
}

// Returns the user's voucher orders, newest first. Any order whose codes
// weren't ready at purchase time is looked up again (a few per call).
export async function listUserVouchers(uid) {
  if (!uid) return [];
  const map = (await rtdbGet(`userVouchers/${safeKey(uid)}`).catch(() => null)) || {};
  const entries = Object.entries(map).map(([key, v]) => ({ key, ...(v || {}) }));
  let refetched = 0;
  for (const entry of entries) {
    if ((entry.codes || []).length || !entry.moogoldOrderId || refetched >= 3) continue;
    if (FAILED_STATUSES.includes(entry.moogoldStatus)) continue;
    refetched++;
    const { codes, status } = await fetchVoucherCodes(entry.moogoldOrderId, { attempts: 1 });
    entry.moogoldStatus = status || entry.moogoldStatus || '';
    if (codes.length) entry.codes = codes;
    const { key, ...record } = entry;
    await saveUserVoucher(uid, key, record);
  }
  return entries
    .map(({ key, ...rest }) => ({ partnerOrderId: key, ...rest }))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

// The catalog package (and its game) for a MooGold product id.
export function findCatalogPackage(gamesData, productId) {
  const id = String(productId || '');
  if (!id) return { game: null, pkg: null };
  for (const game of gamesData) {
    const pkg = (game.packages || []).find(p => String(p.moongoldProductId) === id);
    if (pkg) return { game, pkg };
  }
  return { game: null, pkg: null };
}

export const isVoucherGame = (game) => game?.fulfilment === 'voucher';
