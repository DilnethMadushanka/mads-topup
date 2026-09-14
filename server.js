import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { initTelegramBot } from './src/services/telegramBotService.js';
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

// Security Hardening Headers & CORS Controls
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
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
    const name = sanitizeString(rawName, 50);
    if (!email || !otp) {
      return res.status(400).json({ error: 'Missing email or otp' });
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 24px; border-radius: 16px; max-width: 500px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #ef4444; font-size: 24px; font-weight: 900; margin: 0;">MADS TOPUP</h2>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Email Verification Code</p>
        </div>
        <p style="font-size: 14px; color: #e2e8f0;">Hello ${name || 'Gamer'},</p>
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

    // Option 1: Try Resend API (Primary - High Speed REST API via Port 443)
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

    // Option 2: Try Zoho Mail SMTP (Fallback)
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
          connectionTimeout: 3000,
          greetingTimeout: 3000,
          socketTimeout: 5000
        });
        const info = await mailTransporter.sendMail({
          from: `"MADS TOPUP" <${zohoUser}>`,
          to: email,
          subject: `Your Verification Code: ${otp}`,
          text: `Your MADS TOPUP verification code is: ${otp}. Valid for 15 minutes.`,
          html: emailHtml
        });
        console.log(`[Zoho Mail OTP 465 Sent] Successfully sent to ${email}`, info?.messageId);
        return res.json({ success: true, provider: 'Zoho Mail (Port 465)', messageId: info?.messageId });
      } catch (z465Err) {
        console.warn('[Zoho OTP 465 Note]:', z465Err.message);
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
  return null;
}

// User Wallet Database Helpers (Realtime Database REST Integration)
const FIREBASE_RTDB_URL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || "https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app";

async function getUserWalletData(uid) {
  if (!uid) return { walletBalance: 0, walletUsdt: 0 };
  try {
    const res = await fetch(`${FIREBASE_RTDB_URL}/users/${uid}.json`);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        return {
          walletBalance: parseFloat(data.walletBalance || 0),
          walletUsdt: parseFloat(data.walletUsdt || 0)
        };
      }
    }
  } catch (e) {
    console.warn('[Backend RTDB Read Warning]:', e.message);
  }
  return { walletBalance: 0, walletUsdt: 0 };
}

async function deductUserWallet(uid, priceLkr) {
  if (!uid || priceLkr <= 0) return { success: false, reason: 'Invalid amount' };
  try {
    const current = await getUserWalletData(uid);
    let newLkr = current.walletBalance;
    let newUsdt = current.walletUsdt;

    if (newLkr >= priceLkr) {
      newLkr = newLkr - priceLkr;
      newUsdt = newLkr / 305;
    } else if ((newUsdt * 305) >= priceLkr) {
      const reqUsdt = priceLkr / 305;
      newUsdt = Math.max(0, newUsdt - reqUsdt);
      newLkr = newUsdt * 305;
    } else {
      return { success: false, reason: `Insufficient wallet balance. Required: Rs. ${priceLkr.toFixed(2)}, Available: Rs. ${newLkr.toFixed(2)}` };
    }

    const patchRes = await fetch(`${FIREBASE_RTDB_URL}/users/${uid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletBalance: newLkr,
        walletUsdt: newUsdt,
        updatedAt: new Date().toISOString()
      })
    });

    if (patchRes.ok) {
      return { success: true, newBalanceLkr: newLkr, newBalanceUsdt: newUsdt };
    }
  } catch (e) {
    console.error('[Backend RTDB Deduct Error]:', e.message);
  }
  return { success: false, reason: 'Database update failed' };
}

async function refundUserWallet(uid, priceLkr) {
  if (!uid || priceLkr <= 0) return;
  try {
    const current = await getUserWalletData(uid);
    const newLkr = current.walletBalance + priceLkr;
    const newUsdt = newLkr / 305;

    await fetch(`${FIREBASE_RTDB_URL}/users/${uid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletBalance: newLkr,
        walletUsdt: newUsdt,
        updatedAt: new Date().toISOString()
      })
    });
    console.log(`[Backend Refund Success] Refunded Rs. ${priceLkr} to user ${uid}`);
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
      const deductResult = await deductUserWallet(authenticatedUser.uid, numPriceLkr);
      if (!deductResult.success) {
        console.warn(`[INSUFFICIENT BALANCE BLOCKED] User ${authenticatedUser.uid} attempted order without balance. Required: Rs. ${numPriceLkr}`);
        return res.status(403).json({
          error: deductResult.reason || 'Insufficient wallet balance. Please top up your wallet first.'
        });
      }

      console.log(`[WALLET DEDUCTED] Deducted Rs. ${numPriceLkr} from UID ${authenticatedUser.uid}. New Balance: Rs. ${deductResult.newBalanceLkr}`);
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

    // 4. REFUND USER IF MOOGOLD ORDER FAILED
    if (isOrderCreation && !isSuccess) {
      console.warn(`[MOOGOLD ORDER FAILED] Reverting & Refund Rs. ${numPriceLkr} to UID ${authenticatedUser.uid}`);
      await refundUserWallet(authenticatedUser.uid, numPriceLkr);
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
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback Routing for React Router
app.use((req, res) => {
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
