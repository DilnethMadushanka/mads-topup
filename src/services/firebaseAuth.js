import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut, 
  onAuthStateChanged, 
  getAdditionalUserInfo 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || (typeof process !== 'undefined' && process.env) || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyAzgbA7GdTY5Dv2CtgY8cVOswkpfcQpNcE",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "mads-topup-76445.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "mads-topup-76445",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "mads-topup-76445.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "404411554890",
  appId: env.VITE_FIREBASE_APP_ID || "1:404411554890:web:8a88922ecb041fab7a1ab3",
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || "https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app"
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
    rtdb = getDatabase(app, firebaseConfig.databaseURL || "https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app");
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (err) {
    console.warn('Firebase initialization warning:', err);
  }
}

export { auth, db, rtdb, onAuthStateChanged, getRedirectResult };

/**
 * Sign in with Google using Firebase Auth (with Popup & Redirect fallback)
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

      if (error.code === 'auth/unauthorized-domain') {
        throw new Error('Domain (madstopup.com) is not authorized in Firebase Console! Please add madstopup.com under Firebase -> Auth -> Settings -> Authorized Domains.');
      }

      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        try {
          console.log('Popup blocked or closed, falling back to signInWithRedirect...');
          await signInWithRedirect(auth, googleProvider);
          return { success: false, redirecting: true };
        } catch (redirectErr) {
          throw new Error('Google sign-in popup was blocked by browser. Please allow popups or open in Chrome/Safari.');
        }
      }

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
