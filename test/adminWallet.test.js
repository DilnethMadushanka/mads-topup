import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWalletChange, applyWalletChange } from '../lib/adminWallet.js';

test('add, deduct and set', () => {
  const wallet = { walletBalance: 1000, walletUsdt: 2 };
  assert.deepEqual(applyWalletChange(wallet, parseWalletChange({ mode: 'add', lkr: 500 })).after, { lkr: 1500, usdt: 2 });
  assert.deepEqual(applyWalletChange(wallet, parseWalletChange({ mode: 'deduct', lkr: 250, usdt: 1 })).after, { lkr: 750, usdt: 1 });
  assert.deepEqual(applyWalletChange(wallet, parseWalletChange({ mode: 'set', lkr: 0, usdt: 0 })).after, { lkr: 0, usdt: 0 });
});

test('a deduction larger than the wallet is refused, not cut to zero', () => {
  const r = applyWalletChange({ walletBalance: 100 }, parseWalletChange({ mode: 'deduct', lkr: 500 }));
  assert.ok(r.error);
  assert.equal(r.after, undefined);
});

test('the old "credit" mode still works, negative amounts mean deduct', () => {
  assert.deepEqual(parseWalletChange({ mode: 'credit', lkr: 300 }), { mode: 'add', lkr: 300, usdt: 0 });
  assert.deepEqual(parseWalletChange({ mode: 'credit', lkr: -300 }), { mode: 'deduct', lkr: 300, usdt: 0 });
  assert.ok(parseWalletChange({ mode: 'credit', lkr: -300, usdt: 5 }).error);
});

test('bad input is refused', () => {
  assert.ok(parseWalletChange({ mode: 'add' }).error);
  assert.ok(parseWalletChange({ mode: 'add', lkr: 'abc' }).error);
  assert.ok(parseWalletChange({ mode: 'add', lkr: -5 }).error);
  assert.ok(parseWalletChange({ mode: 'add', lkr: 5000000 }).error);
  assert.ok(parseWalletChange({ mode: 'wipe', lkr: 5 }).error);
});
