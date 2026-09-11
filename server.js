import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // Option 1: Try Resend API (High Delivery to Gmail Primary Inbox)
    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(resendApiKey);
        const data = await resend.emails.send({
          from: process.env.RESEND_FROM || 'MADS TOPUP <onboarding@resend.dev>',
          to: [email],
          subject: `Your Verification Code: ${otp}`,
          html: emailHtml
        });
        console.log(`[Resend OTP Sent] Sent to ${email}, id: ${data?.id}`);
        return res.json({ success: true, provider: 'Resend', messageId: data?.id });
      } catch (rErr) {
        console.warn('[Resend API Note]:', rErr.message);
      }
    }

    let nodemailer;
    try {
      const nmModule = await import('nodemailer');
      nodemailer = nmModule.default || nmModule;
    } catch (e) {
      console.warn('Nodemailer import note:', e.message);
    }

    // Option 2: Try Gmail SMTP if Gmail credentials available
    const gmailUser = process.env.GMAIL_USER || process.env.VITE_GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.VITE_GMAIL_APP_PASSWORD;
    if (nodemailer && gmailUser && gmailPass) {
      try {
        const gmailTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: gmailUser, pass: gmailPass }
        });
        const info = await gmailTransporter.sendMail({
          from: `"MADS TOPUP" <${gmailUser}>`,
          to: email,
          subject: `Your Verification Code: ${otp}`,
          html: emailHtml
        });
        console.log(`[Gmail SMTP OTP Sent] Sent to ${email}, messageId: ${info?.messageId}`);
        return res.json({ success: true, provider: 'Gmail', messageId: info?.messageId });
      } catch (gErr) {
        console.warn('[Gmail SMTP Note]:', gErr.message);
      }
    }

    // Option 3: Fallback to Zoho Mail SMTP
    const zohoPass = process.env.ZOHO_PASSWORD || process.env.VITE_ZOHO_PASSWORD || 'jXi8hF56aCYb';
    if (nodemailer && zohoPass) {
      const mailTransporter = nodemailer.createTransport({
        host: process.env.ZOHO_SMTP_HOST || 'smtppro.zoho.com',
        port: parseInt(process.env.ZOHO_SMTP_PORT || '465'),
        secure: true,
        auth: {
          user: process.env.ZOHO_EMAIL || 'info@trivexit.com',
          pass: zohoPass
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      });
      const info = await mailTransporter.sendMail({
        from: '"MADS TOPUP" <info@trivexit.com>',
        to: email,
        subject: `Your Verification Code: ${otp}`,
        text: `Your MADS TOPUP verification code is: ${otp}. Valid for 15 minutes.`,
        html: emailHtml
      });
      console.log(`[Zoho Mail OTP Sent] Successfully sent OTP to ${email}`, info?.messageId);
      return res.json({ success: true, provider: 'Zoho', messageId: info?.messageId });
    }

    return res.json({ success: true, simulated: true });
  } catch (err) {
    console.error('Mail OTP Error:', err);
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

// Serve built static assets from dist
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback Routing for React Router
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Production Server running on port ${PORT}`);
});
