import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardOrderLines, cardOrderStatus, cardOrderId, orderDataFor } from '../lib/cardOrder.js';

const GAMES = [
  { id: 'mlbb', idLabel: 'User ID', packages: [{ id: 'mlbb-86', name: '86 Diamonds', moongoldProductId: '1001' }, { id: 'mlbb-wp', name: 'Weekly Pass', moongoldProductId: '1002' }] },
  { id: 'freefire', packages: [{ id: 'ff-100', name: '100 Diamonds', moongoldProductId: '2001' }] },
  { id: 'pubgm', packages: [{ id: 'uc-60', name: '60 UC', moongoldProductId: '3001' }] },
  { id: 'shells', fulfilment: 'voucher', packages: [{ id: 'sh-33', name: '33 Shells', moongoldProductId: '4001' }] },
  { id: 'valorant', moongoldIdField: 'Riot Username', packages: [{ id: 'vp-1', name: '475 VP', moongoldProductId: '5001' }] },
];

const record = {
  purpose: 'ORDER', serverPlacesOrder: true,
  order: { gameId: 'mlbb', playerId: ' 12345 ', zoneId: '678', items: [
    { packageId: 'mlbb-86', name: '86 Diamonds', quantity: 2, unitPriceLkr: 450.5 },
    { packageId: 'mlbb-wp', name: 'Weekly Pass', quantity: 1, unitPriceLkr: 600 },
  ] },
};

test('each cart line becomes one order with a fixed id and the paid price', () => {
  const lines = cardOrderLines('txn_ABC-123', record, GAMES);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].partnerOrderId, 'card-txnABC123-1');
  assert.equal(lines[1].partnerOrderId, 'card-txnABC123-2');
  assert.equal(lines[0].priceLkr, 901);
  assert.deepEqual(lines[0].bodyObj.data, { category: 1, 'product-id': 1001, quantity: 2, 'User ID': '12345', 'Server ID': '678', Server: '678' });
  // Same transaction, same ids: a second try can't make a second order.
  assert.deepEqual(cardOrderLines('txn_ABC-123', record, GAMES).map(l => l.partnerOrderId), lines.map(l => l.partnerOrderId));
  assert.match(cardOrderId('x'.repeat(200), 0), /^[A-Za-z0-9_-]{1,80}$/);
});

test('player fields follow each game', () => {
  const g = (id) => GAMES.find(x => x.id === id);
  assert.equal(orderDataFor(g('freefire'), g('freefire').packages[0], 1, '99')['Player ID'], '99');
  assert.equal(orderDataFor(g('pubgm'), g('pubgm').packages[0], 1, '77')['Character ID'], '77');
  assert.deepEqual(orderDataFor(g('shells'), g('shells').packages[0], 3, ''), { category: 2, 'product-id': 4001, quantity: 3 });
  assert.equal(orderDataFor(g('valorant'), g('valorant').packages[0], 1, 'Me#TAG')['Riot Username'], 'Me#TAG');
});

test('a package that is no longer sold is reported, not ordered', () => {
  const r = { ...record, order: { ...record.order, items: [{ packageId: 'gone', name: 'Old pack', quantity: 1, unitPriceLkr: 100 }] } };
  const [line] = cardOrderLines('t1', r, GAMES);
  assert.equal(line.bodyObj, null);
  assert.deepEqual(cardOrderLines('t1', { purpose: 'ORDER' }, GAMES), []);
});

test('overall status', () => {
  assert.equal(cardOrderStatus([{ ok: true }, { ok: true }]), 'PLACED');
  assert.equal(cardOrderStatus([{ ok: true }, { ok: false }]), 'PARTIAL');
  assert.equal(cardOrderStatus([{ ok: false }]), 'FAILED');
  assert.equal(cardOrderStatus([]), 'FAILED');
});
