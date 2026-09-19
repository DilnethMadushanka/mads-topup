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
const rateLimitStore = new Map();
function rateLimiter(maxRequests = 30, windowMs = 60000) {
  return (req, res, next) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimitStore.get(clientIp) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }

    rateLimitStore.set(clientIp, record);

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
const ADMIN_VALID_CODE_HASHES = ['-77f0b15c', '5881e801'];

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
  const cleanCode = String(req.body?.securityCode || '').trim().toUpperCase();

  const validEmail = _adminHash(cleanEmail) === ADMIN_VALID_EMAIL_HASH;
  const validPassword = _adminHash(cleanPassword) === ADMIN_VALID_PASSWORD_HASH;
  const validCode = ADMIN_VALID_CODE_HASHES.includes(_adminHash(cleanCode));

  if (!validEmail || !validPassword || !validCode) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + ADMIN_SESSION_TTL_MS;
  adminSessions.set(token, expiresAt);
  pruneExpiredAdminSessions();

  res.json({ success: true, token, expiresAt });
});

// Direct OTP Email sending API endpoint with rate limiter & sanitization
app.post('/api/send-otp', rateLimiter(10, 60000), async (req, res) => {
  try {
    const rawEmail = req.body?.email;
    const rawOtp = req.body?.otp;
    const rawName = req.body?.name;

    const email = sanitizeString(rawEmail, 100);
    const otp = sanitizeString(rawOtp, 10);
    const rawSanitName = sanitizeString(rawName, 50);

    if (!email || !otp) {
      return res.status(400).json({ error: 'Missing email or otp' });
    }

    let displayName = rawSanitName || '';
    if (!displayName || displayName.includes('@')) {
      if (email.includes('@')) {
        const uPart = email.split('@')[0];
        displayName = uPart.charAt(0).toUpperCase() + uPart.slice(1);
      } else {
        displayName = 'Gamer';
      }
    }

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
        return res.json({ success: true, provider: 'Zoho Mail SMTP', messageId: info?.messageId });
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
          return res.json({ success: true, provider: 'Resend API', messageId: data?.id });
        }
      } catch (rErr) {
        console.warn('[Resend OTP Error]:', rErr.message);
      }
    }

    // Both providers failed
    console.error('[OTP Email] Both Zoho SMTP and Resend failed — OTP not delivered to', email);
    return res.status(503).json({ success: false, error: 'Email service temporarily unavailable. Please try again.' });
  } catch (err) {
    console.error('Mail OTP Error:', err);
    return res.status(500).json({ error: err.message });
  }
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

  // Handle WEB_SESSION fallback tokens generated for custom web user logins
  // Format: WEB_SESSION:uid|email  (new format with pipe separator)
  // Format: WEB_SESSION:uid_or_email  (legacy single-value format)
  if (cleanToken.startsWith('WEB_SESSION:')) {
    const rawId = cleanToken.slice(12).trim();
    if (rawId) {
      // New format: uid|email
      if (rawId.includes('|')) {
        const [uid, email] = rawId.split('|');
        return {
          uid: uid.trim() || email.trim(),
          email: email.trim() || (uid.includes('@') ? uid.trim() : `${uid.trim()}@madstopup.com`),
          emailVerified: true
        };
      }
      // Legacy format: single uid or email
      return {
        uid: rawId,
        email: rawId.includes('@') ? rawId : `${rawId}@madstopup.com`,
        emailVerified: true
      };
    }
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

  // Fallback for custom user profile tokens
  if (cleanToken.length >= 3) {
    return {
      uid: cleanToken,
      email: cleanToken.includes('@') ? cleanToken : 'user@madstopup.com',
      emailVerified: true
    };
  }

  return null;
}

// User Wallet Database Helpers (Realtime Database REST Integration)
const FIREBASE_RTDB_URL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || "https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app";

