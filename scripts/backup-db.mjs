// Takes a database backup now (the server also takes one every day).
// Run on the server from the project folder:
//   npm run backup

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { runBackup } = await import('../lib/dbBackup.js');
const r = await runBackup(root);
console.log(`Saved ${r.file} (${Math.round(r.bytes / 1024)} KB)${r.r2 ? ', copied to R2' : ''}`);
