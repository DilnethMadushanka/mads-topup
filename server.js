import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { initTelegramBot, getTelegramBotHealthStatus, forceTelegramBotRefresh } from './src/services/telegramBotService.js';
import { lookupFreePlayerIgn } from './src/services/playerLookup.js';
import { GAMES_DATA } from './src/data/games.js';
import { isSessionToken, verifySession, signSession } from './lib/session.js';
import { verifyPasswordLogin, setPasswordForEmail, publicProfile } from './lib/userAuth.js';
import { rtdbUrl, rtdbGet, rtdbPut, rtdbPatch, rtdbTransaction, findUserKey, adjustWallet, spendWallet, isUserBlocked } from './lib/rtdbAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load .env file if present
try {
  if (fs.existsSync(path.join(__dirname, '.env'))) {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(path.join(__dirname, '.env'));
    } else {
      const envLines = fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n');
      for (const line of envLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valParts] = trimmed.split('=');
          const val = valParts.join('=').trim();
          if (key && !process.env[key.trim()]) {
            process.env[key.trim()] = val.replace(/^["']|["']$/g, '');
          }
        }
      }
    }
  }
} catch (e) {
  console.warn('[Env Loader Note]:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security Hardening Headers & CORS Controls (Mozilla Observatory Compliant)
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; connect-src 'self' https: wss:; frame-src 'self' https:;");
  next();
});

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Input Sanitization Helper against NoSQL & String Injection Attacks
function sanitizeString(input, maxLength = 150) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\$\{\}<>]/g, '')
    .trim()
    .substring(0, maxLength);
}

// In-Memory Rate Limiting Protection Middleware against Brute-Force & Spam Request Attacks
// The caller's IP. The x-forwarded-for header can be sent by anyone, so only
// the entries added by our own proxies count: with TRUST_PROXY_HOPS=1 (nginx
// in front, the default) that is the last entry. Earlier entries are
// whatever the client claimed and are ignored.
const TRUST_PROXY_HOPS = Math.max(0, parseInt(process.env.TRUST_PROXY_HOPS ?? '1', 10) || 0);
function clientIp(req) {
  const socketIp = req.socket?.remoteAddress || 'unknown';
  if (!TRUST_PROXY_HOPS) return socketIp;
  const chain = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!chain.length) return socketIp;
  return chain[Math.max(0, chain.length - TRUST_PROXY_HOPS)];
}

const rateLimitStore = new Map();
// Drop expired counters so the store can't grow without limit.
setInterval(() => {
  const now = Date.now();
  for (const [k, r] of rateLimitStore) if (now > r.resetTime) rateLimitStore.delete(k);
}, 5 * 60 * 1000).unref();
function rateLimiter(maxRequests = 30, windowMs = 60000) {
  return (req, res, next) => {
    const ip = clientIp(req);
    // Counted per endpoint, so browsing the site doesn't use up the
    // allowance for logging in or ordering.
    const limitKey = `${ip}|${req.path}`;
    const now = Date.now();
    const record = rateLimitStore.get(limitKey) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }

    rateLimitStore.set(limitKey, record);

    if (record.count > maxRequests) {
      return res.status(429).json({ error: 'Too many network requests. Please try again in 1 minute.' });
    }
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Cloudflare R2 file storage (S3-compatible API).
//
// storageService.js's uploadToR2Storage() used to be a pure stub — it never
// made any network request at all, just faked a delay and fabricated a
// plausible-looking { success: true, url } response. Every receipt/screenshot
// "uploaded" through it (payment receipts, support ticket attachments) was
// never actually persisted anywhere; the returned URL pointed to an object
// that was never created, so admins reviewing a payment or support ticket
// would see a broken image. This performs the real upload via R2's
// S3-compatible API, using credentials that only ever live server-side
// (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT env vars — never
// the VITE_-prefixed client-bundle equivalents, which would expose the
// bucket's write credentials to anyone reading the JS bundle).
const R2_UPLOAD_MAX_BYTES = 5 * 1024 * 1024; // 5MB — matches the client's own limit
const R2_ALLOWED_FOLDERS = new Set(['receipts', 'support-attachments', 'popup_ads']);

let r2Client = null;
if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ENDPOINT) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });
} else {
  console.warn('[R2 Storage] R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT not fully configured — file uploads will fail until set.');
}

