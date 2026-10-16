// Daily Realtime Database backup.
//
// The whole database (wallets, orders, deposits, users, ...) is downloaded
// with the server's database secret, gzipped and written to BACKUP_DIR
// (default: ../mads-topup-backups next to the app folder). The newest
// BACKUP_KEEP_DAYS files are kept (default 14).
//
// When R2_BACKUP_BUCKET is set, each backup is also copied there, so a lost
// VPS doesn't take the backups with it. Use a private bucket: a backup holds
// customer emails and wallet balances. Never the public uploads bucket.
//
// Restore one node (example: a user's record) from a backup:
//   node scripts/restore-db.mjs <backup.json.gz> users/<key>

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { rtdbUrl } from './rtdbAdmin.js';

const gzip = promisify(zlib.gzip);
const DAY_MS = 24 * 60 * 60 * 1000;
const FILE_RE = /^rtdb-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})\.json\.gz$/;

export const backupDir = (appDir) =>
  path.resolve(process.env.BACKUP_DIR || path.join(appDir, '..', 'mads-topup-backups'));

const keepDays = () => Math.max(1, parseInt(process.env.BACKUP_KEEP_DAYS || '14', 10) || 14);

export function backupFileName(date = new Date()) {
  return `rtdb-${date.toISOString().slice(0, 16).replace(':', '-')}.json.gz`;
}

// Backup files in dir, newest first.
export function listBackups(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => FILE_RE.test(f)).sort().reverse();
}

// Files to delete so only the newest `keep` days stay.
export function backupsToPrune(files, keep, now = new Date()) {
  const cutoff = now.getTime() - keep * DAY_MS;
  return files.filter(f => {
    const m = f.match(FILE_RE);
    return m && Date.parse(`${m[1]}T${m[2]}:${m[3]}:00Z`) < cutoff;
  });
}

async function copyToR2(fileName, buffer) {
  const bucket = (process.env.R2_BACKUP_BUCKET || '').trim();
  if (!bucket) return false;
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
  });
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: `rtdb/${fileName}`, Body: buffer, ContentType: 'application/gzip' }));
  return true;
}

export async function runBackup(appDir) {
  if (!(process.env.FIREBASE_DB_SECRET || '').trim()) {
    throw new Error('FIREBASE_DB_SECRET is not set, so the database cannot be read for a backup.');
  }
  const res = await fetch(rtdbUrl('', { format: 'export' }));
  if (!res.ok) throw new Error(`Database download failed: HTTP ${res.status}`);
  const raw = Buffer.from(await res.arrayBuffer());
  JSON.parse(raw.toString('utf8')); // refuse to save a truncated download

  const dir = backupDir(appDir);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const fileName = backupFileName();
  const buffer = await gzip(raw);
  fs.writeFileSync(path.join(dir, fileName), buffer, { mode: 0o600 });

  let r2 = false;
  try { r2 = await copyToR2(fileName, buffer); }
  catch (e) { console.error('[DB Backup] R2 copy failed:', e.message); }

  for (const old of backupsToPrune(listBackups(dir), keepDays())) {
    fs.rmSync(path.join(dir, old), { force: true });
  }
  return { file: path.join(dir, fileName), bytes: buffer.length, r2 };
}

// Runs a backup when the newest one is a day old (or missing), checking every
// hour, so pm2 restarts don't skip or repeat a day.
export function scheduleDailyBackup(appDir) {
  if (process.env.BACKUP_DISABLED === '1') return;
  const check = async () => {
    try {
      const newest = listBackups(backupDir(appDir))[0];
      const m = newest?.match(FILE_RE);
      const age = m ? Date.now() - Date.parse(`${m[1]}T${m[2]}:${m[3]}:00Z`) : Infinity;
      if (age < DAY_MS) return;
      const r = await runBackup(appDir);
      console.log(`[DB Backup] Saved ${r.file} (${Math.round(r.bytes / 1024)} KB${r.r2 ? ', copied to R2' : ''})`);
    } catch (e) {
      console.error('[DB Backup] Failed:', e.message);
    }
  };
  setTimeout(check, 60 * 1000).unref();
  setInterval(check, 60 * 60 * 1000).unref();
}
