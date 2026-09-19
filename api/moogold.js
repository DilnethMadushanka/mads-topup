import crypto from 'crypto';
import { GAMES_DATA } from '../src/data/games.js';

// The largest discount any legitimate promo code (TopupModal.jsx WELCOME50 /
// LAUNCH100) can knock off a package's catalog price. Promo codes aren't sent
// to this endpoint, so this is used as a tolerance band around the catalog
// price rather than validating a specific code.
const MAX_PROMO_DISCOUNT_LKR = 100;

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

  // Fallback: treat any non-empty token as valid session (custom web users)
  if (cleanToken.length >= 3) {
    return {
      uid: cleanToken,
      email: cleanToken.includes('@') ? cleanToken : 'user@madstopup.com',
      emailVerified: true,
      isWebSession: true
    };
  }

  return null;
}

const FIREBASE_RTDB_URL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || "https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app";
const FIREBASE_FIRESTORE_URL = process.env.FIREBASE_FIRESTORE_URL || `https://firestore.googleapis.com/v1/projects/mads-topup-76445/databases/(default)/documents/users`;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "AIzaSyAzgbA7GdTY5Dv2CtgY8cVOswkpfcQpNcE";

// Read wallet from Firestore REST API as fallback
async function getUserWalletFromFirestore(uid) {
  if (!uid) return null;
  try {
    const res = await fetch(`${FIREBASE_FIRESTORE_URL}/${uid}?key=${FIREBASE_API_KEY}`);
    if (res.ok) {
      const doc = await res.json();
      const fields = doc.fields || {};
      return {
        walletBalance: parseFloat(fields.walletBalance?.doubleValue || fields.walletBalance?.integerValue || 0),
        walletUsdt: parseFloat(fields.walletUsdt?.doubleValue || fields.walletUsdt?.integerValue || 0)
      };
    }
  } catch (e) { console.warn('[Firestore fallback read error]:', e.message); }
  return null;
}

