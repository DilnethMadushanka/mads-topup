// Official MooGold API 1.0 Client Service
// API Documentation: https://doc.moogold.com
// Reseller Portal: https://reseller.moogold.com

import { auth } from './firebaseAuth.js';
import { getSessionToken, notifySessionExpired } from './serverApi.js';

export const getMoongoldConfig = () => {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('mads_moongold_config');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.apiKey) {
          return {
            ...parsed,
            secretKey: '••••••••••••'
          };
        }
      } catch (e) {
        // fallback
      }
    }
  }

  return {
    apiKey: 'MOONGOLD_PARTNER_ACTIVE',
    secretKey: '••••••••••••',
    baseUrl: 'https://moogold.com/wp-json/v1/api',
    autoFulfill: true,
    simulationMode: false,
    merchantBalanceLkr: 145800.00,
    merchantBalanceUsd: 480.00
  };
};

export const saveMoongoldConfig = (config) => {
  localStorage.setItem('mads_moongold_config', JSON.stringify(config));
};

/**
 * Generate HMAC SHA-256 Auth Signature
 * Formula from doc.moogold.com: hash_hmac('SHA256', Payload + Current_Timestamp + Path, YOUR_SECRET_KEY)
 */
async function generateHmacSha256(message, secret) {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('HMAC SHA256 generation error:', err);
    return '';
  }
}

/**
 * Build MooGold API 1.0 Authentication Headers
 * 1. Authorization: Basic base64_encode(Partner_ID + ":" + Secret_Key)
 * 2. auth: HMAC_SHA256(Payload + Timestamp + Path, Secret_Key)
 * 3. timestamp: UNIX timestamp in seconds
 */
async function getMooGoldHeaders(path, bodyObj, partnerId, secretKey) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadStr = JSON.stringify(bodyObj);
  const stringToSign = payloadStr + timestamp + path;
  const authSignature = await generateHmacSha256(stringToSign, secretKey);
  const basicAuth = 'Basic ' + btoa(`${partnerId}:${secretKey}`);

  return {
    'Content-Type': 'application/json',
    'Authorization': basicAuth,
    'auth': authSignature,
    'timestamp': timestamp.toString()
  };
}

/**
 * Fetch Live Merchant Balance from MooGold Reseller API
 * Endpoint: POST /user/balance
 */
// The store's real MooGold balance, read by the server with its own keys
// (admin session). Returns { success, balanceUsd, balanceLkr, isRealtime }
// or { success: false, error } — never a made-up number.
export const checkMoongoldBalance = async () => {
  try {
    const res = await fetch('/api/admin/moogold-balance', { credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success && Number.isFinite(Number(data.balanceUsd))) {
      const usd = Number(data.balanceUsd);
      return { success: true, balanceUsd: usd, balanceLkr: Math.round(usd * 305), currency: 'USD', isRealtime: true };
    }
    return { success: false, error: data?.error || (res.status === 401 ? 'Admin session expired.' : 'Could not read the MooGold balance.') };
  } catch (e) {
    return { success: false, error: 'Could not reach the server.' };
  }
};

import { lookupFreePlayerIgn, saveCachedIgn } from './playerLookup.js';

/**
 * Player name (IGN) check. The server does the lookup (MooGold validate,
 * then free community lookups), because MooGold's keys live there and the
 * community APIs block browsers. Returns { success: true, ign } only when a
 * real name was found; otherwise { success: false }. It never makes a name up.
 */
export const checkPlayerIGN = async (gameId = '', playerId = '', zoneId = '') => {
  const cleanId = String(playerId).trim();
  const cleanZone = String(zoneId || '').trim();
  if (!cleanId) {
    return { success: false, message: 'Please enter a valid Player ID' };
  }

  try {
    const res = await fetch('/api/player-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, playerId: cleanId, zoneId: cleanZone }),
      signal: AbortSignal.timeout(20000)
    });
    const data = await res.json().catch(() => null);
    if (data?.success && data.ign) {
      saveCachedIgn(gameId, cleanId, cleanZone, data.ign);
      return { success: true, ign: data.ign, isReal: true, status: 'VERIFIED', source: data.source };
    }
    if (res.status === 429) {
      return { success: false, message: 'Too many checks. Please wait a minute and try again.' };
    }
    return { success: false, message: data?.message || 'Player name not found. Check the ID and try again.' };
  } catch (err) {
    console.warn('Player name check error:', err);
  }

  // Server unreachable: try the browser-side lookups (works for cached names).
  const freeResult = await lookupFreePlayerIgn(gameId, cleanId, cleanZone).catch(() => null);
  if (freeResult?.ign) {
    return { success: true, ign: freeResult.ign, isReal: true, status: 'VERIFIED' };
  }
  return { success: false, message: 'Name check is not available right now. Please try again.' };
};

