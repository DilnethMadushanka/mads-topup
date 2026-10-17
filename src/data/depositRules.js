// Deposit rules shared by the server (which credits wallets) and the admin
// Deposit Desk (which shows what an approval will credit). Change them here
// and both stay in step.

// Bonus added when the admin approves an LKR bank / EZ Cash deposit.
export const depositBonusLkr = (amount) => {
  const amt = Number(amount) || 0;
  return amt >= 20000 ? 600 : amt >= 10000 ? 250 : amt >= 5000 ? 100 : 0;
};

// What an approval credits: LKR deposits get the bonus, USDT deposits don't.
export const depositCredit = (pay) => {
  const amount = Number(pay?.amount) || 0;
  if (pay?.currency === 'USDT') return { lkr: 0, usdt: amount, bonusLkr: 0 };
  const bonusLkr = depositBonusLkr(amount);
  return { lkr: amount + bonusLkr, usdt: 0, bonusLkr };
};

// The kind of payment behind a deposit record. Methods are free text, so card
// payments are checked first: "Online Card / eZ Cash" is a Genie card payment,
// not an EZ Cash transfer.
export const depositKind = (method) => {
  const m = String(method || '').toLowerCase();
  if (m.includes('bonus')) return 'bonus';
  if (m.includes('card') || m.includes('genie')) return 'card';
  if (m.includes('ez')) return 'ezcash';
  if (m.includes('binance')) return 'binance';
  if (m.includes('bank') || m.includes('slip')) return 'bank';
  return 'other';
};

// A deposit id that won't clash with another one. The database refuses to
// overwrite an existing deposit, so a clash used to drop the new one silently.
const ID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const newDepositId = (prefix = 'PAY') => {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  const rand = Array.from(bytes, b => ID_CHARS[b % 36]).join('');
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${rand}`;
};
