import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanVoucherInput, createVoucher, updateVoucher, deleteVoucher, voucherState } from '../lib/vouchers.js';

const used = { code: 'WELCOME100', value: 100, currency: 'LKR', maxUses: 50, usedCount: 12, usedByUsers: ['u1', 'a@x.com'], active: true };

test('changing one voucher never resets its usage or touches others', () => {
  const other = { code: 'OTHER', value: 5, currency: 'USDT', maxUses: 10, usedCount: 3, usedByUsers: ['u9'], active: true };
  const { voucher: input } = cleanVoucherInput({ code: 'welcome100', active: false, maxUses: 60 }, { partial: true });
  const r = updateVoucher([used, other], input);
  assert.equal(r.voucher.active, false);
  assert.equal(r.voucher.maxUses, 60);
  assert.equal(r.voucher.usedCount, 12);
  assert.deepEqual(r.voucher.usedByUsers, ['u1', 'a@x.com']);
  assert.deepEqual(r.list[1], other);
});

test('a code can only be created once', () => {
  const { voucher } = cleanVoucherInput({ code: 'welcome100', value: 200, currency: 'LKR', maxUses: 5 });
  assert.ok(createVoucher([used], voucher).error);
  const ok = createVoucher([used], { ...voucher, code: 'NEW200' });
  assert.equal(ok.list.length, 2);
  assert.equal(ok.voucher.usedCount, 0);
});

test('max uses can not go below what was already used', () => {
  const { voucher } = cleanVoucherInput({ code: 'WELCOME100', maxUses: 5 }, { partial: true });
  assert.ok(updateVoucher([used], voucher).error);
});

test('bad input is refused', () => {
  assert.ok(cleanVoucherInput({ code: 'x', value: 10, currency: 'LKR', maxUses: 1 }).error);
  assert.ok(cleanVoucherInput({ code: 'GOOD1', value: -1, currency: 'LKR', maxUses: 1 }).error);
  assert.ok(cleanVoucherInput({ code: 'GOOD1', value: 600, currency: 'USDT', maxUses: 1 }).error);
  assert.ok(cleanVoucherInput({ code: 'GOOD1', value: 10, currency: 'EUR', maxUses: 1 }).error);
  assert.ok(cleanVoucherInput({ code: 'GOOD1', value: 10, currency: 'LKR', maxUses: 0 }).error);
});

test('voucher states', () => {
  const now = Date.parse('2026-10-17T12:00:00Z');
  assert.equal(voucherState(used, now), 'active');
  assert.equal(voucherState({ ...used, active: false }, now), 'paused');
  assert.equal(voucherState({ ...used, usedCount: 50 }, now), 'used_up');
  assert.equal(voucherState({ ...used, expiresAt: '2026-10-17T11:00:00Z' }, now), 'expired');
});

test('delete removes only that code', () => {
  assert.deepEqual(deleteVoucher([used, { code: 'B' }], 'welcome100').list, [{ code: 'B' }]);
  assert.ok(deleteVoucher([used], 'NOPE').error);
});
