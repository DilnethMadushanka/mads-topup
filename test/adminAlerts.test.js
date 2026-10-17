import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alertConfig, createAlerter, formatAlert, pickNew } from '../lib/adminAlerts.js';

const T = Date.parse('2026-10-17T10:00:00Z');
const at = (min) => new Date(T + min * 60000).toISOString();
const timeOf = (x) => x.timestamp;

test('first check remembers what is there, later checks report only new ones once', () => {
  const node = { a: { timestamp: at(-5) }, b: { timestamp: at(-120) } };
  const r1 = pickNew(node, null, { timeOf, now: T });
  assert.equal(r1.fresh.length, 0);
  const node2 = { ...node, c: { timestamp: at(1) }, late: { timestamp: at(-10) } }; // late: browser clock behind
  const r2 = pickNew(node2, r1.state, { timeOf, now: T + 2 * 60000 });
  assert.deepEqual(r2.fresh.map(x => x.id), ['late', 'c']);
  const r3 = pickNew(node2, r2.state, { timeOf, now: T + 4 * 60000 });
  assert.equal(r3.fresh.length, 0);
});

test('config reads .env and falls back to the bot token and admin email', () => {
  const c = alertConfig({ TELEGRAM_BOT_TOKEN: 'tok', ADMIN_ALERT_TELEGRAM_CHAT_ID: '1, 2', ADMIN_EMAIL: 'me@x.com' });
  assert.equal(c.botToken, 'tok');
  assert.deepEqual(c.chatIds, ['1', '2']);
  assert.deepEqual(c.emails, ['me@x.com']);
  assert.equal(c.lowBalanceUsd, 20);
  assert.ok(c.emailTypes.has('failed_order') && !c.emailTypes.has('deposit'));
});

test('messages are escaped for Telegram HTML', () => {
  const m = formatAlert('ticket', { title: '<script>', lines: [['From', 'a&b'], ['Empty', '']] });
  assert.ok(m.html.includes('&lt;script&gt;') && m.html.includes('a&amp;b') && !m.html.includes('Empty'));
});

test('sends to Telegram and email, and throttles by key', async () => {
  const calls = []; const mails = [];
  let clock = T;
  const a = createAlerter({
    config: alertConfig({ TELEGRAM_BOT_TOKEN: 'tok', ADMIN_ALERT_TELEGRAM_CHAT_ID: '42', ADMIN_EMAIL: 'me@x.com' }),
    fetchFn: async (url, opt) => { calls.push({ url, body: JSON.parse(opt.body) }); return { ok: true, status: 200 }; },
    sendMail: async (m) => { mails.push(m); }, now: () => clock, log: { warn() {} },
  });
  const r = await a.send('low_balance', { title: '$12', key: 'low', throttleMs: 3600000 });
  assert.equal(r.telegram, 1); assert.equal(r.email, 1);
  assert.equal(calls[0].body.chat_id, '42');
  assert.equal((await a.send('low_balance', { key: 'low', throttleMs: 3600000 })).reason, 'throttled');
  clock += 3600001;
  assert.equal((await a.send('low_balance', { key: 'low', throttleMs: 3600000 })).sent, true);
  await a.send('deposit', { title: 'Rs. 1000' });
  assert.equal(mails.length, 2); // deposits go to Telegram only by default
});

test('nothing set up: nothing sent', async () => {
  const a = createAlerter({ config: alertConfig({}), fetchFn: async () => { throw new Error('should not call'); } });
  assert.equal((await a.send('deposit', {})).sent, false);
});
