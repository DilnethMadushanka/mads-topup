import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeRtdb } from './fakeRtdb.js';
import { spendWallet, adjustWallet } from '../lib/rtdbAdmin.js';

test('spends LKR first when there is enough', async () => {
  const db = installFakeRtdb({ users: { u1: { walletBalance: 1000, walletUsdt: 5 } } });
  const r = await spendWallet('u1', 400);
  assert.equal(r.success, true);
  assert.equal(r.usedCurrency, 'LKR');
  assert.equal(db.data.users.u1.walletBalance, 600);
  assert.equal(db.data.users.u1.walletUsdt, 5);
});

test('falls back to USDT at 305 when LKR is short', async () => {
  const db = installFakeRtdb({ users: { u1: { walletBalance: 100, walletUsdt: 2 } } });
  const r = await spendWallet('u1', 305);
  assert.equal(r.success, true);
  assert.equal(r.usedCurrency, 'USDT');
  assert.equal(db.data.users.u1.walletBalance, 100);
  assert.equal(db.data.users.u1.walletUsdt, 1);
});

test('refuses when neither wallet covers the price, and writes nothing', async () => {
  const db = installFakeRtdb({ users: { u1: { walletBalance: 100, walletUsdt: 0.1 } } });
  const r = await spendWallet('u1', 500);
  assert.equal(r.success, false);
  assert.match(r.reason, /Insufficient/);
  assert.equal(db.writes, 0);
});

test('refuses a blocked account', async () => {
  const db = installFakeRtdb({ users: { u1: { walletBalance: 5000, status: 'BLOCKED' } } });
  const r = await spendWallet('u1', 100);
  assert.equal(r.success, false);
  assert.match(r.reason, /blocked/);
  assert.equal(db.data.users.u1.walletBalance, 5000);
});

test('refuses a wallet that does not exist', async () => {
  installFakeRtdb({ users: {} });
  const r = await spendWallet('nobody', 100);
  assert.equal(r.success, false);
});

test('a write that lands in between is retried, so the balance is never overspent', async () => {
  const db = installFakeRtdb({ users: { u1: { walletBalance: 500 } } });
  // Another order spends Rs. 300 between our read and our write.
  db.beforePut = () => { db.data.users.u1.walletBalance = 200; };
  const r = await spendWallet('u1', 400);
  assert.equal(r.success, false, 'only Rs. 200 is left after the other order');
  assert.equal(db.data.users.u1.walletBalance, 200);
});

test('two orders at once can only spend what is there', async () => {
  const db = installFakeRtdb({ users: { u1: { walletBalance: 500 } } });
  const results = await Promise.all([spendWallet('u1', 400), spendWallet('u1', 400)]);
  assert.equal(results.filter(r => r.success).length, 1);
  assert.equal(db.data.users.u1.walletBalance, 100);
});

test('refund adds back to the wallet', async () => {
  const db = installFakeRtdb({ users: { u1: { walletBalance: 50.1 } } });
  const r = await adjustWallet('u1', 99.95);
  assert.equal(r.newBalanceLkr, 150.05);
  assert.equal(db.data.users.u1.walletBalance, 150.05);
});

test('a deduction never takes the wallet below zero', async () => {
  installFakeRtdb({ users: { u1: { walletBalance: 100, walletUsdt: 1 } } });
  const r = await adjustWallet('u1', -250, -3);
  assert.equal(r.newBalanceLkr, 0);
  assert.equal(r.newBalanceUsdt, 0);
});