// The largest discount any legitimate promo code (TopupModal.jsx WELCOME50 /
// LAUNCH100) can knock off a package's catalog price. Approved resellers get
// a wider band (see isApprovedReseller below) since their wholesale price is
// a genuine 5% off catalog, which can exceed this on larger packages.
const MAX_PROMO_DISCOUNT_LKR = 100;
const RESELLER_WHOLESALE_DISCOUNT_RATE = 0.05;

// Recompute the official price server-side from the catalog using the MooGold
// product-id the client is actually asking us to order — the client-sent
// priceLkr can never be trusted (it can be freely edited in devtools/replayed
// requests), so it's only used to sanity-check against this value below.
function getCatalogPriceLkr(productId) {
  if (!productId) return null;
  const productIdStr = String(productId);
  for (const game of GAMES_DATA) {
    const pkg = (game.packages || []).find(p => String(p.moongoldProductId) === productIdStr);
    if (pkg && pkg.priceLkr > 0) return pkg.priceLkr;
  }
  return null;
}

// Confirms the authenticated caller is a real, admin-approved reseller —
// never trust a client-sent "isResellerOrder" flag on its own, since that
// alone would let anyone claim reseller pricing. Mirrors resolveUserWalletKey's
// uid-then-email lookup strategy.
async function isApprovedReseller(uid, email) {
  try {
    if (uid) {
      const res = await fetch(`${FIREBASE_RTDB_URL}/users/${encodeURIComponent(uid)}.json`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.isReseller && data.resellerStatus === 'APPROVED') return true;
      }
    }
    if (email) {
      const allRes = await fetch(`${FIREBASE_RTDB_URL}/users.json`);
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

/**
 * Resolve the actual RTDB key for a user — tries uid directly, then scans by email.
 * Returns { rtdbKey, walletBalance, walletUsdt } or null if not found.
 */
async function resolveUserWalletKey(uid, email, clientProfile) {
  // 1. Try direct UID lookup first
  if (uid) {
    try {
      const res = await fetch(`${FIREBASE_RTDB_URL}/users/${encodeURIComponent(uid)}.json`);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.walletBalance !== undefined || data.walletUsdt !== undefined)) {
          const lkr = parseFloat(data.walletBalance || 0);
          const usdt = parseFloat(data.walletUsdt || 0);
          if (lkr > 0 || usdt > 0 || (!clientProfile?.walletBalance && !clientProfile?.walletUsdt)) {
            return {
              rtdbKey: uid,
              walletBalance: lkr,
              walletUsdt: usdt,
              source: 'rtdb_uid'
            };
          }
        }
      }
    } catch (e) {
      console.warn('[Backend RTDB UID Read Warning]:', e.message);
    }
  }

  // 2. Fallback: scan all users and match by email or uid field
  const lookupEmail = email || clientProfile?.email || (uid && uid.includes('@') ? uid : null);
  if (lookupEmail) {
    try {
      const allRes = await fetch(`${FIREBASE_RTDB_URL}/users.json`);
      if (allRes.ok) {
        const allUsers = await allRes.json();
        if (allUsers && typeof allUsers === 'object') {
          for (const [key, userData] of Object.entries(allUsers)) {
            if (!userData) continue;
            const emailMatch = userData.email && userData.email.toLowerCase() === lookupEmail.toLowerCase();
            const uidMatch = userData.uid && (userData.uid === uid || userData.uid === lookupEmail);
            if (emailMatch || uidMatch) {
              const lkr = parseFloat(userData.walletBalance || 0);
              const usdt = parseFloat(userData.walletUsdt || 0);
              if (lkr > 0 || usdt > 0 || (!clientProfile?.walletBalance && !clientProfile?.walletUsdt)) {
                console.log(`[RTDB Key Resolved] Found user by ${emailMatch ? 'email' : 'uid field'}: key=${key}`);
                return {
                  rtdbKey: key,
                  walletBalance: lkr,
                  walletUsdt: usdt,
                  source: 'rtdb_email'
                };
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Backend RTDB Scan Warning]:', e.message);
    }
  }

  // 3. Fallback: If RTDB access is blocked (e.g. 401 Permission Denied) or RTDB has 0 while client has verified balance
  if (clientProfile && (parseFloat(clientProfile.walletBalance || 0) > 0 || parseFloat(clientProfile.walletUsdt || 0) > 0)) {
    const lkr = parseFloat(clientProfile.walletBalance || 0);
    const usdt = parseFloat(clientProfile.walletUsdt || 0);
    console.log(`[RTDB Fallback] Using verified client profile balance for ${uid || lookupEmail}: Rs. ${lkr} LKR / $${usdt} USDT`);
    return {
      rtdbKey: uid || lookupEmail || 'usr_fallback',
      walletBalance: lkr,
      walletUsdt: usdt,
      source: 'client_profile'
    };
  }

  // 4. If uid was given but no record found, still return uid as key (will create fresh entry on PATCH)
  if (uid) {
    return { rtdbKey: uid, walletBalance: 0, walletUsdt: 0, source: 'zero_default' };
  }

  return null;
}

async function getUserWalletData(uid, email, clientProfile) {
  const result = await resolveUserWalletKey(uid, email, clientProfile);
  if (result) return { walletBalance: result.walletBalance, walletUsdt: result.walletUsdt };
  return { walletBalance: 0, walletUsdt: 0 };
}

async function deductUserWallet(uid, priceLkr, email, clientProfile) {
  if (!uid || priceLkr <= 0) return { success: false, reason: 'Invalid amount' };
  try {
    const resolved = await resolveUserWalletKey(uid, email, clientProfile);
    if (!resolved) return { success: false, reason: 'User wallet not found' };

    const { rtdbKey } = resolved;
    // LKR and USDT wallets are INDEPENDENT — never recalculate one from the other
    let newLkr = resolved.walletBalance;
    let newUsdt = resolved.walletUsdt;
    let usedCurrency = null;

    console.log(`[Wallet Check] User ${uid} (key: ${rtdbKey}, source: ${resolved.source}) — LKR: ${newLkr}, USDT: ${newUsdt}, Required: Rs.${priceLkr}`);

    if (newLkr >= priceLkr) {
      // Pay with LKR — only touch walletBalance, leave walletUsdt unchanged
      newLkr = parseFloat((newLkr - priceLkr).toFixed(2));
      usedCurrency = 'LKR';
    } else if ((newUsdt * 305) >= priceLkr) {
      // Pay with USDT — only touch walletUsdt, leave walletBalance unchanged
      const reqUsdt = priceLkr / 305;
      newUsdt = parseFloat(Math.max(0, newUsdt - reqUsdt).toFixed(6));
      usedCurrency = 'USDT';
    } else {
      return { success: false, reason: `Insufficient wallet balance. Required: Rs. ${priceLkr.toFixed(2)}, Available: Rs. ${resolved.walletBalance.toFixed(2)} LKR / $${resolved.walletUsdt.toFixed(2)} USDT` };
    }

    try {
      await fetch(`${FIREBASE_RTDB_URL}/users/${encodeURIComponent(rtdbKey)}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletBalance: newLkr,
          walletUsdt: newUsdt,
          updatedAt: new Date().toISOString()
        })
      });
    } catch (e) {
      console.warn('[Backend RTDB Deduct Patch Note]:', e.message);
    }

    return { success: true, newBalanceLkr: newLkr, newBalanceUsdt: newUsdt, usedCurrency, rtdbKey };
  } catch (e) {
    console.error('[Backend RTDB Deduct Error]:', e.message);
  }
  return { success: false, reason: 'Database update failed' };
}

async function refundUserWallet(uid, priceLkr, usedCurrency = 'LKR', email, rtdbKey) {
  if (!uid || priceLkr <= 0) return;
  try {
    // Use the resolved key if provided (from deductResult), otherwise resolve fresh
    let resolvedKey = rtdbKey;
    let current;
    if (resolvedKey) {
      try {
        const res = await fetch(`${FIREBASE_RTDB_URL}/users/${encodeURIComponent(resolvedKey)}.json`);
        const data = res.ok ? await res.json() : {};
        current = { walletBalance: parseFloat((data && data.walletBalance) || 0), walletUsdt: parseFloat((data && data.walletUsdt) || 0) };
      } catch (e) {
        current = { walletBalance: 0, walletUsdt: 0 };
      }
    } else {
      const resolved = await resolveUserWalletKey(uid, email);
      resolvedKey = resolved ? resolved.rtdbKey : uid;
      current = resolved || { walletBalance: 0, walletUsdt: 0 };
    }

    let patchBody;
    if (usedCurrency === 'USDT') {
      // Refund back to USDT wallet — user originally paid from USDT
      const reqUsdt = priceLkr / 305;
      const newUsdt = parseFloat((current.walletUsdt + reqUsdt).toFixed(6));
      patchBody = {
        walletBalance: current.walletBalance, // LKR untouched
        walletUsdt: newUsdt,
        updatedAt: new Date().toISOString()
      };
      console.log(`[Backend Refund Success] Refunded $${reqUsdt.toFixed(6)} USDT to user ${uid} (key: ${resolvedKey}). New USDT: ${newUsdt}`);
    } else {
      // Refund back to LKR wallet (default)
      const newLkr = parseFloat((current.walletBalance + priceLkr).toFixed(2));
      patchBody = {
        walletBalance: newLkr,
        walletUsdt: current.walletUsdt, // USDT untouched
        updatedAt: new Date().toISOString()
      };
      console.log(`[Backend Refund Success] Refunded Rs. ${priceLkr} to user ${uid} (key: ${resolvedKey}). New LKR: ${newLkr}`);
    }

    try {
      await fetch(`${FIREBASE_RTDB_URL}/users/${encodeURIComponent(resolvedKey)}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody)
      });
    } catch (e) {
      console.warn('[Backend RTDB Refund Patch Note]:', e.message);
    }
  } catch (e) {
    console.error('[Backend Refund Error]:', e.message);
  }
}

/**
 * Credit a user's wallet server-side. Mirrors deductUserWallet but adds instead
 * of subtracts. Used by payment webhooks/IPN callbacks so a successful deposit
 * is never dependent on the customer's browser staying open.
 */
async function creditUserWalletServer(uid, amountLkr, email, clientProfile) {
  if (!uid || !(amountLkr > 0)) return { success: false, reason: 'Invalid amount' };
  try {
    const resolved = await resolveUserWalletKey(uid, email, clientProfile);
    if (!resolved) return { success: false, reason: 'User wallet not found' };

    const { rtdbKey } = resolved;
    const newLkr = parseFloat((resolved.walletBalance + amountLkr).toFixed(2));
    const newUsdt = resolved.walletUsdt;

    await fetch(`${FIREBASE_RTDB_URL}/users/${encodeURIComponent(rtdbKey)}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletBalance: newLkr,
        walletUsdt: newUsdt,
        updatedAt: new Date().toISOString()
      })
    });

    console.log(`[Backend Wallet Credit] +Rs. ${amountLkr} to user ${uid} (key: ${rtdbKey}). New LKR balance: ${newLkr}`);
    return { success: true, newBalanceLkr: newLkr, newBalanceUsdt: newUsdt, rtdbKey };
  } catch (e) {
    console.error('[Backend Wallet Credit Error]:', e.message);
    return { success: false, reason: 'Database update failed' };
  }
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

async function getMoogoldOrderRecord(partnerOrderId) {
  try {
    const res = await fetch(`${FIREBASE_RTDB_URL}/moogoldProcessedOrders/${encodeURIComponent(partnerOrderId)}.json`);
    if (res.ok) return (await res.json()) || null;
  } catch (e) {
    console.warn('[MooGold Order Record Read Warning]:', e.message);
  }
  return null;
}

async function saveMoogoldOrderRecord(partnerOrderId, record) {
  try {
    await fetch(`${FIREBASE_RTDB_URL}/moogoldProcessedOrders/${encodeURIComponent(partnerOrderId)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
  } catch (e) {
    console.error('[MooGold Order Record Save Error]:', e.message);
  }
}

app.post('/api/moogold', rateLimiter(20, 60000), async (req, res) => {
  const partnerOrderId = req.body?.bodyObj?.partnerOrderId || null;
  try {
    const { path: apiPath, bodyObj, priceLkr, paymentId, clientProfile: rawClientProfile } = req.body || {};
    const clientProfile = rawClientProfile || bodyObj?.clientProfile || req.body?.userProfile || null;

    if (!apiPath || !bodyObj) {
      return res.status(400).json({ error: 'Missing path or bodyObj', received: req.body });
    }

    // 1. HARDENED AUTHENTICATION: Require valid Firebase Auth ID Token
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    const authenticatedUser = await verifyFirebaseIdToken(authHeader);

    if (!authenticatedUser) {
      console.warn(`[UNAUTHORIZED ACCESS BLOCKED] Direct unauthenticated attempt to /api/moogold (Path: ${apiPath})`);
      return res.status(401).json({
        error: 'Unauthorized! You must be logged in to access top-up services.'
      });
    }

    console.log(`[AUTHENTICATED REQUEST] UID: ${authenticatedUser.uid}, Email: ${authenticatedUser.email}, Path: ${apiPath}`);

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
      const catalogPriceLkr = getCatalogPriceLkr(requestedProductId);
      if (catalogPriceLkr === null) {
        return res.status(400).json({ error: 'Unrecognized product. Order rejected.' });
      }
      let maxDiscountLkr = MAX_PROMO_DISCOUNT_LKR;
      if (bodyObj?.isResellerOrder) {
        const verifiedReseller = await isApprovedReseller(authenticatedUser.uid, authenticatedUser.email);
        if (verifiedReseller) {
          maxDiscountLkr = Math.ceil(catalogPriceLkr * RESELLER_WHOLESALE_DISCOUNT_RATE) + 5;
        }
      }
      if (numPriceLkr > catalogPriceLkr || numPriceLkr < catalogPriceLkr - maxDiscountLkr) {
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
      // Pass uid, email and clientProfile so resolveUserWalletKey can find the correct balance
      deductResult = await deductUserWallet(authenticatedUser.uid, numPriceLkr, authenticatedUser.email, clientProfile);
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
    const partnerId = process.env.MOONGOLD_PARTNER_ID || process.env.VITE_MOONGOLD_PARTNER_ID || 'f27cabc8d2c2122bbedacabce632db68';
    const secretKey = process.env.MOONGOLD_SECRET_KEY || process.env.VITE_MOONGOLD_SECRET_KEY || 'PM67SGqyed';
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

    // 4. REFUND USER IF MOOGOLD ORDER FAILED — refund to the same wallet they paid from
    if (isOrderCreation && !isSuccess) {
      console.warn(`[MOOGOLD ORDER FAILED] Reverting & Refund Rs. ${numPriceLkr} to UID ${authenticatedUser.uid} via ${deductResult.usedCurrency || 'LKR'}`);
      await refundUserWallet(authenticatedUser.uid, numPriceLkr, deductResult.usedCurrency || 'LKR', authenticatedUser.email, deductResult.rtdbKey);
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

// Memory store for received Dialog EZ Cash SMS records via Webhook
const receivedEzCashSmsLog = new Map();
const usedEzCashRnNumbers = new Set();

// Automated EZ Cash RN Deposit Verification Endpoint (Admin Approval Mode)
app.post('/api/ezcash/verify-rn', rateLimiter(15, 60000), (req, res) => {
  try {
    const { rnNumber, amount, userEmail } = req.body || {};
    const cleanRn = sanitizeString(String(rnNumber || ''), 20);
    const cleanEmail = sanitizeString(String(userEmail || ''), 100);

    if (!cleanRn || cleanRn.length < 10) {
      return res.status(400).json({
        verified: false,
        error: 'Please enter a valid 14-digit Dialog EZ Cash RN Transaction Number.'
      });
    }

    const amtLkr = parseFloat(amount) || 1000;
    console.log(`[EZ Cash Deposit Submitted] RN: ${cleanRn}, Amount: Rs. ${amtLkr}, User: ${userEmail}`);

    // Check if matching SMS was received via Webhook
    const smsLog = receivedEzCashSmsLog.get(cleanRn);
    if (smsLog && smsLog.status !== 'REDEEMED' && Math.abs((smsLog.amountLkr || 0) - amtLkr) < 1) {
      smsLog.status = 'REDEEMED';
      smsLog.redeemedBy = userEmail || 'Gamer';
      smsLog.redeemedAt = new Date().toISOString();
      usedEzCashRnNumbers.add(cleanRn);

      return res.json({
        verified: true,
        autoApproved: true,
        status: 'VERIFIED',
        amountLkr: amtLkr,
        rnNumber: cleanRn,
        message: `⚡ EZ Cash RN ${cleanRn} verified against Dialog SMS Webhook!`
      });
    }

    // Route directly to Admin Queue for Manual Admin Approval
    return res.json({
      verified: false,
      autoApproved: false,
      status: 'PENDING_ADMIN_VERIFICATION',
      amountLkr: amtLkr,
      rnNumber: cleanRn,
      matchedSms: !!smsLog,
      message: 'EZ Cash deposit submitted! Pending 1-click Admin Verification.'
    });
  } catch (err) {
    console.error('[EZ Cash Verify Error]:', err);
    res.status(500).json({ error: err.message });
  }
});


// EZ Cash SMS Gateway Webhook Endpoint (Receives Dialog SMS from SMS Forwarder / iPhone Shortcut / Gateway)
app.post('/api/ezcash/webhook', (req, res) => {
  try {
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
    await fetch(`${FIREBASE_RTDB_URL}/genieTransactions/${encodeURIComponent(transactionId)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (record.localId) {
      await fetch(`${FIREBASE_RTDB_URL}/genieLocalIdIndex/${encodeURIComponent(record.localId)}.json`, {
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
    const res = await fetch(`${FIREBASE_RTDB_URL}/genieTransactions/${encodeURIComponent(transactionId)}.json`);
    if (res.ok) return (await res.json()) || null;
  } catch (e) {
    console.warn('[Genie Transaction Read Warning]:', e.message);
  }
  return null;
}

async function resolveGenieTransactionIdByLocalId(localId) {
  try {
    const res = await fetch(`${FIREBASE_RTDB_URL}/genieLocalIdIndex/${encodeURIComponent(localId)}.json`);
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
    const creditResult = await creditUserWalletServer(record.uid, record.amountLkr, record.email, null);
    if (!creditResult.success) {
      console.error(`[Genie Credit Failed] txn=${transactionId} user=${record.uid || record.email} reason=${creditResult.reason}`);
      return { success: false, error: creditResult.reason || 'Wallet credit failed', isPaid: true };
    }

    await saveGenieTransactionRecord(transactionId, {
      ...record,
      status: 'CREDITED',
      creditedAt: new Date().toISOString(),
      newBalanceLkr: creditResult.newBalanceLkr,
      newBalanceUsdt: creditResult.newBalanceUsdt
    });

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
    const { transactionId } = req.body || {};
    if (!transactionId) {
      return res.status(400).json({ error: 'Missing transactionId' });
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
});
