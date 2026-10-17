import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWalletHistory } from '../lib/walletHistory.js';

const who = { uid: 'u1', email: 'Me@x.com', keys: ['k-old'] };
const nodes = {
  payments: {
    a: { id: 'PAY-1', userId: 'u1', method: 'EZ Cash', referenceNumber: 'RN 1', amount: 1000, creditedLkr: 1020, currency: 'LKR', status: 'VERIFIED', timestamp: '2026-10-01T10:00:00Z' },
    b: { id: 'PAY-2', userEmail: 'me@x.com', method: 'Bank', amount: 500, currency: 'LKR', status: 'PENDING', createdAt: '2026-10-02 09:00' },
    c: { id: 'PAY-3', userId: 'someone', amount: 9999, currency: 'LKR', status: 'VERIFIED' },
    d: { id: 'PAY-4', userId: 'u1', method: 'Binance', amount: 5, currency: 'USDT', status: 'REJECTED', rejectReason: 'Wrong id', timestamp: '2026-10-03T00:00:00Z' },
  },
  orders: {
    'SRV-1': { id: 'SRV-1', source: 'server', userId: 'u1', gameName: 'MLBB', packageName: '86 Diamonds', priceLkr: 450, status: 'COMPLETED', paymentMethod: 'MADS Wallet Balance', createdAt: '2026-10-04T00:00:00Z' },
    'ORD-1': { id: 'ORD-1', userId: 'u1', gameName: 'MLBB', priceLkr: 450, status: 'COMPLETED', createdAt: '2026-10-04T00:00:01Z' },
    'SRV-2': { id: 'SRV-2', source: 'server', userId: 'u1', gameName: 'PUBG', packageName: '60 UC', priceLkr: 300, status: 'FAILED', createdAt: '2026-10-05T00:00:00Z' },
  },
  adminLog: { x: { id: 'x', key: 'k-old', mode: 'add', before: { lkr: 100, usdt: 0 }, after: { lkr: 300, usdt: 0 }, reason: 'Sorry for the delay', at: '2026-10-06T00:00:00Z' } },
  vouchersLog: { 1791000000000: { userId: 'u1', voucherCode: 'GIFT1', value: 250, currency: 'LKR', redeemedAt: '2026-10-07T00:00:00Z' } },
  referrals: { 1791000000001: { referrerUid: 'u1', cashbackLkr: 15, creditedAt: '2026-10-08T00:00:00Z' } },
};

test('only this customer\'s money moves, newest first', () => {
  const h = buildWalletHistory(who, nodes);
  assert.deepEqual(h.entries.map(e => e.id), ['ref-1791000000001', 'vch-1791000000000', 'adm-x', 'ord-SRV-2', 'ord-SRV-1', 'dep-PAY-4', 'dep-PAY-2', 'dep-PAY-1']);
  const byId = Object.fromEntries(h.entries.map(e => [e.id, e]));
  assert.equal(byId['dep-PAY-1'].lkr, 1020);          // with the bonus that was credited
  assert.equal(byId['dep-PAY-2'].status, 'pending');
  assert.equal(byId['dep-PAY-4'].usdt, 5);
  assert.equal(byId['dep-PAY-4'].note, 'Wrong id');
  assert.equal(byId['ord-SRV-1'].lkr, -450);
  assert.equal(byId['ord-SRV-2'].lkr, 0);             // failed and refunded
  assert.equal(byId['adm-x'].lkr, 200);
  assert.equal(h.totals.inLkr, 1020 + 200 + 250 + 15);
  assert.equal(h.totals.outLkr, 450);
  assert.equal(h.totals.pending, 1);
});

test('nothing for a stranger, and bad records are ignored', () => {
  const h = buildWalletHistory({ uid: 'nobody', email: '' }, { ...nodes, payments: { ...nodes.payments, bad: null, worse: 'x' } });
  assert.equal(h.entries.length, 0);
  assert.equal(buildWalletHistory(who, {}).entries.length, 0);
});

test('limit keeps the newest', () => {
  const h = buildWalletHistory(who, nodes, { limit: 2 });
  assert.equal(h.entries.length, 2);
  assert.equal(h.total, 8);
});
