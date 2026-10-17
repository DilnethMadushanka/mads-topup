import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextCode, checkCode, emailKey, codeStore, MAX_ATTEMPTS, CODE_TTL_MS } from '../lib/authCodes.js';

const T = Date.parse('2026-10-17T10:00:00Z');

test('a code checks once, then is gone', () => {
  const { code, entry } = nextCode(null, T);
  assert.match(code, /^\d{6}$/);
  assert.equal(checkCode(entry, code, T + 1000).result, 'ok');
  assert.equal(checkCode(entry, code, T + 1000).next, null);
});

test('wrong guesses are counted and stop at the limit', () => {
  let { entry } = nextCode(null, T);
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const r = checkCode(entry, '000000', T);
    if (r.result === 'ok') return; // 1 in a million
    entry = r.next;
  }
  assert.equal(checkCode(entry, '123456', T).result, 'expired');
});

test('asking again keeps the guess count and the expiry, and is limited', () => {
  const first = nextCode(null, T).entry;
  const used = { ...first, attempts: 3 };
  const second = nextCode(used, T + 120000).entry;
  assert.equal(second.attempts, 3);
  assert.equal(second.expires, first.expires);
  const third = nextCode(second, T + 240000).entry;
  assert.equal(nextCode(third, T + 360000).error, 'too_many');
  assert.equal(nextCode(third, T + 300000, { minGapMs: 120000 }).error, 'wait');
});

test('codes expire', () => {
  const { code, entry } = nextCode(null, T);
  assert.equal(checkCode(entry, code, T + CODE_TTL_MS + 1).result, 'expired');
});

test('the database key hides the email', () => {
  assert.equal(emailKey('A@x.com '), emailKey('a@x.com'));
  assert.ok(!emailKey('a@x.com').includes('@'));
});

test('the store survives a restart (a second store reads the same record)', async () => {
  const db = new Map();
  const io = {
    rtdbGet: async (p) => db.get(p) ?? null,
    rtdbPut: async (p, v) => { if (v === null) db.delete(p); else db.set(p, v); },
    rtdbTransaction: async (p, update) => { const next = update(db.get(p) ?? null); if (next === undefined) return { committed: false }; if (next === null) db.delete(p); else db.set(p, next); return { committed: true, value: next }; },
  };
  const { code, entry } = nextCode(null);
  await codeStore('signup', io).set('me@x.com', entry);
  const afterRestart = codeStore('signup', io);
  assert.equal(await afterRestart.check('me@x.com', '999999') === 'ok' ? 'ok' : 'wrong', code === '999999' ? 'ok' : 'wrong');
  assert.equal(await afterRestart.check('me@x.com', code), 'ok');
  assert.equal(await afterRestart.get('me@x.com'), null);
});
