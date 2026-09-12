import { db, rtdb } from './firebaseAuth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, addDoc } from 'firebase/firestore';
import { ref as dbRef, get as rtdbGet, set as rtdbSet, update as rtdbUpdate, onValue as rtdbOnValue } from 'firebase/database';

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
        const newUserProfile = {
          uid: user.uid,
          name: user.name || 'Verified Gamer',
          email: user.email || '',
          phone: '',
          walletBalance: 0,
          walletUsdt: 0,
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
        const newUserProfile = {
          uid: user.uid,
          name: user.name || 'Verified Gamer',
          email: user.email || '',
          phone: '',
          walletBalance: 0,
          walletUsdt: 0,
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

  return profileData || {
    uid: user.uid,
    name: user.name || 'Verified Gamer',
    email: user.email || '',
    phone: '',
    walletBalance: 0,
    walletUsdt: 0,
    avatar: user.photoURL || '',
    savedIds: [],
    createdAt: new Date().toISOString()
  };
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
          callback(snapshot.val());
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
          callback(snapshot.data());
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
          const list = Object.keys(data).map(key => ({ uid: key, ...data[key] }));
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
        const list = snapshot.docs.map(docSnap => ({ uid: docSnap.id, ...docSnap.data() }));
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
        const userRef = dbRef(rtdb, `users/${userId}`);
        await rtdbUpdate(userRef, { isReseller: true, role: 'reseller', resellerStatus: 'APPROVED' });
      }
    } catch (e) {
      console.warn('RTDB reseller app status update note:', e);
    }
  }

  if (db) {
    try {
      const userRef = doc(db, 'users', userId);
      if (newStatus === 'APPROVED') {
        await updateDoc(userRef, { isReseller: true, role: 'reseller', resellerStatus: 'APPROVED' });
      }
    } catch (err) {
      console.warn('Firestore reseller status update note:', err);
    }
  }
};

