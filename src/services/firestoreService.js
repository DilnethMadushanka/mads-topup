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
      await updateDoc(userRef, updatedData);
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
