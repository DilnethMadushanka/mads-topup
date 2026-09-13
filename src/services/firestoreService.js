import { db, rtdb } from './firebaseAuth.js';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, addDoc } from 'firebase/firestore';
import { ref as dbRef, get as rtdbGet, set as rtdbSet, update as rtdbUpdate, onValue as rtdbOnValue } from 'firebase/database';

/**
 * Ensure unique Reseller Code & Security Key exist for a user profile
 */
export const ensureResellerCredentials = (user) => {
  if (!user) return null;
  const cleanUid = String(user.uid || Math.random().toString(36).substring(2, 8));
  
  const resellerCode = user.resellerCode || `RS-${cleanUid.slice(-6).toUpperCase()}`;
  
  let securityKey = user.securityKey;
  if (!securityKey) {
    const prefix = cleanUid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    const randHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    securityKey = `MADS-SEC-${prefix}${randHex}`;
  }

  return {
    ...user,
    resellerCode,
    securityKey
  };
};

// Active reseller memory registry for Telegram bot & instant validation
export const activeResellerRegistry = new Map([
  ['MADS-SEC-882104', {
    uid: 'user-882104',
    name: 'Dilneth Reseller Partner',
    email: 'reseller@madstopup.com',
    resellerCode: 'RS-882104',
    securityKey: 'MADS-SEC-882104',
    walletBalance: 15000.00,
    walletUsdt: 49.18,
    isReseller: true
  }],
  ['RS-882104', {
    uid: 'user-882104',
    name: 'Dilneth Reseller Partner',
    email: 'reseller@madstopup.com',
    resellerCode: 'RS-882104',
    securityKey: 'MADS-SEC-882104',
    walletBalance: 15000.00,
    walletUsdt: 49.18,
    isReseller: true
  }]
]);

export const registerResellerInRegistry = (profile) => {
  if (!profile) return null;
  const creds = ensureResellerCredentials(profile);
  if (creds.securityKey) {
    activeResellerRegistry.set(creds.securityKey.toUpperCase(), creds);
  }
  if (creds.resellerCode) {
    activeResellerRegistry.set(creds.resellerCode.toUpperCase(), creds);
  }
  return creds;
};

export const getResellerProfileByKey = (keyOrCode) => {
  if (!keyOrCode) return null;
  const cleanKey = String(keyOrCode).trim().toUpperCase();
  return activeResellerRegistry.get(cleanKey) || null;
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
        const securityKey = `MADS-SEC-${cleanUid.slice(0, 4)}8A92`;

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
        const securityKey = `MADS-SEC-${cleanUid.slice(0, 4)}8A92`;

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
export const updateResellerApplicationStatusInFirestore = async (appId, userId, newStatus) => {
  if (rtdb) {
    try {
      const appRef = dbRef(rtdb, `reseller_applications/${appId}`);
      await rtdbUpdate(appRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      if (userId && newStatus === 'APPROVED') {
        const cleanUid = String(userId).slice(-6).toUpperCase();
        const userRef = dbRef(rtdb, `users/${userId}`);
        await rtdbUpdate(userRef, { 
          isReseller: true, 
          role: 'reseller', 
          resellerStatus: 'APPROVED',
          resellerCode: `RS-${cleanUid}`,
          securityKey: `MADS-SEC-${cleanUid.slice(0, 4)}8A92`
        });
      }
    } catch (e) {
      console.warn('RTDB reseller app status update note:', e);
    }
  }

  if (db) {
    try {
      const userRef = doc(db, 'users', userId);
      if (newStatus === 'APPROVED') {
        const cleanUid = String(userId).slice(-6).toUpperCase();
        await updateDoc(userRef, { 
          isReseller: true, 
          role: 'reseller', 
          resellerStatus: 'APPROVED',
          resellerCode: `RS-${cleanUid}`,
          securityKey: `MADS-SEC-${cleanUid.slice(0, 4)}8A92`
        });
      }
    } catch (err) {
      console.warn('Firestore reseller status update note:', err);
    }
  }
};
