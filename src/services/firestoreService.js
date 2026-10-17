import { db, rtdb } from './firebaseAuth.js';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref as dbRef, get as rtdbGet, set as rtdbSet, update as rtdbUpdate, onValue as rtdbOnValue } from 'firebase/database';
import { postServerApi, getServerApi, getUserAuthToken, getSessionToken, setSessionToken } from './serverApi.js';
import { getAllPopupBanners, MAX_POPUP_BANNERS } from '../utils/popupBanners.js';

// A login token without logging anyone out when there is none.
const getUserAuthTokenQuiet = async () => {
  try {
    const { auth } = await import('./firebaseAuth.js');
    if (auth?.currentUser) return await auth.currentUser.getIdToken().catch(() => null);
  } catch (_) {}
  return getSessionToken();
};

/**
 * SHA-256 password hashing using Web Crypto API (runs in browser & Node).
 * Returns a hex string prefixed with 'sha256:' so we can detect hashed vs plain-text legacy passwords.
 */
export const hashPassword = async (plain) => {
  if (!plain) return '';
  // Already hashed — don't double-hash
  if (String(plain).startsWith('sha256:')) return plain;
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(String(plain));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `sha256:${hashHex}`;
  } catch (e) {
    // Fallback: simple non-crypto hash for environments without SubtleCrypto
    let h = 0x811c9dc5;
    for (let i = 0; i < plain.length; i++) h = Math.imul(31, h) + plain.charCodeAt(i) | 0;
    return `sha256:fallback:${Math.abs(h).toString(16)}`;
  }
};

/**
 * Helper function to generate a 100% unique & stable Security Key for each user/reseller.
 * Uses object properties (uid, email, username) or seed string and persists fallback in localStorage.
 */
export const generateUniqueSecurityKey = (seedInput, existingKey = null) => {
  if (existingKey && String(existingKey).startsWith('MADS-SEC-')) {
    return String(existingKey).toUpperCase();
  }

  let seedStr = seedInput;
  if (typeof seedInput === 'object' && seedInput !== null) {
    if (seedInput.securityKey && String(seedInput.securityKey).startsWith('MADS-SEC-')) {
      return String(seedInput.securityKey).toUpperCase();
    }
    seedStr = seedInput.uid || seedInput.email || seedInput.username || seedInput.phone || seedInput.name || seedInput.id || seedInput.appId;
  }

  if (typeof seedStr === 'string' && seedStr.startsWith('MADS-SEC-')) {
    return seedStr.toUpperCase();
  }

  // Persistent browser fallback seed to prevent changing key across re-renders when profile is loading
  let fallbackSeed = '';
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      fallbackSeed = localStorage.getItem('mads_device_reseller_seed');
      if (!fallbackSeed) {
        fallbackSeed = 'SEED-' + Math.random().toString(36).substring(2, 12).toUpperCase();
        localStorage.setItem('mads_device_reseller_seed', fallbackSeed);
      }
    } catch (e) {}
  }

  const cleanSeed = String(seedStr || fallbackSeed || 'DEFAULT-RESELLER-SEED').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  let hash1 = 5381;
  let hash2 = 0;
  for (let i = 0; i < cleanSeed.length; i++) {
    const char = cleanSeed.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) + char;
    hash2 = char + (hash2 << 6) + (hash2 << 16) - hash2;
  }

  const hex1 = Math.abs(hash1).toString(36).toUpperCase().padStart(4, '0').slice(-4);
  const hex2 = Math.abs(hash2).toString(36).toUpperCase().padStart(4, '0').slice(-4);
  const part1 = cleanSeed.slice(-4).padStart(4, 'X');

  return `MADS-SEC-${part1.slice(0, 2)}${hex1.slice(0, 3)}${hex2.slice(0, 3)}`;
};

/**
 * Helper function to generate a 100% unique & stable Reseller Code (RS-XXXXXX)
 */
export const generateUniqueResellerCode = (seedInput, existingCode = null) => {
  if (existingCode && String(existingCode).startsWith('RS-')) {
    return String(existingCode).toUpperCase();
  }

  let seedStr = seedInput;
  if (typeof seedInput === 'object' && seedInput !== null) {
    if (seedInput.resellerCode && String(seedInput.resellerCode).startsWith('RS-')) {
      return String(seedInput.resellerCode).toUpperCase();
    }
    seedStr = seedInput.uid || seedInput.email || seedInput.username || seedInput.phone || seedInput.name || seedInput.id || seedInput.appId;
  }

  if (typeof seedStr === 'string' && seedStr.startsWith('RS-')) {
    return seedStr.toUpperCase();
  }

  let fallbackSeed = '';
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      fallbackSeed = localStorage.getItem('mads_device_reseller_seed');
      if (!fallbackSeed) {
        fallbackSeed = 'SEED-' + Math.random().toString(36).substring(2, 12).toUpperCase();
        localStorage.setItem('mads_device_reseller_seed', fallbackSeed);
      }
    } catch (e) {}
  }

  const cleanSeed = String(seedStr || fallbackSeed || 'DEFAULT-RESELLER-SEED').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  let hash = 0;
  for (let i = 0; i < cleanSeed.length; i++) {
    hash = (hash << 5) - hash + cleanSeed.charCodeAt(i);
    hash |= 0;
  }

  const codeHex = Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(-6);
  return `RS-${codeHex}`;
};

/**
 * Ensure unique Reseller Code & Security Key exist deterministically for a user profile
 */
export const ensureResellerCredentials = (user) => {
  if (!user) return null;
  const resellerCode = generateUniqueResellerCode(user, user.resellerCode);
  const securityKey = generateUniqueSecurityKey(user, user.securityKey);

  return {
    ...user,
    resellerCode,
    securityKey
  };
};

// Active reseller memory registry for Telegram bot & instant validation
export const activeResellerRegistry = new Map();

export const registerResellerInRegistry = (profile) => {
  if (!profile) return null;
  const creds = ensureResellerCredentials(profile);
  if (creds.securityKey) {
    activeResellerRegistry.set(creds.securityKey.toUpperCase(), creds);
  }
  if (creds.resellerCode) {
    activeResellerRegistry.set(creds.resellerCode.toUpperCase(), creds);
  }
  if (creds.uid) {
    activeResellerRegistry.set(String(creds.uid).toUpperCase(), creds);
  }
  return creds;
};

