import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupFileName, backupsToPrune } from '../lib/dbBackup.js';

test('backup file names carry the date and time', () => {
  assert.equal(backupFileName(new Date('2026-10-16T21:05:00Z')), 'rtdb-2026-10-16T21-05.json.gz');
});

test('only backups older than the keep window are removed', () => {
  const now = new Date('2026-10-16T12:00:00Z');
  const files = ['rtdb-2026-10-16T03-00.json.gz', 'rtdb-2026-10-03T03-00.json.gz', 'rtdb-2026-10-01T03-00.json.gz', 'notes.txt'];
  assert.deepEqual(backupsToPrune(files, 14, now), ['rtdb-2026-10-01T03-00.json.gz']);
});
