import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderEmailHtml, orderEmailRows, sendOrderCompleteEmail } from '../lib/orderEmail.js';

const order = { id: 'SRV-1', gameName: 'Mobile Legends', packageName: '86 Diamonds', playerId: '12345', zoneId: '2001', priceLkr: 520 };

test('the email lists the order details', () => {
  assert.deepEqual(orderEmailRows(order), [
    ['Game', 'Mobile Legends'], ['Package', '86 Diamonds'], ['Player ID', '12345 (2001)'], ['Paid', 'Rs. 520'], ['Order ID', 'SRV-1']
  ]);
});

test('empty details are left out', () => {
  assert.deepEqual(orderEmailRows({ id: 'X', gameName: 'Garena Shells', packageName: '100 Shells' }).map(r => r[0]), ['Game', 'Package', 'Order ID']);
});

test('customer text is escaped in the HTML', () => {
  const html = orderEmailHtml({ ...order, displayName: '<script>x</script>' });
  assert.ok(!html.includes('<script>x'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('no email is attempted without a real address', async () => {
  assert.equal((await sendOrderCompleteEmail({ ...order, email: '' })).skipped, true);
  assert.equal((await sendOrderCompleteEmail({ ...order, email: 'not-an-email' })).skipped, true);
});