// The signed-in user's own records, read through the server (/api/me):
// browsers can't read the users list (database rules). Uses the Firebase ID
// token for Google sign-ins, otherwise the password-login session; never
// logs anyone out. Returns the response body, { status: 404 } when the
// account has no record yet, or null when not signed in / unreachable.
export const fetchMyAccount = async (opts = {}) => {
  try {
    const token = await getUserAuthTokenQuiet();
    if (!token) return null;
    const { ok, status, data } = await postServerApi('/api/me', opts, token);
    if (status === 404) return { ...(data || {}), status: 404 };
    return ok ? data : null;
  } catch (_) {
    return null;
  }
};

/**
 * The signed-in user's approved reseller profile (the key argument is kept
 * for callers; the server decides from the login, not from the key).
 */
export const getResellerProfileByKeyAsync = async (keyOrCode) => {
  const me = await fetchMyAccount({ reseller: true });
  const r = me?.reseller;
  if (!r) return null;
  const profile = ensureResellerCredentials({
    ...r,
    walletBalance: parseFloat(r.walletBalance || 0),
    walletUsdt: parseFloat(r.walletUsdt || 0),
    isReseller: true,
    resellerStatus: 'APPROVED'
  });
  registerResellerInRegistry(profile);
  if (keyOrCode) activeResellerRegistry.set(String(keyOrCode).trim().toUpperCase(), profile);
  return profile;
};

export const getResellerProfileByKey = (keyOrCode) => {
  if (!keyOrCode) return null;
  const cleanKey = String(keyOrCode).trim().toUpperCase();
  
  if (activeResellerRegistry.has(cleanKey)) {
    return activeResellerRegistry.get(cleanKey);
  }

  // Trigger background async database lookup to populate cache
  getResellerProfileByKeyAsync(cleanKey).catch(() => {});

  return null;
};

/**
 * Sync or create user profile document in Firestore & Realtime Database
 */
export const syncUserProfileToFirestore = async (user) => {
  if (!user || !user.uid) return null;

  let profileData = null;

  // 1. Realtime Database (RTDB): the own record is read through the server;
  // a missing one is created here (browsers may only create records).
  if (rtdb) {
    try {
      const userRtdbRef = dbRef(rtdb, `users/${user.uid}`);
      const me = await fetchMyAccount();
      // linked: a Google login joined to the earlier account with the same
      // email; that account (its own uid) is the profile from now on.
      const mine = me?.profile && (me.profile.uid === user.uid || me.linked) ? me.profile : null;
      // Create only when the server says there is no record, or at signup
      // (no session yet); the database rules refuse overwriting one.
      const canCreate = me?.status === 404 || (!me && Boolean(user.password));
      if (!mine && !canCreate) throw new Error('Profile not readable right now');
      if (mine) {
        profileData = mine;
        if (!profileData.securityKey || !profileData.resellerCode) {
          const creds = ensureResellerCredentials(profileData);
          profileData = { ...profileData, ...creds };
          await updateUserProfileInFirestore(profileData.uid, {
            securityKey: creds.securityKey,
            resellerCode: creds.resellerCode
          });
        }
      } else {
        const creds = ensureResellerCredentials(user);
        const newUserProfile = {
          uid: user.uid,
          name: user.name || 'Verified Gamer',
          email: user.email || '',
          phone: user.phone || '',
          // New accounts always start empty; only the server adds money.
          walletBalance: 0,
          walletUsdt: 0,
          resellerCode: creds.resellerCode,
          securityKey: creds.securityKey,
          isReseller: false,
          avatar: user.photoURL || user.avatar || '',
          savedIds: user.savedIds || [],
          createdAt: user.createdAt || new Date().toISOString()
        };
        if (user.password) newUserProfile.password = await hashPassword(user.password);
        await rtdbSet(userRtdbRef, newUserProfile);
        profileData = newUserProfile;
      }
    } catch (e) {
      console.warn('Realtime Database sync note:', e);
    }
  }

  // 2. Try Firestore (ALWAYS sync to Firestore as well, so both databases stay in sync)
  if (db) {
    try {
      const userRef = doc(db, 'users', profileData?.uid || user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const existingData = docSnap.data();
        if (!profileData) profileData = existingData;
        const creds = ensureResellerCredentials(profileData);
        profileData = { ...existingData, ...profileData, ...creds };
        await setDoc(userRef, {
          securityKey: creds.securityKey,
          resellerCode: creds.resellerCode
        }, { merge: true });
      } else {
        const creds = ensureResellerCredentials(profileData || user);
        const newUserProfile = {
          uid: profileData?.uid || user.uid,
          name: profileData?.name || user.name || 'Verified Gamer',
          email: profileData?.email || user.email || '',
          phone: profileData?.phone || user.phone || '',
          walletBalance: profileData?.walletBalance || user.walletBalance || 0,
          walletUsdt: profileData?.walletUsdt || user.walletUsdt || 0,
          resellerCode: creds.resellerCode,
          securityKey: creds.securityKey,
          isReseller: profileData?.isReseller || user.isReseller || false,
          avatar: profileData?.avatar || user.photoURL || user.avatar || '',
          savedIds: profileData?.savedIds || user.savedIds || [],
          createdAt: profileData?.createdAt || user.createdAt || new Date().toISOString()
        };
        await setDoc(userRef, newUserProfile);
        if (!profileData) profileData = newUserProfile;
      }
    } catch (error) {
      console.warn('Firestore sync note:', error);
    }
  }

  const finalProfile = ensureResellerCredentials(profileData || {
    uid: user.uid,
    name: user.name || 'Verified Gamer',
    email: user.email || '',
    phone: user.phone || '',
    walletBalance: user.walletBalance || 0,
    walletUsdt: user.walletUsdt || 0,
    avatar: user.photoURL || user.avatar || '',
    savedIds: user.savedIds || [],
    createdAt: new Date().toISOString()
  });

  registerResellerInRegistry(finalProfile);
  return finalProfile;
};

/**
 * Save user profile updates to Database
 */
