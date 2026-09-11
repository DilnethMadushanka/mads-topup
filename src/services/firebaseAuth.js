import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, getAdditionalUserInfo } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAzgbA7GdTY5Dv2CtgY8cVOswkpfcQpNcE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mads-topup-76445.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mads-topup-76445",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mads-topup-76445.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "404411554890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:404411554890:web:8a88922ecb041fab7a1ab3",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

let app = null;
let auth = null;
let db = null;
let rtdb = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    rtdb = getDatabase(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (err) {
    console.warn('Firebase initialization warning:', err);
  }
}

export { auth, db, rtdb, onAuthStateChanged };

/**
 * Sign in with Google using Firebase Auth or Fallback Popup
 */
export const loginWithGoogle = async () => {
  if (isFirebaseConfigured && auth && googleProvider) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const additionalInfo = getAdditionalUserInfo(result);
      return {
        success: true,
        isNewUser: additionalInfo?.isNewUser || false,
        user: {
          name: user.displayName || 'Google Gamer',
          email: user.email,
          photoURL: user.photoURL,
          uid: user.uid,
          provider: 'firebase-google'
        }
      };
    } catch (error) {
      console.error('Firebase Google Auth error:', error);
      throw new Error(error.message || 'Google sign-in failed');
    }
  }

  // Fallback demo authentication when env vars are not populated yet
  return {
    success: true,
    user: {
      name: 'Dilneth Madushanka',
      email: 'dilneth.mads@gmail.com',
      photoURL: 'https://lh3.googleusercontent.com/a/ACg8ocI8Q1hXz0_demo',
      uid: 'google-demo-uid-102938',
      provider: 'google-demo'
    }
  };
};

/**
 * Sign out Google session
 */
export const logoutGoogle = async () => {
  if (isFirebaseConfigured && auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }
};
