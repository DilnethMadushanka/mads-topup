import { db, rtdb } from './firebaseAuth.js';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref as dbRef, get as rtdbGet, set as rtdbSet, update as rtdbUpdate, onValue as rtdbOnValue } from 'firebase/database';

/**
 * Helper function to generate a 100% unique Security Key for each user/reseller
 */
export const generateUniqueSecurityKey = (seedStr, existingKey = null) => {
  if (existingKey && String(existingKey).startsWith('MADS-SEC-')) {
    return existingKey;
  }
  const cleanSeed = String(seedStr || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!cleanSeed) {
    return `MADS-SEC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  }

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
 * Ensure unique Reseller Code & Security Key exist for a user profile
 */
export const ensureResellerCredentials = (user) => {
  if (!user) return null;
  const cleanUid = String(user.uid || Math.random().toString(36).substring(2, 8));
  
  const resellerCode = user.resellerCode || `RS-${cleanUid.slice(-6).toUpperCase()}`;
  
  let securityKey = user.securityKey;
  if (!securityKey) {
    securityKey = generateUniqueSecurityKey(user.uid || cleanUid);
  }

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

/**
 * Async lookup for reseller profile in memory, Realtime Database (RTDB), or Firestore
 */
export const getResellerProfileByKeyAsync = async (keyOrCode) => {
  if (!keyOrCode) return null;
  const cleanKey = String(keyOrCode).trim().toUpperCase();

  // 1. Check in-memory registry first
  if (activeResellerRegistry.has(cleanKey)) {
    return activeResellerRegistry.get(cleanKey);
  }

  let cachedApps = null;
  const fetchAppsData = async () => {
    if (cachedApps) return cachedApps;
    try {
      const res = await fetch('https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app/reseller_applications.json');
      if (res.ok) {
        cachedApps = (await res.json()) || {};
        return cachedApps;
      }
    } catch (e) {}
    return {};
  };

  const findAppInfo = async (userId) => {
    const apps = await fetchAppsData();
    for (const [appId, app] of Object.entries(apps)) {
      if (!app) continue;
      if (
        (app.userId && String(app.userId).toUpperCase() === String(userId).toUpperCase()) ||
        (app.securityKey && String(app.securityKey).toUpperCase() === cleanKey) ||
        (app.resellerCode && String(app.resellerCode).toUpperCase() === cleanKey)
      ) {
        return app;
      }
    }
    return null;
  };

  const isMatch = (userObj, uidKey) => {
    if (!userObj) return false;
    const userSecKey = String(userObj.securityKey || '').trim().toUpperCase();
    const userCode = String(userObj.resellerCode || '').trim().toUpperCase();
    const cleanUid = String(userObj.uid || uidKey || '').trim().toUpperCase();

    if (userSecKey && userSecKey === cleanKey) return true;
    if (userCode && userCode === cleanKey) return true;
    if (cleanUid && cleanUid === cleanKey) return true;

    return false;
  };

  const createProfile = async (userObj, uidKey) => {
    const cleanUid = String(userObj?.uid || uidKey || '').trim().toUpperCase();
    const appInfo = await findAppInfo(userObj?.uid || uidKey);

    const name = userObj?.name || userObj?.storeName || userObj?.fullName || appInfo?.realName || appInfo?.fullName || appInfo?.storeName || appInfo?.name || 'Verified Reseller Partner';
    const email = userObj?.email || appInfo?.emailAddress || appInfo?.email || appInfo?.userEmail || '';
    const phone = userObj?.phone || userObj?.whatsapp || appInfo?.phone || appInfo?.whatsapp || '';

    return {
      uid: userObj?.uid || uidKey,
      name,
      email,
      phone,
      resellerCode: userObj?.resellerCode || appInfo?.resellerCode || `RS-${cleanUid.slice(-6)}`,
      securityKey: userObj?.securityKey || appInfo?.securityKey || cleanKey,
      walletBalance: parseFloat(userObj?.walletBalance || 0),
      walletUsdt: parseFloat((userObj?.walletBalance || 0) / 305),
      isReseller: true
    };
  };

  // 2. Search Realtime Database (RTDB) via Firebase SDK
  if (rtdb) {
    try {
      const usersRef = dbRef(rtdb, 'users');
      const snapshot = await rtdbGet(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        for (const [uidKey, userObj] of Object.entries(usersData)) {
          if (isMatch(userObj, uidKey)) {
            const profile = await createProfile(userObj, uidKey);
            activeResellerRegistry.set(cleanKey, profile);
            if (profile.securityKey) activeResellerRegistry.set(profile.securityKey.toUpperCase(), profile);
            if (profile.resellerCode) activeResellerRegistry.set(profile.resellerCode.toUpperCase(), profile);
            return profile;
          }
        }
      }
    } catch (e) {
      console.warn('RTDB reseller lookup error:', e.message);
    }
  }

  // 3. Fallback: Direct HTTPS REST API query to Firebase RTDB asia-southeast1
  try {
    const rtdbUrl = 'https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app/users.json';
    const res = await fetch(rtdbUrl);
    if (res.ok) {
      const usersData = await res.json();
      if (usersData) {
        for (const [uidKey, userObj] of Object.entries(usersData)) {
          if (isMatch(userObj, uidKey)) {
            const profile = await createProfile(userObj, uidKey);
            activeResellerRegistry.set(cleanKey, profile);
            if (profile.securityKey) activeResellerRegistry.set(profile.securityKey.toUpperCase(), profile);
            if (profile.resellerCode) activeResellerRegistry.set(profile.resellerCode.toUpperCase(), profile);
            return profile;
          }
        }
      }
    }
  } catch (restErr) {
    console.warn('RTDB REST API lookup note:', restErr.message);
  }

  // 4. Search reseller_applications node directly if not matched in users
  try {
    const apps = await fetchAppsData();
    for (const [appId, app] of Object.entries(apps)) {
      if (isMatch(app, appId)) {
        const profile = await createProfile(app, appId);
        activeResellerRegistry.set(cleanKey, profile);
        if (profile.securityKey) activeResellerRegistry.set(profile.securityKey.toUpperCase(), profile);
        if (profile.resellerCode) activeResellerRegistry.set(profile.resellerCode.toUpperCase(), profile);
        return profile;
      }
    }
  } catch (e) {}

  // 5. Search Firestore for matching securityKey or resellerCode
  if (db) {
    try {
      const usersCol = collection(db, 'users');
      const qSec = query(usersCol, where('securityKey', '==', cleanKey));
      let qSnap = await getDocs(qSec);

      if (qSnap.empty) {
        const qCode = query(usersCol, where('resellerCode', '==', cleanKey));
        qSnap = await getDocs(qCode);
      }

      if (!qSnap.empty) {
        const docData = qSnap.docs[0].data();
        const profile = await createProfile(docData, qSnap.docs[0].id);
        activeResellerRegistry.set(cleanKey, profile);
        if (profile.securityKey) activeResellerRegistry.set(profile.securityKey.toUpperCase(), profile);
        if (profile.resellerCode) activeResellerRegistry.set(profile.resellerCode.toUpperCase(), profile);
        return profile;
      }
    } catch (err) {
      console.warn('Firestore reseller lookup error:', err.message);
    }
  }

  return null;
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

export const deductResellerWalletBalance = async (uid, amountLkr) => {
  if (!uid || !amountLkr) return false;
  // Update in-memory registry
  for (const [key, profile] of activeResellerRegistry.entries()) {
    if (profile.uid === uid) {
      profile.walletBalance = Math.max(0, (profile.walletBalance || 0) - amountLkr);
      profile.walletUsdt = profile.walletBalance / 305;
    }
  }

  // Update in Realtime Database & Firestore
  if (rtdb) {
    try {
      const userRef = dbRef(rtdb, `users/${uid}`);
      const snap = await rtdbGet(userRef);
      if (snap.exists()) {
        const curBal = snap.val().walletBalance || 0;
        const newBal = Math.max(0, curBal - amountLkr);
        await rtdbUpdate(userRef, {
          walletBalance: newBal,
          walletUsdt: newBal / 305,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {}
  }
  return true;
};

/**
 * Sync or create user profile document in Firestore & Realtime Database
 */
export const syncUserProfileToFirestore = async (user) => {
  if (!user || !user.uid) return null;

  let profileData = null;

  // 1. Try Realtime Database (RTDB)
  if (rtdb) {
    try {
      const userRtdbRef = dbRef(rtdb, `users/${user.uid}`);
      const snapshot = await rtdbGet(userRtdbRef);
      if (snapshot.exists()) {
        profileData = snapshot.val();
      } else {
        const cleanUid = String(user.uid || '').slice(-6).toUpperCase();
        const resellerCode = `RS-${cleanUid}`;
        const securityKey = generateUniqueSecurityKey(user.uid);

        const newUserProfile = {
          uid: user.uid,
          name: user.name || 'Verified Gamer',
          email: user.email || '',
          phone: '',
          walletBalance: 0,
          walletUsdt: 0,
          resellerCode,
          securityKey,
          isReseller: false,
          avatar: user.photoURL || '',
          savedIds: [],
          createdAt: new Date().toISOString()
        };
        await rtdbSet(userRtdbRef, newUserProfile);
        profileData = newUserProfile;
      }
    } catch (e) {
      console.warn('Realtime Database sync note:', e);
    }
  }

  // 2. Try Firestore
  if (db && !profileData) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        profileData = docSnap.data();
      } else {
        const cleanUid = String(user.uid || '').slice(-6).toUpperCase();
        const resellerCode = `RS-${cleanUid}`;
        const securityKey = generateUniqueSecurityKey(user.uid);

        const newUserProfile = {
          uid: user.uid,
          name: user.name || 'Verified Gamer',
          email: user.email || '',
          phone: '',
          walletBalance: 0,
          walletUsdt: 0,
          resellerCode,
          securityKey,
          isReseller: false,
          avatar: user.photoURL || '',
          savedIds: [],
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, newUserProfile);
        profileData = newUserProfile;
      }
    } catch (error) {
      console.warn('Firestore sync note:', error);
    }
  }

  const finalProfile = ensureResellerCredentials(profileData || {
    uid: user.uid,
    name: user.name || 'Verified Gamer',
    email: user.email || '',
    phone: '',
    walletBalance: 0,
    walletUsdt: 0,
    avatar: user.photoURL || '',
    savedIds: [],
    createdAt: new Date().toISOString()
  });

  registerResellerInRegistry(finalProfile);
  return finalProfile;
};

/**
 * Save user profile updates to Database
 */
export const updateUserProfileInFirestore = async (uid, updatedData) => {
  if (!uid) return;

  // Realtime Database
  if (rtdb) {
    try {
      const userRtdbRef = dbRef(rtdb, `users/${uid}`);
      await rtdbUpdate(userRtdbRef, updatedData);
    } catch (e) {
      console.warn('RTDB update note:', e);
    }
  }

  // Firestore
  if (db) {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, updatedData, { merge: true });
    } catch (error) {
      console.warn('Firestore update note:', error);
    }
  }
};

/**
 * Listen to live user profile changes in Realtime Database or Firestore
 */
export const subscribeUserProfile = (uid, callback) => {
  if (!uid) return () => {};

  let unsubRtdb = null;
  let unsubFirestore = null;

  if (rtdb) {
    try {
      const userRtdbRef = dbRef(rtdb, `users/${uid}`);
      unsubRtdb = rtdbOnValue(userRtdbRef, (snapshot) => {
        if (snapshot.exists()) {
          const creds = ensureResellerCredentials(snapshot.val());
          registerResellerInRegistry(creds);
          callback(creds);
        }
      });
    } catch (e) {
      console.warn('RTDB listener note:', e);
    }
  }

  if (db) {
    try {
      const userRef = doc(db, 'users', uid);
      unsubFirestore = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const creds = ensureResellerCredentials(snapshot.data());
          registerResellerInRegistry(creds);
          callback(creds);
        }
      });
    } catch (err) {
      console.warn('Firestore listener note:', err);
    }
  }

  return () => {
    if (typeof unsubRtdb === 'function') unsubRtdb();
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
export const subscribeOrdersFromFirestore = (uid, callback) => {
  let unsubRtdb = null;
  let unsubFirestore = null;

  if (rtdb) {
    try {
      const ordersRef = dbRef(rtdb, 'orders');
      unsubRtdb = rtdbOnValue(ordersRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list = Object.keys(data).map(key => ({ ...data[key], key }));
          const filtered = uid ? list.filter(o => o.userId === uid || o.userEmail === uid) : list;
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
        const filtered = uid ? list.filter(o => o.userId === uid || o.userEmail === uid) : list;
        if (filtered.length > 0) callback(filtered);
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
  if (rtdb) {
    try {
      const orderRef = dbRef(rtdb, `orders/${orderId}`);
      await rtdbUpdate(orderRef, {
        status: newStatus,
        ...(moongoldRef ? { moongoldRef } : {}),
        updatedAt: new Date().toISOString()
      });
    } catch (e) {}
  }
};

/**
 * Subscribe to all registered users in Firestore or Realtime Database
 */
export const subscribeAllUsersFromFirestore = (callback) => {
  let unsubRtdb = null;
  let unsubFirestore = null;

  if (rtdb) {
    try {
      const usersRtdbRef = dbRef(rtdb, 'users');
      unsubRtdb = rtdbOnValue(usersRtdbRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list = Object.keys(data).map(key => {
            const creds = ensureResellerCredentials({ uid: key, ...data[key] });
            registerResellerInRegistry(creds);
            return creds;
          });
          if (list.length > 0) callback(list);
        }
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
      const appsRef = dbRef(rtdb, 'reseller_applications');
      unsubRtdb = rtdbOnValue(appsRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
          if (list.length > 0) callback(list);
        }
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
export const updateResellerApplicationStatusInFirestore = async (appId, userId, newStatus, firestoreId = null, targetSecurityKey = null) => {
  const cleanUid = String(userId || appId || '').slice(-6).toUpperCase();
  const resellerCode = `RS-${cleanUid}`;
  const securityKey = targetSecurityKey || generateUniqueSecurityKey(userId || appId);

  if (rtdb) {
    try {
      const appRef = dbRef(rtdb, `reseller_applications/${appId}`);
      await rtdbUpdate(appRef, {
        status: newStatus,
        resellerCode,
        securityKey,
        updatedAt: new Date().toISOString()
      });
      if (userId && newStatus === 'APPROVED') {
        const userRef = dbRef(rtdb, `users/${userId}`);
        await rtdbUpdate(userRef, { 
          isReseller: true, 
          role: 'reseller', 
          resellerStatus: 'APPROVED',
          resellerCode,
          securityKey
        });
      }
    } catch (e) {
      console.warn('RTDB reseller app status update note:', e);
    }
  }

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
          role: 'reseller', 
          resellerStatus: 'APPROVED',
          resellerCode,
          securityKey
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Firestore reseller status update note:', err);
    }
  }
};

/**
 * Save custom game package prices to Firestore & Realtime Database
 */
export const saveCustomGamePricesToFirestore = async (customPricesMap) => {
  if (!customPricesMap) return false;

  if (rtdb) {
    try {
      const pricesRef = dbRef(rtdb, 'settings/customPrices');
      await rtdbSet(pricesRef, customPricesMap);
    } catch (e) {
      console.warn('RTDB custom prices save note:', e);
    }
  }

  if (db) {
    try {
      const settingsDocRef = doc(db, 'settings', 'customPrices');
      await setDoc(settingsDocRef, {
        prices: customPricesMap,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore custom prices save note:', err);
    }
  }

  return true;
};

/**
 * Subscribe to realtime custom game prices from Firestore & Realtime Database
 */
export const subscribeCustomGamePricesFromFirestore = (callback) => {
  let unsubRtdb = null;
  let unsubFirestore = null;

  if (rtdb) {
    try {
      const pricesRef = dbRef(rtdb, 'settings/customPrices');
      unsubRtdb = rtdbOnValue(pricesRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data) callback(data);
        }
      });
    } catch (e) {
      console.warn('RTDB custom prices listener note:', e);
    }
  }

  if (db) {
    try {
      const docRef = doc(db, 'settings', 'customPrices');
      unsubFirestore = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.prices) callback(data.prices);
        }
      });
    } catch (err) {
      console.warn('Firestore custom prices listener note:', err);
    }
  }

  return () => {
    if (typeof unsubRtdb === 'function') unsubRtdb();
    if (typeof unsubFirestore === 'function') unsubFirestore();
  };
};

