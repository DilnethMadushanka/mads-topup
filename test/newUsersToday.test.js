import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newUsersToday, sriLankaDay } from '../src/utils/newUsersToday.js';

// 17 Oct 2026, 20:30 in Sri Lanka (UTC+05:30) = 15:00 UTC.
const NOW = Date.parse('2026-10-17T15:00:00Z');

test('today is the Sri Lanka calendar day', () => {
  // 00:10 on 18 Oct in Sri Lanka is still 17 Oct in UTC.
  assert.equal(sriLankaDay(Date.parse('2026-10-17T18:40:00Z')), '2026-10-18');
  assert.equal(sriLankaDay(Date.parse('2026-10-16T18:29:00Z')), '2026-10-16');
});

test('counts sign-ups from Sri Lanka midnight, not UTC midnight', () => {
  const users = [
    { uid: 'a', email: 'a@x.com', createdAt: '2026-10-16T18:35:00.000Z' }, // 00:05 SL today
    { uid: 'b', email: 'b@x.com', createdAt: '2026-10-16T18:25:00.000Z' }, // 23:55 SL yesterday
    { uid: 'c', email: 'c@x.com', createdAt: '2026-10-17T14:00:00.000Z' },
  ];
  assert.deepEqual(newUsersToday(users, NOW).map(u => u.uid), ['c', 'a']);
});

test('skips records without a usable date', () => {
  const users = [
    { uid: 'a', email: 'a@x.com' },
    { uid: 'b', email: 'b@x.com', createdAt: 'Just Now' },
    { uid: 'c', email: 'c@x.com', createdAt: { seconds: Date.parse('2026-10-17T10:00:00Z') / 1000 } },
    null,
  ];
  assert.deepEqual(newUsersToday(users, NOW).map(u => u.uid), ['c']);
});

test('one person with two records counts once', () => {
  const users = [
    { uid: 'google', email: 'Same@X.com', createdAt: '2026-10-17T12:00:00.000Z' },
    { uid: 'email', email: 'same@x.com', createdAt: '2026-10-17T09:00:00.000Z' },
  ];
  assert.deepEqual(newUsersToday(users, NOW).map(u => u.uid), ['email']);
});