const PROFILE_FIELDS = ['name', 'phone', 'avatar', 'storeName', 'storeEmail', 'provider', 'savedIds', 'resellerCode', 'securityKey'];
const lastSentProfile = new Map();
export const updateUserProfileInFirestore = async (uid, rawData) => {
  if (!uid) return;
  // Browsers can't edit users records directly any more (database rules);
  // the server saves only the caller's own editable fields.
  const fields = {};
  for (const k of PROFILE_FIELDS) if (rawData && rawData[k] !== undefined) fields[k] = rawData[k];
  if (!Object.keys(fields).length) return;
  const sig = JSON.stringify(fields);
  const prev = lastSentProfile.get(uid) || {};
  const changed = Object.fromEntries(Object.entries(fields).filter(([k, v]) => JSON.stringify(prev[k]) !== JSON.stringify(v)));
  if (!Object.keys(changed).length) return;
  try {
    // Quiet token lookup: a profile save must never log the user out (e.g.
    // during signup, before the session exists).
    const { auth } = await import('./firebaseAuth.js');
    const token = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : getSessionToken();
    if (!token) return;
    const res = await fetch('/api/user/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fields: changed })
    });
    if (res.ok) lastSentProfile.set(uid, JSON.parse(sig));
  } catch (e) {
    console.warn('Profile save note:', e);
  }
  // Keep the Firestore copy in step, since the profile listener reads it too.
  if (db) {
    try {
      await Promise.race([
        setDoc(doc(db, 'users', uid), changed, { merge: true }),
        new Promise((r) => setTimeout(r, 1800))
      ]);
    } catch (error) {
      console.warn('Firestore update note:', error);
    }
  }
};

/**
 * Verify user password during login
 */
export const ACCOUNT_BLOCKED_MESSAGE = 'Your account has been blocked. Please contact support.';

// True when any user record for this uid or email is BLOCKED (a person can
// have several records; the admin's Block button marks one of them).
export const isAccountBlockedAsync = async (uid, email) => {
  if (!uid && !email) return false;
  const me = await fetchMyAccount({ checkBlocked: true });
  return Boolean(me?.blocked);
};

// Username/password and reseller login. The server checks the password and
// returns a signed session token (stored for later top-ups). The browser no
// longer compares passwords against the public users list itself.
export const verifyUserLoginAsync = async (identifier, passwordInput, remember = true) => {
  if (!identifier || !passwordInput) return { success: false, message: 'Please enter username and password!' };
  const { ok, data } = await postServerApi('/api/auth/login', { identifier: String(identifier).trim(), password: String(passwordInput) });
  if (ok && data?.success && data.token) {
    setSessionToken(data.token, remember);
    return { success: true, user: data.user };
  }
  return {
    success: false,
    blocked: Boolean(data?.blocked),
    message: data?.message || data?.error || 'Login failed. Please try again.'
  };
};

// Password reset: the server emails a code and checks it (the code used to
// be made and checked in the browser, so anyone could reset any password).
export const requestPasswordResetCode = async (email) => {
  const { ok, data } = await postServerApi('/api/auth/reset-request', { email: String(email || '').trim() });
  return { success: ok && Boolean(data?.success), message: data?.message || data?.error };
};

export const confirmPasswordReset = async (email, code, newPassword) => {
  const { ok, data } = await postServerApi('/api/auth/reset-confirm', { email: String(email || '').trim(), code: String(code || '').trim(), newPassword });
  return { success: ok && Boolean(data?.success), message: data?.message || data?.error };
};

/**
 * Credit user or reseller wallet balance in Realtime Database & Firestore by UID, Email, or Reseller Code
 */
export const creditUserWalletInDatabase = async (identifier, lkrAmount, usdtAmount = 0, opts = {}) => {
  if (!identifier || (!lkrAmount && !usdtAmount)) return false;
  return adminWalletRequest({ identifier: String(identifier).trim(), mode: 'credit', lkr: lkrAmount || 0, usdt: usdtAmount || 0 }, opts);
};

/**
 * Set exact user wallet balance (admin only) by UID, Email, Reseller Code, or Security Key
 */
export const setUserExactBalanceInDatabase = async (identifier, exactLkr, exactUsdt, opts = {}) => {
  if (!identifier) return false;
  return adminWalletRequest({
    identifier: String(identifier).trim(),
    mode: 'set',
    lkr: Math.max(0, parseFloat(exactLkr) || 0),
    usdt: Math.max(0, parseFloat(exactUsdt) || 0)
  }, opts);
};

// Wallet changes are made by the server (admin session required). Returns
// the user's database key, or false/throws (strict) on failure.
const adminWalletRequest = async (body, opts = {}) => {
  const { ok, data } = await postServerApi('/api/admin/wallet', body);
  if (!ok || !data?.success) {
    const message = data?.error || 'Wallet update failed';
    console.warn('Admin wallet update failed:', message);
    if (opts.strict) throw new Error(message);
    return false;
  }
  for (const [, profile] of activeResellerRegistry.entries()) {
    if (profile && profile.uid === data.key) {
      profile.walletBalance = data.newBalanceLkr;
      profile.walletUsdt = data.newBalanceUsdt;
    }
  }
  return data.key;
};

/**
 * Listen to live user profile changes in Realtime Database or Firestore
 */
export const subscribeUserProfile = (uid, callback) => {
  if (!uid) return () => {};

  // The own record is read through the server every 20s and when the tab
  // comes back into view (browsers can't listen to users/ directly).
  let stopped = false;
  const refresh = async () => {
    if (stopped) return;
    const me = await fetchMyAccount();
    if (stopped || !me?.profile || me.profile.uid !== uid) return;
    const creds = ensureResellerCredentials(me.profile);
    registerResellerInRegistry(creds);
    callback(creds);
  };
  refresh();
  const timer = setInterval(refresh, 20000);
  const onVisible = () => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') refresh(); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);

  let unsubFirestore = null;
  if (db) {
    try {
      const userRef = doc(db, 'users', uid);
      unsubFirestore = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const creds = ensureResellerCredentials(snapshot.data());
          registerResellerInRegistry(creds);
          callback(creds);
        }
      }, () => {});
    } catch (err) {
      console.warn('Firestore listener note:', err);
    }
  }

  return () => {
    stopped = true;
    clearInterval(timer);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    if (typeof unsubFirestore === 'function') unsubFirestore();
  };
};

/**
 * Save a new top-up order to Database
 */
export const saveOrderToFirestore = async (uid, order) => {
  const payload = {
    ...order,
    userId: uid || 'guest',
    timestamp: new Date().toISOString()
  };

  if (rtdb) {
    try {
      const orderRef = dbRef(rtdb, `orders/${order.id || Date.now()}`);
      await rtdbSet(orderRef, payload);
    } catch (e) {
      console.warn('RTDB order save note:', e);
    }
  }

  if (db) {
    try {
      const ordersCol = collection(db, 'orders');
      await addDoc(ordersCol, payload);
    } catch (err) {
      console.warn('Firestore order save note:', err);
    }
  }
};

