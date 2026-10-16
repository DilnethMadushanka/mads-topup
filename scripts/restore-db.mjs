// Puts one part of the database back from a backup file.
// Run on the server from the project folder:
//   node scripts/restore-db.mjs <backup.json.gz> <path>          shows old vs backup
//   node scripts/restore-db.mjs <backup.json.gz> <path> --yes    writes it
// <path> is a database path such as users/<key> or orders/<id>. Restoring the
// whole database is refused here: do that from the Firebase console import.

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { rtdbGet, rtdbPut } = await import('../lib/rtdbAdmin.js');

const [file, dbPath, confirm] = process.argv.slice(2);
const segments = String(dbPath || '').split('/').filter(Boolean);
if (!file || !segments.length) {
  console.error('Usage: node scripts/restore-db.mjs <backup.json.gz> <path> [--yes]');
  process.exit(1);
}

const backup = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));
const fromBackup = segments.reduce((node, key) => (node == null ? undefined : node[key]), backup);
if (fromBackup === undefined) {
  console.error(`${segments.join('/')} is not in this backup.`);
  process.exit(1);
}

const current = await rtdbGet(segments.join('/'));
console.log('Now in the database:\n', JSON.stringify(current, null, 2)?.slice(0, 2000));
console.log('In the backup:\n', JSON.stringify(fromBackup, null, 2).slice(0, 2000));

if (confirm !== '--yes') {
  console.log('\nNothing written. Add --yes to put the backup copy back.');
  process.exit(0);
}
await rtdbPut(segments.join('/'), fromBackup);
console.log(`Restored ${segments.join('/')}.`);
