// Promo voucher list rules (settings/vouchers). The admin panel changes one
// voucher at a time through these, so a change can never reset another
// voucher's usage, and a voucher's own usage (usedCount / usedByUsers) is
// only ever changed by a redemption.

export const VOUCHER_CODE_RE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
const MAX_VALUE = { LKR: 100000, USDT: 500 };

const asList = (current) => (Array.isArray(current) ? current : current && typeof current === 'object' ? Object.values(current) : [])
  .filter(v => v && typeof v === 'object' && v.code);

export const sameCode = (a, b) => String(a || '').trim().toUpperCase() === String(b || '').trim().toUpperCase();

// 'active' | 'paused' | 'used_up' | 'expired'
export function voucherState(v, now = Date.now()) {
  if (v?.maxUses && (Number(v.usedCount) || 0) >= Number(v.maxUses)) return 'used_up';
  const exp = v?.expiresAt ? Date.parse(v.expiresAt) : NaN;
  if (!Number.isNaN(exp) && exp <= now) return 'expired';
  return v?.active === false ? 'paused' : 'active';
}

// Checks admin input. Returns { voucher } or { error }. Only the fields the
// admin may set are returned.
export function cleanVoucherInput(body, { partial = false } = {}) {
  const out = {};
  const code = String(body?.code || '').trim().toUpperCase();
  if (!VOUCHER_CODE_RE.test(code)) return { error: 'Codes are 3–32 letters, numbers, - or _.' };
  out.code = code;
  if (!partial || body.currency !== undefined) {
    if (!['LKR', 'USDT'].includes(body?.currency)) return { error: 'Choose LKR or USDT.' };
    out.currency = body.currency;
  }
  if (!partial || body.value !== undefined) {
    const value = Math.round(Number(body?.value) * 100) / 100;
    const cur = out.currency || 'LKR';
    if (!(value > 0) || value > MAX_VALUE[cur]) return { error: `Value must be between 0 and ${MAX_VALUE[cur].toLocaleString('en-US')} ${cur}.` };
    out.value = value;
  }
  if (!partial || body.maxUses !== undefined) {
    const maxUses = Number(body?.maxUses);
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100000) return { error: 'Max uses must be a whole number from 1 to 100,000.' };
    out.maxUses = maxUses;
  }
  if (body?.active !== undefined) out.active = Boolean(body.active);
  if (body?.expiresAt !== undefined) {
    if (body.expiresAt === null || body.expiresAt === '') out.expiresAt = null;
    else {
      const t = Date.parse(body.expiresAt);
      if (Number.isNaN(t)) return { error: 'Invalid expiry date.' };
      out.expiresAt = new Date(t).toISOString();
    }
  }
  if (body?.note !== undefined) out.note = String(body.note || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120) || null;
  return { voucher: out };
}

// New list with one voucher created. Refuses a code that already exists.
export function createVoucher(current, input, now = new Date().toISOString()) {
  const list = asList(current);
  if (list.some(v => sameCode(v.code, input.code))) return { error: `The code ${input.code} already exists.` };
  const voucher = { active: true, expiresAt: null, note: null, ...input, usedCount: 0, usedByUsers: [], createdAt: now };
  return { list: [voucher, ...list], voucher };
}

// New list with one voucher's settings changed; its usage is kept.
export function updateVoucher(current, input, now = new Date().toISOString()) {
  const list = asList(current);
  const idx = list.findIndex(v => sameCode(v.code, input.code));
  if (idx === -1) return { error: 'Voucher not found.' };
  const { code, ...changes } = input;
  const prev = list[idx];
  const next = { ...prev, ...changes, usedCount: prev.usedCount || 0, usedByUsers: prev.usedByUsers || [], updatedAt: now };
  if (next.maxUses && next.maxUses < (next.usedCount || 0)) return { error: `It has already been used ${next.usedCount} times.` };
  const out = list.slice();
  out[idx] = next;
  return { list: out, voucher: next };
}

export function deleteVoucher(current, code) {
  const list = asList(current);
  const out = list.filter(v => !sameCode(v.code, code));
  if (out.length === list.length) return { error: 'Voucher not found.' };
  return { list: out };
}
