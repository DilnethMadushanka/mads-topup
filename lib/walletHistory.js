// A customer's wallet history, built on the server from the records that
// actually move money: deposits (manual_payments), orders paid from the
// wallet (orders written by the server), admin changes (adminWalletLog),
// gift vouchers (vouchers_log) and referral cashback (referrals_cashback).
// It used to be only the deposits this browser had sent, kept in
// localStorage, so a new phone or a cleared browser showed nothing.

const lower = (v) => String(v || '').trim().toLowerCase();
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const round2 = (n) => Math.round(n * 100) / 100;
const iso = (...vals) => {
  for (const v of vals) {
    if (!v) continue;
    const t = typeof v === 'number' ? v : Date.parse(String(v).length === 16 ? `${String(v).replace(' ', 'T')}:00Z` : v);
    if (Number.isFinite(t)) return new Date(t).toISOString();
  }
  return '';
};
const list = (node) => (node && typeof node === 'object' ? Object.entries(node).filter(([, v]) => v && typeof v === 'object') : []);

// who: { uid, email, keys: [user record keys] }
// Entry: { id, at, kind: 'deposit'|'order'|'refund'|'admin'|'voucher'|'referral',
//          title, detail, lkr, usdt, status: 'done'|'pending'|'rejected'|'failed' }
export function buildWalletHistory(who, nodes, { limit = 100 } = {}) {
  const uid = String(who?.uid || '');
  const email = lower(who?.email);
  const keys = new Set([uid, ...(who?.keys || [])].filter(Boolean));
  const mine = (id, mail) => (id && keys.has(String(id))) || (email && lower(mail) === email);
  const out = [];

  for (const [key, p] of list(nodes.payments)) {
    if (!mine(p.userId, p.userEmail)) continue;
    const status = p.status === 'VERIFIED' ? 'done' : p.status === 'REJECTED' ? 'rejected' : 'pending';
    const usdt = p.currency === 'USDT' || p.currency === 'USD';
    // A credited deposit shows what reached the wallet (with any bonus).
    const amount = (status === 'done' && num(usdt ? p.creditedUsdt : p.creditedLkr)) || num(p.amount);
    out.push({
      id: `dep-${p.id || key}`,
      at: iso(p.timestamp, p.creditedAt, p.createdAt),
      kind: 'deposit',
      title: p.purpose === 'ORDER' ? 'Card payment for an order' : 'Deposit',
      detail: [p.method, p.referenceNumber].filter(Boolean).join(' · '),
      lkr: usdt ? 0 : round2(amount),
      usdt: usdt ? round2(amount) : 0,
      status,
      note: status === 'rejected' ? (p.rejectReason || '') : '',
    });
  }

  for (const [key, o] of list(nodes.orders)) {
    // Only the server's own order records: they are written when the wallet
    // is really charged (the browser's copy of the same order is skipped).
    if (o.source !== 'server' || !mine(o.userId, o.userEmail)) continue;
    const failed = o.status !== 'COMPLETED';
    out.push({
      id: `ord-${o.id || key}`,
      at: iso(o.createdAt),
      kind: failed ? 'refund' : 'order',
      title: `${o.gameName || 'Top-up'} · ${o.packageName || ''}`.replace(/ · $/, ''),
      detail: failed ? 'Order failed, the money went back to your wallet' : (o.paymentMethod || 'MADS Wallet'),
      lkr: failed ? 0 : -round2(num(o.priceLkr)),
      usdt: 0,
      // A failed order moved no money; the price is shown crossed out.
      ...(failed ? { shownLkr: -round2(num(o.priceLkr)) } : {}),
      status: failed ? 'failed' : 'done',
    });
  }

  for (const [key, a] of list(nodes.adminLog)) {
    if (!mine(a.key, a.email)) continue;
    const dl = round2(num(a.after?.lkr) - num(a.before?.lkr));
    const du = round2(num(a.after?.usdt) - num(a.before?.usdt));
    if (!dl && !du) continue;
    out.push({
      id: `adm-${a.id || key}`,
      at: iso(a.at),
      kind: 'admin',
      title: dl + du >= 0 ? 'Added by MADS support' : 'Removed by MADS support',
      detail: a.reason || '',
      lkr: dl,
      usdt: du,
      status: 'done',
    });
  }

  for (const [key, v] of list(nodes.vouchersLog)) {
    if (!mine(v.userId, v.userEmail)) continue;
    const usdt = v.currency === 'USDT';
    out.push({
      id: `vch-${key}`,
      at: iso(v.redeemedAt, num(key) || undefined),
      kind: 'voucher',
      title: 'Gift voucher',
      detail: v.voucherCode || '',
      lkr: usdt ? 0 : round2(num(v.value)),
      usdt: usdt ? round2(num(v.value)) : 0,
      status: 'done',
    });
  }

  for (const [key, r] of list(nodes.referrals)) {
    if (!mine(r.referrerUid, r.referrerEmail)) continue;
    out.push({
      id: `ref-${key}`,
      at: iso(r.creditedAt, num(key) || undefined),
      kind: 'referral',
      title: 'Referral cashback',
      detail: 'A friend you invited made their first order',
      lkr: round2(num(r.cashbackLkr)),
      usdt: 0,
      status: 'done',
    });
  }

  out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const done = out.filter(e => e.status === 'done');
  return {
    entries: out.slice(0, limit),
    total: out.length,
    totals: {
      inLkr: round2(done.filter(e => e.lkr > 0).reduce((s, e) => s + e.lkr, 0)),
      outLkr: round2(-done.filter(e => e.lkr < 0).reduce((s, e) => s + e.lkr, 0)),
      pending: out.filter(e => e.status === 'pending').length,
    },
  };
}