/**
 * Subscribe to real-time order updates for user or admin
 */
export const subscribeOrdersFromFirestore = (uid, callback, email = '') => {
  let unsubRtdb = null;
  let unsubFirestore = null;
  // A customer's own orders: saved under their uid, or (server records and
  // older orders) only under their email.
  const lowerEmail = String(email || '').toLowerCase();
  const isMine = (o) => o.userId === uid || o.userEmail === uid ||
    (Boolean(lowerEmail) && String(o.userEmail || '').toLowerCase() === lowerEmail);

  if (rtdb) {
    try {
      const ordersRef = dbRef(rtdb, 'orders');
      unsubRtdb = rtdbOnValue(ordersRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const all = Object.keys(data).map(key => ({ ...data[key], key }));
          // The server writes its own record of every order (source: 'server');
          // show it only when the browser never saved its own copy.
          const clientIds = new Set(all.filter(o => o.source !== 'server')
            .flatMap(o => [o.partnerOrderId, ...(Array.isArray(o.partnerOrderIds) ? o.partnerOrderIds : [])]).filter(Boolean));
          const list = all.filter(o => o.source !== 'server' || !clientIds.has(o.partnerOrderId));
          const filtered = uid ? list.filter(isMine) : list;
          if (filtered.length > 0) callback(filtered);
        }
      });
    } catch (e) {
      console.warn('RTDB orders listener note:', e);
    }
  }

  if (db) {
    try {
      const ordersCol = collection(db, 'orders');
      unsubFirestore = onSnapshot(ordersCol, (snapshot) => {
        const list = snapshot.docs.map(docSnap => ({ firestoreId: docSnap.id, ...docSnap.data() }));
        const filtered = uid ? list.filter(isMine) : list;
        if (filtered.length > 0) callback(filtered);
      }, (err) => {
        // Gracefully handle permission denials without unhandled console errors
        console.warn('Firestore orders permission notice:', err.code);
      });
    } catch (err) {
      console.warn('Firestore orders listener note:', err);
    }
  }

  return () => {
    if (typeof unsubRtdb === 'function') unsubRtdb();
    if (typeof unsubFirestore === 'function') unsubFirestore();
  };
};

/**
 * Update order status in Realtime Database & Firestore
 */
export const updateOrderStatusInFirestore = async (orderId, newStatus, moongoldRef = null) => {
  const updatePayload = {
    status: newStatus,
    ...(moongoldRef ? { moongoldRef } : {}),
    updatedAt: new Date().toISOString()
  };

  // Existing orders can only be changed by the server (admin session).
  const { ok, data } = await postServerApi('/api/admin/order-status', { orderId, status: newStatus, moongoldRef });
  if (!ok) {
    console.warn('Order status was not saved:', data?.error);
    return false;
  }

  // Also update Firestore orders collection (was missing before)
  if (db) {
    try {
      const ordersCol = collection(db, 'orders');
      const q = query(ordersCol, where('id', '==', orderId));
      const qSnap = await getDocs(q);
      qSnap.forEach(async (docSnap) => {
        await updateDoc(doc(db, 'orders', docSnap.id), updatePayload);
      });
    } catch (e) { console.warn('Firestore order status update note:', e); }
  }
  return true;
};

/**
 * Save manual payment record (EZ Cash, Binance Pay, Bank Slip) to Database
 */
