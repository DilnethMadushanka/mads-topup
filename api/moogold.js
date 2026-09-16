import crypto from 'crypto';

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
    console.error('[Vercel Auth Token Error]:', err.message);
  }
  return null;
}

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
  } catch (e) {}
  return { walletBalance: 0, walletUsdt: 0 };
}

async function deductUserWallet(uid, priceLkr) {
  if (!uid || priceLkr <= 0) return { success: false, reason: 'Invalid amount' };
  try {
    const current = await getUserWalletData(uid);
    // LKR and USDT wallets are INDEPENDENT — never recalculate one from the other
    let newLkr = current.walletBalance;
    let newUsdt = current.walletUsdt;
    let usedCurrency = null;

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
      return { success: false, reason: `Insufficient wallet balance. Required: Rs. ${priceLkr.toFixed(2)}, Available: Rs. ${newLkr.toFixed(2)} LKR / $${newUsdt.toFixed(2)} USDT` };
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
      return { success: true, newBalanceLkr: newLkr, newBalanceUsdt: newUsdt, usedCurrency };
    }
  } catch (e) { console.error('[Vercel Deduct Error]:', e.message); }
  return { success: false, reason: 'Database update failed' };
}

async function refundUserWallet(uid, priceLkr, usedCurrency = 'LKR') {
  if (!uid || priceLkr <= 0) return;
  try {
    const current = await getUserWalletData(uid);
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
    } else {
      // Refund back to LKR wallet (default)
      const newLkr = parseFloat((current.walletBalance + priceLkr).toFixed(2));
      patchBody = {
        walletBalance: newLkr,
        walletUsdt: current.walletUsdt, // USDT untouched
        updatedAt: new Date().toISOString()
      };
    }

    await fetch(`${FIREBASE_RTDB_URL}/users/${uid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchBody)
    });
  } catch (e) { console.error('[Vercel Refund Error]:', e.message); }
}

export default async function handler(req, res) {
  try {
    // CORS headers for frontend
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

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const { path: apiPath, bodyObj, priceLkr, paymentId } = body || {};

    if (!apiPath || !bodyObj) {
      res.status(400).json({ error: 'Missing path or bodyObj', received: req.body });
      return;
    }

    // 1. HARDENED AUTHENTICATION CHECK
    const authHeader = req.headers.authorization || req.headers.Authorization || req.headers['authorization'] || '';
    const authenticatedUser = await verifyFirebaseIdToken(authHeader);

    if (!authenticatedUser) {
      res.status(401).json({ error: 'Unauthorized! You must be logged in to access top-up services.' });
      return;
    }

    // 2. Forward request through Whitelisted VPS IP with Authorization header
    try {
      const vpsRes = await fetch('http://152.42.202.221:3000/api/moogold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({ path: apiPath, bodyObj, priceLkr, paymentId })
      });
      if (vpsRes.ok) {
        const text = await vpsRes.text();
        res.status(vpsRes.status);
        try {
          return res.json(JSON.parse(text));
        } catch (e) {
          return res.send(text);
        }
      }
    } catch (vpsErr) {
      console.warn('VPS proxy note:', vpsErr.message);
    }

    // 3. Fallback Vercel Execution: Check wallet balance if order creation
    const isOrderCreation = apiPath === 'order/create_order';
    const numPriceLkr = parseFloat(priceLkr || body?.priceLkr || bodyObj?.priceLkr || 0);
    let deductResult = null;

    if (isOrderCreation) {
      if (numPriceLkr <= 0) {
        return res.status(400).json({ error: 'Invalid order price specified.' });
      }

      deductResult = await deductUserWallet(authenticatedUser.uid, numPriceLkr);
      if (!deductResult.success) {
        return res.status(403).json({ error: deductResult.reason || 'Insufficient wallet balance.' });
      }
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
    let jsonResult = null;
    try {
      jsonResult = JSON.parse(text);
    } catch (e) {}

    const isSuccess = apiRes.ok && jsonResult && (jsonResult.status === 'processing' || jsonResult.status === 'true' || jsonResult.status === true || jsonResult.status === 1 || jsonResult.order_id);

    if (isOrderCreation && !isSuccess) {
      await refundUserWallet(authenticatedUser.uid, numPriceLkr, deductResult?.usedCurrency || 'LKR');
    }

    res.status(apiRes.status);
    if (jsonResult) {
      res.json(jsonResult);
    } else {
      res.send(text);
    }
  } catch (err) {
    console.error('Serverless function error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
}
