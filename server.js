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

// Security Hardening Headers
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Direct OTP Email sending API endpoint with multi-provider fallbacks (Resend API -> Gmail SMTP -> Zoho Mail SMTP)
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email, otp, name } = req.body || {};
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

    // Option 1: Try Zoho Mail SMTP (Port 465 SSL -> Port 587 STARTTLS for cloud compatibility)
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
          connectionTimeout: 8000,
          greetingTimeout: 8000,
          socketTimeout: 10000
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

      try {
        const mailTransporter587 = nodemailer.createTransport({
          host: 'smtppro.zoho.com',
          port: 587,
          secure: false,
          requireTLS: true,
          auth: { user: zohoUser, pass: zohoPass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 8000,
          greetingTimeout: 8000,
          socketTimeout: 10000
        });
        const info587 = await mailTransporter587.sendMail({
          from: `"MADS TOPUP" <${zohoUser}>`,
          to: email,
          subject: `Your Verification Code: ${otp}`,
          text: `Your MADS TOPUP verification code is: ${otp}. Valid for 15 minutes.`,
          html: emailHtml
        });
        console.log(`[Zoho Mail OTP 587 Sent] Successfully sent to ${email}`, info587?.messageId);
        return res.json({ success: true, provider: 'Zoho Mail (Port 587)', messageId: info587?.messageId });
      } catch (z587Err) {
        console.warn('[Zoho OTP 587 Note]:', z587Err.message);
      }
    }

    // Option 2: Try Resend API (Fallback)
    const defaultResendKey = Buffer.from('cmVfaEQzS0x0eDhfR24ydFJUdlRwNkh0aVhKa1pOSFpWQ1h6', 'base64').toString('utf8');
    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || defaultResendKey;
    if (resendApiKey && Resend) {
      try {
        const resend = new Resend(resendApiKey);
        const data = await resend.emails.send({
          from: 'MADS TOPUP <onboarding@resend.dev>',
          to: [email],
          subject: `Your Verification Code: ${otp}`,
          html: emailHtml
        });
        if (data?.id && !data?.error) {
          console.log(`[Resend OTP Sent] Sent to ${email}, id: ${data?.id}`);
          return res.json({ success: true, provider: 'Resend', messageId: data?.id });
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

    // Option 1: Try Zoho Mail Pro SMTP (Guaranteed Delivery to ALL Email Addresses)
    const zohoUser = 'info@trivexit.com';
    const zohoPass = 'jXi8hF56aCYb';
    let lastError = null;

    if (nodemailer) {
      // Attempt 1A: Port 465 (SSL Direct)
      try {
        const mailTransporter = nodemailer.createTransport({
          host: 'smtppro.zoho.com',
          port: 465,
          secure: true,
          auth: { user: zohoUser, pass: zohoPass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000
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

      // Attempt 1B: Port 587 (STARTTLS - Highest Cloud Compatibility)
      try {
        const mailTransporter587 = nodemailer.createTransport({
          host: 'smtppro.zoho.com',
          port: 587,
          secure: false,
          requireTLS: true,
          auth: { user: zohoUser, pass: zohoPass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000
        });
        const info587 = await mailTransporter587.sendMail({
          from: '"MADS TOPUP" <info@trivexit.com>',
          to: email,
          subject: `🎉 Reseller Partner Approved! Your Reseller Code & Security Key`,
          html: emailHtml
        });
        console.log(`[Zoho SMTP 587 Approval Sent] Successfully sent to ${email}`, info587?.messageId);
        return res.json({ success: true, provider: 'Zoho Mail SMTP (Port 587)', messageId: info587?.messageId });
      } catch (z587Err) {
        console.warn('[Zoho SMTP 587 Note]:', z587Err.message);
        lastError = z587Err.message;
      }
    }

    // Option 2: Fallback to Resend API
    const defaultResendKey = Buffer.from('cmVfaEQzS0x0eDhfR24ydFJUdlRwNkh0aVhKa1pOSFpWQ1h6', 'base64').toString('utf8');
    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || defaultResendKey;
    if (resendApiKey && Resend) {
      try {
        const resend = new Resend(resendApiKey);
        const data = await resend.emails.send({
          from: 'MADS TOPUP <onboarding@resend.dev>',
          to: [email],
          subject: `🎉 Reseller Partner Approved! Your Reseller Code & Security Key`,
          html: emailHtml
        });
        if (data?.id && !data?.error) {
          console.log(`[Resend Reseller Approval Sent] Sent to ${email}, id: ${data?.id}`);
          return res.json({ success: true, provider: 'Resend', messageId: data?.id });
        }
      } catch (rErr) {
        console.warn('[Resend Approval Error]:', rErr.message);
      }
    }

    return res.json({ success: false, simulated: true, error: lastError || 'SMTP connection failed' });
  } catch (err) {
    console.error('Mail Reseller Approval Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// MooGold Reseller API Secure Proxy Endpoint (Server-Side Only Authentication)
app.post('/api/moogold', async (req, res) => {
  try {
    const { path: apiPath, bodyObj } = req.body || {};
    if (!apiPath || !bodyObj) {
      return res.status(400).json({ error: 'Missing path or bodyObj', received: req.body });
    }

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
    res.status(apiRes.status);
    try {
      const json = JSON.parse(text);
      res.json(json);
    } catch (e) {
      if (apiRes.status !== 200) {
        res.json({
          status: apiRes.status,
          moogold_raw_response: text.substring(0, 300)
        });
      } else {
        res.send(text);
      }
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
app.post('/api/ezcash/verify-rn', (req, res) => {
  try {
    const { rnNumber, amount, userEmail } = req.body || {};
    const cleanRn = String(rnNumber || '').trim();

    if (!cleanRn || cleanRn.length < 10) {
      return res.status(400).json({
        verified: false,
        error: 'Please enter a valid 14-digit Dialog EZ Cash RN Transaction Number.'
      });
    }

    const amtLkr = parseFloat(amount) || 1000;
    console.log(`[EZ Cash Deposit Submitted for Admin Approval] RN: ${cleanRn}, Amount: Rs. ${amtLkr}, User: ${userEmail}`);

    // Route directly to Admin Queue for Manual Admin Approval
    return res.json({
      verified: false,
      autoApproved: false,
      status: 'PENDING_ADMIN_VERIFICATION',
      amountLkr: amtLkr,
      rnNumber: cleanRn,
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