export const saveManualPaymentToFirestore = async (payment) => {
  if (!payment) return;
  const payId = payment.id || `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
  const payload = {
    ...payment,
    id: payId,
    timestamp: new Date().toISOString()
  };

  if (rtdb) {
    try {
      const payRef = dbRef(rtdb, `manual_payments/${payId}`);
      await rtdbSet(payRef, payload);
    } catch (e) {
      console.warn('RTDB manual payment save note:', e);
    }
  }

  if (db) {
    try {
      const payCol = collection(db, 'manual_payments');
      await addDoc(payCol, payload);
    } catch (err) {
      console.warn('Firestore manual payment save note:', err);
    }
  }
};

/**
 * Update manual payment status in Database
 */
// Deposits are approved and credited on the server, which reads the amount
// and account from the stored record. Browsers can't edit deposits.
export const approveManualPaymentOnServer = async (paymentId) => {
  const { ok, data } = await postServerApi('/api/admin/manual-payment/approve', { payId: paymentId });
  return { ok, ...(data || {}) };
};

// Rejecting goes through the server, which refuses a deposit that was
// already credited. Returns { ok, error }.
export const rejectManualPaymentOnServer = async (paymentId, reason = '') => {
  const { ok, data } = await postServerApi('/api/admin/manual-payment/reject', { payId: paymentId, reason });
  return { ok, ...(data || {}) };
};

// Admin: record a payment received outside the site. The server finds the
// customer's account by email. Returns { ok, payment, error }.
export const createManualPaymentOnServer = async (fields) => {
  const { ok, data } = await postServerApi('/api/admin/manual-payment/create', fields);
  return { ok, ...(data || {}) };
};

/**
 * Admin deposit list. The server's copy (Realtime Database) is the only one
 * it credits from, so it is the only one listed: the old Firestore copy was
 * never updated on approval and kept flipping approved deposits back to
 * PENDING. An empty list is passed on too, so removed deposits disappear.
 */
export const subscribeManualPaymentsFromFirestore = (callback) => {
  if (!rtdb) return () => {};
  try {
    return pollAdminList('payments', (data) => {
      const entries = data && typeof data === 'object' ? Object.entries(data) : [];
      callback(entries.filter(([, v]) => v && typeof v === 'object').map(([key, v]) => ({ ...v, id: key })));
    });
  } catch (e) {
    console.warn('Deposit list poll note:', e);
    return () => {};
  }
};

// Admin dashboard lists come from the server (/api/admin/data/<name>, admin
// session cookie): browsers can't read these nodes directly any more.
// Calls onData(value) now and every intervalMs. Returns a stop function.
const pollAdminList = (name, onData, intervalMs = 15000) => {
  let stopped = false;
  const load = async () => {
    if (stopped) return;
    const { ok, data } = await getServerApi(`/api/admin/data/${name}`);
    if (!stopped && ok && data && data.data !== undefined) onData(data.data);
  };
  load();
  const timer = setInterval(load, intervalMs);
  return () => { stopped = true; clearInterval(timer); };
};

/**
 * Subscribe to all registered users in Firestore or Realtime Database
 */
export const subscribeAllUsersFromFirestore = (callback) => {
  let unsubRtdb = null;
  let unsubFirestore = null;

  if (rtdb) {
    try {
      unsubRtdb = pollAdminList('users', (data) => {
        if (!data || typeof data !== 'object') return;
        const list = Object.keys(data).map(key => {
          const creds = ensureResellerCredentials({ uid: key, ...data[key] });
          registerResellerInRegistry(creds);
          return creds;
        });
        if (list.length > 0) callback(list);
      });
    } catch (e) {
      console.warn('RTDB users listener note:', e);
    }
  }

  if (db) {
    try {
      const usersCol = collection(db, 'users');
      unsubFirestore = onSnapshot(usersCol, (snapshot) => {
        const list = snapshot.docs.map(docSnap => {
          const creds = ensureResellerCredentials({ uid: docSnap.id, ...docSnap.data() });
          registerResellerInRegistry(creds);
          return creds;
        });
        if (list.length > 0) callback(list);
      }, (err) => {
        console.warn('Firestore users permission notice:', err.code);
      });
    } catch (err) {
      console.warn('Firestore users listener note:', err);
    }
  }

  return () => {
    if (typeof unsubRtdb === 'function') unsubRtdb();
    if (typeof unsubFirestore === 'function') unsubFirestore();
  };
};

/**
 * Save reseller application to Database
 */
export const saveResellerApplicationToFirestore = async (appData) => {
  const payload = {
    ...appData,
    submittedAt: new Date().toISOString()
  };

  if (rtdb) {
    try {
      const appRef = dbRef(rtdb, `reseller_applications/${appData.id || Date.now()}`);
      await rtdbSet(appRef, payload);
    } catch (e) {
      console.warn('RTDB reseller app save note:', e);
    }
  }

  if (db) {
    try {
      const colRef = collection(db, 'reseller_applications');
      await addDoc(colRef, payload);
    } catch (err) {
      console.warn('Firestore reseller app save note:', err);
    }
  }
};

/**
 * Subscribe to all reseller applications
 */
export const subscribeResellerApplicationsFromFirestore = (callback) => {
  let unsubRtdb = null;
  let unsubFirestore = null;

  if (rtdb) {
    try {
      unsubRtdb = pollAdminList('applications', (data) => {
        if (!data || typeof data !== 'object') return;
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        if (list.length > 0) callback(list);
      });
    } catch (e) {
      console.warn('RTDB reseller apps listener note:', e);
    }
  }

  if (db) {
    try {
      const colRef = collection(db, 'reseller_applications');
      unsubFirestore = onSnapshot(colRef, (snapshot) => {
        const list = snapshot.docs.map(docSnap => ({ firestoreId: docSnap.id, ...docSnap.data() }));
        if (list.length > 0) callback(list);
      }, (err) => {
        console.warn('Firestore reseller apps permission notice:', err.code);
      });
    } catch (err) {
      console.warn('Firestore reseller apps listener note:', err);
    }
  }

  return () => {
    if (typeof unsubRtdb === 'function') unsubRtdb();
    if (typeof unsubFirestore === 'function') unsubFirestore();
  };
};

/**
 * Update reseller application status and sync user reseller role
 */
export const updateResellerApplicationStatusInFirestore = async (appId, userId, newStatus, firestoreId = null, targetSecurityKey = null, targetResellerCode = null) => {
  const creds = ensureResellerCredentials({
    uid: userId || appId,
    securityKey: targetSecurityKey,
    resellerCode: targetResellerCode
  });
  let securityKey = creds.securityKey;
  let resellerCode = creds.resellerCode;
  let approval = null;

  if (rtdb) {
    try {
      const appRef = dbRef(rtdb, `reseller_applications/${appId}`);
      // Application status is written by the server (browsers can only
      // create an application).
      if (newStatus !== 'APPROVED') {
        const { ok, data } = await postServerApi('/api/admin/reseller-status', { appId, status: newStatus });
        if (!ok) console.warn('Reseller status was not saved:', data?.error);
      }
      if (newStatus === 'APPROVED') {
        let approvedAppEmail = '';
        try {
          const appSnap = await rtdbGet(appRef);
          if (appSnap.exists()) {
            const appVal = appSnap.val();
            approvedAppEmail = (appVal?.emailAddress || appVal?.email || appVal?.userEmail || '').trim().toLowerCase();
          }
        } catch (e) {}

        // The reseller flag itself is granted by the server.
        const { ok, data } = await postServerApi('/api/admin/reseller-approve', {
          appId,
          userId,
          email: approvedAppEmail,
          resellerCode,
          securityKey
        });
        // Refused (e.g. the applicant has not deposited enough yet): stop
        // here so nothing marks them approved.
        if (!ok) return { error: data?.error || 'Reseller approval was not saved.' };
        approval = data;
      }
    } catch (e) {
      console.warn('RTDB reseller app status update note:', e);
    }
  }

  // The server keeps an account's existing codes; use what it saved.
  if (approval?.resellerCode) resellerCode = approval.resellerCode;
  if (approval?.securityKey) securityKey = approval.securityKey;

  if (db) {
    try {
      if (firestoreId) {
        const docRef = doc(db, 'reseller_applications', firestoreId);
        await updateDoc(docRef, { status: newStatus, resellerCode, securityKey, updatedAt: new Date().toISOString() });
      } else {
        const appsCol = collection(db, 'reseller_applications');
        const q = query(appsCol, where('id', '==', appId));
        const qSnap = await getDocs(q);
        qSnap.forEach(async (d) => {
          await updateDoc(doc(db, 'reseller_applications', d.id), { status: newStatus, resellerCode, securityKey, updatedAt: new Date().toISOString() });
        });
      }

      if (userId && newStatus === 'APPROVED') {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, { 
          isReseller: true, 
          role: 'Reseller Partner', 
          resellerStatus: 'APPROVED',
          resellerCode,
          securityKey
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Firestore reseller status update note:', err);
    }
  }
  return approval;
};

/**
 * Save custom game package prices to Firestore & Realtime Database
 */
export const saveCustomGamePricesToFirestore = async (customPricesMap) => {
  if (!customPricesMap) return false;

  // The server charges these prices, so only it may store them (admin session).
  const { ok, data } = await postServerApi('/api/admin/custom-prices', { prices: customPricesMap });
  if (!ok) throw new Error(data?.error || 'Prices were not saved');

  return true;
};

// Prices come only from the Realtime Database settings/customPrices, the same
// record the server checks orders against. A second Firestore copy used to be
// read too; whenever it was stale or failed to save, it could overwrite the
// real prices on screen and orders were then rejected as a price mismatch.
export const subscribeCustomGamePricesFromFirestore = (callback) => {
  if (!rtdb) return () => {};
  try {
    // An empty record means every override was removed: still report it so
    // prices on screen go back to the defaults without a refresh.
    return rtdbOnValue(dbRef(rtdb, 'settings/customPrices'), (snapshot) => {
      callback(snapshot.exists() ? (snapshot.val() || {}) : {});
    });
  } catch (e) {
    console.warn('RTDB custom prices listener note:', e);
    return () => {};
  }
};

/**
 * Save master vouchers list to Firestore & Realtime Database
 */
export const saveVouchersToFirestore = async (vouchersList) => {
  if (!Array.isArray(vouchersList)) return false;

  // Saved by the server (admin session required) — browsers can't write vouchers.
  const { ok, data } = await postServerApi('/api/admin/vouchers', { vouchers: vouchersList });
  if (!ok) {
    console.warn('Vouchers save failed:', data?.error);
    return false;
  }

  if (db) {
    try {
      const vDocRef = doc(db, 'settings', 'vouchers');
      await setDoc(vDocRef, {
        list: vouchersList,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore vouchers save note:', err);
    }
  }

  return true;
};

/**
 * Subscribe to realtime master vouchers list from Firestore & Realtime Database
 */
export const subscribeVouchersFromFirestore = (callback) => {
  let unsubRtdb = null;
  let unsubFirestore = null;

  if (rtdb) {
    try {
      unsubRtdb = pollAdminList('vouchers', (data) => {
        if (data) callback(Array.isArray(data) ? data : Object.values(data));
      });
    } catch (e) {
      console.warn('RTDB vouchers listener note:', e);
    }
  }

  if (db) {
    try {
      const docRef = doc(db, 'settings', 'vouchers');
      unsubFirestore = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.list)) callback(data.list);
        }
      });
    } catch (err) {
      console.warn('Firestore vouchers listener note:', err);
    }
  }

  return () => {
    if (typeof unsubRtdb === 'function') unsubRtdb();
    if (typeof unsubFirestore === 'function') unsubFirestore();
  };
};

/**
 * Redeem a voucher. The server checks the code, enforces one redemption per
 * user and the global max-uses cap, and credits the wallet.
 */
export const redeemVoucherInDatabase = async (voucherCode, userProfile) => {
  if (!voucherCode || !userProfile) {
    return { success: false, message: 'Please log in to redeem voucher codes!' };
  }
  const token = await getUserAuthToken(userProfile);
  if (!token) return { success: false, message: 'Please log in to redeem voucher codes!' };
  const { data } = await postServerApi('/api/vouchers/redeem', { code: String(voucherCode).trim() }, token);
  if (data && typeof data.success === 'boolean') return data;
  return { success: false, message: 'Could not redeem this voucher right now. Please try again.' };
};

/**
 * Popup Ad Configuration Management & Realtime Sync
 */
export const DEFAULT_POPUP_AD_CONFIG = {
  enabled: true,
  title: '🔥 SPECIAL PROMO OFFER!',
  description: 'Get up to 20% Extra Bonus Diamonds on all Free Fire & Mobile Legends top-ups today! Fast & Instant automated delivery.',
  imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000&auto=format&fit=crop',
  buttonText: 'Top Up Now 🚀',
  buttonLink: '#catalog',
  badge: 'LIMITED TIME DEAL',
  showOncePerSession: false
};

// Every visitor downloads this config through a realtime listener, so keep it small and
// well-formed. (Embedding a multi-MB base64 image here used to blow past the database limits.)
const POPUP_AD_MAX_BYTES = 900 * 1024;

export const savePopupAdConfigToFirestore = async (config) => {
  if (!config) return false;

  const banners = getAllPopupBanners(config).slice(0, MAX_POPUP_BANNERS).map((b) => ({
    id: b.id.slice(0, 40),
    enabled: b.enabled,
    title: b.title.slice(0, 200),
    description: b.description.slice(0, 1000),
    imageUrl: b.imageUrl,
    buttonText: b.buttonText.slice(0, 60),
    buttonLink: b.buttonLink.slice(0, 500),
    badge: b.badge.slice(0, 60),
  }));
  // The top-level fields repeat the first live banner, so a visitor still on the old
  // one-banner page sees that banner.
  const first = banners.find((b) => b.enabled) || banners[0] || {};
  const clean = {
    enabled: Boolean(config.enabled),
    title: first.title || '',
    description: first.description || '',
    imageUrl: first.imageUrl || '',
    buttonText: first.buttonText || '',
    buttonLink: first.buttonLink || '#catalog',
    badge: first.badge || '',
    showOncePerSession: Boolean(config.showOncePerSession),
    banners,
  };

  if (JSON.stringify(clean).length > POPUP_AD_MAX_BYTES) {
    console.warn('[PopupAd] Config too large to publish (image is embedded as base64). Upload the image so it is stored as a URL.');
    return false;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try { localStorage.setItem('mads_popup_ad_config', JSON.stringify(clean)); } catch (e) {}
  }

  // Report the truth: success means the config reached at least one live database.
  // Published by the server to the realtime database (the rules stop browsers writing
  // siteConfig). Visitors read that copy, so only the server's answer counts as "live".
  const { ok, data } = await postServerApi('/api/admin/popup-ad', { config: clean });
  if (!ok) {
    console.warn('[PopupAd] Publish failed:', data?.error);
    return false;
  }
  // Best-effort mirror so the Firestore fallback never serves an older ad.
  if (db) {
    try { await setDoc(doc(db, 'siteConfig', 'popupAd'), clean); } catch (e) { /* rules may deny it */ }
  }
  return true;
};

export const subscribePopupAdConfigFromFirestore = (callback) => {
  if (typeof callback !== 'function') return () => {};

  let localSaved = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const item = localStorage.getItem('mads_popup_ad_config');
      if (item) localSaved = JSON.parse(item);
    } catch (e) {}
  }
  // No cached copy: stay quiet until the live config arrives. Falling back to the demo
  // default here flashed a placeholder ad that reopened as the real one once it loaded.
  if (localSaved) callback(localSaved);

  let unsubDb = null;
  let unsubRtdb = null;
  // The server publishes to the realtime database; once it answers, a stale Firestore
  // copy must not overwrite it (the two listeners fire in any order).
  let rtdbHasAd = false;

  if (rtdb) {
    try {
      const adRef = dbRef(rtdb, 'siteConfig/popupAd');
      unsubRtdb = rtdbOnValue(adRef, (snap) => {
        if (snap.exists() && snap.val()) {
          rtdbHasAd = true;
          const data = snap.val();
          if (typeof window !== 'undefined' && window.localStorage) {
            try { localStorage.setItem('mads_popup_ad_config', JSON.stringify(data)); } catch (e) {}
          }
          callback(data);
        }
      });
    } catch (e) {}
  }

  if (db) {
    try {
      const adDocRef = doc(db, 'siteConfig', 'popupAd');
      unsubDb = onSnapshot(adDocRef, (docSnap) => {
        if (docSnap.exists() && !rtdbHasAd) {
          const data = docSnap.data();
          if (typeof window !== 'undefined' && window.localStorage) {
            try { localStorage.setItem('mads_popup_ad_config', JSON.stringify(data)); } catch (e) {}
          }
          callback(data);
        }
      });
    } catch (e) {}
  }

  return () => {
    if (typeof unsubDb === 'function') unsubDb();
    if (typeof unsubRtdb === 'function') unsubRtdb();
  };
};

/**
 * "Discover more games" icon bar on the home page.
 * Admin edits it in the "Games Bar" tab; the server publishes it to siteConfig/gameStrip.
 * An empty item list means "show every game in the catalog".
 */
export const DEFAULT_GAME_STRIP_CONFIG = {
  enabled: true,
  title: 'Discover More Games',
  items: [],
};

export const GAME_STRIP_MAX_ITEMS = 40;

// RTDB hands arrays back as objects when keys have gaps; always give the UI a clean array.
export const normalizeGameStripConfig = (raw) => {
  const c = raw && typeof raw === 'object' ? raw : {};
  const list = Array.isArray(c.items) ? c.items : (c.items && typeof c.items === 'object' ? Object.values(c.items) : []);
  return {
    enabled: c.enabled === undefined ? true : Boolean(c.enabled),
    title: String(c.title ?? DEFAULT_GAME_STRIP_CONFIG.title).slice(0, 80),
    items: list
      .filter((it) => it && typeof it === 'object' && it.imageUrl)
      .slice(0, GAME_STRIP_MAX_ITEMS)
      .map((it) => ({
        name: String(it.name || '').slice(0, 60),
        imageUrl: String(it.imageUrl || ''),
        link: String(it.link || '#catalog').slice(0, 500),
      })),
  };
};

export const saveGameStripConfig = async (config) => {
  const clean = normalizeGameStripConfig(config);
  if (JSON.stringify(clean).length > 900 * 1024) {
    console.warn('[GameStrip] Config too large to publish. Upload the icons so they are stored as links.');
    return false;
  }
  const { ok, data } = await postServerApi('/api/admin/game-strip', { config: clean });
  if (!ok) {
    console.warn('[GameStrip] Publish failed:', data?.error);
    return false;
  }
  try { localStorage.setItem('mads_game_strip_config', JSON.stringify(clean)); } catch (e) {}
  return true;
};

export const subscribeGameStripConfig = (callback) => {
  if (typeof callback !== 'function') return () => {};
  let cached = null;
  try {
    const item = localStorage.getItem('mads_game_strip_config');
    if (item) cached = JSON.parse(item);
  } catch (e) {}
  callback(normalizeGameStripConfig(cached || DEFAULT_GAME_STRIP_CONFIG));

  if (!rtdb) return () => {};
  try {
    return rtdbOnValue(dbRef(rtdb, 'siteConfig/gameStrip'), (snap) => {
      if (!snap.exists()) return;
      const data = normalizeGameStripConfig(snap.val());
      try { localStorage.setItem('mads_game_strip_config', JSON.stringify(data)); } catch (e) {}
      callback(data);
    });
  } catch (e) {
    return () => {};
  }
};

/**
 * Running ticker notice. Admin edits it in the "Ticker Notice" tab; the server
 * publishes it to siteConfig/ticker and every open page updates live.
 */
export const saveTickerNotice = async (text) => {
  const clean = String(text || '').trim().slice(0, 500);
  const { ok, data } = await postServerApi('/api/admin/ticker', { text: clean });
  if (!ok) {
    console.warn('[Ticker] Publish failed:', data?.error);
    return false;
  }
  try { localStorage.setItem('mads_ticker_notice', clean); } catch (e) {}
  return true;
};

export const subscribeTickerNotice = (callback) => {
  if (typeof callback !== 'function' || !rtdb) return () => {};
  try {
    return rtdbOnValue(dbRef(rtdb, 'siteConfig/ticker'), (snap) => {
      if (!snap.exists()) return;
      const text = String(snap.val()?.text || '');
      try { localStorage.setItem('mads_ticker_notice', text); } catch (e) {}
      callback(text);
    });
  } catch (e) {
    return () => {};
  }
};

/* ================================================================
   SUPPORT TICKET SYSTEM — Firestore + RTDB dual-sync
   ================================================================ */

/**
 * Save or update a full support ticket document in both RTDB and Firestore.
 * ticketId is used as the document / RTDB node key.
 */
export const saveSupportTicketToFirestore = async (ticket) => {
  if (!ticket || !ticket.id) return false;
  const key = String(ticket.id).replace(/[.#$[\]]/g, '_');

  if (rtdb) {
    try {
      const tRef = dbRef(rtdb, `supportTickets/${key}`);
      await rtdbSet(tRef, ticket);
    } catch (e) { console.warn('[firestoreService] RTDB ticket save note:', e); }
  }

  if (db) {
    try {
      const tDocRef = doc(db, 'supportTickets', key);
      await setDoc(tDocRef, ticket, { merge: true });
    } catch (e) { console.warn('[firestoreService] Firestore ticket save note:', e); }
  }
  return true;
};

/**
 * Merge a partial update into an existing support ticket (status, priority, messages array).
 */
export const updateSupportTicketInFirestore = async (ticketId, updates) => {
  if (!ticketId || !updates) return false;
  const key = String(ticketId).replace(/[.#$[\]]/g, '_');

  if (rtdb) {
    try {
      const tRef = dbRef(rtdb, `supportTickets/${key}`);
      await rtdbUpdate(tRef, updates);
    } catch (e) { console.warn('[firestoreService] RTDB ticket update note:', e); }
  }

  if (db) {
    try {
      const tDocRef = doc(db, 'supportTickets', key);
      await setDoc(tDocRef, updates, { merge: true });
    } catch (e) { console.warn('[firestoreService] Firestore ticket update note:', e); }
  }
  return true;
};

/**
 * Real-time subscription to all support tickets.
 * Fires callback(ticketsArray) immediately from localStorage cache, then from live DB.
 * Returns an unsubscribe function.
 */
export const subscribeSupportTicketsFromFirestore = (callback, { admin = false } = {}) => {
  if (typeof callback !== 'function') return () => {};

  // Seed from localStorage immediately so the UI shows previous data on mount
  try {
    const cached = localStorage.getItem('mads_support_tickets');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) callback(parsed);
    }
  } catch (e) {}

  let unsubRtdb = null;
  let unsubDb = null;

  if (rtdb) {
    try {
      const deliver = (tickets) => {
        if (tickets.length > 0) {
          try { localStorage.setItem('mads_support_tickets', JSON.stringify(tickets)); } catch (e) {}
          callback(tickets);
        }
      };
      if (admin) {
        unsubRtdb = pollAdminList('tickets', (val) => deliver(Object.values(val || {}).filter(Boolean)), 10000);
      } else {
        // The customer's own tickets, every 10s (admin replies show up live).
        let stopped = false;
        const load = async () => {
          if (stopped) return;
          const token = await getUserAuthTokenQuiet();
          if (!token || stopped) return;
          const { ok, data } = await postServerApi('/api/tickets/mine', {}, token);
          if (!stopped && ok && Array.isArray(data?.tickets)) deliver(data.tickets.filter(Boolean));
        };
        load();
        const timer = setInterval(load, 10000);
        unsubRtdb = () => { stopped = true; clearInterval(timer); };
      }
    } catch (e) {}
  }

  if (db) {
    try {
      const tCol = collection(db, 'supportTickets');
      unsubDb = onSnapshot(tCol, (snapshot) => {
        const tickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(Boolean);
        if (tickets.length > 0) {
          try { localStorage.setItem('mads_support_tickets', JSON.stringify(tickets)); } catch (e) {}
          callback(tickets);
        }
      }, (err) => {
        console.warn('Firestore support tickets permission notice:', err.code);
      });
    } catch (e) {}
  }

  return () => {
    if (typeof unsubRtdb === 'function') unsubRtdb();
    if (typeof unsubDb === 'function') unsubDb();
  };
};

/* ================================================================
   REVIEWS SYSTEM — Firestore + RTDB dual-sync
   ================================================================ */

/**
 * Save a new user review to RTDB and Firestore.
 */
export const saveReviewToFirestore = async (review) => {
  if (!review || !review.id) return false;
  const key = String(review.id).replace(/[.#$[\]]/g, '_');

  if (rtdb) {
    try {
      const rRef = dbRef(rtdb, `reviews/${key}`);
      await rtdbSet(rRef, review);
    } catch (e) { console.warn('[firestoreService] RTDB review save:', e); }
  }

  if (db) {
    try {
      const rDocRef = doc(db, 'reviews', key);
      await setDoc(rDocRef, review, { merge: true });
    } catch (e) { console.warn('[firestoreService] Firestore review save:', e); }
  }
  return true;
};

/**
 * Real-time subscription to all community reviews.
 * Fires callback(reviewsArray) immediately from localStorage, then with the
 * full live list from RTDB every time it changes (an empty list once the
 * last review is deleted). RTDB is the one source, so a review the admin
 * deletes disappears everywhere.
 */
export const subscribeReviewsFromFirestore = (callback) => {
  if (typeof callback !== 'function') return () => {};

  // Seed from localStorage cache immediately
  try {
    const cached = localStorage.getItem('mads_user_reviews');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) callback(parsed);
    }
  } catch (e) {}

  let unsubRtdb = null;

  if (rtdb) {
    try {
      const rRef = dbRef(rtdb, 'reviews');
      unsubRtdb = rtdbOnValue(rRef, (snap) => {
        const val = snap.exists() ? snap.val() : {};
        const reviews = Object.entries(val || {})
          .filter(([, r]) => r && typeof r === 'object')
          .map(([key, r]) => ({ ...r, id: r.id || key, dbKey: key }));
        try { localStorage.setItem('mads_user_reviews', JSON.stringify(reviews)); } catch (e) {}
        callback(reviews);
      });
    } catch (e) {}
  }

  return () => {
    if (typeof unsubRtdb === 'function') unsubRtdb();
  };
};

/**
 * Admin: delete a review (server removes the RTDB copy; the Firestore copy
 * is removed too when the rules allow it).
 */
export const deleteReviewInDatabase = async (review) => {
  const key = String(review?.dbKey || review?.id || '').replace(/[.#$[\]]/g, '_');
  if (!key) return { ok: false, error: 'Missing review id.' };
  const { ok, data } = await postServerApi('/api/admin/delete-review', { id: key });
  if (ok && db) {
    try { await deleteDoc(doc(db, 'reviews', key)); } catch (e) {}
  }
  return { ok, error: data?.error };
};

/* ================================================================
   REFERRAL TRACKING SYSTEM
   ================================================================
   - saveReferralClick      : called when a new user lands via /ref/:code
   - the 1.5% referrer cashback is paid by the server (server.js payReferralCashback)
   ================================================================ */

/**
 * Store a referral attribution when someone visits /ref/:code.
 * Stored in RTDB at referrals/{referralCode}/{timestamp} for admin visibility.
 */
export const saveReferralClick = async (referralCode, newUserIdentifier) => {
  if (!referralCode || !newUserIdentifier) return false;
  const cleanCode = String(referralCode).trim().toUpperCase();

  const record = {
    referralCode: cleanCode,
    newUser: String(newUserIdentifier).trim(),
    clickedAt: new Date().toISOString(),
    cashbackPaid: false,
    cashbackAmount: 0
  };

  if (rtdb) {
    try {
      const refKey = cleanCode.replace(/[.#$[\]]/g, '_');
      const clickRef = dbRef(rtdb, `referrals/${refKey}/${Date.now()}`);
      await rtdbSet(clickRef, record);
    } catch (e) {
      console.warn('[referral] RTDB save click:', e.message);
    }
  }

  // Firestore mirror (best-effort)
  if (db) {
    addDoc(collection(db, 'referrals'), record).catch(() => {});
  }

  return true;
};

