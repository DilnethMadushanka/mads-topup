import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderPriceRange } from '../lib/orderPrice.js';

test('a normal customer pays exactly the catalog price', () => {
  assert.deepEqual(orderPriceRange(450, 1), { min: 450, max: 450 });
  assert.deepEqual(orderPriceRange(450, 3), { min: 1350, max: 1350 });
});

test('a cheap package cannot be bought for less (old Rs. 100 allowance bug)', () => {
  const { min } = orderPriceRange(40, 1);
  assert.ok(1 < min, 'Rs. 1 must be refused');
  assert.equal(min, 40);
});

test('a reseller gets their tier discount and no more', () => {
  const { min, max } = orderPriceRange(1000, 2, 0.05);
  assert.equal(max, 2000);
  assert.equal(min, 1900);
  assert.ok(1800 < min, 'a 10% discount is refused for a 5% reseller');
});

test('reseller floor allows either rounding (per unit or on the total)', () => {
  // 333 * 0.95 = 316.35: per unit rounds to 316 (x3 = 948), total 999 * 0.95 = 949.05 -> 949.
  const { min } = orderPriceRange(333, 3, 0.05);
  assert.equal(min, 948);
});
