// Admin wallet changes (Wallet Credit tab and the customer sheet). Pure
// helpers so the rules can be tested; server.js does the database work.

const round2 = (n) => Math.round(n * 100) / 100;
const round6 = (n) => Math.round(n * 1e6) / 1e6;

export const ADMIN_WALLET_LIMITS = { lkr: 1000000, usdt: 10000 };

// Checks the request. Returns { mode, lkr, usdt } or { error }.
// mode: 'add' (amounts added), 'deduct' (amounts taken off) or 'set'.
export function parseWalletChange(body) {
  const mode = ['add', 'deduct', 'set'].includes(body?.mode) ? body.mode
    : body?.mode === 'credit' ? 'add' : null;
  if (!mode) return { error: 'Choose add, deduct or set.' };
  const num = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));
  let lkr = num(body.lkr);
  let usdt = num(body.usdt);
  if (!Number.isFinite(lkr) || !Number.isFinite(usdt)) return { error: 'Enter valid amounts.' };
  // The old "credit" mode sent negative amounts to deduct.
  if (body?.mode === 'credit' && (lkr < 0 || usdt < 0)) {
    if (lkr > 0 || usdt > 0) return { error: 'Add and deduct in separate changes.' };
    return parseWalletChange({ mode: 'deduct', lkr: Math.abs(lkr), usdt: Math.abs(usdt) });
  }
  if (lkr < 0 || usdt < 0) return { error: 'Amounts can not be negative.' };
  if (lkr > ADMIN_WALLET_LIMITS.lkr || usdt > ADMIN_WALLET_LIMITS.usdt) return { error: 'That amount is too large.' };
  if (mode !== 'set' && lkr === 0 && usdt === 0) return { error: 'Enter an amount.' };
  return { mode, lkr: round2(lkr), usdt: round6(usdt) };
}

// The wallet after the change, or { error } when a deduction would take it
// below zero (the old code silently stopped at zero).
export function applyWalletChange(current, change) {
  const before = {
    lkr: round2(parseFloat(current?.walletBalance) || 0),
    usdt: round6(parseFloat(current?.walletUsdt) || 0),
  };
  let after;
  if (change.mode === 'set') after = { lkr: change.lkr, usdt: change.usdt };
  else if (change.mode === 'add') after = { lkr: round2(before.lkr + change.lkr), usdt: round6(before.usdt + change.usdt) };
  else after = { lkr: round2(before.lkr - change.lkr), usdt: round6(before.usdt - change.usdt) };
  if (after.lkr < 0 || after.usdt < 0) {
    return { error: `Not enough balance to deduct that. The wallet has Rs. ${before.lkr.toLocaleString('en-US')} / $${before.usdt}.`, before };
  }
  return { before, after };
}
