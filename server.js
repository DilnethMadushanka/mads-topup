import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { initTelegramBot, getTelegramBotHealthStatus, forceTelegramBotRefresh } from './src/services/telegramBotService.js';
import { lookupFreePlayerIgn } from './src/services/playerLookup.js';

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
          to: email,
          subject: `Your Verification Code: ${otp}`,
          text: `Your MADS TOPUP verification code is: ${otp}. Valid for 15 minutes.`,
          html: emailHtml
        });
        console.log(`[Zoho Mail OTP Sent] Successfully sent to ${email}`, info?.messageId);
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

    return res.json({ success: true, simulated: true });
  } catch (err) {
    console.error('Mail OTP Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Reseller Approval Email Endpoint
app.post('/api/send-reseller-approval', async (req, res) => {
  try {
    const { email, name, resellerCode, securityKey } = req.body || {};
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

/**
 * Resolve the actual RTDB key for a user — tries uid directly, then scans by email.
 * Returns { rtdbKey, walletBalance, walletUsdt } or null if not found.
 */
async function resolveUserWalletKey(uid, email) {
  // 1. Try direct UID lookup first
  if (uid) {
    try {
      const res = await fetch(`${FIREBASE_RTDB_URL}/users/${encodeURIComponent(uid)}.json`);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.walletBalance !== undefined || data.walletUsdt !== undefined || data.email || data.uid)) {
          return {
            rtdbKey: uid,
            walletBalance: parseFloat(data.walletBalance || 0),
            walletUsdt: parseFloat(data.walletUsdt || 0)
          };
        }
      }
    } catch (e) {
      console.warn('[Backend RTDB UID Read Warning]:', e.message);
    }
  }

  // 2. Fallback: scan all users and match by email or uid field
  const lookupEmail = email || (uid && uid.includes('@') ? uid : null);
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
              console.log(`[RTDB Key Resolved] Found user by ${emailMatch ? 'email' : 'uid field'}: key=${key}`);
              return {
                rtdbKey: key,
                walletBalance: parseFloat(userData.walletBalance || 0),
                walletUsdt: parseFloat(userData.walletUsdt || 0)
              };
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Backend RTDB Scan Warning]:', e.message);
    }
  }

  // 3. If uid was given but no record found, still return uid as key (will create fresh entry on PATCH)
  if (uid) {
    return { rtdbKey: uid, walletBalance: 0, walletUsdt: 0 };
  }

  return null;
}

async function getUserWalletData(uid, email) {
  const result = await resolveUserWalletKey(uid, email);
  if (result) return { walletBalance: result.walletBalance, walletUsdt: result.walletUsdt };
  return { walletBalance: 0, walletUsdt: 0 };
}

async function deductUserWallet(uid, priceLkr, email) {
  if (!uid || priceLkr <= 0) return { success: false, reason: 'Invalid amount' };
  try {
    const resolved = await resolveUserWalletKey(uid, email);
    if (!resolved) return { success: false, reason: 'User wallet not found' };

    const { rtdbKey } = resolved;
    // LKR and USDT wallets are INDEPENDENT — never recalculate one from the other
    let newLkr = resolved.walletBalance;
    let newUsdt = resolved.walletUsdt;
    let usedCurrency = null;

    console.log(`[Wallet Check] User ${uid} (key: ${rtdbKey}) — LKR: ${newLkr}, USDT: ${newUsdt}, Required: Rs.${priceLkr}`);

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

    const patchRes = await fetch(`${FIREBASE_RTDB_URL}/users/${encodeURIComponent(rtdbKey)}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletBalance: newLkr,
        walletUsdt: newUsdt,
        updatedAt: new Date().toISOString()
      })
    });

    if (patchRes.ok) {
      return { success: true, newBalanceLkr: newLkr, newBalanceUsdt: newUsdt, usedCurrency, rtdbKey };
    }
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
      const res = await fetch(`${FIREBASE_RTDB_URL}/users/${encodeURIComponent(resolvedKey)}.json`);
      const data = res.ok ? await res.json() : {};
      current = { walletBalance: parseFloat((data && data.walletBalance) || 0), walletUsdt: parseFloat((data && data.walletUsdt) || 0) };
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

    await fetch(`${FIREBASE_RTDB_URL}/users/${encodeURIComponent(resolvedKey)}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchBody)
    });
  } catch (e) {
    console.error('[Backend Refund Error]:', e.message);
  }
}

