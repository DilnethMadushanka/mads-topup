import { db } from './firebaseAuth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, addDoc } from 'firebase/firestore';

/**
 * Sync or create user profile document in Firestore database
 */
export const syncUserProfileToFirestore = async (user) => {
  if (!db || !user || !user.uid) return null;

  try {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        uid: user.uid,
        name: data.name || user.name || 'Verified Gamer',
        email: data.email || user.email || '',
        phone: data.phone || '',
        walletBalance: data.walletBalance !== undefined ? data.walletBalance : 0,
        walletUsdt: data.walletUsdt !== undefined ? data.walletUsdt : 0,
        avatar: data.avatar || user.photoURL || '',
        savedIds: data.savedIds || [],
        createdAt: data.createdAt || new Date().toISOString()
      };
    } else {
      // Create new user profile document in Firestore
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
      return newUserProfile;
    }
  } catch (error) {
    console.error('Error syncing user profile to Firestore:', error);
    return null;
  }
};

/**
 * Save user profile updates to Firestore database
 */
export const updateUserProfileInFirestore = async (uid, updatedData) => {
  if (!db || !uid) return;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, updatedData);
  } catch (error) {
    console.error('Error updating user profile in Firestore:', error);
  }
};

/**
 * Listen to live user profile changes in Firestore
 */
export const subscribeUserProfile = (uid, callback) => {
  if (!db || !uid) return () => {};
  try {
    const userRef = doc(db, 'users', uid);
    return onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      }
    });
  } catch (err) {
    console.error('Firestore snapshot listener error:', err);
    return () => {};
  }
};

/**
 * Save a new top-up order to Firestore
 */
export const saveOrderToFirestore = async (uid, order) => {
  if (!db) return;
  try {
    const ordersCol = collection(db, 'orders');
    await addDoc(ordersCol, {
      ...order,
      userId: uid || 'guest',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error saving order to Firestore:', err);
  }
};