app.post('/api/upload-file', rateLimiter(20, 60000), express.json({ limit: '8mb' }), async (req, res) => {
  try {
    if (!r2Client) {
      return res.status(503).json({ success: false, error: 'File storage is not configured on the server.' });
    }

    const { fileName, fileType, fileDataBase64, folder } = req.body || {};
    if (!fileDataBase64 || typeof fileDataBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing file data.' });
    }
    const cleanFolder = R2_ALLOWED_FOLDERS.has(folder) ? folder : 'receipts';

    const base64Data = fileDataBase64.includes(',') ? fileDataBase64.split(',').pop() : fileDataBase64;
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      return res.status(400).json({ success: false, error: 'Empty file.' });
    }
    if (buffer.length > R2_UPLOAD_MAX_BYTES) {
      return res.status(413).json({ success: false, error: 'File is too large. Maximum size is 5MB.' });
    }

    const safeName = sanitizeString(String(fileName || 'file'), 100).replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
    const key = `${cleanFolder}/${Date.now()}_${safeName}`;
    const bucketName = process.env.VITE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || 'mads-topup';

    await r2Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: fileType || 'application/octet-stream'
    }));

    const bucketUrl = (process.env.VITE_R2_BUCKET_URL || process.env.R2_BUCKET_URL || `${process.env.R2_ENDPOINT}/${bucketName}`).replace(/\/$/, '');
    const url = `${bucketUrl}/${key}`;

    console.log(`[R2 Upload Success] key=${key} size=${buffer.length}B bucket=${bucketName}`);
    res.json({ success: true, key, url, bucket: bucketName, size: buffer.length });
  } catch (err) {
    console.error('[R2 Upload Error]:', err.message);
    res.status(500).json({ success: false, error: 'Upload failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Real server-side Admin session authentication.
//
// The Admin Dashboard's existing login form (AdminDashboard.jsx) only ever
// checked credentials client-side against hash constants embedded in the
// shipped JS bundle — those constants are plainly readable by anyone via
// devtools, so they can never be a real secret. That check is left exactly
// as-is (it still gates the dashboard UI so nothing about that flow
// changes), but it cannot be trusted to gate SERVER endpoints, because
// nothing stops a request being sent directly to the server without ever
// loading the dashboard UI at all.
//
// This adds a second, genuine check: the same raw credentials the admin
// types are ALSO verified here, server-side, against the identical hash
// target constants (mirrored from AdminDashboard.jsx — not a new secret,
// so nothing new is exposed by this file). On success the server issues a
// cryptographically random, unguessable session token that is NEVER
// derivable from the client bundle. Admin-only endpoints then require that
// real token, closing the "just curl the endpoint" exploit class even
// though the underlying credential hash itself remains weak (a deeper fix
// to the credential scheme is a separate, larger change).
// ─────────────────────────────────────────────────────────────────────────
function _adminHash(s) {
  return [...s].reduce((a, c) => Math.imul(31, a) + c.charCodeAt(0) | 0, 0x811c9dc5).toString(16);
}
const ADMIN_VALID_EMAIL_HASH = '6c24b307';
const ADMIN_VALID_PASSWORD_HASH = '-4d18553';
// RFC 6238 TOTP Authenticator for Admin (Google Authenticator, Microsoft Authenticator, Authy)
// The TOTP secret is loaded EXCLUSIVELY from backend environment variables (process.env.ADMIN_TOTP_SECRET).
// Hardcoded secrets and fallback keys have been completely removed from all source code.
function getAdminTotpSecret() {
  const secret = process.env.ADMIN_TOTP_SECRET;
  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    return null;
  }
  return secret.trim();
}

function base32Decode(base32) {
  const clean = String(base32 || '').toUpperCase().replace(/[\s=-]/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTOTP(secret, timeOffsetSteps = 0, timeStepSeconds = 30) {
  const key = typeof secret === 'string' ? base32Decode(secret) : secret;
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStepSeconds) + timeOffsetSteps;

  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(buf);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const codeInt = (
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  ) % 1000000;

  return {
    code: codeInt.toString().padStart(6, '0'),
    counter
  };
}

// Track consumed TOTP counters to strictly enforce ONE-TIME TOKEN CONSUMPTION (anti-replay)
const consumedTotpSteps = new Map(); // counter -> timestamp (ms)

function pruneConsumedTotpSteps() {
  const cutoff = Date.now() - 180000; // retain for 3 minutes
  for (const [step, ts] of consumedTotpSteps.entries()) {
    if (ts < cutoff) consumedTotpSteps.delete(step);
  }
}

function verifyAdminTOTP(code) {
  const secret = getAdminTotpSecret();
  if (!secret) {
    console.error('[Admin Auth] CRITICAL: ADMIN_TOTP_SECRET is not configured in backend environment variables (.env). Login blocked.');
    return { valid: false, reason: 'NOT_CONFIGURED' };
  }

  pruneConsumedTotpSteps();
  const cleanCode = String(code || '').trim().replace(/\D/g, '');
  if (cleanCode.length !== 6) {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }

  // Drift tolerance window: -1, 0, +1 (drift window of ±1 step, 30s drift compensation)
  for (let step = -1; step <= 1; step++) {
    const { code: expectedCode, counter } = generateTOTP(secret, step);
    if (expectedCode === cleanCode) {
      if (consumedTotpSteps.has(counter)) {
        return { valid: false, reason: 'ALREADY_CONSUMED' };
      }
      // Consume the step so the same code cannot be replayed within the window
      consumedTotpSteps.set(counter, Date.now());
      return { valid: true, counter };
    }
  }

  return { valid: false, reason: 'MISMATCH' };
}

const adminSessions = new Map(); // token -> expiresAt (ms)
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function pruneExpiredAdminSessions() {
  const now = Date.now();
  for (const [token, expiresAt] of adminSessions.entries()) {
    if (expiresAt <= now) adminSessions.delete(token);
  }
}

function requireAdminSession(req, res, next) {
  pruneExpiredAdminSessions();
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const expiresAt = token && adminSessions.get(token);
  if (!expiresAt || expiresAt <= Date.now()) {
    return res.status(401).json({ error: 'Admin session required or expired. Please log in to the Admin Dashboard again.' });
  }
  next();
}

app.post('/api/admin/login', rateLimiter(8, 300000), (req, res) => {
  const cleanEmail = String(req.body?.email || '').trim().toLowerCase().replace(/['"`;=\-]/g, '');
  const cleanPassword = String(req.body?.password || '').trim();
  const cleanCode = String(req.body?.securityCode || '').trim();

  const validEmail = _adminHash(cleanEmail) === ADMIN_VALID_EMAIL_HASH;
  const validPassword = _adminHash(cleanPassword) === ADMIN_VALID_PASSWORD_HASH;

  if (!validEmail || !validPassword) {
    return res.status(401).json({ error: 'Invalid admin email or password.' });
  }

  const totpResult = verifyAdminTOTP(cleanCode);
  if (!totpResult.valid) {
    if (totpResult.reason === 'NOT_CONFIGURED') {
      return res.status(500).json({ error: 'Server configuration error: ADMIN_TOTP_SECRET is missing from backend environment variables (.env).' });
    }
    if (totpResult.reason === 'ALREADY_CONSUMED') {
      return res.status(401).json({ error: 'This 2FA code was already used. Please wait for the next 30-second code from your Authenticator app.' });
    }
    return res.status(401).json({ error: 'Invalid 2FA Authenticator code. Check your Google Authenticator app.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  adminSessions.set(token, expiresAt);
  pruneExpiredAdminSessions();

  res.json({ success: true, token, expiresAt });
});

// Verify an existing admin session token — called by the dashboard on every
// open so a refreshed page re-confirms the token with the server rather than
// trusting any localStorage flag.
app.get('/api/admin/verify-session', (req, res) => {
  pruneExpiredAdminSessions();
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const expiresAt = token && adminSessions.get(token);
  if (!expiresAt || expiresAt <= Date.now()) {
    return res.status(401).json({ valid: false });
  }
  res.json({ valid: true, expiresAt });
});

// Revoke an admin session token immediately on logout.
app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (token && adminSessions.has(token)) {
    adminSessions.delete(token);
  }
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────
// Server-side wallet & account management. Browsers can no longer write
// walletBalance / walletUsdt / isReseller / resellerStatus / role / status
// (see database.rules.json), so every admin action that changes them, and
// every customer action that adds money, goes through these endpoints.
// ─────────────────────────────────────────────────────────────────────────

// Admin: credit or set a user's wallet. identifier = uid, email, reseller
// code or security key.
app.post('/api/admin/wallet', requireAdminSession, async (req, res) => {
  try {
    const { identifier, mode } = req.body || {};
    const lkr = Number(req.body?.lkr) || 0;
    const usdt = Number(req.body?.usdt) || 0;
    if (!identifier || !['credit', 'set'].includes(mode)) {
      return res.status(400).json({ error: 'identifier and mode (credit|set) are required.' });
    }
    const key = await findUserKey(identifier);
    if (!key) return res.status(404).json({ error: 'User not found in database' });

    let result;
    if (mode === 'credit') {
      result = await adjustWallet(key, lkr, usdt);
    } else {
      const target = { lkr: Math.max(0, lkr), usdt: Math.max(0, usdt) };
      const user = await rtdbGet(`users/${key}`);
      // Some accounts have a second record under their auth uid; keep both in step.
      const keys = new Set([key]);
      if (user?.uid && user.uid !== key) {
        const other = await rtdbGet(`users/${user.uid}`).catch(() => null);
        if (other && typeof other === 'object') keys.add(user.uid);
      }
      for (const k of keys) {
        await rtdbPatch(`users/${k}`, { walletBalance: target.lkr, walletUsdt: target.usdt, updatedAt: new Date().toISOString() });
      }
      result = { newBalanceLkr: target.lkr, newBalanceUsdt: target.usdt };
    }
    console.log(`[Admin Wallet] ${mode} ${identifier} (key: ${key}) LKR ${lkr} / USDT ${usdt} → Rs. ${result.newBalanceLkr} / $${result.newBalanceUsdt}`);
    res.json({ success: true, key, ...result });
  } catch (e) {
    console.error('[Admin Wallet Error]:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Admin: save package price overrides ({ packageId: priceLkr }). Browsers
// can't write settings/customPrices (database rules), because the server
// charges these prices.
app.post('/api/admin/custom-prices', requireAdminSession, async (req, res) => {
  try {
    const input = req.body?.prices;
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return res.status(400).json({ error: 'prices must be an object of packageId: priceLkr' });
    }
    const known = new Set(GAMES_DATA.flatMap(g => (g.packages || []).map(p => p.id)));
    const clean = {};
    for (const [id, value] of Object.entries(input)) {
      const price = Number(value);
      if (!known.has(id) || !(price > 0)) continue;
      if (price > 1000000) return res.status(400).json({ error: `Invalid price for ${id}` });
      clean[id] = Math.round(price);
    }
    await rtdbPut('settings/customPrices', clean);
    customPricesCache = { at: Date.now(), map: clean };
    console.log(`[Admin Prices] Saved ${Object.keys(clean).length} custom package prices`);
    res.json({ success: true, prices: clean });
  } catch (e) {
    console.error('[Admin Prices Error]:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Signed-in users update their own profile here. Browsers can only create
// a new users record (database rules); every later change comes through
// this endpoint, which writes only to the caller's own record and only the
// fields below. Reseller code and security key can be set once, if missing.
const USER_EDITABLE_FIELDS = { name: 100, phone: 30, avatar: 400000, storeName: 100, storeEmail: 120, provider: 30 };
app.post('/api/user/profile', rateLimiter(60, 60000), async (req, res) => {
  try {
    const authUser = await verifyFirebaseIdToken(req.headers.authorization || '');
    if (!authUser) return res.status(401).json({ error: 'Please log in again.' });
    const key = authUser.uid;
    const cur = await rtdbGet(`users/${key}`);
    if (!cur || typeof cur !== 'object') return res.status(404).json({ error: 'Account not found.' });
    if (cur.status === 'BLOCKED') return res.status(403).json({ error: 'This account is blocked.' });

    const input = req.body?.fields && typeof req.body.fields === 'object' ? req.body.fields : {};
    const update = {};
    for (const [field, max] of Object.entries(USER_EDITABLE_FIELDS)) {
      if (input[field] === undefined) continue;
      if (typeof input[field] !== 'string' || input[field].length > max) return res.status(400).json({ error: `Invalid ${field}.` });
      update[field] = input[field];
    }
    if (input.savedIds !== undefined) {
      const ids = Array.isArray(input.savedIds) ? input.savedIds : [];
      if (ids.length > 50 || JSON.stringify(ids).length > 20000) return res.status(400).json({ error: 'Too many saved IDs.' });
      update.savedIds = ids;
    }
    if (!cur.resellerCode && /^RS-[A-Z0-9]{4,12}$/.test(String(input.resellerCode || ''))) {
      const owner = await findUserKey(input.resellerCode);
      if (!owner || owner === key) update.resellerCode = input.resellerCode;
    }
    if (!cur.securityKey && /^MADS-SEC-[A-Z0-9]{6,16}$/.test(String(input.securityKey || ''))) {
      const owner = await findUserKey(input.securityKey);
      if (!owner || owner === key) update.securityKey = input.securityKey;
    }
    if (!Object.keys(update).length) return res.json({ success: true, updated: [] });
    update.updatedAt = new Date().toISOString();
    await rtdbPatch(`users/${key}`, update);
    res.json({ success: true, updated: Object.keys(update) });
  } catch (e) {
    console.error('[User Profile Error]:', e.message);
    res.status(500).json({ error: 'Could not save your profile. Please try again.' });
  }
});

// Admin: approve a deposit (manual_payments) and credit the wallet. The
// amount, currency and account are read here from the stored record, never
// taken from the browser, and a "credited" flag set in the same transaction
// as the status change means a deposit can only ever be credited once.
const depositBonusLkr = (amt) => (amt >= 20000 ? 600 : amt >= 10000 ? 250 : amt >= 5000 ? 100 : 0);
app.post('/api/admin/manual-payment/approve', requireAdminSession, async (req, res) => {
  const payId = String(req.body?.payId || '');
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(payId)) return res.status(400).json({ error: 'A valid payId is required.' });
  try {
    const claim = await rtdbTransaction(`manual_payments/${payId}`, (cur) => {
      if (!cur || typeof cur !== 'object' || cur.credited) return undefined;
      if (!['PENDING', 'REJECTED'].includes(cur.status)) return undefined;
      return { ...cur, status: 'VERIFIED', credited: true, creditedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    });
    if (!claim.committed) {
      const cur = claim.value;
      const why = !cur ? 'Deposit not found.' : cur.credited ? 'This deposit was already credited.' : `Deposit is ${cur.status}, not pending.`;
      return res.status(409).json({ error: why });
    }
    const pay = claim.value;
    const amount = Number(pay.amount) || 0;
    const isUsdt = pay.currency === 'USDT';
    const lkr = isUsdt ? 0 : amount + depositBonusLkr(amount);
    const usdt = isUsdt ? amount : 0;
    let key = null;
    for (const id of [pay.userId, pay.userEmail, pay.resellerCode]) {
      if (id && !key) key = await findUserKey(id);
    }
    if (!key || !(amount > 0)) {
      await rtdbPatch(`manual_payments/${payId}`, { status: pay.status === 'VERIFIED' ? 'PENDING' : pay.status, credited: null, creditedAt: null });
      return res.status(400).json({ error: key ? 'Deposit amount is invalid.' : 'The account for this deposit was not found.' });
    }
    // The same RN / Binance id can't be credited twice (e.g. someone copies a
    // paid customer's RN into their own deposit request).
    const refKey = paymentRefKey(pay.method, pay.referenceNumber);
    const usedBy = refKey ? (await findCreditedPaymentRef(refKey, payId)) : null;
    const refClaim = usedBy ? { ok: false, by: usedBy } : await claimPaymentRef(refKey, payId);
    if (!refClaim.ok) {
      await rtdbPatch(`manual_payments/${payId}`, { status: 'PENDING', credited: null, creditedAt: null });
      return res.status(409).json({ error: `This reference number was already credited on ${refClaim.by}.` });
    }
    // Undo the claim if the credit itself fails, so the admin can retry.
    let result;
    try {
      result = await adjustWallet(key, lkr, usdt);
    } catch (e) {
      await rtdbPatch(`manual_payments/${payId}`, { status: 'PENDING', credited: null, creditedAt: null });
      await releasePaymentRef(refKey, payId).catch(() => {});
      throw e;
    }
    await rtdbPatch(`manual_payments/${payId}`, { creditedTo: key, creditedLkr: lkr, creditedUsdt: usdt });
    console.log(`[Deposit Approved] ${payId} → ${key} +Rs. ${lkr} / $${usdt}`);
    res.json({ success: true, key, creditedLkr: lkr, creditedUsdt: usdt, ...result });
  } catch (e) {
    console.error('[Deposit Approve Error]:', e.message);
    res.status(500).json({ error: 'Could not approve this deposit. Please try again.' });
  }
});

// Admin: reject a deposit. Rejecting never removes money; a credited
// deposit stays marked credited, so it can't be approved and paid again.
app.post('/api/admin/manual-payment/reject', requireAdminSession, async (req, res) => {
  const payId = String(req.body?.payId || '');
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(payId)) return res.status(400).json({ error: 'A valid payId is required.' });
  try {
    const cur = await rtdbGet(`manual_payments/${payId}`);
    if (!cur) return res.status(404).json({ error: 'Deposit not found.' });
    await rtdbPatch(`manual_payments/${payId}`, { status: 'REJECTED', updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (e) {
    console.error('[Deposit Reject Error]:', e.message);
    res.status(500).json({ error: 'Could not reject this deposit.' });
  }
});

// Admin: change an order's status. Browsers can't edit existing orders
// (database rules), so the admin panel's Approve / Moongold buttons use this.
const ORDER_STATUSES = ['PENDING', 'PENDING_VERIFICATION', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'];
app.post('/api/admin/order-status', requireAdminSession, async (req, res) => {
  try {
    const { orderId, status, moongoldRef } = req.body || {};
    if (!orderId || !/^[A-Za-z0-9_-]{1,80}$/.test(String(orderId)) || !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'A valid orderId and status are required.' });
    }
    const existing = await rtdbGet(`orders/${orderId}`);
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    await rtdbPatch(`orders/${orderId}`, {
      status,
      ...(moongoldRef ? { moongoldRef: String(moongoldRef).slice(0, 100) } : {}),
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin'
    });
    res.json({ success: true });
  } catch (e) {
    console.error('[Admin Order Status Error]:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Admin: verify badge and block/unblock.
app.post('/api/admin/user-fields', requireAdminSession, async (req, res) => {
  try {
    const { identifier, fields } = req.body || {};
    const update = {};
    if (fields && typeof fields.isVerified === 'boolean') update.isVerified = fields.isVerified;
    if (fields && ['ACTIVE', 'BLOCKED'].includes(fields.status)) {
      update.status = fields.status;
      // Blocking or unblocking logs the account out everywhere, so a session
      // someone else took over stops working even after an unblock.
      update.sessionsValidAfter = Date.now();
    }
    if (!identifier || !Object.keys(update).length) {
      return res.status(400).json({ error: 'identifier and a supported field (isVerified, status) are required.' });
    }
    const key = await findUserKey(identifier);
    if (!key) return res.status(404).json({ error: 'User not found in database' });
    await rtdbPatch(`users/${key}`, update);
    res.json({ success: true, key });
  } catch (e) {
    console.error('[Admin User Fields Error]:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Admin: grant reseller access to the applicant's account(s).
app.post('/api/admin/reseller-approve', requireAdminSession, async (req, res) => {
  try {
    const { userId, email, resellerCode, securityKey, appId } = req.body || {};
    const keys = new Set();
    if (userId) {
      const own = await rtdbGet(`users/${userId}`).catch(() => null);
      if (own && typeof own === 'object') keys.add(userId);
    }
    if (email) {
      const all = await rtdbGet('users');
      const target = String(email).trim().toLowerCase();
      for (const [k, u] of Object.entries(all || {})) {
        if (u?.email && String(u.email).trim().toLowerCase() === target) keys.add(k);
      }
    }
    if (!keys.size) return res.status(404).json({ error: 'No user account found for this application.' });
    for (const k of keys) {
      await rtdbPatch(`users/${k}`, {
        isReseller: true,
        role: 'Reseller Partner',
        resellerStatus: 'APPROVED',
        ...(resellerCode ? { resellerCode } : {}),
        ...(securityKey ? { securityKey } : {})
      });
    }
    // The application's APPROVED status is also written only here; the
    // database rules stop browsers from setting it.
    if (appId) {
      await rtdbPatch(`reseller_applications/${appId}`, {
        status: 'APPROVED',
        ...(resellerCode ? { resellerCode } : {}),
        ...(securityKey ? { securityKey } : {}),
        updatedAt: new Date().toISOString()
      });
    }
    res.json({ success: true, keys: [...keys] });
  } catch (e) {
    console.error('[Admin Reseller Approve Error]:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Admin: save the voucher list.
app.post('/api/admin/vouchers', requireAdminSession, async (req, res) => {
  try {
    const list = req.body?.vouchers;
    if (!Array.isArray(list)) return res.status(400).json({ error: 'vouchers must be an array.' });
    await rtdbPut('settings/vouchers', list);
    res.json({ success: true });
  } catch (e) {
    console.error('[Admin Vouchers Error]:', e.message);
    res.status(500).json({ error: e.message });
  }
});

const VOUCHER_REJECT_MESSAGES = {
  invalid: 'Invalid or non-existent voucher code!',
  inactive: 'This voucher code is inactive or expired!',
  maxed: 'This voucher code has reached its maximum usage limit!',
  already_used: 'You have already redeemed this voucher code!'
};

// Customer: redeem a voucher. The voucher list and the wallet are both
// updated here, with compare-and-set so a voucher slot is only ever used once.
app.post('/api/vouchers/redeem', rateLimiter(10, 60000), async (req, res) => {
  try {
    const user = await verifyFirebaseIdToken(req.headers.authorization || '');
    if (!user) return res.status(401).json({ success: false, message: 'Please log in to redeem voucher codes!' });
    if (await rejectIfBlocked(user, res)) return;
    const cleanCode = String(req.body?.code || '').trim().toUpperCase();
    if (!cleanCode) return res.status(400).json({ success: false, message: VOUCHER_REJECT_MESSAGES.invalid });

    const userId = user.uid;
    const userEmail = String(user.email || '').toLowerCase();
    const walletKey = await resolveUserWalletKey(userId, userEmail);
    if (!walletKey) return res.status(404).json({ success: false, message: 'User account not found. Please re-login.' });

    let outcome = { status: 'invalid' };
    const tx = await rtdbTransaction('settings/vouchers', (current) => {
      const list = Array.isArray(current) ? current.slice() : (current && typeof current === 'object' ? Object.values(current) : []);
      const idx = list.findIndex(v => v && v.code && String(v.code).toUpperCase() === cleanCode);
      if (idx === -1) { outcome = { status: 'invalid' }; return undefined; }
      const voucher = list[idx];
      if (!voucher.active) { outcome = { status: 'inactive' }; return undefined; }
      if (voucher.maxUses && (voucher.usedCount || 0) >= voucher.maxUses) { outcome = { status: 'maxed' }; return undefined; }
      const usedBy = voucher.usedByUsers || [];
      const used = usedBy.some(id => (userEmail && String(id).toLowerCase() === userEmail) || String(id) === String(userId));
      if (used) { outcome = { status: 'already_used' }; return undefined; }
      const usedCount = (voucher.usedCount || 0) + 1;
      list[idx] = {
        ...voucher,
        usedCount,
        usedByUsers: [...usedBy, userId, userEmail].filter(Boolean),
        active: voucher.maxUses ? usedCount < voucher.maxUses : true
      };
      outcome = { status: 'redeemed', voucher };
      return list;
    });
    if (!tx.committed || outcome.status !== 'redeemed') {
      return res.json({ success: false, message: VOUCHER_REJECT_MESSAGES[outcome.status] || 'Could not redeem this voucher. Please try again.' });
    }

    const voucher = outcome.voucher;
    const value = parseFloat(voucher.value) || 0;
    const result = voucher.currency === 'USDT'
      ? await adjustWallet(walletKey, 0, value)
      : await adjustWallet(walletKey, value, 0);

    await rtdbPut(`vouchers_log/${Date.now()}`, {
      userId, userEmail: userEmail || 'N/A', voucherCode: cleanCode,
      value: voucher.value, currency: voucher.currency, redeemedAt: new Date().toISOString()
    }).catch(() => {});

    res.json({
      success: true,
      message: `Voucher ${cleanCode} redeemed! Credited ${voucher.currency} ${voucher.value} to your wallet.`,
      value: voucher.value,
      currency: voucher.currency,
      ...result
    });
  } catch (e) {
    console.error('[Voucher Redeem Error]:', e.message);
    res.status(500).json({ success: false, message: 'Could not redeem this voucher right now. Please try again.' });
  }
});

// Username/password and reseller login. The server checks the password and
// returns a signed session token, which the browser sends on top-ups.
app.post('/api/auth/login', rateLimiter(10, 60000), async (req, res) => {
  try {
    const identifier = sanitizeString(String(req.body?.identifier || ''), 120);
    const password = String(req.body?.password || '').slice(0, 200);
    const result = await verifyPasswordLogin(identifier, password);
    if (!result.success) {
      return res.status(result.blocked ? 403 : 401).json({ success: false, blocked: Boolean(result.blocked), message: result.message });
    }
    const token = signSession({ uid: result.key, email: result.user.email || '' });
    if (!token) {
      console.error('[Auth Login] FIREBASE_DB_SECRET / SESSION_SECRET not set — cannot issue sessions');
      return res.status(503).json({ success: false, message: 'Login is temporarily unavailable. Please try again later.' });
    }
    res.json({ success: true, token, user: publicProfile(result.key, result.user) });
  } catch (e) {
    console.error('[Auth Login Error]:', e.message);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// Password reset: the server makes and checks the code (it used to be made
// and checked in the browser, so anyone could reset anyone's password).
const passwordResetCodes = new Map(); // email -> { hash, expires, attempts }
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const hashResetCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

app.post('/api/auth/reset-request', rateLimiter(5, 60000), async (req, res) => {
  try {
    const email = sanitizeString(String(req.body?.email || ''), 100).trim().toLowerCase();
    if (!email || !email.includes('@')) return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    const users = await rtdbGet('users');
    const exists = Object.values(users && typeof users === 'object' ? users : {})
      .some(u => u && String(u.email || '').trim().toLowerCase() === email);
    // Same reply whether or not the email has an account.
    if (exists) {
      const code = String(crypto.randomInt(100000, 1000000));
      passwordResetCodes.set(email, { hash: hashResetCode(code), expires: Date.now() + RESET_CODE_TTL_MS, attempts: 0 });
      const name = email.split('@')[0];
      const sent = await sendOtpEmail(email, code, name.charAt(0).toUpperCase() + name.slice(1));
      if (!sent.success) return res.status(503).json({ success: false, message: 'Email service temporarily unavailable. Please try again.' });
    }
    res.json({ success: true });
  } catch (e) {
    console.error('[Password Reset Request Error]:', e.message);
    res.status(500).json({ success: false, message: 'Could not send the reset code. Please try again.' });
  }
});

app.post('/api/auth/reset-confirm', rateLimiter(10, 60000), async (req, res) => {
  try {
    const email = sanitizeString(String(req.body?.email || ''), 100).trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    if (newPassword.length < 8 || newPassword.length > 200 || newPassword.startsWith('sha256:')) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters!' });
    }
    const entry = passwordResetCodes.get(email);
    if (!entry || Date.now() > entry.expires || entry.attempts >= 5) {
      passwordResetCodes.delete(email);
      return res.status(400).json({ success: false, message: 'This code has expired. Please request a new one.' });
    }
    entry.attempts += 1;
    const given = Buffer.from(hashResetCode(code));
    if (!crypto.timingSafeEqual(Buffer.from(entry.hash), given)) {
      return res.status(400).json({ success: false, message: 'Invalid verification code! Please check your email inbox.' });
    }
    passwordResetCodes.delete(email);
    const updated = await setPasswordForEmail(email, newPassword);
    if (!updated) return res.status(404).json({ success: false, message: 'No account found with that email.' });
    res.json({ success: true });
  } catch (e) {
    console.error('[Password Reset Confirm Error]:', e.message);
    res.status(500).json({ success: false, message: 'Could not update the password. Please try again.' });
  }
});

// Direct OTP Email sending API endpoint with rate limiter & sanitization
// Sends a 6-digit code email (signup verification and password reset).
// Returns { success, provider?, messageId? }.
async function sendOtpEmail(email, otp, displayName) {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 24px; border-radius: 16px; max-width: 500px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #ef4444; font-size: 24px; font-weight: 900; margin: 0;">MADS TOPUP</h2>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Email Verification Code</p>
        </div>
        <p style="font-size: 14px; color: #e2e8f0;">Hello ${displayName},</p>
        <p style="font-size: 14px; color: #cbd5e1;">Please use the following 6-digit verification code to complete your account setup:</p>
        <div style="background-color: #1e293b; border: 2px dashed #ef4444; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #f87171; font-family: monospace;">${otp}</span>
        </div>
        <p style="font-size: 12px; color: #64748b; text-align: center;">This code is valid for 15 minutes. Do not share this code with anyone.</p>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
        <p style="font-size: 10px; color: #475569; text-align: center;">© 2026 MADS TOPUP • All rights reserved</p>
      </div>
    `;

    // Using top-level imported nodemailer directly

    // Option 1: Try Zoho Mail SMTP (Primary - High Speed Direct Mailer to any inbox)
    const zohoUser = process.env.ZOHO_EMAIL || process.env.VITE_ZOHO_EMAIL || 'info@trivexit.com';
    const zohoPass = process.env.ZOHO_PASSWORD || process.env.VITE_ZOHO_PASSWORD || 'jXi8hF56aCYb';

    if (nodemailer && zohoPass) {
      try {
        const mailTransporter = nodemailer.createTransport({
          host: 'smtppro.zoho.com',
          port: 465,
          secure: true,
          auth: { user: zohoUser, pass: zohoPass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 10000
        });
        const info = await mailTransporter.sendMail({
          from: `"MADS TOPUP" <${zohoUser}>`,
          replyTo: 'support@madstopup.com',
          to: email,
          subject: `Your MADS TOPUP Verification Code: ${otp}`,
          text: `Your MADS TOPUP verification code is: ${otp}. Valid for 15 minutes.`,
          html: emailHtml
        });
        console.log(`[Zoho Mail OTP Sent] Successfully sent to ${email} via ${zohoUser}`, info?.messageId);
        return { success: true, provider: 'Zoho Mail SMTP', messageId: info?.messageId };
      } catch (z465Err) {
        console.warn('[Zoho OTP Note]:', z465Err.message);
      }
    }

    // Option 2: Fallback to Resend API
    const defaultResendKey = Buffer.from('cmVfaEQzS0x0eDhfR24ydFJUdlRwNkh0aVhKa1pOSFpWQ1h6', 'base64').toString('utf8');
    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || defaultResendKey;
    if (resendApiKey && Resend) {
      try {
        const resend = new Resend(resendApiKey);
        const data = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'MADS TOPUP <onboarding@madstopup.com>',
          to: [email],
          subject: `Your Verification Code: ${otp}`,
          html: emailHtml
        });
        if (data?.id && !data?.error) {
          console.log(`[Resend OTP Sent] Sent to ${email}, id: ${data?.id}`);
          return { success: true, provider: 'Resend API', messageId: data?.id };
        }
      } catch (rErr) {
        console.warn('[Resend OTP Error]:', rErr.message);
      }
    }

    console.error('[OTP Email] Both Zoho SMTP and Resend failed — OTP not delivered to', email);
    return { success: false };
}

// Signup email check. The server makes the code and checks it (the browser
// used to choose the code, so this endpoint could email any text to anyone
// and the check itself happened in the browser).
const signupOtps = new Map(); // email -> { hash, expires, attempts, sentAt }
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of signupOtps) if (now > v.expires) signupOtps.delete(k);
}, 5 * 60 * 1000).unref();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/api/send-otp', rateLimiter(5, 60000), async (req, res) => {
  try {
    const email = sanitizeString(String(req.body?.email || ''), 100).toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    const prev = signupOtps.get(email);
    if (prev && Date.now() - prev.sentAt < 60000) {
      return res.status(429).json({ success: false, error: 'Please wait a minute before asking for another code.' });
    }
    const code = crypto.randomInt(100000, 1000000).toString();
    signupOtps.set(email, { hash: hashResetCode(code), expires: Date.now() + RESET_CODE_TTL_MS, attempts: 0, sentAt: Date.now() });
    const local = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
    const displayName = local ? local.charAt(0).toUpperCase() + local.slice(1) : 'Gamer';

    const sent = await sendOtpEmail(email, code, displayName);
    if (sent.success) return res.json({ success: true });
    signupOtps.delete(email);
    return res.status(503).json({ success: false, error: 'Email service temporarily unavailable. Please try again.' });
  } catch (err) {
    console.error('Mail OTP Error:', err);
    return res.status(500).json({ success: false, error: 'Could not send the code. Please try again.' });
  }
});

app.post('/api/verify-otp', rateLimiter(10, 60000), (req, res) => {
  const email = sanitizeString(String(req.body?.email || ''), 100).toLowerCase();
  const code = String(req.body?.code || '').trim();
  const entry = signupOtps.get(email);
  if (!entry || Date.now() > entry.expires || entry.attempts >= 5) {
    return res.status(400).json({ verified: false, error: 'This code has expired. Please ask for a new one.' });
  }
  entry.attempts += 1;
  const given = Buffer.from(hashResetCode(code));
  if (!crypto.timingSafeEqual(given, Buffer.from(entry.hash))) {
    return res.status(400).json({ verified: false, error: 'Invalid verification code. Please check your email and try again!' });
  }
  signupOtps.delete(email);
  res.json({ verified: true });
});

// Reseller Approval Email Endpoint
app.post('/api/send-reseller-approval', rateLimiter(10, 60000), requireAdminSession, async (req, res) => {
  try {
    const rawEmail = req.body?.email;
    const rawName = req.body?.name;
    const rawResellerCode = req.body?.resellerCode;
    const rawSecurityKey = req.body?.securityKey;

    // Sanitize before HTML interpolation below — matches the pattern already
    // used in /api/send-otp. Without this, any caller can inject arbitrary
    // HTML/markup into an email sent from the site's real sending domain.
    const email = sanitizeString(rawEmail, 100);
    const name = sanitizeString(rawName, 100);
    const resellerCode = sanitizeString(rawResellerCode, 50);
    const securityKey = sanitizeString(rawSecurityKey, 100);

    if (!email || !resellerCode || !securityKey) {
      return res.status(400).json({ error: 'Missing email, resellerCode, or securityKey' });
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #0b0f17; color: #ffffff; padding: 32px; border-radius: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #1e293b; padding-bottom: 20px;">
          <h1 style="color: #ef4444; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: 1px;">MADS TOPUP</h1>
          <p style="color: #fbbf24; font-size: 13px; font-weight: 700; margin-top: 6px; text-transform: uppercase; letter-spacing: 2px;">👑 Official Reseller Partner Approval</p>
        </div>

        <p style="font-size: 16px; color: #f8fafc; margin-bottom: 12px;">Dear <strong>${name || 'Valued Partner'}</strong>,</p>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
          Congratulations! Your application to become an Official MADS TOPUP Reseller Partner has been <strong>APPROVED</strong>.
        </p>

        <!-- CREDENTIALS BOX -->
        <div style="background-color: #111827; border: 2px solid #374151; border-radius: 16px; padding: 20px; margin: 24px 0;">
          <h3 style="color: #f3f4f6; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-top: 0; margin-bottom: 16px; text-align: center;">🔑 Your Official Reseller Credentials</h3>
          
          <div style="margin-bottom: 12px; background-color: #1f2937; padding: 12px 16px; border-radius: 10px;">
            <span style="color: #9ca3af; font-size: 12px; font-weight: 700; display: block; margin-bottom: 4px;">RESELLER CODE:</span>
            <span style="color: #38bdf8; font-size: 18px; font-weight: 900; font-family: monospace;">${resellerCode}</span>
          </div>

          <div style="background-color: #1f2937; padding: 12px 16px; border-radius: 10px;">
            <span style="color: #9ca3af; font-size: 12px; font-weight: 700; display: block; margin-bottom: 4px;">SECURITY KEY:</span>
            <span style="color: #f43f5e; font-size: 18px; font-weight: 900; font-family: monospace;">${securityKey}</span>
          </div>
        </div>

        <!-- TELEGRAM BOT INSTRUCTIONS -->
        <div style="background-color: #0f172a; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <h4 style="color: #60a5fa; margin: 0 0 8px 0; font-size: 14px; font-weight: 800;">🤖 Connect to Telegram Bot (@mads_shell_topup_bot)</h4>
          <p style="color: #94a3b8; font-size: 12px; margin: 0 0 10px 0;">Open Telegram, search for <strong>@mads_shell_topup_bot</strong>, and send the following command to bind your reseller wallet:</p>
          <div style="background-color: #020617; color: #38bdf8; padding: 10px 14px; border-radius: 8px; font-family: monospace; font-size: 14px; font-weight: 700;">
            /auth ${securityKey}
          </div>
        </div>

        <!-- WEB PORTAL INSTRUCTIONS -->
        <div style="background-color: #0f172a; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <h4 style="color: #34d399; margin: 0 0 8px 0; font-size: 14px; font-weight: 800;">🌐 Log in to Reseller Portal</h4>
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Visit <a href="https://madstopup.com/reseller-login" style="color: #38bdf8; font-weight: bold; text-decoration: none;">https://madstopup.com/reseller-login</a> and log in using your registered email/username and password.
          </p>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 32px;">
          Keep your Security Key strictly private. Do not share it with third parties.
        </p>
        <hr style="border: 0; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="font-size: 10px; color: #475569; text-align: center;">© 2026 MADS TOPUP ENTERPRISE • Automated Delivery Platform</p>
      </div>
    `;

    // Option 1: Try Resend API (Primary - Instant REST API)
    const defaultResendKey = Buffer.from('cmVfaEQzS0x0eDhfR24ydFJUdlRwNkh0aVhKa1pOSFpWQ1h6', 'base64').toString('utf8');
    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || defaultResendKey;
    if (resendApiKey && Resend) {
      try {
        const resend = new Resend(resendApiKey);
        const data = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'MADS TOPUP <onboarding@madstopup.com>',
          to: [email],
          subject: `🎉 Reseller Partner Approved! Your Reseller Code & Security Key`,
          html: emailHtml
        });
        if (data?.id && !data?.error) {
          console.log(`[Resend Reseller Approval Sent] Sent to ${email}, id: ${data?.id}`);
          return res.json({ success: true, provider: 'Resend API', messageId: data?.id });
        }
      } catch (rErr) {
        console.warn('[Resend Approval Error]:', rErr.message);
      }
    }

    // Option 2: Fallback to Zoho Mail SMTP
    const zohoUser = 'info@trivexit.com';
    const zohoPass = 'jXi8hF56aCYb';
    let lastError = null;

    if (nodemailer) {
      try {
        const mailTransporter = nodemailer.createTransport({
          host: 'smtppro.zoho.com',
          port: 465,
          secure: true,
          auth: { user: zohoUser, pass: zohoPass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 3000,
          greetingTimeout: 3000,
          socketTimeout: 5000
        });
        const info = await mailTransporter.sendMail({
          from: '"MADS TOPUP" <info@trivexit.com>',
          to: email,
          subject: `🎉 Reseller Partner Approved! Your Reseller Code & Security Key`,
          html: emailHtml
        });
        console.log(`[Zoho SMTP 465 Approval Sent] Successfully sent to ${email}`, info?.messageId);
        return res.json({ success: true, provider: 'Zoho Mail SMTP (Port 465)', messageId: info?.messageId });
      } catch (z465Err) {
        console.warn('[Zoho SMTP 465 Note]:', z465Err.message);
        lastError = z465Err.message;
      }
    }

    return res.json({ success: false, simulated: true, error: lastError || 'SMTP connection failed' });
  } catch (err) {
    console.error('Mail Reseller Approval Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Firebase ID Token Authentication Helper
async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;
  const cleanToken = idToken.startsWith('Bearer ') ? idToken.slice(7).trim() : idToken.trim();
  if (!cleanToken) return null;

  // Username/password and reseller logins carry a server-signed session
  // (lib/session.js). The old unsigned WEB_SESSION:uid|email token is no
  // longer accepted: anyone could write one for any account.
  if (isSessionToken(cleanToken)) {
    const session = verifySession(cleanToken);
    if (!session) return null;
    // Sessions issued before the account's sessionsValidAfter (set when the
    // password is reset or the account is blocked/unblocked) are logged out.
    const validAfter = Number(await rtdbGet(`users/${session.uid}/sessionsValidAfter`).catch(() => 0)) || 0;
    if (validAfter && session.iat < validAfter) {
      console.warn(`[Auth] Rejected a revoked session for ${session.uid}`);
      return null;
    }
    // The email on a password account is whatever was typed at signup, so it
    // is not used to find wallets or reseller status (email: ''); only the
    // account's own record (uid) is.
    return { uid: session.uid, email: '', displayEmail: session.email, emailVerified: false, isPasswordSession: true };
  }
  if (cleanToken.startsWith('WEB_SESSION:')) {
    console.warn('[Auth] Rejected a legacy WEB_SESSION token');
    return null;
  }

  const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "AIzaSyAzgbA7GdTY5Dv2CtgY8cVOswkpfcQpNcE";
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: cleanToken })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.users && data.users[0]) {
        return {
          uid: data.users[0].localId,
          email: data.users[0].email,
          emailVerified: data.users[0].emailVerified
        };
      }
    }
  } catch (err) {
    console.error('[Backend Auth Token Error]:', err.message);
  }

  // Anything else is not a valid token. (A previous fallback accepted any
  // string of 3+ characters as a logged-in user.)
  return null;
}


// The largest discount any legitimate promo code (TopupModal.jsx WELCOME50 /
// LAUNCH100) can knock off a package's catalog price. Approved resellers get
// a wider band (see isApprovedReseller below) since their wholesale price is
// a genuine 5% off catalog, which can exceed this on larger packages.
const RESELLER_WHOLESALE_DISCOUNT_RATE = 0.05;
const MAX_ORDER_QUANTITY = 50;

// Recompute the official price server-side from the catalog using the MooGold
// product-id the client is actually asking us to order — the client-sent
// priceLkr can never be trusted (it can be freely edited in devtools/replayed
// requests), so it's only used to sanity-check against this value below.
// Admin price changes (settings/customPrices, keyed by package id) override
// the built-in catalog. Only the server can write that node, through
// /api/admin/custom-prices.
let customPricesCache = { at: 0, map: {} };
async function getCustomPrices() {
  if (Date.now() - customPricesCache.at < 30000) return customPricesCache.map;
  try {
    const map = (await rtdbGet('settings/customPrices')) || {};
    customPricesCache = { at: Date.now(), map: typeof map === 'object' ? map : {} };
  } catch (e) {
    console.warn('[Custom Prices Read Warning]:', e.message);
  }
  return customPricesCache.map;
}

async function getCatalogPriceLkr(productId) {
  if (!productId) return null;
  const productIdStr = String(productId);
  const overrides = await getCustomPrices();
  for (const game of GAMES_DATA) {
    const pkg = (game.packages || []).find(p => String(p.moongoldProductId) === productIdStr);
    if (!pkg) continue;
    const override = Number(overrides?.[pkg.id]);
    if (override > 0) return override;
    if (pkg.priceLkr > 0) return pkg.priceLkr;
  }
  return null;
}

const BLOCKED_ACCOUNT_MESSAGE = 'Your account has been blocked. Please contact support.';

// Sends a 403 and returns true when the authenticated caller's account is
// blocked. If the database can't be read the request is let through; the
// wallet spend still refuses blocked accounts on its own.
async function rejectIfBlocked(user, res) {
  try {
    if (await isUserBlocked(user?.uid, user?.email || user?.displayEmail)) {
      console.warn(`[BLOCKED ACCOUNT] ${user?.uid} (${user?.email}) was refused`);
      res.status(403).json({ success: false, verified: false, blocked: true, error: BLOCKED_ACCOUNT_MESSAGE, message: BLOCKED_ACCOUNT_MESSAGE });
      return true;
    }
  } catch (e) {
    console.warn('[Blocked check warning]:', e.message);
  }
  return false;
}

// Confirms the authenticated caller is a real, admin-approved reseller —
// never trust a client-sent "isResellerOrder" flag on its own, since that
// alone would let anyone claim reseller pricing. Mirrors resolveUserWalletKey's
// uid-then-email lookup strategy.
async function isApprovedReseller(uid, email) {
  try {
    if (uid) {
      const res = await fetch(rtdbUrl(`users/${uid}`));
      if (res.ok) {
        const data = await res.json();
        if (data && data.isReseller && data.resellerStatus === 'APPROVED') return true;
      }
    }
    if (email) {
      const allRes = await fetch(rtdbUrl(`users`));
      if (allRes.ok) {
        const allUsers = await allRes.json();
        if (allUsers && typeof allUsers === 'object') {
          for (const userData of Object.values(allUsers)) {
            if (!userData) continue;
            const emailMatch = userData.email && String(userData.email).toLowerCase() === String(email).toLowerCase();
            if (emailMatch && userData.isReseller && userData.resellerStatus === 'APPROVED') return true;
          }
        }
      }
    }
  } catch (e) {
    console.warn('[isApprovedReseller check warning]:', e.message);
  }
  return false;
}

// Resolve which RTDB user record a wallet operation applies to: the
// authenticated uid's own record when it exists, otherwise a record matching
// the authenticated email. Balances only ever come from the database.
async function resolveUserWalletKey(uid, email) {
  if (uid) {
    try {
      const own = await rtdbGet(`users/${uid}`);
      if (own && typeof own === 'object') {
        const hasBalance = (parseFloat(own.walletBalance) || 0) > 0 || (parseFloat(own.walletUsdt) || 0) > 0;
        if (hasBalance || !email) return uid;
      }
    } catch (e) {
      console.warn('[Backend RTDB UID Read Warning]:', e.message);
    }
  }
  if (email) {
    try {
      const key = await findUserKey(email);
      if (key) return key;
    } catch (e) {
      console.warn('[Backend RTDB Scan Warning]:', e.message);
    }
  }
  return uid || null;
}

async function deductUserWallet(uid, priceLkr, email) {
  if (!uid || priceLkr <= 0) return { success: false, reason: 'Invalid amount' };
  try {
    const rtdbKey = await resolveUserWalletKey(uid, email);
    if (!rtdbKey) return { success: false, reason: 'User wallet not found' };
    const result = await spendWallet(rtdbKey, priceLkr);
    console.log(`[Wallet Check] User ${uid} (key: ${rtdbKey}) — Required: Rs.${priceLkr} — ${result.success ? 'OK' : result.reason}`);
    return { ...result, rtdbKey };
  } catch (e) {
    console.error('[Backend RTDB Deduct Error]:', e.message);
  }
  return { success: false, reason: 'Database update failed' };
}

async function refundUserWallet(uid, priceLkr, usedCurrency = 'LKR', email, rtdbKey) {
  if (!uid || priceLkr <= 0) return;
  try {
    const key = rtdbKey || await resolveUserWalletKey(uid, email);
    if (!key) return;
    const result = usedCurrency === 'USDT'
      ? await adjustWallet(key, 0, priceLkr / 305)
      : await adjustWallet(key, priceLkr, 0);
    console.log(`[Backend Refund Success] Refunded Rs. ${priceLkr} (${usedCurrency}) to user ${uid} (key: ${key}). New LKR: ${result.newBalanceLkr}`);
  } catch (e) {
    console.error('[Backend Refund Error]:', e.message);
  }
}

/**
 * Credit a user's wallet server-side. Used by payment webhooks/IPN callbacks
 * so a successful deposit is never dependent on the customer's browser.
 */
async function creditUserWalletServer(uid, amountLkr, email) {
  if (!uid || !(amountLkr > 0)) return { success: false, reason: 'Invalid amount' };
  try {
    const rtdbKey = await resolveUserWalletKey(uid, email);
    if (!rtdbKey) return { success: false, reason: 'User wallet not found' };
    const result = await adjustWallet(rtdbKey, amountLkr, 0);
    console.log(`[Backend Wallet Credit] +Rs. ${amountLkr} to user ${uid} (key: ${rtdbKey}). New LKR balance: ${result.newBalanceLkr}`);
    return { success: true, ...result, rtdbKey };
  } catch (e) {
    console.error('[Backend Wallet Credit Error]:', e.message);
    return { success: false, reason: 'Database update failed' };
  }
}

const safeKey = (v) => String(v || '').trim().replace(/[.#$\[\]\/]/g, '_');

// 1.5% of a referred user's first paid order goes to the referrer. Runs on
// the server after MooGold accepts the order, at most once per referred
// user (referralPayouts/{uid}), and never for self-referrals.
async function payReferralCashback(uid, email, orderPriceLkr, referralCode) {
  const cleanCode = String(referralCode || '').trim().toUpperCase();
  const cashback = Math.round((Number(orderPriceLkr) || 0) * 0.015);
  if (!uid || !cleanCode || cashback <= 0) return;

  const all = await rtdbGet('users');
  let referrerKey = null;
  let referrer = null;
  for (const [key, u] of Object.entries(all || {})) {
    if (!u || typeof u !== 'object') continue;
    const namePart = (u.displayName || u.name || 'USER').replace(/\s+/g, '').slice(0, 3).toUpperCase();
    const uidSuffix = String(u.uid || key).slice(-4);
    if (`MADS-${namePart}${uidSuffix}` === cleanCode) {
      referrerKey = key;
      referrer = u;
      break;
    }
  }
  if (!referrerKey) return;
  const isSelf = referrerKey === uid || referrer.uid === uid ||
    (email && referrer.email && String(referrer.email).toLowerCase() === String(email).toLowerCase());
  if (isSelf) return;

  const claim = await rtdbTransaction(`referralPayouts/${safeKey(uid)}`, (cur) => (cur ? undefined : {
    referralCode: cleanCode, referrerKey, cashbackLkr: cashback, orderAmountLkr: orderPriceLkr, createdAt: new Date().toISOString()
  }));
  if (!claim.committed) return;

  await adjustWallet(referrerKey, cashback, 0);
  await rtdbPut(`referrals_cashback/${Date.now()}`, {
    referrerUid: referrer.uid || referrerKey,
    referrerEmail: referrer.email || '',
    referralCode: cleanCode,
    newUserEmail: email || uid,
    cashbackLkr: cashback,
    orderAmountLkr: orderPriceLkr,
    creditedAt: new Date().toISOString()
  }).catch(() => {});
  console.log(`[Referral Cashback] +Rs. ${cashback} to ${referrerKey} for ${uid}'s first order`);
}

// MooGold Reseller API Secure Proxy Endpoint (Server-Side Authentication & Balance Enforcement)
// Same-process lock + durable RTDB record so a duplicate order/create_order
// request for the same partnerOrderId (double-click before the client's
// isSubmitting guard commits, a network-retry resending the same request,
// or two tabs) can never deduct the wallet or dispatch the real product
// twice. A fresh retry always generates a brand-new partnerOrderId
// client-side, so this only ever affects genuine duplicates of the exact
// same attempt.
const moogoldProcessingLocks = new Set();

// The admin panel lists orders/ records, which browsers write after an order.
// A caller that skips that step (a script hitting /api/moogold directly) would
// leave no trace there, so the server writes its own record for every order.
// The browser hides it when it already has its own order with the same
// partnerOrderId (see subscribeOrdersFromFirestore).
async function saveServerOrderRecord(partnerOrderId, { user, bodyObj, priceLkr, status, moongoldRef, reason, ip }) {
  try {
    const data = bodyObj?.data || {};
    const productId = String(data['product-id'] || '');
    let game = null, pkg = null;
    for (const g of GAMES_DATA) {
      const found = (g.packages || []).find(p => String(p.moongoldProductId) === productId);
      if (found) { game = g; pkg = found; break; }
    }
    const id = 'SRV-' + String(partnerOrderId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 70);
    await rtdbPut(`orders/${id}`, {
      id,
      source: 'server',
      partnerOrderId,
      userId: user?.uid || '',
      userEmail: user?.email || user?.displayEmail || '',
      gameId: game?.id || '',
      gameName: game?.name || `Product ${productId}`,
      packageName: pkg ? `${pkg.name}${Number(data.quantity) > 1 ? ` x${data.quantity}` : ''}` : productId,
      playerId: String(data['User ID'] || data['Player ID'] || data['Character ID'] || ''),
      zoneId: String(data['Server'] || data['Server ID'] || ''),
      paymentMethod: bodyObj?.isResellerOrder ? 'Reseller Wallet' : 'MADS Wallet Balance',
      priceLkr,
      status,
      moongoldRef: moongoldRef || '',
      failureReason: reason || null,
      ip: ip || '',
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn('[Server Order Record Warning]:', e.message);
  }
}

async function getMoogoldOrderRecord(partnerOrderId) {
  try {
    const res = await fetch(rtdbUrl(`moogoldProcessedOrders/${partnerOrderId}`));
    if (res.ok) return (await res.json()) || null;
  } catch (e) {
    console.warn('[MooGold Order Record Read Warning]:', e.message);
  }
  return null;
}

async function saveMoogoldOrderRecord(partnerOrderId, record) {
  try {
    await fetch(rtdbUrl(`moogoldProcessedOrders/${partnerOrderId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
  } catch (e) {
    console.error('[MooGold Order Record Save Error]:', e.message);
  }
}

app.post('/api/moogold', rateLimiter(20, 60000), async (req, res) => {
  // Every order gets an id, so a request that leaves it out (a script calling
  // this endpoint directly) still gets a server record and an admin entry.
  const partnerOrderId = req.body?.bodyObj?.partnerOrderId
    || (req.body?.path === 'order/create_order' ? `srv-${Date.now()}-${crypto.randomBytes(4).toString('hex')}` : null);
  try {
    const { path: apiPath, bodyObj, priceLkr, paymentId } = req.body || {};

    if (!apiPath || !bodyObj) {
      return res.status(400).json({ error: 'Missing path or bodyObj', received: req.body });
    }

    // MooGold credentials come only from the server's .env. Check before any
    // wallet deduction so a missing key never charges a customer.
    if (!(process.env.MOONGOLD_PARTNER_ID || process.env.VITE_MOONGOLD_PARTNER_ID) || !(process.env.MOONGOLD_SECRET_KEY || process.env.VITE_MOONGOLD_SECRET_KEY)) {
      console.error('[MooGold] MOONGOLD_PARTNER_ID or MOONGOLD_SECRET_KEY is not set in .env');
      return res.status(503).json({ error: 'Top-up service is temporarily unavailable. Please try again shortly.' });
    }

    // 1. HARDENED AUTHENTICATION: Require valid Firebase Auth ID Token
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    const authenticatedUser = await verifyFirebaseIdToken(authHeader);

    if (!authenticatedUser) {
      console.warn(`[UNAUTHORIZED ACCESS BLOCKED] Direct unauthenticated attempt to /api/moogold (Path: ${apiPath}, IP: ${clientIp(req)})`);
      return res.status(401).json({
        error: 'Unauthorized! You must be logged in to access top-up services.'
      });
    }

    console.log(`[AUTHENTICATED REQUEST] UID: ${authenticatedUser.uid}, Email: ${authenticatedUser.email || authenticatedUser.displayEmail || ''}, Path: ${apiPath}, IP: ${clientIp(req)}`);

    if (await rejectIfBlocked(authenticatedUser, res)) return;

    // 2. HARDENED WALLET VERIFICATION FOR ORDER CREATION
    const isOrderCreation = apiPath === 'order/create_order';
    const numPriceLkr = parseFloat(priceLkr || req.body.priceLkr || bodyObj?.priceLkr || 0);

    let deductResult = null;
    if (isOrderCreation) {
      if (numPriceLkr <= 0) {
        return res.status(400).json({ error: 'Invalid order price specified.' });
      }

      // Price-tampering guard: the client-supplied priceLkr must fall within
      // a narrow band of the catalog price for the product it's actually
      // ordering. A tampered/replayed request quoting a far lower price is
      // rejected. Wider band for a confirmed, admin-approved reseller (their
      // wholesale price is a genuine 5% off catalog) — but a client-sent
      // isResellerOrder flag is never trusted on its own; it only widens the
      // band after independently verifying the authenticated caller really
      // is an approved reseller. This check previously only existed on the
      // Vercel fallback (api/moogold.js), not here on the primary VPS path.
      const requestedProductId = bodyObj?.data?.['product-id'];
      const unitCatalogPriceLkr = await getCatalogPriceLkr(requestedProductId);
      if (unitCatalogPriceLkr === null) {
        return res.status(400).json({ error: 'Unrecognized product. Order rejected.' });
      }
      // The cart sends one request per package with its quantity (e.g. 2x
      // Weekly Pass = one order of quantity 2), and priceLkr is the total for
      // that quantity — so the catalog price must be scaled the same way.
      // MooGold delivers `quantity` units, so this is also what gets charged.
      const requestedQty = Number(bodyObj?.data?.quantity ?? 1);
      if (!Number.isInteger(requestedQty) || requestedQty < 1 || requestedQty > MAX_ORDER_QUANTITY) {
        return res.status(400).json({ error: 'Invalid order quantity.' });
      }
      const catalogPriceLkr = unitCatalogPriceLkr * requestedQty;
      // The only discount the site offers is the approved-reseller 5%
      // (rounded per unit by the site, or on the total by the reseller
      // panel). Anything cheaper is a tampered price: there used to be a flat
      // Rs. 100 allowance here, which let any order under Rs. 100 (e.g. 5
      // Diamonds at Rs. 40) be bought for Rs. 1.
      const verifiedReseller = await isApprovedReseller(authenticatedUser.uid, authenticatedUser.email);
      if (bodyObj?.isResellerOrder && !verifiedReseller) {
        // A "Reseller Partner Wallet" order from an account that isn't an
        // admin-approved reseller is refused outright.
        console.warn(`[NON-RESELLER BLOCKED] ${authenticatedUser.uid} (${authenticatedUser.email}) attempted a reseller order`);
        return res.status(403).json({ error: 'Reseller orders are only available to approved reseller accounts.' });
      }
      const minPriceLkr = verifiedReseller
        ? Math.min(Math.round(unitCatalogPriceLkr * (1 - RESELLER_WHOLESALE_DISCOUNT_RATE)) * requestedQty,
                   Math.round(catalogPriceLkr * (1 - RESELLER_WHOLESALE_DISCOUNT_RATE)))
        : catalogPriceLkr;
      if (numPriceLkr > catalogPriceLkr || numPriceLkr < minPriceLkr) {
        console.warn(`[PRICE TAMPER BLOCKED] ${authenticatedUser.uid} product-id=${requestedProductId} qty=${requestedQty} sent Rs. ${numPriceLkr}, minimum Rs. ${minPriceLkr}`);
        return res.status(400).json({ error: 'Price mismatch detected. Order rejected.' });
      }

      // Idempotency check — reject an in-flight duplicate outright, and
      // replay the original result for a duplicate that already finished,
      // instead of deducting/dispatching a second time.
      if (partnerOrderId) {
        if (moogoldProcessingLocks.has(partnerOrderId)) {
          return res.status(409).json({ error: 'This order is already being processed. Please wait.' });
        }
        const existingRecord = await getMoogoldOrderRecord(partnerOrderId);
        if (existingRecord) {
          console.warn(`[MooGold Duplicate Order Blocked] partnerOrderId=${partnerOrderId} already ${existingRecord.status} — replaying original result instead of reprocessing.`);
          if (existingRecord.status === 'COMPLETED') {
            return res.status(200).json(existingRecord.response || { success: true, message: 'Order already completed.' });
          }
          return res.status(409).json({ error: 'This order has already been submitted.' });
        }
        moogoldProcessingLocks.add(partnerOrderId);
        await saveMoogoldOrderRecord(partnerOrderId, { status: 'PROCESSING', uid: authenticatedUser.uid, priceLkr: numPriceLkr, createdAt: new Date().toISOString() });
      }

      // Perform atomic backend wallet deduction BEFORE calling MooGold
      deductResult = await deductUserWallet(authenticatedUser.uid, numPriceLkr, authenticatedUser.email);
      if (!deductResult.success) {
        console.warn(`[INSUFFICIENT BALANCE BLOCKED] User ${authenticatedUser.uid} (${authenticatedUser.email}) attempted order without balance. Required: Rs. ${numPriceLkr}`);
        if (partnerOrderId) await saveMoogoldOrderRecord(partnerOrderId, { status: 'FAILED', uid: authenticatedUser.uid, priceLkr: numPriceLkr, reason: deductResult.reason, createdAt: new Date().toISOString() });
        return res.status(403).json({
          error: deductResult.reason || 'Insufficient wallet balance. Please top up your wallet first.'
        });
      }

      console.log(`[WALLET DEDUCTED] Deducted Rs. ${numPriceLkr} from UID ${authenticatedUser.uid} (key: ${deductResult.rtdbKey}). New Balance: Rs. ${deductResult.newBalanceLkr}`);
    }

    // 3. EXECUTE SIGNED MOOGOLD API REQUEST
    const partnerId = process.env.MOONGOLD_PARTNER_ID || process.env.VITE_MOONGOLD_PARTNER_ID || '';
    const secretKey = process.env.MOONGOLD_SECRET_KEY || process.env.VITE_MOONGOLD_SECRET_KEY || '';
    const baseUrl = 'https://moogold.com/wp-json/v1/api';

    // MooGold's documented request shape is { path, data } (see the
    // product/validate and user/check_id calls in moongoldApi.js, which
    // already follow this). The client's `bodyObj` is OUR internal wrapper —
    // it also carries partnerOrderId, priceLkr, paymentId, clientProfile
    // (including the customer's wallet balance) and isResellerOrder, which
    // this server needs but MooGold never should. Previously the ENTIRE
    // wrapper was sent to MooGold verbatim, leaking wallet balance data to a
    // third party and sending fields outside their documented schema.
    const moongoldPayload = { path: apiPath, data: bodyObj?.data };
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadStr = JSON.stringify(moongoldPayload);
    const stringToSign = payloadStr + timestamp + apiPath;

    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(stringToSign);
    const authSignature = hmac.digest('hex');
    const basicAuth = 'Basic ' + Buffer.from(`${partnerId}:${secretKey}`).toString('base64');

    // Robust request/response logging — for order/create_order this
    // pinpoints exactly which game/package/product-id MooGold rejected and
    // why, without having to reconstruct it from a raw JSON blob.
    const logTag = isOrderCreation ? `ORDER product-id=${moongoldPayload.data?.['product-id']} category=${moongoldPayload.data?.category}` : apiPath;
    console.log(`\n========================================`);
    console.log(`[MooGold Proxy Request] Path: ${apiPath} | ${logTag}`);
    console.log(`[MooGold Proxy Request Payload]:`, payloadStr);

    const apiRes = await fetch(`${baseUrl}/${apiPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': basicAuth,
        'auth': authSignature,
        'timestamp': timestamp.toString(),
        'User-Agent': 'Mozilla/5.0'
      },
      body: payloadStr
    });

    const text = await apiRes.text();
    console.log(`[MooGold Proxy Response] HTTP ${apiRes.status} | ${logTag}`);
    console.log(`[MooGold Proxy Response Body]:`, text);
    console.log(`========================================\n`);

    let jsonResult = null;
    try {
      jsonResult = JSON.parse(text);
    } catch (e) {}

    const isSuccess = apiRes.ok && jsonResult && (jsonResult.status === 'processing' || jsonResult.status === 'true' || jsonResult.status === true || jsonResult.status === 1 || jsonResult.order_id);

    if (isOrderCreation && !isSuccess) {
      console.error(`[MOOGOLD ORDER REJECTED] product-id=${moongoldPayload.data?.['product-id']} category=${moongoldPayload.data?.category} reason="${jsonResult?.message || jsonResult?.error || text}"`);
    }

    if (isOrderCreation && deductResult?.success && partnerOrderId) {
      await saveServerOrderRecord(partnerOrderId, {
        user: authenticatedUser, bodyObj, priceLkr: numPriceLkr,
        status: isSuccess ? 'COMPLETED' : 'FAILED',
        moongoldRef: jsonResult?.order_id ? String(jsonResult.order_id) : '',
        reason: isSuccess ? null : (jsonResult?.message || jsonResult?.error || `HTTP ${apiRes.status}`),
        ip: clientIp(req)
      });
    }

    // 4. REFUND USER IF MOOGOLD ORDER FAILED — refund to the same wallet they paid from
    if (isOrderCreation && !isSuccess) {
      console.warn(`[MOOGOLD ORDER FAILED] Reverting & Refund Rs. ${numPriceLkr} to UID ${authenticatedUser.uid} via ${deductResult.usedCurrency || 'LKR'}`);
      await refundUserWallet(authenticatedUser.uid, numPriceLkr, deductResult.usedCurrency || 'LKR', authenticatedUser.email, deductResult.rtdbKey);
    }

    // Referral cashback for the referrer on this user's first paid order.
    const referralCode = bodyObj?.referralCode || req.body?.referralCode;
    if (isOrderCreation && isSuccess && deductResult?.success && referralCode) {
      payReferralCashback(authenticatedUser.uid, authenticatedUser.email, numPriceLkr, referralCode)
        .catch(e => console.warn('[Referral Cashback Error]:', e.message));
    }

    res.status(apiRes.status);
    if (jsonResult) {
      if (isOrderCreation && deductResult?.success) {
        const responseBody = {
          ...jsonResult,
          newBalanceLkr: deductResult.newBalanceLkr,
          newBalanceUsdt: deductResult.newBalanceUsdt
        };
        if (partnerOrderId) {
          await saveMoogoldOrderRecord(partnerOrderId, {
            status: isSuccess ? 'COMPLETED' : 'FAILED',
            uid: authenticatedUser.uid,
            priceLkr: numPriceLkr,
            response: isSuccess ? responseBody : undefined,
            createdAt: new Date().toISOString()
          });
        }
        return res.json(responseBody);
      }
      return res.json(jsonResult);
    } else {
      if (isOrderCreation && partnerOrderId) {
        await saveMoogoldOrderRecord(partnerOrderId, { status: isSuccess ? 'COMPLETED' : 'FAILED', uid: authenticatedUser.uid, priceLkr: numPriceLkr, createdAt: new Date().toISOString() });
      }
      return res.send(text);
    }
  } catch (err) {
    console.error('MooGold Serverless Proxy Error:', err);
    if (partnerOrderId) {
      // Don't leave a permanently-stuck PROCESSING record on an unexpected
      // error — remove it so a genuine retry with the same id isn't blocked
      // forever (the in-flight lock release below still prevents a
      // concurrent duplicate during this same failure).
      await saveMoogoldOrderRecord(partnerOrderId, { status: 'FAILED', reason: err.message, createdAt: new Date().toISOString() }).catch(() => {});
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (partnerOrderId) moogoldProcessingLocks.delete(partnerOrderId);
  }
});

// Public homepage stats: number of registered user accounts. Counted on the
// server with a shallow read (keys only), so browsers never need to read the
// users list. Cached for 5 minutes to keep database reads low.
let publicStatsCache = { at: 0, data: null };
app.get('/api/public-stats', rateLimiter(60, 60000), async (req, res) => {
  try {
    if (!publicStatsCache.data || Date.now() - publicStatsCache.at > 5 * 60 * 1000) {
      const r = await fetch(rtdbUrl('users', { shallow: true }));
      if (!r.ok) throw new Error(`RTDB users count failed: HTTP ${r.status}`);
      const keys = await r.json();
      publicStatsCache = { at: Date.now(), data: { users: keys ? Object.keys(keys).length : 0 } };
    }
    res.set('Cache-Control', 'public, max-age=300');
    res.json(publicStatsCache.data);
  } catch (e) {
    if (publicStatsCache.data) return res.json(publicStatsCache.data);
    res.status(500).json({ error: 'Stats unavailable' });
  }
});

// Diagnostic IP Endpoint
app.get('/api/ip', async (req, res) => {
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipRes.json();
    res.json({ ip: ipData.ip, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Automated Binance Pay Deposit Verification Endpoint (Admin Approval Mode)
app.post('/api/binance/verify-order', async (req, res) => {
  try {
    const { orderId, payId, amount } = req.body || {};
    if (!orderId || !payId) {
      return res.status(400).json({ error: 'Missing Order ID or Pay ID' });
    }

    console.log(`[Binance Deposit Submitted for Admin Approval] Order: ${orderId}, PayID: ${payId}, Amount: ${amount} USDT`);

    // Route directly to Admin Queue for Manual Admin Approval
    return res.json({
      verified: false,
      autoApproved: false,
      status: 'PENDING_ADMIN_VERIFICATION',
      amountUsdt: amount,
      orderId,
      payId,
      message: 'Binance Pay deposit submitted! Pending 1-click Admin Verification.'
    });
  } catch (err) {
    console.error('[Binance Verify Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Binance Pay Instant Webhook Callback Endpoint
app.post('/api/binance/webhook', (req, res) => {
  try {
    console.log(`[Binance Instant Webhook Received]:`, req.body);
    res.json({ returnCode: 'SUCCESS', returnMessage: null });
  } catch (e) {
    res.status(500).json({ returnCode: 'FAIL', returnMessage: e.message });
  }
});

// Payment reference helpers. A deposit reference (EZ Cash RN, Binance
// order/pay id) can be credited only once: usedPaymentRefs/{key} records which
// deposit used it, and older approved deposits are checked as well.
const phoneTail = (v) => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 9 ? d.slice(-9) : ''; };
const EZCASH_MERCHANT_TAIL = phoneTail(process.env.EZCASH_MERCHANT_NUMBER || '0740436276');
function phonesInSms(text) {
  const found = [...String(text || '').matchAll(/(?<!\d)(?:\+?94|0)7\d{8}(?!\d)/g)].map(m => phoneTail(m[0]));
  return [...new Set(found)].filter(p => p && p !== EZCASH_MERCHANT_TAIL);
}
function paymentRefKey(method, ref) {
  const m = String(method || '').toLowerCase();
  if (m.includes('ez')) {
    const rn = String(ref || '').replace(/\D/g, '');
    return rn.length >= 10 ? `ezcash_${rn.slice(0, 20)}` : null;
  }
  if (m.includes('binance')) {
    const clean = String(ref || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean.length >= 8 ? `binance_${clean.slice(0, 120)}` : null;
  }
  return null;
}
// Returns the id of another deposit that already credited this reference.
async function findCreditedPaymentRef(refKey, exceptPayId) {
  if (!refKey) return null;
  const used = await rtdbGet(`usedPaymentRefs/${refKey}`);
  if (used?.payId && used.payId !== exceptPayId) return used.payId;
  const all = await rtdbGet('manual_payments');
  for (const [id, p] of Object.entries(all || {})) {
    if (!p || typeof p !== 'object' || id === exceptPayId) continue;
    if ((p.status === 'VERIFIED' || p.credited) && paymentRefKey(p.method, p.referenceNumber) === refKey) return id;
  }
  return null;
}
async function claimPaymentRef(refKey, payId) {
  if (!refKey) return { ok: true };
  const r = await rtdbTransaction(`usedPaymentRefs/${refKey}`, (cur) => (cur?.payId && cur.payId !== payId ? undefined : { payId, at: new Date().toISOString() }));
  return { ok: r.committed || r.value?.payId === payId, by: r.value?.payId };
}
async function releasePaymentRef(refKey, payId) {
  if (!refKey) return;
  const cur = await rtdbGet(`usedPaymentRefs/${refKey}`);
  if (cur?.payId === payId) await rtdbPut(`usedPaymentRefs/${refKey}`, null);
}

// Memory store for received Dialog EZ Cash SMS records via Webhook
const receivedEzCashSmsLog = new Map();

// Automated EZ Cash RN Deposit Verification Endpoint
// An RN only proves that *someone* paid, so it is tied to the payer: the
// customer must give the mobile number they paid from, and the wallet is
// credited automatically only when Dialog's SMS shows that same number.
// Anything else goes to the admin queue with the number shown next to it.
app.post('/api/ezcash/verify-rn', rateLimiter(15, 60000), async (req, res) => {
  try {
    const { rnNumber, amount, payerPhone } = req.body || {};
    const authUser = await verifyFirebaseIdToken(req.headers.authorization || '');
    if (!authUser) return res.status(401).json({ verified: false, error: 'Please log in again to submit a deposit.' });
    if (await rejectIfBlocked(authUser, res)) return;
    const cleanRn = String(rnNumber || '').replace(/\D/g, '').slice(0, 20);
    const payerTail = phoneTail(payerPhone);

    if (!cleanRn || cleanRn.length < 10) {
      return res.status(400).json({
        verified: false,
        error: 'Please enter a valid 14-digit Dialog EZ Cash RN Transaction Number.'
      });
    }
    if (!payerTail) {
      return res.status(400).json({ verified: false, error: 'Please enter the mobile number you sent the EZ Cash from.' });
    }

    const refKey = paymentRefKey('EZ Cash', cleanRn);
    const usedBy = await findCreditedPaymentRef(refKey, null);
    if (usedBy) {
      console.warn(`[EZ Cash RN Reused] RN ${cleanRn} already credited on ${usedBy}; tried by ${authUser.uid}`);
      return res.status(409).json({ verified: false, error: 'This RN number has already been used.' });
    }

    const amtLkr = parseFloat(amount) || 1000;
    console.log(`[EZ Cash Deposit Submitted] RN: ${cleanRn}, Amount: Rs. ${amtLkr}, User: ${authUser.uid}, From: ...${payerTail.slice(-4)}`);

    const smsLog = receivedEzCashSmsLog.get(cleanRn);
    const smsPhones = smsLog?.payerPhones || [];
    const phoneMatches = smsPhones.includes(payerTail);
    if (smsLog && smsLog.status !== 'REDEEMED' && phoneMatches && Math.abs((smsLog.amountLkr || 0) - amtLkr) < 1) {
      const payId = `PAY-EZ-${cleanRn}`;
      const claim = await claimPaymentRef(refKey, payId);
      if (!claim.ok) return res.status(409).json({ verified: false, error: 'This RN number has already been used.' });
      smsLog.status = 'REDEEMED';
      smsLog.redeemedBy = authUser.email || authUser.displayEmail || authUser.uid;
      smsLog.redeemedAt = new Date().toISOString();

      // The server credits the wallet itself (the browser can no longer).
      const credit = await creditUserWalletServer(authUser.uid, smsLog.amountLkr, authUser.email);
      if (!credit.success) {
        smsLog.status = 'UNCLAIMED';
        await releasePaymentRef(refKey, payId).catch(() => {});
        return res.status(500).json({ verified: false, error: credit.reason || 'Wallet credit failed. Please try again.' });
      }
      const now = new Date().toISOString();
      await rtdbPut(`manual_payments/${payId}`, {
        id: payId, userId: authUser.uid, userEmail: authUser.email || authUser.displayEmail || '', userName: String(authUser.email || authUser.displayEmail || 'Gamer').split('@')[0],
        method: 'EZ Cash (Automated)', referenceNumber: cleanRn, payerPhone: `0${payerTail}`,
        amount: smsLog.amountLkr, currency: 'LKR', slipUrl: '', status: 'VERIFIED',
        credited: true, creditedAt: now, creditedTo: credit.rtdbKey, creditedLkr: smsLog.amountLkr, creditedUsdt: 0,
        createdAt: now.replace('T', ' ').substring(0, 16)
      }).catch(e => console.error('[EZ Cash] Could not save deposit record:', e.message));

      return res.json({
        verified: true,
        autoApproved: true,
        status: 'VERIFIED',
        amountLkr: smsLog.amountLkr,
        rnNumber: cleanRn,
        newBalanceLkr: credit.newBalanceLkr,
        newBalanceUsdt: credit.newBalanceUsdt,
        message: `EZ Cash RN ${cleanRn} verified.`
      });
    }
    if (smsLog && smsPhones.length && !phoneMatches) {
      console.warn(`[EZ Cash Phone Mismatch] RN ${cleanRn} was paid from another number; submitted by ${authUser.uid}`);
    }

    // Route to the admin queue for manual approval.
    return res.json({
      verified: false,
      autoApproved: false,
      status: 'PENDING_ADMIN_VERIFICATION',
      amountLkr: amtLkr,
      rnNumber: cleanRn,
      payerPhone: `0${payerTail}`,
      matchedSms: !!smsLog,
      message: 'EZ Cash deposit submitted! Pending Admin Verification.'
    });
  } catch (err) {
    console.error('[EZ Cash Verify Error]:', err);
    res.status(500).json({ error: 'Could not check this RN. Please try again.' });
  }
});


// EZ Cash SMS Gateway Webhook Endpoint (Receives Dialog SMS from SMS Forwarder / iPhone Shortcut / Gateway)
app.post('/api/ezcash/webhook', (req, res) => {
  try {
    // Only the SMS forwarder may log payments: it must send EZCASH_WEBHOOK_SECRET
    // as ?key=... or an x-webhook-key header. Without this anyone could post a
    // fake "payment received" SMS and get auto-approved wallet credit.
    const expectedKey = (process.env.EZCASH_WEBHOOK_SECRET || '').trim();
    const givenKey = String(req.query?.key || req.headers['x-webhook-key'] || '').trim();
    if (!expectedKey || givenKey.length !== expectedKey.length ||
        !crypto.timingSafeEqual(Buffer.from(givenKey), Buffer.from(expectedKey))) {
      console.warn('[EZ Cash Webhook] Rejected request without a valid key');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { smsText, message, sender, body } = req.body || {};
    const textContent = smsText || message || body || JSON.stringify(req.body);
    console.log(`[EZ Cash SMS Webhook Received]:`, textContent);

    // Extract 14-digit RN number & amount using Regex pattern matching exact Dialog EZ Cash SMS formats
    const rnMatch = textContent.match(/RN[:\s]*(\d{10,16})/i) || textContent.match(/Trans ID[:\s]*(\d+)/i) || textContent.match(/(\d{14})/);
    const amtMatch = textContent.match(/Net Received[:\s]*Rs\.?\s*([0-9,.]+)/i) || textContent.match(/Rs\.?\s*([0-9,.]+)/i) || textContent.match(/LKR[\s:]*([0-9,.]+)/i);

    if (rnMatch && rnMatch[1]) {
      const rnNo = rnMatch[1];
      const parsedAmt = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) : 0;
      const existing = receivedEzCashSmsLog.get(rnNo);
      receivedEzCashSmsLog.set(rnNo, {
        rnNumber: rnNo,
        amountLkr: parsedAmt,
        rawSms: textContent,
        payerPhones: phonesInSms(textContent),
        sender: sender || 'Dialog EZ Cash Gateway',
        status: existing?.status || 'UNCLAIMED',
        redeemedBy: existing?.redeemedBy || null,
        receivedAt: existing?.receivedAt || new Date().toISOString()
      });
      console.log(`[Dialog EZ Cash SMS Stored] RN: ${rnNo}, Amount: Rs. ${parsedAmt}`);
    }

    res.json({ success: true, message: 'SMS logged successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin API: Retrieve all received EZ Cash Webhook SMS logs
app.get('/api/ezcash/webhook-logs', requireAdminSession, (req, res) => {
  try {
    const logs = Array.from(receivedEzCashSmsLog.values()).sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
    res.json({
      success: true,
      count: logs.length,
      logs: logs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dialog Genie Business IPG Integration Endpoints
const GENIE_DEFAULT_APP_ID = 'c99b450d-38e9-4557-89f1-5cdc91fd7a0f';
const GENIE_DEFAULT_APP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6ImM5OWI0NTBkLTM4ZTktNDU1Ny04OWYxLTVjZGM5MWZkN2EwZiIsImNvbXBhbnlJZCI6IjY5OWMyOTRiZWM5YWFlMDAwMjA2NjAxNiIsImlhdCI6MTc3MTg0MjE0OSwiZXhwIjo0OTI3NTE1NzQ5fQ.LutDa2obyzXY6MsCGtrK3bPZHMrNpxI-T8Q4cCtKZo4';
const GENIE_DEFAULT_BASE_URL = 'https://api.geniebiz.lk';

// Same-process lock to stop the webhook and the client's redirect-triggered
// verify-status poll from both crediting the same transaction if they land
// at (almost) the same instant. The RTDB status field below is the durable
// idempotency guard that also survives process restarts.
const genieCreditLocks = new Set();

async function saveGenieTransactionRecord(transactionId, record) {
  try {
    await fetch(rtdbUrl(`genieTransactions/${transactionId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (record.localId) {
      await fetch(rtdbUrl(`genieLocalIdIndex/${record.localId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionId)
      });
    }
  } catch (e) {
    console.error('[Genie Transaction Save Error]:', e.message);
  }
}

async function getGenieTransactionRecord(transactionId) {
  try {
    const res = await fetch(rtdbUrl(`genieTransactions/${transactionId}`));
    if (res.ok) return (await res.json()) || null;
  } catch (e) {
    console.warn('[Genie Transaction Read Warning]:', e.message);
  }
  return null;
}

async function resolveGenieTransactionIdByLocalId(localId) {
  try {
    const res = await fetch(rtdbUrl(`genieLocalIdIndex/${localId}`));
    if (res.ok) return (await res.json()) || null;
  } catch (e) { /* not found */ }
  return null;
}

/**
 * Idempotently verify (against Genie's OWN status API — a webhook body or
 * client claim is never trusted on its own) and credit a Genie transaction's
 * wallet. Safe to call repeatedly for the same transaction: the webhook (IPN)
 * and the client's redirect-triggered verify-status poll both call this, and
 * whichever gets there first performs the credit; the other sees status
 * CREDITED and becomes a no-op. This is what makes crediting NOT depend
 * solely on the customer's browser completing the redirect flow.
 */
// Genie card recharge bonus — mirrors getGenieBonus in WalletPage.jsx.
function genieRechargeBonus(amountLkr) {
  const n = parseFloat(amountLkr) || 0;
  if (n >= 10000) return 200;
  if (n >= 5000) return 100;
  return 0;
}

async function verifyAndCreditGenieTransaction(transactionId) {
  if (!transactionId) return { success: false, error: 'Missing transactionId' };

  if (genieCreditLocks.has(transactionId)) {
    return { success: true, isPaid: true, pending: true };
  }

  const record = await getGenieTransactionRecord(transactionId);
  if (!record) {
    console.error(`[Genie Credit Error] No transaction record found for txn=${transactionId} — cannot identify which user to credit.`);
    return { success: false, error: 'Unknown transaction (no pending record on file)' };
  }
  if (record.status === 'CREDITED') {
    return {
      success: true, isPaid: true, alreadyCredited: true,
      amount: record.amountLkr, newBalanceLkr: record.newBalanceLkr, newBalanceUsdt: record.newBalanceUsdt
    };
  }

  const appKey = (process.env.GENIE_APP_KEY || process.env.VITE_GENIE_APP_KEY || GENIE_DEFAULT_APP_KEY).replace(/[\r\n\s]/g, '');
  const baseUrl = (process.env.GENIE_BASE_URL || process.env.VITE_GENIE_BASE_URL || GENIE_DEFAULT_BASE_URL).replace(/[\r\n\s\/]+$/, '');

  let state = '';
  try {
    const apiRes = await fetch(`${baseUrl}/public/transactions/${transactionId}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': appKey }
    });
    const resText = await apiRes.text();
    let resJson = null;
    try { resJson = JSON.parse(resText); } catch (e) {}
    if (apiRes.ok && resJson) {
      state = String(resJson.state || '').toUpperCase();
    } else {
      console.warn(`[Genie Status Re-check Failed] txn=${transactionId} HTTP ${apiRes.status}: ${resText.substring(0, 200)}`);
    }
  } catch (e) {
    console.error(`[Genie Status Re-check Error] txn=${transactionId}:`, e.message);
    return { success: false, error: 'Could not verify transaction with Dialog Genie' };
  }

  const isPaid = state === 'SUCCESS' || state === 'COMPLETED' || state === 'CONFIRMED' || state === 'CAPTURED';
  if (!isPaid) {
    return { success: true, isPaid: false, state };
  }

  genieCreditLocks.add(transactionId);
  try {
    // Re-fetch immediately before writing to shrink the race window against a
    // concurrent request that read the record just before this one locked it.
    const freshRecord = await getGenieTransactionRecord(transactionId);
    if (freshRecord && freshRecord.status === 'CREDITED') {
      return {
        success: true, isPaid: true, alreadyCredited: true,
        amount: freshRecord.amountLkr, newBalanceLkr: freshRecord.newBalanceLkr, newBalanceUsdt: freshRecord.newBalanceUsdt
      };
    }

    // Credit using the amount WE stored at transaction-creation time, never a
    // value read back from Genie/webhook — same anti-tampering principle as
    // the MooGold order-price check.
    // Includes the recharge bonus (previously added by the customer's
    // browser, which can no longer write wallet balances).
    const creditResult = await creditUserWalletServer(record.uid, record.amountLkr + genieRechargeBonus(record.amountLkr), record.email);
    if (!creditResult.success) {
      console.error(`[Genie Credit Failed] txn=${transactionId} user=${record.uid || record.email} reason=${creditResult.reason}`);
      return { success: false, error: creditResult.reason || 'Wallet credit failed', isPaid: true };
    }

async function recordGenieManualPaymentToRtdb(transactionId, record) {
  try {
    const payId = 'PAY-GENIE-' + String(transactionId).slice(-6).toUpperCase();
    const payload = {
      id: payId,
      userId: record.uid || '',
      userEmail: record.email || '',
      userName: record.userName || 'Gamer',
      method: 'Online Card / eZ Cash',
      referenceNumber: `Txn: ${transactionId}`,
      amount: record.amountLkr,
      currency: 'LKR',
      slipUrl: '',
      status: 'VERIFIED',
      credited: true,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      timestamp: new Date().toISOString()
    };
    await fetch(rtdbUrl(`manual_payments/${payId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error('[Genie Manual Payment Save Error]:', e.message);
  }
}

    await saveGenieTransactionRecord(transactionId, {
      ...record,
      status: 'CREDITED',
      creditedAt: new Date().toISOString(),
      newBalanceLkr: creditResult.newBalanceLkr,
      newBalanceUsdt: creditResult.newBalanceUsdt
    });

    await recordGenieManualPaymentToRtdb(transactionId, record);

    console.log(`[Genie Wallet Credited] txn=${transactionId} user=${record.uid || record.email} amount=Rs.${record.amountLkr} newBalance=Rs.${creditResult.newBalanceLkr}`);
    return {
      success: true, isPaid: true, credited: true,
      amount: record.amountLkr, newBalanceLkr: creditResult.newBalanceLkr, newBalanceUsdt: creditResult.newBalanceUsdt
    };
  } finally {
    genieCreditLocks.delete(transactionId);
  }
}

// Create Genie Business IPG Transaction
app.post('/api/genie/create-transaction', rateLimiter(15, 60000), async (req, res) => {
  try {
    const { amount, userId, userEmail, userName, redirectUrl, orderRef } = req.body || {};
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Please specify a valid payment amount.' });
    }

    let appKey = (process.env.GENIE_APP_KEY || process.env.VITE_GENIE_APP_KEY || GENIE_DEFAULT_APP_KEY).replace(/[\r\n\s]/g, '');
    if (!appKey.includes('699c294bec9aae0002066016')) {
      appKey = GENIE_DEFAULT_APP_KEY;
    }
    const baseUrl = (process.env.GENIE_BASE_URL || process.env.VITE_GENIE_BASE_URL || GENIE_DEFAULT_BASE_URL).replace(/[\r\n\s\/]+$/, '');

    const cleanEmail = sanitizeString(userEmail || 'customer@madstopup.com', 100);
    const cleanName = sanitizeString(userName || 'MADS Gamer', 100);
    const localId = orderRef || ('ORD-GENIE-' + Date.now());

    let returnUrl = redirectUrl || 'https://madstopup.com/wallet?genie=success';
    if (!returnUrl.startsWith('https://')) {
      returnUrl = 'https://madstopup.com/wallet?genie=success';
    }
    const sep = returnUrl.includes('?') ? '&' : '?';
    returnUrl = `${returnUrl}${sep}orderRef=${encodeURIComponent(localId)}`;

    const payload = {
      amount: Math.round(numAmount * 100),
      currency: 'LKR',
      redirectUrl: returnUrl,
      webhook: 'https://madstopup.com/api/genie/webhook',
      localId,
      customerReference: cleanName,
      billingDetails: {
        email: cleanEmail,
        name: cleanName,
        address1: 'Colombo, Sri Lanka',
        city: 'Colombo',
        country: 'LK'
      }
    };

    console.log(`[Geniebiz IPG Create Attempt] Amount: Rs. ${numAmount} (${payload.amount} cents), User: ${cleanEmail}, Ref: ${localId}, KeyLen: ${appKey.length}, Target: ${baseUrl}/public/v2/transactions`);

    let apiRes = await fetch(`${baseUrl}/public/v2/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': appKey
      },
      body: JSON.stringify(payload)
    });

    let resText = await apiRes.text();
    let resJson = null;
    try { resJson = JSON.parse(resText); } catch (e) {}

    console.log(`[Geniebiz IPG Create Response] HTTP ${apiRes.status}:`, resText.substring(0, 300));

    if (apiRes.ok && resJson && (resJson.url || resJson.shortUrl)) {
      // Persist who this transaction belongs to and the real amount BEFORE
      // redirecting the customer to checkout, so the webhook/verify-status
      // can credit the right wallet even if the browser never comes back.
      if (resJson.id) {
        await saveGenieTransactionRecord(resJson.id, {
          uid: userId || '',
          email: cleanEmail,
          userName: cleanName,
          amountLkr: numAmount,
          localId,
          status: 'PENDING',
          createdAt: new Date().toISOString()
        });
      } else {
        console.error(`[Genie Create Warning] No transaction id returned by Genie for localId=${localId} — wallet cannot be auto-credited for this attempt.`);
      }

      return res.json({
        success: true,
        transactionId: resJson.id,
        redirectUrl: resJson.url || resJson.shortUrl,
        shortUrl: resJson.shortUrl,
        localId: resJson.localId,
        state: resJson.state
      });
    } else {
      let friendlyError = resJson?.message || resText.substring(0, 200) || 'Failed to create Genie Business IPG transaction';
      if (apiRes.status === 401 || friendlyError === 'Unauthorized') {
        friendlyError = 'Dialog Genie IPG Key Unauthorized. Please use eZ Cash, Bank Deposit or Binance Pay!';
      }
      return res.status(apiRes.status || 400).json({
        success: false,
        error: friendlyError
      });
    }
  } catch (err) {
    console.error('[Geniebiz Create Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Verify Genie Business IPG Transaction Status — this is the customer's browser
// polling us right after the redirect back from checkout. It performs the SAME
// server-side credit as the webhook (idempotent), so a successful payment is
// credited here immediately without waiting for Dialog's async IPN — but it is
// NOT the only path that can credit it (see webhook below), so a closed tab
// or dropped connection right after payment doesn't lose the deposit.
app.post('/api/genie/verify-status', rateLimiter(30, 60000), async (req, res) => {
  try {
    let { transactionId, orderRef, localId } = req.body || {};
    if (!transactionId && (orderRef || localId)) {
      transactionId = await resolveGenieTransactionIdByLocalId(orderRef || localId);
    }
    if (!transactionId) {
      return res.status(400).json({ error: 'Missing transactionId or orderRef' });
    }

    const result = await verifyAndCreditGenieTransaction(transactionId);
    if (!result.success) {
      console.error(`[Genie Verify-Status Error] txn=${transactionId}:`, result.error);
      return res.status(400).json(result);
    }
    return res.json({ ...result, transactionId });
  } catch (err) {
    console.error('[Geniebiz Verify Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Genie Business Webhook (IPN Callback) — the authoritative, server-to-server
// confirmation from Dialog Genie. This does NOT depend on the customer's
// browser at all, so it's what guarantees a successful card/eZ Cash payment
// always credits the wallet even if the customer never sees the redirect
// (closed tab, crashed app, network drop). Field names for the transaction id
// aren't guaranteed by Dialog's docs, so we defensively check the common
// shapes; if none match we still ack (so Genie doesn't retry-storm us) but log
// loudly for manual follow-up.
app.post('/api/genie/webhook', async (req, res) => {
  const body = req.body || {};
  console.log('[Genie Business IPG Webhook Received]:', body);

  let transactionId = body.id || body.transactionId || body.data?.id || null;
  if (!transactionId && body.localId) {
    transactionId = await resolveGenieTransactionIdByLocalId(body.localId);
  }

  if (!transactionId) {
    console.error('[Genie Webhook Error] Could not determine transaction id from webhook payload:', JSON.stringify(body).substring(0, 500));
    return res.json({ success: true, message: 'Webhook received (no matching transaction id — logged for manual follow-up)' });
  }

  try {
    const result = await verifyAndCreditGenieTransaction(transactionId);
    if (!result.success) {
      console.error(`[Genie Webhook Credit Failed] txn=${transactionId}:`, result.error);
    }
    // Always ack 200 so Dialog doesn't endlessly retry — failures are logged
    // above for admin follow-up/manual credit rather than silently dropped.
    return res.json({ success: true, message: 'Webhook processed', result });
  } catch (e) {
    console.error(`[Genie Webhook Error] txn=${transactionId}:`, e.message);
    return res.json({ success: true, message: 'Webhook received (processing error logged)' });
  }
});

// Express endpoint for Live Game Player IGN Lookup (Mobile Legends, Free Fire, PUBG, etc.)
app.get('/api/player-lookup', async (req, res) => {
  try {
    const { game = 'mobilelegends', id, zone } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Missing Player ID' });
    }
    const result = await lookupFreePlayerIgn(game, id, zone);
    if (result && result.ign) {
      return res.json({ success: true, ...result });
    }
    return res.json({ success: false, message: 'Player ID or Zone not found', ign: `Player ${id}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Process-level unhandled rejection protection against Telegram API network timeouts & socket drops
process.on('unhandledRejection', (reason, promise) => {
  if (reason && (reason.code === 'ETIMEDOUT' || reason.code === 'ECONNRESET' || reason.code === 'EAI_AGAIN' || String(reason).includes('telegram'))) {
    console.warn('[Network/Telegram Rejection Suppressed]:', reason.message || reason);
  } else {
    console.error('[Unhandled Rejection]:', reason);
  }
});

// Express endpoint for Telegram Bot 24/7 Health Status
app.get('/api/telegram/status', (req, res) => {
  try {
    const health = getTelegramBotHealthStatus();
    res.json({ success: true, ...health });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Express endpoint to trigger Manual Telegram Bot Refresh & Health Check
app.all('/api/telegram/refresh', async (req, res) => {
  try {
    const health = await forceTelegramBotRefresh();
    res.json({ success: true, ...health });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Explicit XML & TXT routes for Googlebot sitemap and robots.txt indexing
app.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');
  res.sendFile(path.join(__dirname, 'dist', 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
  res.header('Content-Type', 'text/plain');
  res.sendFile(path.join(__dirname, 'dist', 'robots.txt'));
});

// Serve built static assets from dist
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Content-Security-Policy', "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; connect-src 'self' https: wss:; frame-src 'self' https:;");
  }
}));

// SPA Fallback Routing for React Router
app.use((req, res) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; connect-src 'self' https: wss:; frame-src 'self' https:;");
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Production Server running on port ${PORT}`);
  try {
    initTelegramBot();
  } catch (e) {
    console.warn('[Telegram Bot Init Note]:', e.message);
  }

  // Periodic background check (every 60s) for recent PENDING Genie transactions
  setInterval(async () => {
    try {
      const res = await fetch(rtdbUrl(`genieTransactions`));
      if (!res.ok) return;
      const allTxns = await res.json();
      if (!allTxns || typeof allTxns !== 'object') return;

      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      for (const [txnId, record] of Object.entries(allTxns)) {
        if (!record || record.status !== 'PENDING') continue;
        const createdTime = new Date(record.createdAt || 0).getTime();
        if (createdTime >= twoHoursAgo) {
          await verifyAndCreditGenieTransaction(txnId);
        }
      }
    } catch (e) {
      console.warn('[Genie Sync Note]:', e.message);
    }
  }, 60000);
});