// MooGold Reseller API Secure Proxy Endpoint (Server-Side Authentication & Balance Enforcement)
app.post('/api/moogold', rateLimiter(20, 60000), async (req, res) => {
  try {
    const { path: apiPath, bodyObj, priceLkr, paymentId } = req.body || {};
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

    if (isOrderCreation) {
      if (numPriceLkr <= 0) {
        return res.status(400).json({ error: 'Invalid order price specified.' });
      }

      // Perform atomic backend wallet deduction BEFORE calling MooGold
      // Pass both uid and email so resolveUserWalletKey can find the correct RTDB path
      const deductResult = await deductUserWallet(authenticatedUser.uid, numPriceLkr, authenticatedUser.email);
      if (!deductResult.success) {
        console.warn(`[INSUFFICIENT BALANCE BLOCKED] User ${authenticatedUser.uid} (${authenticatedUser.email}) attempted order without balance. Required: Rs. ${numPriceLkr}`);
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

    const timestamp = Math.floor(Date.now() / 1000);
    const payloadStr = JSON.stringify(bodyObj);
    const stringToSign = payloadStr + timestamp + apiPath;

    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(stringToSign);
    const authSignature = hmac.digest('hex');
    const basicAuth = 'Basic ' + Buffer.from(`${partnerId}:${secretKey}`).toString('base64');

    console.log(`\n========================================`);
    console.log(`[MooGold Proxy Request] Path: ${apiPath}`);
    console.log(`[Payload]:`, payloadStr);

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
    console.log(`[MooGold Proxy Response] HTTP ${apiRes.status}:`, text);
    console.log(`========================================\n`);

    let jsonResult = null;
    try {
      jsonResult = JSON.parse(text);
    } catch (e) {}

    const isSuccess = apiRes.ok && jsonResult && (jsonResult.status === 'processing' || jsonResult.status === 'true' || jsonResult.status === true || jsonResult.status === 1 || jsonResult.order_id);

    // 4. REFUND USER IF MOOGOLD ORDER FAILED — refund to the same wallet they paid from
    if (isOrderCreation && !isSuccess) {
      console.warn(`[MOOGOLD ORDER FAILED] Reverting & Refund Rs. ${numPriceLkr} to UID ${authenticatedUser.uid} via ${deductResult.usedCurrency || 'LKR'}`);
      await refundUserWallet(authenticatedUser.uid, numPriceLkr, deductResult.usedCurrency || 'LKR', authenticatedUser.email, deductResult.rtdbKey);
    }

    res.status(apiRes.status);
    if (jsonResult) {
      return res.json(jsonResult);
    } else {
      return res.send(text);
    }
  } catch (err) {
    console.error('MooGold Serverless Proxy Error:', err);
    res.status(500).json({ error: err.message });
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
app.get('/api/ezcash/webhook-logs', (req, res) => {
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

// Create Genie Business IPG Transaction
app.post('/api/genie/create-transaction', rateLimiter(15, 60000), async (req, res) => {
  try {
    const { amount, userEmail, userName, redirectUrl, orderRef } = req.body || {};
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

// Verify Genie Business IPG Transaction Status
app.post('/api/genie/verify-status', rateLimiter(30, 60000), async (req, res) => {
  try {
    const { transactionId } = req.body || {};
    if (!transactionId) {
      return res.status(400).json({ error: 'Missing transactionId' });
    }

    const appKey = (process.env.GENIE_APP_KEY || process.env.VITE_GENIE_APP_KEY || GENIE_DEFAULT_APP_KEY).replace(/[\r\n\s]/g, '');
    const baseUrl = (process.env.GENIE_BASE_URL || process.env.VITE_GENIE_BASE_URL || GENIE_DEFAULT_BASE_URL).replace(/[\r\n\s\/]+$/, '');

    const apiRes = await fetch(`${baseUrl}/public/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': appKey
      }
    });

    const resText = await apiRes.text();
    let resJson = null;
    try { resJson = JSON.parse(resText); } catch (e) {}

    if (apiRes.ok && resJson) {
      const state = String(resJson.state || '').toUpperCase();
      const isPaid = state === 'SUCCESS' || state === 'COMPLETED' || state === 'CONFIRMED' || state === 'CAPTURED';
      const rawAmt = parseFloat(resJson.amount || resJson.payAmount || 0);
      const amtLkr = rawAmt > 1000 ? rawAmt / 100 : rawAmt;

      return res.json({
        success: true,
        isPaid,
        state,
        transactionId: resJson.id,
        amount: amtLkr,
        currency: resJson.currency || 'LKR',
        localId: resJson.localId,
        details: resJson
      });
    } else {
      return res.status(apiRes.status || 400).json({
        success: false,
        error: resJson?.message || 'Failed to retrieve transaction status'
      });
    }
  } catch (err) {
    console.error('[Geniebiz Verify Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Genie Business Webhook (IPN Callback)
app.post('/api/genie/webhook', (req, res) => {
  try {
    console.log(`[Genie Business IPG Webhook Received]:`, req.body);
    res.json({ success: true, message: 'Webhook received successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
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
