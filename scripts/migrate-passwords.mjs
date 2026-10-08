// One-off: move every password hash out of the public users list into
// userSecrets (which browsers can't read). Run on the server from the
// project folder:
//   node scripts/migrate-passwords.mjs
// Hashes are moved as they are (old sha256 hashes still work and are
// upgraded to scrypt on the user's next login). Safe to run more than once.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { rtdbGet, rtdbPatch } = await import('../lib/rtdbAdmin.js');
const { hashPasswordServer } = await import('../lib/userAuth.js');

const users = await rtdbGet('users');
if (!users || typeof users !== 'object') {
  console.error('No users could be read. Is FIREBASE_DB_SECRET set in .env?');
  process.exit(1);
}

let moved = 0;
for (const [key, u] of Object.entries(users)) {
  if (!u || typeof u !== 'object' || !u.password) continue;
  const stored = String(u.password);
  // Plain-text legacy passwords are hashed before they are stored.
  const value = stored.startsWith('sha256:') || stored.startsWith('scrypt:') ? stored : hashPasswordServer(stored);
  const existing = await rtdbGet(`userSecrets/${key}`).catch(() => null);
  if (!existing?.password) {
    await rtdbPatch(`userSecrets/${key}`, { password: value, updatedAt: new Date().toISOString() });
  }
  await rtdbPatch(`users/${key}`, { password: null });
  moved++;
}
console.log(`Moved ${moved} password(s) out of the public users list.`);
