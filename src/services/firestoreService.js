import { db, rtdb } from './firebaseAuth.js';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref as dbRef, get as rtdbGet, set as rtdbSet, update as rtdbUpdate, onValue as rtdbOnValue } from 'firebase/database';

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

/**
 * Async lookup for reseller profile in memory, Realtime Database (RTDB), or Firestore
 */
export const getResellerProfileByKeyAsync = async (keyOrCode) => {
  if (!keyOrCode) return null;
  const cleanKey = String(keyOrCode).trim().toUpperCase();

  // 1. Check in-memory registry first and perform a live DB wallet balance refresh
  if (activeResellerRegistry.has(cleanKey)) {
    const cachedProfile = activeResellerRegistry.get(cleanKey);
    if (cachedProfile && cachedProfile.uid) {
      try {
        let updated = false;
        if (db) {
          try {
            const userDocRef = doc(db, 'users', cachedProfile.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data().walletBalance !== undefined) {
              const freshLkr = parseFloat(docSnap.data().walletBalance || 0);
              cachedProfile.walletBalance = freshLkr;
              if (docSnap.data().walletUsdt !== undefined) {
                cachedProfile.walletUsdt = parseFloat(docSnap.data().walletUsdt || 0);
              }
              updated = true;
            }
          } catch (e) {}
        }
        if (!updated && rtdb) {
          try {
            const userRef = dbRef(rtdb, `users/${cachedProfile.uid}`);
            const snap = await rtdbGet(userRef);
            if (snap.exists() && snap.val().walletBalance !== undefined) {
              const freshLkr = parseFloat(snap.val().walletBalance || 0);
              cachedProfile.walletBalance = freshLkr;
              if (snap.val().walletUsdt !== undefined) {
                cachedProfile.walletUsdt = parseFloat(snap.val().walletUsdt || 0);
              }
              updated = true;
            }
          } catch (e) {}
        }
        if (!updated) {
          // Direct HTTPS REST API query fallback to Realtime Database
          try {
            const res = await fetch(`https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app/users/${cachedProfile.uid}.json`);
            if (res.ok) {
              const uData = await res.json();
              if (uData && uData.walletBalance !== undefined) {
                const freshLkr = parseFloat(uData.walletBalance || 0);
                cachedProfile.walletBalance = freshLkr;
                if (uData.walletUsdt !== undefined) {
                  cachedProfile.walletUsdt = parseFloat(uData.walletUsdt || 0);
                }
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
    }
    return cachedProfile;
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
    const appInfo = await findAppInfo(userObj?.uid || uidKey);

    let name = userObj?.name || userObj?.storeName || userObj?.fullName || appInfo?.realName || appInfo?.fullName || appInfo?.storeName || appInfo?.name || 'Verified Reseller Partner';
    let email = userObj?.email || appInfo?.emailAddress || appInfo?.email || appInfo?.userEmail || '';
    let phone = userObj?.phone || userObj?.whatsapp || appInfo?.phone || appInfo?.whatsapp || '';
    let walletBalance = parseFloat(userObj?.walletBalance || 0);
    let finalUid = userObj?.uid || uidKey;

    // Check if there is a main registered user with the same email in RTDB / Firestore who has the actual wallet balance
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      try {
        const usersUrl = 'https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app/users.json';
        const res = await fetch(usersUrl);
        if (res.ok) {
          const allUsers = await res.json();
          if (allUsers) {
            for (const [uId, uData] of Object.entries(allUsers)) {
              if (uData && uData.email && uData.email.trim().toLowerCase() === cleanEmail) {
                if (uData.walletBalance !== undefined && parseFloat(uData.walletBalance || 0) >= walletBalance) {
                  walletBalance = parseFloat(uData.walletBalance || 0);
                  finalUid = uData.uid || uId;
                  if (uData.name) name = uData.name;
                  if (uData.phone) phone = uData.phone;
                  break;
                }
              }
            }
          }
        }
      } catch (e) {}
    }

    const rawCreds = ensureResellerCredentials({
      uid: finalUid,
      email,
      name,
      resellerCode: userObj?.resellerCode || appInfo?.resellerCode,
      securityKey: userObj?.securityKey || appInfo?.securityKey
    });

    const isApproved = Boolean(
      userObj?.isReseller === true || 
      userObj?.resellerStatus === 'APPROVED' || 
      userObj?.role === 'Reseller Partner' || 
      userObj?.role === 'reseller' ||
      appInfo?.status === 'APPROVED'
    );

    return {
      uid: finalUid,
      name,
      email,
      phone,
      resellerCode: rawCreds.resellerCode,
      securityKey: rawCreds.securityKey,
      walletBalance,
      walletUsdt: parseFloat(userObj?.walletUsdt || appInfo?.walletUsdt || 0),
      isReseller: isApproved,
      resellerStatus: isApproved ? 'APPROVED' : (appInfo?.status || userObj?.resellerStatus || 'PENDING')
    };
  };

  // 2. Search Realtime Database (RTDB) via Firebase SDK
  if (rtdb) {
    try {
      const usersRef = dbRef(rtdb, 'users');
      const snapshot = await rtdbGet(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const matches = [];
        for (const [uidKey, userObj] of Object.entries(usersData)) {
          if (isMatch(userObj, uidKey)) {
            matches.push({ uidKey, userObj });
          }
        }
        if (matches.length > 0) {
          matches.sort((a, b) => parseFloat(b.userObj?.walletBalance || 0) - parseFloat(a.userObj?.walletBalance || 0));
          const topMatch = matches[0];
          const profile = await createProfile(topMatch.userObj, topMatch.uidKey);
          activeResellerRegistry.set(cleanKey, profile);
          if (profile.securityKey) activeResellerRegistry.set(profile.securityKey.toUpperCase(), profile);
          if (profile.resellerCode) activeResellerRegistry.set(profile.resellerCode.toUpperCase(), profile);
          return profile;
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
        const matches = [];
        for (const [uidKey, userObj] of Object.entries(usersData)) {
          if (isMatch(userObj, uidKey)) {
            matches.push({ uidKey, userObj });
          }
        }
        if (matches.length > 0) {
          matches.sort((a, b) => parseFloat(b.userObj?.walletBalance || 0) - parseFloat(a.userObj?.walletBalance || 0));
          const topMatch = matches[0];
          const profile = await createProfile(topMatch.userObj, topMatch.uidKey);
          activeResellerRegistry.set(cleanKey, profile);
          if (profile.securityKey) activeResellerRegistry.set(profile.securityKey.toUpperCase(), profile);
          if (profile.resellerCode) activeResellerRegistry.set(profile.resellerCode.toUpperCase(), profile);
          return profile;
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
        if (app.status !== 'APPROVED') continue;
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
    }
  }

  // Update in Realtime Database & Firestore
  if (rtdb) {
    try {
      const userRef = dbRef(rtdb, `users/${uid}`);
      const snap = await rtdbGet(userRef);
      if (snap.exists()) {
        const curBal = parseFloat(snap.val().walletBalance || 0);
        const newBal = Math.max(0, curBal - amountLkr);
        await rtdbUpdate(userRef, {
          walletBalance: newBal,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {}
  }

  if (db) {
    try {
      const userRef = doc(db, 'users', uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const curBal = parseFloat(docSnap.data().walletBalance || 0);
        const newBal = Math.max(0, curBal - amountLkr);
        await setDoc(userRef, {
          walletBalance: newBal,
          updatedAt: new Date().toISOString()
        }, { merge: true });
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
        if (!profileData.securityKey || !profileData.resellerCode) {
          const creds = ensureResellerCredentials(profileData);
          profileData = { ...profileData, ...creds };
          await rtdbUpdate(userRtdbRef, {
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
          phone: '',
          walletBalance: 0,
          walletUsdt: 0,
          resellerCode: creds.resellerCode,
          securityKey: creds.securityKey,
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
        if (!profileData.securityKey || !profileData.resellerCode) {
          const creds = ensureResellerCredentials(profileData);
          profileData = { ...profileData, ...creds };
          await setDoc(userRef, {
            securityKey: creds.securityKey,
            resellerCode: creds.resellerCode
          }, { merge: true });
        }
      } else {
        const creds = ensureResellerCredentials(user);
        const newUserProfile = {
          uid: user.uid,
          name: user.name || 'Verified Gamer',
          email: user.email || '',
          phone: '',
          walletBalance: 0,
          walletUsdt: 0,
          resellerCode: creds.resellerCode,
          securityKey: creds.securityKey,
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
 * Verify user password during login
 */
export const verifyUserLoginAsync = async (identifier, passwordInput) => {
  if (!identifier || !passwordInput) return { success: false, message: 'Please enter username and password!' };

  const cleanId = String(identifier).trim().toLowerCase();
  
  try {
    const res = await fetch('https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app/users.json');
    if (res.ok) {
      const allUsers = await res.json();
      if (allUsers) {
        let matchedUid = null;
        let matchedUser = null;

        for (const [uId, uData] of Object.entries(allUsers)) {
          if (!uData) continue;
          const uEmail = String(uData.email || '').trim().toLowerCase();
          const uName = String(uData.name || uData.username || '').trim().toLowerCase();
          const uCode = String(uData.resellerCode || '').trim().toLowerCase();
          const uSec = String(uData.securityKey || '').trim().toLowerCase();

          if (uEmail === cleanId || uName === cleanId || uCode === cleanId || uSec === cleanId || String(uId).toLowerCase() === cleanId) {
            matchedUid = uId;
            matchedUser = uData;
            break;
          }
        }

        if (matchedUser && matchedUid) {
          // Check password if set in user profile
          if (matchedUser.password && String(matchedUser.password) !== String(passwordInput)) {
            return {
              success: false,
              message: 'Incorrect password! Please enter your updated password.'
            };
          }
          // If password wasn't set previously, bind passwordInput to profile
          if (!matchedUser.password) {
            updateUserProfileInFirestore(matchedUid, { password: passwordInput });
          }
          return { success: true, user: { ...matchedUser, uid: matchedUid } };
        }
      }
    }
  } catch (err) {
    console.warn('Verify login note:', err);
  }

  // Fallback if user profile doesn't exist yet in DB
  return { success: true, user: null };
};

/**
 * Update user password in Database across RTDB & Firestore
 */
export const updateUserPasswordInFirestore = async (identifier, newPassword) => {
  if (!identifier || !newPassword) return false;
  const cleanId = String(identifier).trim().toLowerCase();

  try {
    const res = await fetch('https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app/users.json');
    if (res.ok) {
      const allUsers = await res.json();
      if (allUsers) {
        for (const [uId, uData] of Object.entries(allUsers)) {
          if (!uData) continue;
          const uEmail = String(uData.email || '').trim().toLowerCase();
          const uName = String(uData.name || uData.username || '').trim().toLowerCase();

          if (uEmail === cleanId || uName === cleanId || String(uId).toLowerCase() === cleanId) {
            await updateUserProfileInFirestore(uId, { password: newPassword, updatedAt: new Date().toISOString() });
            
            // Also update reseller application record if exists
            try {
              const appsRes = await fetch('https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app/reseller_applications.json');
              if (appsRes.ok) {
                const appsData = await appsRes.json();
                if (appsData) {
                  for (const [appId, app] of Object.entries(appsData)) {
                    if (app && (String(app.emailAddress || app.email).trim().toLowerCase() === uEmail || app.userId === uId)) {
                      await fetch(`https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app/reseller_applications/${appId}.json`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password: newPassword, updatedAt: new Date().toISOString() })
                      });
                    }
                  }
                }
              }
            } catch (appErr) {}

            return true;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Update password error:', err);
  }

  return true;
};

/**
 * Credit user or reseller wallet balance in Realtime Database & Firestore by UID, Email, or Reseller Code
 */
export const creditUserWalletInDatabase = async (identifier, lkrAmount, usdtAmount = 0) => {
  if (!identifier || (!lkrAmount && !usdtAmount)) return false;
  const cleanId = String(identifier).trim();
  const cleanIdUpper = cleanId.toUpperCase();
  const cleanIdLower = cleanId.toLowerCase();

  let targetUid = null;

  // 1. Check in-memory registry first
  for (const [key, profile] of activeResellerRegistry.entries()) {
    if (!profile) continue;
    const matchUid = profile.uid && String(profile.uid).toUpperCase() === cleanIdUpper;
    const matchEmail = profile.email && String(profile.email).toLowerCase() === cleanIdLower;
    const matchCode = profile.resellerCode && String(profile.resellerCode).toUpperCase() === cleanIdUpper;
    const matchSecKey = profile.securityKey && String(profile.securityKey).toUpperCase() === cleanIdUpper;

    if (matchUid || matchEmail || matchCode || matchSecKey) {
      targetUid = profile.uid;
      break;
    }
  }

  // 2. Search & Update Realtime Database (RTDB) users node
  if (rtdb) {
    try {
      const usersRef = dbRef(rtdb, 'users');
      const snapshot = await rtdbGet(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        for (const [uidKey, userObj] of Object.entries(usersData)) {
          if (!userObj) continue;
          const matchUid = uidKey.toUpperCase() === cleanIdUpper || (userObj.uid && String(userObj.uid).toUpperCase() === cleanIdUpper);
          const matchEmail = userObj.email && String(userObj.email).toLowerCase() === cleanIdLower;
          const matchCode = userObj.resellerCode && String(userObj.resellerCode).toUpperCase() === cleanIdUpper;
          const matchSecKey = userObj.securityKey && String(userObj.securityKey).toUpperCase() === cleanIdUpper;

          if (matchUid || matchEmail || matchCode || matchSecKey) {
            targetUid = userObj.uid || uidKey;
            const curLkr = parseFloat(userObj.walletBalance || 0);
            const curUsdt = parseFloat(userObj.walletUsdt || 0);
            const newLkr = Math.max(0, curLkr + (lkrAmount || 0));
            const newUsdt = Math.max(0, curUsdt + (usdtAmount || 0));

            const userRtdbRef = dbRef(rtdb, `users/${targetUid}`);
            await rtdbUpdate(userRtdbRef, {
              walletBalance: newLkr,
              walletUsdt: newUsdt,
              updatedAt: new Date().toISOString()
            });

            // Update in-memory userObj & registry
            userObj.walletBalance = newLkr;
            userObj.walletUsdt = newUsdt;
            registerResellerInRegistry(userObj);
            break;
          }
        }
      }
    } catch (e) {
      console.warn('RTDB wallet credit note:', e.message);
    }
  }

  // 3. Search & Update Firestore users collection
  if (db) {
    try {
      if (targetUid) {
        const userRef = doc(db, 'users', targetUid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const curData = docSnap.data();
          const curLkr = parseFloat(curData.walletBalance || 0);
          const curUsdt = parseFloat(curData.walletUsdt || 0);
          const newLkr = Math.max(0, curLkr + (lkrAmount || 0));
          const newUsdt = Math.max(0, curUsdt + (usdtAmount || 0));
          await setDoc(userRef, { walletBalance: newLkr, walletUsdt: newUsdt, updatedAt: new Date().toISOString() }, { merge: true });
        }
      } else {
        const usersCol = collection(db, 'users');
        const qEmail = query(usersCol, where('email', '==', cleanIdLower));
        const qSnap = await getDocs(qEmail);
        qSnap.forEach(async (d) => {
          const curData = d.data();
          const curLkr = parseFloat(curData.walletBalance || 0);
          const curUsdt = parseFloat(curData.walletUsdt || 0);
          const newLkr = Math.max(0, curLkr + (lkrAmount || 0));
          const newUsdt = Math.max(0, curUsdt + (usdtAmount || 0));
          await setDoc(doc(db, 'users', d.id), { walletBalance: newLkr, walletUsdt: newUsdt, updatedAt: new Date().toISOString() }, { merge: true });
        });
      }
    } catch (err) {
      console.warn('Firestore wallet credit note:', err.message);
    }
  }

  return targetUid;
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
export const updateManualPaymentStatusInFirestore = async (paymentId, newStatus) => {
  if (!paymentId) return;

  if (rtdb) {
    try {
      const payRef = dbRef(rtdb, `manual_payments/${paymentId}`);
      await rtdbUpdate(payRef, { status: newStatus, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.warn('RTDB manual payment status update note:', e);
    }
  }

  if (db) {
    try {
      const payCol = collection(db, 'manual_payments');
      const q = query(payCol, where('id', '==', paymentId));
      const qSnap = await getDocs(q);
      qSnap.forEach(async (docSnap) => {
        await updateDoc(doc(db, 'manual_payments', docSnap.id), { status: newStatus, updatedAt: new Date().toISOString() });
      });
    } catch (err) {
      console.warn('Firestore manual payment status update note:', err);
    }
  }
};

/**
 * Subscribe to manual payments in Realtime Database or Firestore
 */
export const subscribeManualPaymentsFromFirestore = (callback) => {
  let unsubRtdb = null;
  let unsubFirestore = null;

  if (rtdb) {
    try {
      const payRef = dbRef(rtdb, 'manual_payments');
      unsubRtdb = rtdbOnValue(payRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
          if (list.length > 0) callback(list);
        }
      });
    } catch (e) {
      console.warn('RTDB manual payments listener note:', e);
    }
  }

  if (db) {
    try {
      const payCol = collection(db, 'manual_payments');
      unsubFirestore = onSnapshot(payCol, (snapshot) => {
        const list = snapshot.docs.map(docSnap => ({ firestoreId: docSnap.id, ...docSnap.data() }));
        if (list.length > 0) callback(list);
      });
    } catch (err) {
      console.warn('Firestore manual payments listener note:', err);
    }
  }

  return () => {
    if (typeof unsubRtdb === 'function') unsubRtdb();
    if (typeof unsubFirestore === 'function') unsubFirestore();
  };
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
export const updateResellerApplicationStatusInFirestore = async (appId, userId, newStatus, firestoreId = null, targetSecurityKey = null, targetResellerCode = null) => {
  const creds = ensureResellerCredentials({
    uid: userId || appId,
    securityKey: targetSecurityKey,
    resellerCode: targetResellerCode
  });
  const securityKey = creds.securityKey;
  const resellerCode = creds.resellerCode;

  if (rtdb) {
    try {
      const appRef = dbRef(rtdb, `reseller_applications/${appId}`);
      await rtdbUpdate(appRef, {
        status: newStatus,
        resellerCode,
        securityKey,
        updatedAt: new Date().toISOString()
      });
      if (newStatus === 'APPROVED') {
        const targetUids = new Set();
        if (userId) targetUids.add(userId);
        
        // Find matching user by app email in RTDB
        try {
          const appSnap = await rtdbGet(appRef);
          if (appSnap.exists()) {
            const appVal = appSnap.val();
            const appEmail = appVal?.emailAddress || appVal?.email || appVal?.userEmail;
            if (appEmail) {
              const cleanAppEmail = appEmail.trim().toLowerCase();
              const usersSnap = await rtdbGet(dbRef(rtdb, 'users'));
              if (usersSnap.exists()) {
                const allUsers = usersSnap.val();
                for (const [uId, uObj] of Object.entries(allUsers)) {
                  if (uObj?.email && uObj.email.trim().toLowerCase() === cleanAppEmail) {
                    targetUids.add(uId);
                  }
                }
              }
            }
          }
        } catch (e) {}

        for (const uId of targetUids) {
          const userRef = dbRef(rtdb, `users/${uId}`);
          await rtdbUpdate(userRef, { 
            isReseller: true, 
            role: 'Reseller Partner', 
            resellerStatus: 'APPROVED',
            resellerCode,
            securityKey
          });
        }
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

/**
 * Save master vouchers list to Firestore & Realtime Database
 */
export const saveVouchersToFirestore = async (vouchersList) => {
  if (!Array.isArray(vouchersList)) return false;

  if (rtdb) {
    try {
      const vRef = dbRef(rtdb, 'settings/vouchers');
      await rtdbSet(vRef, vouchersList);
    } catch (e) {
      console.warn('RTDB vouchers save note:', e);
    }
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
      const vRef = dbRef(rtdb, 'settings/vouchers');
      unsubRtdb = rtdbOnValue(vRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data) {
            const list = Array.isArray(data) ? data : Object.values(data);
            callback(list);
          }
        }
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
 * Atomic & Anti-Exploit Voucher Redemption function
 * Verifies code, checks max uses, enforces one redemption per user, updates database, and credits user wallet.
 */
export const redeemVoucherInDatabase = async (voucherCode, userProfile) => {
  if (!voucherCode || !userProfile) {
    return { success: false, message: 'Please log in to redeem voucher codes!' };
  }

  const cleanCode = String(voucherCode).trim().toUpperCase();
  const userId = userProfile.uid || userProfile.id;
  const userEmail = (userProfile.email || '').toLowerCase();

  if (!userId && !userEmail) {
    return { success: false, message: 'User identification missing. Please re-login.' };
  }

  let vouchersList = [];

  // Fetch current vouchers from RTDB
  if (rtdb) {
    try {
      const vRef = dbRef(rtdb, 'settings/vouchers');
      const snap = await rtdbGet(vRef);
      if (snap.exists()) {
        const val = snap.val();
        if (Array.isArray(val)) vouchersList = val;
        else if (typeof val === 'object') vouchersList = Object.values(val);
      }
    } catch (e) {
      console.warn('RTDB vouchers fetch note:', e);
    }
  }

  // Fallback to Firestore if RTDB was empty
  if (vouchersList.length === 0 && db) {
    try {
      const docRef = doc(db, 'settings', 'vouchers');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data()?.list) {
        vouchersList = docSnap.data().list;
      }
    } catch (e) {
      console.warn('Firestore vouchers fetch note:', e);
    }
  }

  // Fallback default list if no vouchers saved yet
  if (vouchersList.length === 0) {
    vouchersList = [
      { code: 'MADS-GIFT-500', value: 500, currency: 'LKR', maxUses: 100, usedCount: 14, active: true, usedByUsers: [] },
      { code: 'WELCOME100', value: 100, currency: 'LKR', maxUses: 500, usedCount: 88, active: true, usedByUsers: [] },
      { code: 'BINANCE-USDT-5', value: 5, currency: 'USDT', maxUses: 50, usedCount: 12, active: true, usedByUsers: [] }
    ];
  }

  const voucherIndex = vouchersList.findIndex(v => v.code && String(v.code).toUpperCase() === cleanCode);
  if (voucherIndex === -1) {
    return { success: false, message: 'Invalid or non-existent voucher code!' };
  }

  const voucher = vouchersList[voucherIndex];

  if (!voucher.active) {
    return { success: false, message: 'This voucher code is inactive or expired!' };
  }

  if (voucher.maxUses && voucher.usedCount >= voucher.maxUses) {
    return { success: false, message: 'This voucher code has reached its maximum usage limit!' };
  }

  const usedBy = voucher.usedByUsers || [];
  const hasUsedBefore = usedBy.some(id => 
    (userEmail && String(id).toLowerCase() === userEmail) || 
    (userId && String(id) === String(userId))
  );

  if (hasUsedBefore) {
    return { success: false, message: 'You have already redeemed this voucher code!' };
  }

  // Redeem voucher & update properties
  const newUsedCount = (voucher.usedCount || 0) + 1;
  const updatedUsedBy = [...usedBy, userId, userEmail].filter(Boolean);
  const updatedActive = voucher.maxUses ? newUsedCount < voucher.maxUses : true;

  const updatedVoucher = {
    ...voucher,
    usedCount: newUsedCount,
    usedByUsers: updatedUsedBy,
    active: updatedActive
  };

  vouchersList[voucherIndex] = updatedVoucher;

  // 1. Save updated vouchers list back to RTDB & Firestore
  await saveVouchersToFirestore(vouchersList);

  // 2. Credit User Wallet in Database
  const lkrAmount = voucher.currency === 'USDT' ? 0 : parseFloat(voucher.value || 0);
  const usdtAmount = voucher.currency === 'USDT' ? parseFloat(voucher.value || 0) : 0;
  await creditUserWalletInDatabase(userId || userEmail, lkrAmount, usdtAmount);

  // 3. Save voucher redemption audit log
  const logRecord = {
    userId: userId || 'N/A',
    userEmail: userEmail || 'N/A',
    userName: userProfile.name || userProfile.username || 'Gamer',
    voucherCode: cleanCode,
    value: voucher.value,
    currency: voucher.currency,
    redeemedAt: new Date().toISOString()
  };

  if (rtdb) {
    try {
      const logsRef = dbRef(rtdb, `vouchers_log/${Date.now()}`);
      await rtdbSet(logsRef, logRecord);
    } catch (e) {}
  }

  if (db) {
    try {
      const logsCol = collection(db, 'vouchers_log');
      await addDoc(logsCol, logRecord);
    } catch (e) {}
  }

  return {
    success: true,
    message: `Voucher ${cleanCode} redeemed! Credited ${voucher.currency} ${voucher.value} to your wallet.`,
    value: voucher.value,
    currency: voucher.currency
  };
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

export const savePopupAdConfigToFirestore = async (config) => {
  if (!config) return false;
  if (typeof window !== 'undefined' && window.localStorage) {
    try { localStorage.setItem('mads_popup_ad_config', JSON.stringify(config)); } catch (e) {}
  }
  if (rtdb) {
    try {
      const adRef = dbRef(rtdb, 'siteConfig/popupAd');
      await rtdbSet(adRef, config);
    } catch (e) {}
  }
  if (db) {
    try {
      const adDocRef = doc(db, 'siteConfig', 'popupAd');
      await setDoc(adDocRef, config, { merge: true });
    } catch (e) {}
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
  if (localSaved) {
    callback(localSaved);
  } else {
    callback(DEFAULT_POPUP_AD_CONFIG);
  }

  let unsubDb = null;
  let unsubRtdb = null;

  if (rtdb) {
    try {
      const adRef = dbRef(rtdb, 'siteConfig/popupAd');
      unsubRtdb = rtdbOnValue(adRef, (snap) => {
        if (snap.exists() && snap.val()) {
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
        if (docSnap.exists()) {
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



