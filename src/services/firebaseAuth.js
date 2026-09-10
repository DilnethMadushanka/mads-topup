import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY'
);

let auth = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (err) {
    console.warn('Firebase initialization warning:', err);
  }
}

/**
 * Sign in with Google using Firebase Auth or Fallback Popup
 */
export const loginWithGoogle = async () => {
  if (isFirebaseConfigured && auth && googleProvider) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      return {
        success: true,
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
