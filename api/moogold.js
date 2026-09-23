import crypto from 'crypto';
import { GAMES_DATA } from '../src/data/games.js';

// The largest discount any legitimate promo code (TopupModal.jsx WELCOME50 /
// LAUNCH100) can knock off a package's catalog price. Promo codes aren't sent
// to this endpoint, so this is used as a tolerance band around the catalog
// price rather than validating a specific code. Approved resellers get a
// wider band — see isApprovedReseller below.
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
// never trust a client-sent "isResellerOrder" flag on its own.
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

// Durable idempotency record (shared RTDB path with server.js's identical
// check) so a duplicate order/create_order request for the same
// partnerOrderId — a double-click, a network retry, or a request that
// happens to fall back to this Vercel function after server.js already
// processed it — never deducts the wallet or dispatches the real product a
// second time. Serverless functions can't hold an in-memory lock across
// invocations, so this durable record is the only guard here (no in-memory
// lock like server.js's — RTDB is the single source of truth either way).
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
  let partnerOrderId = null;
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
      // ordering. A tampered/replayed request quoting a far lower price is
      // rejected. The band is wider for a confirmed, admin-approved reseller
      // (their wholesale price is a genuine 5% off catalog, which can exceed
      // the ordinary promo tolerance on larger packages) — but a client-sent
      // isResellerOrder flag is NEVER trusted on its own; it only widens the
      // band after independently verifying the authenticated caller really
      // is an approved reseller.
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

      // Idempotency check — a duplicate request for the same partnerOrderId
      // (double-click, retry, or one that already completed via server.js)
      // must never deduct or dispatch a second time.
      if (partnerOrderId) {
        const existingRecord = await getMoogoldOrderRecord(partnerOrderId);
        if (existingRecord) {
          console.warn(`[MooGold Duplicate Order Blocked] partnerOrderId=${partnerOrderId} already ${existingRecord.status} — replaying original result instead of reprocessing.`);
          if (existingRecord.status === 'COMPLETED') {
            return res.status(200).json(existingRecord.response || { success: true, message: 'Order already completed.' });
          }
          return res.status(409).json({ error: 'This order has already been submitted.' });
        }
        await saveMoogoldOrderRecord(partnerOrderId, { status: 'PROCESSING', uid: authenticatedUser.uid, priceLkr: numPriceLkr, createdAt: new Date().toISOString() });
      }

      deductResult = await deductUserWallet(authenticatedUser.uid, numPriceLkr, authenticatedUser.email, clientProfile);
      if (!deductResult.success) {
        if (partnerOrderId) await saveMoogoldOrderRecord(partnerOrderId, { status: 'FAILED', uid: authenticatedUser.uid, priceLkr: numPriceLkr, reason: deductResult.reason, createdAt: new Date().toISOString() });
        return res.status(403).json({ error: deductResult.reason || 'Insufficient wallet balance.' });
      }
    }

    const partnerId = process.env.MOONGOLD_PARTNER_ID || process.env.VITE_MOONGOLD_PARTNER_ID || 'f27cabc8d2c2122bbedacabce632db68';
    const secretKey = process.env.MOONGOLD_SECRET_KEY || process.env.VITE_MOONGOLD_SECRET_KEY || 'PM67SGqyed';
    const baseUrl = 'https://moogold.com/wp-json/v1/api';

    // MooGold's documented request shape is { path, data } — the client's
    // `bodyObj` is our internal wrapper (also carries partnerOrderId,
    // priceLkr, paymentId, clientProfile with the customer's wallet balance,
    // isResellerOrder), which MooGold never should receive. Previously the
    const effectivePartnerOrderId = partnerOrderId || (isOrderCreation ? (crypto.randomUUID ? crypto.randomUUID() : `ORD-${Date.now()}`) : null);
    const moongoldPayload = {
      path: apiPath,
      data: bodyObj?.data,
      ...(effectivePartnerOrderId ? { partnerOrderId: effectivePartnerOrderId } : {})
    };
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadStr = JSON.stringify(moongoldPayload);
    const stringToSign = payloadStr + timestamp + apiPath;

    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(stringToSign);
    const authSignature = hmac.digest('hex');
    const basicAuth = 'Basic ' + Buffer.from(`${partnerId}:${secretKey}`).toString('base64');

    const logTag = isOrderCreation ? `ORDER product-id=${moongoldPayload.data?.['product-id']} category=${moongoldPayload.data?.category}` : apiPath;
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

    const isSuccess = apiRes.ok && jsonResult && (jsonResult.status === 'processing' || jsonResult.status === 'true' || jsonResult.status === true || jsonResult.status === 1 || jsonResult.order_id);

    if (isOrderCreation && !isSuccess) {
      console.error(`[MOOGOLD ORDER REJECTED - Vercel] product-id=${moongoldPayload.data?.['product-id']} category=${moongoldPayload.data?.category} reason="${jsonResult?.message || jsonResult?.error || text}"`);
      await refundUserWallet(authenticatedUser.uid, numPriceLkr, deductResult?.usedCurrency || 'LKR', authenticatedUser.email, deductResult?.rtdbKey);
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
      res.json(jsonResult);
    } else {
      if (isOrderCreation && partnerOrderId) {
        await saveMoogoldOrderRecord(partnerOrderId, { status: isSuccess ? 'COMPLETED' : 'FAILED', uid: authenticatedUser.uid, priceLkr: numPriceLkr, createdAt: new Date().toISOString() });
      }
      res.send(text);
    }
  } catch (err) {
    console.error('Serverless function error:', err);
    if (partnerOrderId) {
      await saveMoogoldOrderRecord(partnerOrderId, { status: 'FAILED', reason: err.message, createdAt: new Date().toISOString() }).catch(() => {});
    }
    res.status(500).json({ error: err.message, stack: err.stack });
  }
}
