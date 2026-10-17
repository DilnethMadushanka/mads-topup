import { test } from 'node:test';
import assert from 'node:assert/strict';
import { depositBonusLkr, depositCredit, depositKind, newDepositId } from '../src/data/depositRules.js';
import { paymentRefKey } from '../lib/paymentRefs.js';

test('deposit bonus tiers', () => {
  assert.equal(depositBonusLkr(4999), 0);
  assert.equal(depositBonusLkr(5000), 100);
  assert.equal(depositBonusLkr(10000), 250);
  assert.equal(depositBonusLkr(20000), 600);
});

test('an approval credits LKR with the bonus and USDT without it', () => {
  assert.deepEqual(depositCredit({ amount: 5000, currency: 'LKR' }), { lkr: 5100, usdt: 0, bonusLkr: 100 });
  assert.deepEqual(depositCredit({ amount: 25, currency: 'USDT' }), { lkr: 0, usdt: 25, bonusLkr: 0 });
});

test('a Genie card payment is not mistaken for EZ Cash', () => {
  assert.equal(depositKind('Online Card / eZ Cash'), 'card');
  assert.equal(depositKind('Card Payment (Top-up Order)'), 'card');
  assert.equal(depositKind('EZ Cash'), 'ezcash');
  assert.equal(depositKind('EZ Cash (Automated)'), 'ezcash');
  assert.equal(depositKind('Binance Pay (Automated)'), 'binance');
  assert.equal(depositKind('Bank Deposit'), 'bank');
  assert.equal(depositKind('Bank Slip'), 'bank');
  assert.equal(depositKind('🎁 Recharge Bonus'), 'bonus');
});

test('card payments have no EZ Cash reference key', () => {
  assert.equal(paymentRefKey('Online Card / eZ Cash', 'Txn: 1234567890123456'), null);
});

test('new deposit ids do not repeat', () => {
  const ids = new Set(Array.from({ length: 2000 }, () => newDepositId()));
  assert.equal(ids.size, 2000);
  assert.match(newDepositId('PAY-ADM'), /^PAY-ADM-[A-Z0-9]+$/);
});
