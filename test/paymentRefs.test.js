import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paymentRefKey, phoneTail, phonesInSms } from '../lib/paymentRefs.js';

test('the same EZ Cash RN gives the same key however it was typed', () => {
  assert.equal(paymentRefKey('EZ Cash', '12345678901234'), 'ezcash_12345678901234');
  assert.equal(paymentRefKey('ez cash', 'RN: 1234 5678 9012 34'), 'ezcash_12345678901234');
});

test('a too-short EZ Cash RN gives no key', () => {
  assert.equal(paymentRefKey('EZ Cash', '12345'), null);
});

test('Binance uses only the order id, not the Pay ID', () => {
  const a = paymentRefKey('Binance Pay', 'Order: 3456789012345 | PayID: 111');
  const b = paymentRefKey('Binance Pay', 'order 3456789012345 | PayID: 999');
  assert.equal(a, 'binance_3456789012345');
  assert.equal(a, b);
});

test('other methods have no reference key', () => {
  assert.equal(paymentRefKey('Bank Transfer', '12345678901234'), null);
});

test('phone numbers match in every Sri Lankan format', () => {
  assert.equal(phoneTail('0771234567'), '771234567');
  assert.equal(phoneTail('+94 77 123 4567'), '771234567');
  assert.equal(phoneTail('12'), '');
});

test('the payer number is read from the SMS and the store number is left out', () => {
  const sms = 'You have received Rs. 1,000.00 from 0771234567 to 0740436276. RN: 12345678901234';
  assert.deepEqual(phonesInSms(sms, phoneTail('0740436276')), ['771234567']);
});