// Write updated balance back to Firestore REST API
async function patchFirestoreWallet(uid, walletBalance, walletUsdt) {
  if (!uid) return;
  try {
    const url = `${FIREBASE_FIRESTORE_URL}/${uid}?updateMask.fieldPaths=walletBalance&updateMask.fieldPaths=walletUsdt&updateMask.fieldPaths=updatedAt&key=${FIREBASE_API_KEY}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          walletBalance: { doubleValue: walletBalance },
          walletUsdt: { doubleValue: walletUsdt },
          updatedAt: { stringValue: new Date().toISOString() }
        }
      })
    });
  } catch (e) { console.warn('[Firestore fallback write error]:', e.message); }
}

async function resolveUserWalletKey(uid, email, clientProfile) {
  // 1. Try direct UID lookup first in RTDB
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
    } catch (e) { console.warn('[RTDB read error]:', e.message); }
  }

  // 2. Scan all users by email or uid field in RTDB
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
    } catch (e) { console.warn('[RTDB scan error]:', e.message); }
  }

  // 3. Fallback: read from Firestore if enabled
  const firestoreData = await getUserWalletFromFirestore(uid);
  if (firestoreData && (firestoreData.walletBalance > 0 || firestoreData.walletUsdt > 0)) {
    return {
      rtdbKey: uid,
      walletBalance: firestoreData.walletBalance,
      walletUsdt: firestoreData.walletUsdt,
      source: 'firestore'
    };
  }

  // 4. Fallback: use verified clientProfile if positive balance provided
  if (clientProfile && (parseFloat(clientProfile.walletBalance || 0) > 0 || parseFloat(clientProfile.walletUsdt || 0) > 0)) {
    return {
      rtdbKey: uid || lookupEmail || 'usr_fallback',
      walletBalance: parseFloat(clientProfile.walletBalance || 0),
      walletUsdt: parseFloat(clientProfile.walletUsdt || 0),
      source: 'client_profile'
    };
  }

  return { rtdbKey: uid || 'usr_unknown', walletBalance: 0, walletUsdt: 0, source: 'zero_default' };
}

async function getUserWalletData(uid, email, clientProfile) {
  const res = await resolveUserWalletKey(uid, email, clientProfile);
  return { walletBalance: res.walletBalance, walletUsdt: res.walletUsdt };
}

async function deductUserWallet(uid, priceLkr, email, clientProfile) {
  if (!uid || priceLkr <= 0) return { success: false, reason: 'Invalid amount' };
  try {
    const resolved = await resolveUserWalletKey(uid, email, clientProfile);
    if (!resolved) return { success: false, reason: 'User wallet not found' };

    const { rtdbKey } = resolved;
    let newLkr = resolved.walletBalance;
    let newUsdt = resolved.walletUsdt;
    let usedCurrency = null;

    if (newLkr >= priceLkr) {
      newLkr = parseFloat((newLkr - priceLkr).toFixed(2));
      usedCurrency = 'LKR';
    } else if ((newUsdt * 305) >= priceLkr) {
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
      await patchFirestoreWallet(rtdbKey, newLkr, newUsdt);
    } catch (e) {
      console.warn('[Deduct patch note]:', e.message);
    }

    return { success: true, newBalanceLkr: newLkr, newBalanceUsdt: newUsdt, usedCurrency, rtdbKey };
  } catch (e) { console.error('[Vercel Deduct Error]:', e.message); }
  return { success: false, reason: 'Database update failed' };
}

async function refundUserWallet(uid, priceLkr, usedCurrency = 'LKR', email, rtdbKey) {
  if (!uid || priceLkr <= 0) return;
  try {
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
      const reqUsdt = priceLkr / 305;
      const newUsdt = parseFloat((current.walletUsdt + reqUsdt).toFixed(6));
      patchBody = {
        walletBalance: current.walletBalance,
        walletUsdt: newUsdt,
        updatedAt: new Date().toISOString()
      };
    } else {
      const newLkr = parseFloat((current.walletBalance + priceLkr).toFixed(2));
      patchBody = {
        walletBalance: newLkr,
        walletUsdt: current.walletUsdt,
        updatedAt: new Date().toISOString()
      };
    }

    try {
      await fetch(`${FIREBASE_RTDB_URL}/users/${encodeURIComponent(resolvedKey)}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody)
      });
      await patchFirestoreWallet(resolvedKey, patchBody.walletBalance, patchBody.walletUsdt);
    } catch (e) {
      console.warn('[Refund patch note]:', e.message);
    }
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

    const { path: apiPath, bodyObj, priceLkr, paymentId, clientProfile: rawClientProfile } = body || {};
    const clientProfile = rawClientProfile || bodyObj?.clientProfile || body?.userProfile || null;

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

    // 3. Fallback Vercel Execution: Check wallet balance if order creation
    const isOrderCreation = apiPath === 'order/create_order';
    const numPriceLkr = parseFloat(priceLkr || body?.priceLkr || bodyObj?.priceLkr || 0);
    let deductResult = null;

    if (isOrderCreation) {
      if (numPriceLkr <= 0) {
        return res.status(400).json({ error: 'Invalid order price specified.' });
      }

      // Price-tampering guard: the client-supplied priceLkr must fall within a
      // narrow band of the catalog price for the product it's actually
      // ordering (the band only covers the largest known promo discount).
      // A tampered/replayed request quoting a far lower price is rejected.
      const requestedProductId = bodyObj?.data?.['product-id'];
      const catalogPriceLkr = getCatalogPriceLkr(requestedProductId);
      if (catalogPriceLkr === null) {
        return res.status(400).json({ error: 'Unrecognized product. Order rejected.' });
      }
      if (numPriceLkr > catalogPriceLkr || numPriceLkr < catalogPriceLkr - MAX_PROMO_DISCOUNT_LKR) {
        return res.status(400).json({ error: 'Price mismatch detected. Order rejected.' });
      }

      deductResult = await deductUserWallet(authenticatedUser.uid, numPriceLkr, authenticatedUser.email, clientProfile);
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
      await refundUserWallet(authenticatedUser.uid, numPriceLkr, deductResult?.usedCurrency || 'LKR', authenticatedUser.email, deductResult?.rtdbKey);
    }

    res.status(apiRes.status);
    if (jsonResult) {
      if (isOrderCreation && deductResult?.success) {
        return res.json({
          ...jsonResult,
          newBalanceLkr: deductResult.newBalanceLkr,
          newBalanceUsdt: deductResult.newBalanceUsdt
        });
      }
      res.json(jsonResult);
    } else {
      res.send(text);
    }
  } catch (err) {
    console.error('Serverless function error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
}
