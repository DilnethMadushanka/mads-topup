import crypto from 'crypto';

async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;
  const cleanToken = idToken.startsWith('Bearer ') ? idToken.slice(7).trim() : idToken.trim();
  if (!cleanToken) return null;

  // Handle WEB_SESSION tokens for custom-login users (not Firebase Auth)
  // Format: WEB_SESSION:uid|email  (new)  or  WEB_SESSION:uid_or_email  (legacy)
  if (cleanToken.startsWith('WEB_SESSION:')) {
    const rawId = cleanToken.slice(12).trim();
    if (rawId) {
      if (rawId.includes('|')) {
        const [uid, email] = rawId.split('|');
        return {
          uid: uid.trim() || email.trim(),
          email: email.trim() || (uid.includes('@') ? uid.trim() : `${uid.trim()}@madstopup.com`),
          emailVerified: true,
          isWebSession: true
        };
      }
      return {
        uid: rawId,
        email: rawId.includes('@') ? rawId : `${rawId}@madstopup.com`,
        emailVerified: true,
        isWebSession: true
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
          emailVerified: data.users[0].emailVerified,
          isWebSession: false
        };
      }
    }
  } catch (err) {
    console.error('[Vercel Auth Token Error]:', err.message);
  }

  // No valid token — reject
  return null;
}

export default async function handler(req, res) {
  let partnerOrderId = null;
  try {
    // CORS headers — restrict to production domain + local dev
    const allowedOrigins = ['https://madstopup.com', 'https://www.madstopup.com', 'http://localhost:5173', 'http://localhost:5174'];
    const requestOrigin = req.headers.origin || '';
    const corsOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : 'https://madstopup.com';
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
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

    const { path: apiPath, bodyObj, priceLkr, paymentId, clientProfile } = body || {};
    partnerOrderId = bodyObj?.partnerOrderId || null;

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
    let vpsRes = null;
    try {
      vpsRes = await fetch('http://152.42.202.221:3000/api/moogold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({ path: apiPath, bodyObj, priceLkr, paymentId, clientProfile })
      });
    } catch (vpsErr) {
      console.warn('VPS proxy connection note:', vpsErr.message);
    }

    // If VPS responded (whether 200, 400, 403), return VPS response directly
    if (vpsRes) {
      const text = await vpsRes.text();
      res.status(vpsRes.status);
      try {
        return res.json(JSON.parse(text));
      } catch (e) {
        return res.send(text);
      }
    }

    // 3. Fallback (VPS unreachable). Wallet orders are only handled by the
    // VPS (server.js), which holds the database secret and does the atomic
    // wallet deduction — so order creation is refused here rather than
    // run without a wallet check. Read-only paths (product lists etc.) still
    // go straight to MooGold.
    const isOrderCreation = apiPath === 'order/create_order';
    if (isOrderCreation) {
      return res.status(503).json({ error: 'Top-up service is temporarily unavailable. Please try again in a moment.' });
    }

    const partnerId = process.env.MOONGOLD_PARTNER_ID || process.env.VITE_MOONGOLD_PARTNER_ID || '';
    const secretKey = process.env.MOONGOLD_SECRET_KEY || process.env.VITE_MOONGOLD_SECRET_KEY || '';
    if (!partnerId || !secretKey) {
      console.error('[MooGold] MOONGOLD_PARTNER_ID or MOONGOLD_SECRET_KEY env vars not set.');
      return res.status(500).json({ error: 'Payment gateway not configured. Please contact support.' });
    }
    const baseUrl = 'https://moogold.com/wp-json/v1/api';

    // MooGold's documented request shape is { path, data } — the client's
    // `bodyObj` is our internal wrapper (also carries partnerOrderId,
    // priceLkr, paymentId, clientProfile with the customer's wallet balance,
    // isResellerOrder), which MooGold never should receive. Previously the
    // whole wrapper was forwarded verbatim.
    const moongoldPayload = { path: apiPath, data: bodyObj?.data };
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadStr = JSON.stringify(moongoldPayload);
    const stringToSign = payloadStr + timestamp + apiPath;

    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(stringToSign);
    const authSignature = hmac.digest('hex');
    const basicAuth = 'Basic ' + Buffer.from(`${partnerId}:${secretKey}`).toString('base64');

    const logTag = apiPath;
    console.log(`[MooGold Proxy Request - Vercel] Path: ${apiPath} | ${logTag}`);
    console.log(`[MooGold Proxy Request Payload - Vercel]:`, payloadStr);

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
    console.log(`[MooGold Proxy Response - Vercel] HTTP ${apiRes.status} | ${logTag}`);
    console.log(`[MooGold Proxy Response Body - Vercel]:`, text);

    let jsonResult = null;
    try {
      jsonResult = JSON.parse(text);
    } catch (e) {}

    res.status(apiRes.status);
    if (jsonResult) {
      res.json(jsonResult);
    } else {
      res.send(text);
    }
  } catch (err) {
    console.error('Serverless function error:', err);
    res.status(500).json({ error: 'Internal server error. Please try again or contact support.' });
  }
}
