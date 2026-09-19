import crypto from 'crypto';
import { saveGenieTransactionRecord } from './_genieWallet.js';

const GENIE_DEFAULT_APP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6ImM5OWI0NTBkLTM4ZTktNDU1Ny04OWYxLTVjZGM5MWZkN2EwZiIsImNvbXBhbnlJZCI6IjY5OWMyOTRiZWM5YWFlMDAwMjA2NjAxNiIsImlhdCI6MTc3MTg0MjE0OSwiZXhwIjo0OTI3NTE1NzQ5fQ.LutDa2obyzXY6MsCGtrK3bPZHMrNpxI-T8Q4cCtKZo4';
const GENIE_DEFAULT_BASE_URL = 'https://api.geniebiz.lk';

function sanitizeString(str, maxLen = 100) {
  if (typeof str !== 'string') return '';
  return str.replace(/[^\w\s@.-]/gi, '').substring(0, maxLen);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 1. Forward to Live VPS server if available
  try {
    const vpsRes = await fetch('http://152.42.202.221:3000' + req.url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    if (vpsRes.ok) {
      const vpsText = await vpsRes.text();
      res.status(vpsRes.status);
      try {
        return res.json(JSON.parse(vpsText));
      } catch (e) {
        return res.send(vpsText);
      }
    }
  } catch (vpsErr) {
    console.warn('[Vercel Genie VPS Forward Note]:', vpsErr.message);
  }

  // 2. Direct Vercel Execution fallback
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }

    const { amount, userId, userEmail, userName, redirectUrl, orderRef, transactionId } = body || {};

    let appKey = (process.env.GENIE_APP_KEY || process.env.VITE_GENIE_APP_KEY || GENIE_DEFAULT_APP_KEY).replace(/[\r\n\s]/g, '');
    if (!appKey.includes('699c294bec9aae0002066016')) {
      appKey = GENIE_DEFAULT_APP_KEY;
    }
    const baseUrl = (process.env.GENIE_BASE_URL || process.env.VITE_GENIE_BASE_URL || GENIE_DEFAULT_BASE_URL).replace(/[\r\n\s\/]+$/, '');

    // Endpoint: /api/genie/create-transaction
    if (req.url.includes('create-transaction') || req.method === 'POST') {
      const numAmount = parseFloat(amount);
      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({ error: 'Please specify a valid payment amount.' });
      }

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

      const apiRes = await fetch(`${baseUrl}/public/v2/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': appKey
        },
        body: JSON.stringify(payload)
      });

      const resText = await apiRes.text();
      let resJson = null;
      try { resJson = JSON.parse(resText); } catch (e) {}

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
        let errDesc = resJson?.message || resText.substring(0, 200) || 'Failed to create Genie Business IPG transaction';
        if (apiRes.status === 401 || errDesc === 'Unauthorized') {
          errDesc = 'Dialog Genie IPG Authorization Failed. Please use Bank Deposit, eZ Cash or Binance Pay!';
        }
        return res.status(apiRes.status || 400).json({
          success: false,
          error: errDesc
        });
      }
    }

    res.status(404).json({ error: 'Endpoint Not Found' });
  } catch (err) {
    console.error('Vercel Genie Handler Error:', err);
    res.status(500).json({ error: err.message });
  }
}
