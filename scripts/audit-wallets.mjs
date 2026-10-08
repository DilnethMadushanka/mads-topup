// Read-only wallet audit. Run on the server from the project folder:
//   node scripts/audit-wallets.mjs
//
// It never writes to the database. For every account it compares the wallet
// balance with the money the database can explain:
//   credits = approved deposits (manual_payments VERIFIED, incl. launch bonus)
//           + vouchers_log + referrals_cashback
//   spends  = wallet orders the server processed (moogoldProcessedOrders)
//           + wallet orders without a server record (older orders, Telegram bot)
// Admin "Top Up" / wallet adjustments are not stored in the database, so an
// account the admin topped up by hand will show that amount as unexplained.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { rtdbGet } = await import('../lib/rtdbAdmin.js');

const MIN_UNEXPLAINED_LKR = Number(process.argv[2]) || 1000;
const lkr = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
const num = (v) => Number(v) || 0;
const lower = (v) => String(v || '').trim().toLowerCase();
const entries = (obj) => (obj && typeof obj === 'object' ? Object.entries(obj) : []);

const [users, payments, vouchers, referrals, processed, orders, apps] = await Promise.all(
  ['users', 'manual_payments', 'vouchers_log', 'referrals_cashback', 'moogoldProcessedOrders', 'orders', 'reseller_applications']
    .map(p => rtdbGet(p).catch(e => { console.error(`Could not read ${p}: ${e.message}`); return null; }))
);
if (!users) {
  console.error('No users could be read. Is FIREBASE_DB_SECRET set in .env?');
  process.exit(1);
}

// Map any identifier (record key, uid field, email, reseller code) to its account key.
const accounts = new Map();
const keyOf = new Map();
for (const [key, u] of entries(users)) {
  if (!u || typeof u !== 'object') continue;
  accounts.set(key, { key, u, credits: 0, spends: 0, creditItems: 0, spendItems: 0 });
  for (const id of [key, u.uid, lower(u.email), u.resellerCode, u.securityKey]) {
    if (id && !keyOf.has(id)) keyOf.set(id, key);
  }
}
const find = (...ids) => {
  for (const id of ids) {
    if (!id) continue;
    const k = keyOf.get(id) || keyOf.get(lower(id));
    if (k) return accounts.get(k);
  }
  return null;
};

const launchBonus = (amt) => (amt >= 20000 ? 600 : amt >= 10000 ? 250 : amt >= 5000 ? 100 : 0);
const bigPayments = [];
for (const [id, p] of entries(payments)) {
  if (!p || p.status !== 'VERIFIED' || p.currency === 'USDT') continue;
  const amt = num(p.amount);
  const isGenie = String(p.id || id).startsWith('PAY-GENIE-');
  const credited = amt + (isGenie ? 0 : launchBonus(amt));
  const acc = find(p.userId, p.userEmail, p.resellerCode);
  if (acc) { acc.credits += credited; acc.creditItems++; }
  if (amt >= 5000 && !isGenie) bigPayments.push({ id: p.id || id, acc, amt, method: p.method, ref: p.referenceNumber, date: p.createdAt });
}
for (const [, v] of entries(vouchers)) {
  if (!v || v.currency === 'USDT') continue;
  const acc = find(v.userId, v.userEmail);
  if (acc) { acc.credits += num(v.value); acc.creditItems++; }
}
for (const [, r] of entries(referrals)) {
  const acc = find(r?.referrerUid, r?.referrerEmail);
  if (acc) { acc.credits += num(r.cashbackLkr); acc.creditItems++; }
}

const SPENT = ['COMPLETED', 'PROCESSING'];
for (const [, rec] of entries(processed)) {
  if (!rec || !SPENT.includes(rec.status)) continue;
  const acc = find(rec.uid);
  if (acc) { acc.spends += num(rec.priceLkr); acc.spendItems++; }
}
const fakeCompleted = [];
for (const [id, o] of entries(orders)) {
  if (!o || typeof o !== 'object') continue;
  const isWallet = /wallet/i.test(String(o.paymentMethod || ''));
  const server = o.partnerOrderId ? processed?.[o.partnerOrderId] : null;
  if (o.status === 'COMPLETED' && isWallet && o.partnerOrderId && (!server || !SPENT.includes(server.status))) {
    fakeCompleted.push({ id: o.id || id, acc: find(o.userId, o.userEmail), price: o.priceLkr, date: o.createdAt || o.timestamp });
  }
  if (!isWallet || !SPENT.includes(o.status) || o.partnerOrderId) continue;
  const acc = find(o.userId, o.userEmail);
  if (acc) { acc.spends += num(o.priceLkr); acc.spendItems++; }
}