/**
 * Dispatch Topup Order via MooGold API 1.0
 * Endpoint: POST /order/create_order
 */
export const dispatchMoongoldOrder = async (orderData) => {

  // Get current Firebase Auth user ID token for secure backend verification
  let idToken = null;
  if (auth && auth.currentUser) {
    try {
      idToken = await auth.currentUser.getIdToken(true);
    } catch (e) {
      console.warn('Could not retrieve Auth ID Token:', e.message);
    }
  }

  // Username/password and reseller logins use their signed session.
  if (!idToken) idToken = getSessionToken();

  if (!idToken) {
    notifySessionExpired();
    return {
      success: false,
      status: 'FAILED',
      message: 'Authentication failed! Please log in to your MADS TOPUP account before ordering.'
    };
  }

  // Generate standard RFC4122 UUID v4 for partnerOrderId as required by MooGold API
  const generateUuid = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const partnerOrderId = generateUuid();

  // (A browser-only "simulation mode" used to return a fake success here
  // without placing the order. Orders always go to the server now.)

  const gameId = (orderData.gameId || orderData.game?.id || '').toLowerCase();
  const idLabel = (orderData.idLabel || orderData.game?.idLabel || '').toLowerCase();

  const productId = orderData.package?.moongoldProductId || '215570';

  // MooGold API: category is always 1 (Direct Top Up) for order creation,
  // for every game — confirmed live against the real API (category:1 with
  // the correct 'Player ID' field below succeeded, order_id 46748036).
  // moongoldCategoryId on the game object (e.g. '50' for Free Fire SG/MY)
  // is for a DIFFERENT endpoint (product listing/browsing), not order
  // creation — an earlier fix attempt conflated the two.
  //
  // MooGold's official OpenAPI spec (api-doc.yaml) documents category,
  // product-id, and quantity as `type: integer`, not quoted strings.
  // eVoucher products (Garena Shells) are category 2 and take no player
  // fields: MooGold returns a PIN code instead.
  const isVoucher = orderData.game?.fulfilment === 'voucher';
  const dataPayload = {
    category: isVoucher ? 2 : 1,
    'product-id': parseInt(productId, 10),
    quantity: parseInt(orderData.quantity || 1, 10)
  };

  if (isVoucher) {
    // nothing to add
  } else if (orderData.game?.moongoldIdField) {
    // Games whose MooGold product names its own ID field (Valorant: 'Riot Username').
    dataPayload[orderData.game.moongoldIdField] = (orderData.playerId || '').trim();
  } else if (gameId.includes('pubg') || idLabel.includes('character')) {
    dataPayload['Character ID'] = orderData.playerId || '';
  } else if (gameId.includes('freefire')) {
    // MooGold Free Fire (SG/MY) requires 'Player ID', not 'User ID' —
    // confirmed live against the real MooGold API; a prior "fix" had this
    // backwards and was the actual root cause of every Free Fire order
    // failing with a misleading "Product ID incorrect/unauthorized" error.
    dataPayload['Player ID'] = orderData.playerId || '';
  } else {
    dataPayload['User ID'] = orderData.playerId || '';
    if (orderData.zoneId) {
      dataPayload['Server ID'] = orderData.zoneId;
      dataPayload['Server'] = orderData.zoneId;
    }
  }

  const path = 'order/create_order';
  const priceLkr = (orderData.priceLkr !== undefined && orderData.priceLkr !== null && orderData.priceLkr > 0)
    ? orderData.priceLkr
    : (orderData.package?.priceLkr || 0);
  const paymentId = orderData.payment?.id || orderData.paymentMethod || 'wallet';

  // Pending referral code from a /ref link — the server pays the referrer's
  // cashback on this user's first successful order.
  const referralCode = (() => {
    try {
      return localStorage.getItem('mads_ref_used') ? '' : (localStorage.getItem('mads_pending_ref') || '');
    } catch (_) { return ''; }
  })();

  const bodyObj = {
    path,
    data: dataPayload,
    partnerOrderId,
    priceLkr,
    paymentId,
    referralCode,
    // Only ever WIDENS the server's price-tolerance check after it
    // independently re-verifies the caller is a real approved reseller —
    // this flag alone grants nothing.
    isResellerOrder: Boolean(orderData.isResellerOrder)
  };

  // Dispatch ONLY through secure backend proxy with Bearer Auth Token
  try {
    const proxyRes = await fetch('/api/moogold', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ path, bodyObj, priceLkr, paymentId })
    });

    const data = await proxyRes.json().catch(() => ({}));

    if (proxyRes.ok) {
      if (data && (data.status === 'processing' || data.status === 'true' || data.status === true || data.status === 1 || data.order_id)) {
        if (referralCode) {
          try { localStorage.setItem('mads_ref_used', '1'); localStorage.removeItem('mads_pending_ref'); } catch (_) {}
        }
        return {
          success: true,
          moongoldRef: data.order_id || partnerOrderId,
          partnerOrderId,
          status: 'COMPLETED',
          message: data.message || 'Order created successfully!',
          newBalanceLkr: data.newBalanceLkr,
          newBalanceUsdt: data.newBalanceUsdt,
          voucherCodes: Array.isArray(data.voucherCodes) ? data.voucherCodes : null,
          data
        };
      } else {
        return {
          success: false,
          moongoldRef: partnerOrderId,
          status: 'FAILED',
          message: data.error || data.message || data.err_message || 'Order creation failed at provider',
          data
        };
      }
    } else {
      if (proxyRes.status === 401) notifySessionExpired();
      if (data && data.blocked) {
        // The server refused because this account is blocked — AppContext
        // logs the user out, and callers don't record a failed order.
        try { window.dispatchEvent(new Event('mads:account-blocked')); } catch (_) {}
        return { success: false, blocked: true, status: 'FAILED', message: data.error || 'Your account has been blocked.' };
      }
      return {
        success: false,
        moongoldRef: partnerOrderId,
        status: 'FAILED',
        message: data.error || data.message || `Server returned HTTP ${proxyRes.status}`
      };
    }
  } catch (err) {
    console.error('MooGold secure order error:', err);
    return {
      success: false,
      moongoldRef: partnerOrderId,
      status: 'FAILED',
      message: 'Network or connection error. Please try again.'
    };
  }
};

// The logged-in user's eVoucher PIN codes (Garena Shells etc.), newest first.
export const fetchMyVouchers = async () => {
  try {
    let idToken = null;
    if (auth && auth.currentUser) {
      try { idToken = await auth.currentUser.getIdToken(); } catch (_) {}
    }
    if (!idToken) idToken = getSessionToken();
    if (!idToken) return { success: false, vouchers: [] };
    const res = await fetch('/api/my-vouchers', { headers: { 'Authorization': `Bearer ${idToken}` } });
    if (res.status === 401) notifySessionExpired();
    const data = await res.json().catch(() => ({}));
    return { success: res.ok, vouchers: Array.isArray(data.vouchers) ? data.vouchers : [] };
  } catch (e) {
    return { success: false, vouchers: [] };
  }
};
