// Sends a test email and prints exactly which provider worked or why it
// failed. Run on the server from the project folder:
//   node scripts/test-email.mjs you@gmail.com
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const to = process.argv[2];
if (!to || !to.includes('@')) {
  console.error('Usage: node scripts/test-email.mjs you@gmail.com');
  process.exit(1);
}

const { sendMail, mailProvidersConfigured } = await import('../lib/mailer.js');
console.log('Configured providers:', mailProvidersConfigured().join(', ') || 'none');
const r = await sendMail({
  to,
  subject: 'MADS TOPUP test email',
  text: 'If you can read this, OTP emails work.',
  html: '<p>If you can read this, OTP emails work.</p>'
});
if (r.success) console.log(`OK: sent via ${r.provider} (${r.messageId}). Check inbox and spam.`);
else console.log('FAILED:\n  ' + r.errors.join('\n  '));
for (const e of r.success ? r.errors : []) console.log('  (tried first) ' + e);
process.exit(r.success ? 0 : 1);