const who = (acc) => acc ? `${acc.key}  (${acc.u.name || acc.u.username || 'no name'})` : '(account not found)';
const line = () => console.log('-'.repeat(78));

console.log(`\nMADS TOPUP WALLET AUDIT  ${new Date().toISOString()}`);
console.log(`Accounts: ${accounts.size}   Total LKR in wallets: ${lkr([...accounts.values()].reduce((s, a) => s + num(a.u.walletBalance), 0))}`);

line();
console.log(`1. Balances higher than deposits minus spending by ${lkr(MIN_UNEXPLAINED_LKR)} or more`);
console.log('   (subtract any Top Up you gave by hand; what is left has no explanation)\n');
const flagged = [...accounts.values()]
  .map(a => ({ ...a, bal: num(a.u.walletBalance), extra: num(a.u.walletBalance) - (a.credits - a.spends) }))
  .filter(a => a.extra >= MIN_UNEXPLAINED_LKR)
  .sort((a, b) => b.extra - a.extra);
if (!flagged.length) console.log('   None.');
for (const a of flagged) {
  console.log(`   ${who(a)}${a.u.status === 'BLOCKED' ? '  [BLOCKED]' : ''}`);
  console.log(`      balance ${lkr(a.bal)} | deposits ${lkr(a.credits)} (${a.creditItems}) | spent ${lkr(a.spends)} (${a.spendItems}) | UNEXPLAINED ${lkr(a.extra)}`);
}

line();
console.log('2. Accounts with no email and no signup date (written straight into the database)\n');
const odd = [...accounts.values()].filter(a => !a.u.email && !a.u.createdAt && !a.u.joinedAt);
if (!odd.length) console.log('   None.');
for (const a of odd) console.log(`   ${who(a)}  balance ${lkr(a.u.walletBalance)}  status ${a.u.status || '-'}`);

line();
console.log('3. Reseller / admin accounts (check each one is someone you approved)\n');
const approvedApps = new Set(entries(apps).filter(([, x]) => x?.status === 'APPROVED')
  .flatMap(([, x]) => [x.userId, x.uid, lower(x.email), lower(x.userEmail)].filter(Boolean)));
const privileged = [...accounts.values()].filter(a => a.u.isReseller || a.u.resellerStatus === 'APPROVED' || /admin/i.test(String(a.u.role || '')));
if (!privileged.length) console.log('   None.');
for (const a of privileged) {
  const hasApp = [a.key, a.u.uid, lower(a.u.email)].some(id => id && approvedApps.has(id));
  console.log(`   ${who(a)}  role ${a.u.role || '-'}  code ${a.u.resellerCode || '-'}  balance ${lkr(a.u.walletBalance)}${hasApp ? '' : '  <- no approved application found'}`);
}

line();
console.log('4. Wallet orders marked COMPLETED that the server never completed\n');
if (!fakeCompleted.length) console.log('   None.');
for (const o of fakeCompleted.slice(-30)) console.log(`   ${o.id}  ${lkr(o.price)}  ${o.date || ''}  ${who(o.acc)}`);

line();
console.log('5. Approved bank / Binance deposits of Rs. 5,000+ (compare each with its slip)\n');
if (!bigPayments.length) console.log('   None.');
for (const p of bigPayments.sort((a, b) => b.amt - a.amt).slice(0, 40)) {
  console.log(`   ${p.id}  ${lkr(p.amt)}  ${p.method || ''}  ref ${p.ref || '-'}  ${p.date || ''}  ${who(p.acc)}`);
}
line();
console.log('Read-only: nothing was changed.\n');
