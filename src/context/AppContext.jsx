
import React, { createContext, useContext, useState, useEffect } from 'react';
import { GAMES_DATA } from '../data/games';
import { getMoongoldConfig, saveMoongoldConfig } from '../services/moongoldApi';
import { getR2Config, saveR2Config } from '../services/storageService';
import { auth, onAuthStateChanged, logoutGoogle, getRedirectResult } from '../services/firebaseAuth';
import { 
  syncUserProfileToFirestore, updateUserProfileInFirestore, subscribeUserProfile, 
  saveOrderToFirestore, subscribeAllUsersFromFirestore, subscribeOrdersFromFirestore, updateOrderStatusInFirestore,
  saveResellerApplicationToFirestore, subscribeResellerApplicationsFromFirestore, updateResellerApplicationStatusInFirestore,
  saveCustomGamePricesToFirestore, subscribeCustomGamePricesFromFirestore, generateUniqueSecurityKey, ensureResellerCredentials,
  saveManualPaymentToFirestore, updateManualPaymentStatusInFirestore, subscribeManualPaymentsFromFirestore, creditUserWalletInDatabase, setUserExactBalanceInDatabase,
  saveVouchersToFirestore, subscribeVouchersFromFirestore, redeemVoucherInDatabase,
  savePopupAdConfigToFirestore, subscribePopupAdConfigFromFirestore, DEFAULT_POPUP_AD_CONFIG
} from '../services/firestoreService';


const INITIAL_REVIEWS = [];

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currency, setCurrency] = useState('LKR'); // 'LKR' | 'USD'
  const [exchangeRate] = useState(340); // 1 USD = 340 LKR
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      return path === '/admin' || path.startsWith('/admin/') || hash === '#admin' || search.includes('admin');
    }
    return false;
  });
  const [isGameCatalogOpen, setIsGameCatalogOpen] = useState(false);
  const [isReviewsPageOpen, setIsReviewsPageOpen] = useState(false);
  const [isContactPageOpen, setIsContactPageOpen] = useState(false);
  const [isReferralPageOpen, setIsReferralPageOpen] = useState(false);
  const [isResellerPageOpen, setIsResellerPageOpen] = useState(false);
  const [isResellerLoginPageOpen, setIsResellerLoginPageOpen] = useState(false);
  const [isResellerDashboardOpen, setIsResellerDashboardOpen] = useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletActiveTab, setWalletActiveTab] = useState('binance'); // 'ezcash' | 'binance' | 'redeem'
  const [isDownloadAppModalOpen, setIsDownloadAppModalOpen] = useState(false);

  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [activePolicyTab, setActivePolicyTab] = useState('refund'); // 'refund' | 'privacy' | 'terms'

  const openPolicyModal = (tab = 'refund') => {
    setActivePolicyTab(tab);
    setIsPolicyModalOpen(true);
  };

  const closePolicyModal = () => {
    setIsPolicyModalOpen(false);
  };

  const openWalletModal = (tab = 'binance') => {
    setWalletActiveTab(tab);
    setIsWalletModalOpen(true);
    setIsUserProfileOpen(false);
    setIsContactPageOpen(false);
    setIsReviewsPageOpen(false);
    setIsReferralPageOpen(false);
    setIsResellerPageOpen(false);
    setIsGameCatalogOpen(false);
    setSelectedGame(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAuth = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const openCatalog = () => {
    if (!isLoggedIn && (!auth || !auth.currentUser)) {
      openAuth('login');
      showToast('🔒 Please log in or register an account to access the game catalog!', 'error');
      return;
    }
    setIsGameCatalogOpen(true);
    setIsUserProfileOpen(false);
    setIsContactPageOpen(false);
    setIsReviewsPageOpen(false);
    setIsReferralPageOpen(false);
    setIsResellerPageOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeCatalog = () => {
    setIsGameCatalogOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openReviewsPage = () => {
    setIsReviewsPageOpen(true);
    setIsUserProfileOpen(false);
    setIsContactPageOpen(false);
    setIsReferralPageOpen(false);
    setIsResellerPageOpen(false);
    setIsGameCatalogOpen(false);
    setSelectedGame(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeReviewsPage = () => {
    setIsReviewsPageOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openContactPage = () => {
    setIsContactPageOpen(true);
    setIsUserProfileOpen(false);
    setIsReviewsPageOpen(false);
    setIsReferralPageOpen(false);
    setIsResellerPageOpen(false);
    setIsGameCatalogOpen(false);
    setSelectedGame(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeContactPage = () => {
    setIsContactPageOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openReferralPage = () => {
    setIsReferralPageOpen(true);
    setIsUserProfileOpen(false);
    setIsContactPageOpen(false);
    setIsReviewsPageOpen(false);
    setIsResellerPageOpen(false);
    setIsGameCatalogOpen(false);
    setSelectedGame(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeReferralPage = () => {
    setIsReferralPageOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openResellerPage = () => {
    setIsResellerPageOpen(true);
    setIsResellerLoginPageOpen(false);
    setIsReferralPageOpen(false);
    setIsUserProfileOpen(false);
    setIsContactPageOpen(false);
    setIsReviewsPageOpen(false);
    setIsGameCatalogOpen(false);
    setSelectedGame(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeResellerPage = () => {
    setIsResellerPageOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openResellerLoginPage = () => {
    setIsResellerLoginPageOpen(true);
    setIsResellerPageOpen(false);
    setIsReferralPageOpen(false);
    setIsUserProfileOpen(false);
    setIsContactPageOpen(false);
    setIsReviewsPageOpen(false);
    setIsGameCatalogOpen(false);
    setSelectedGame(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeResellerLoginPage = () => {
    setIsResellerLoginPageOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openResellerDashboard = () => {
    setIsResellerDashboardOpen(true);
    setIsResellerLoginPageOpen(false);
    setIsResellerPageOpen(false);
    setIsReferralPageOpen(false);
    setIsUserProfileOpen(false);
    setIsContactPageOpen(false);
    setIsReviewsPageOpen(false);
    setIsGameCatalogOpen(false);
    setSelectedGame(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeResellerDashboard = () => {
    setIsResellerDashboardOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openUserProfilePage = () => {
    setIsUserProfileOpen(true);
    setIsContactPageOpen(false);
    setIsReviewsPageOpen(false);
    setIsReferralPageOpen(false);
    setIsGameCatalogOpen(false);
    setSelectedGame(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeUserProfilePage = () => {
    setIsUserProfileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [userReviews, setUserReviews] = useState(() => {
    const saved = localStorage.getItem('mads_user_reviews');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out hardcoded mock reviews
          return parsed.filter(r => r && r.id && !String(r.id).startsWith('rev-'));
        }
      } catch (e) {}
    }
    return INITIAL_REVIEWS;
  });

  useEffect(() => {
    localStorage.setItem('mads_user_reviews', JSON.stringify(userReviews));
  }, [userReviews]);

  const addReview = (newRev) => {
    setUserReviews(prev => [newRev, ...prev]);
    if (showToast) showToast('Thank you! Your review has been published successfully.');
  };
  
  // Dynamic Games Catalog State & Realtime Custom Prices Sync
  const [gamesCatalog, setGamesCatalog] = useState(GAMES_DATA);

  useEffect(() => {
    const unsub = subscribeCustomGamePricesFromFirestore((customPricesMap) => {
      if (!customPricesMap || typeof customPricesMap !== 'object') return;

      GAMES_DATA.forEach(game => {
        if (game.packages) {
          game.packages.forEach(pkg => {
            if (customPricesMap[pkg.id] !== undefined && customPricesMap[pkg.id] !== null) {
              const newPrice = Number(customPricesMap[pkg.id]);
              if (!isNaN(newPrice) && newPrice > 0) {
                pkg.priceLkr = newPrice;
                pkg.priceUsd = Number((newPrice / 340).toFixed(2));
              }
            }
          });
        }
      });

      setGamesCatalog(GAMES_DATA.map(g => ({ ...g, packages: [...g.packages] })));
    });

    return () => unsub();
  }, []);

  const updateGamePrices = async (customPricesMap) => {
    try {
      await saveCustomGamePricesToFirestore(customPricesMap);
      return true;
    } catch (err) {
      console.error('[AppContext] Save Prices Error:', err);
      return false;
    }
  };

  // Popup Ad State & Subscription
  const [popupAdConfig, setPopupAdConfig] = useState(DEFAULT_POPUP_AD_CONFIG);

  useEffect(() => {
    const unsub = subscribePopupAdConfigFromFirestore((config) => {
      if (config) {
        setPopupAdConfig(config);
      }
    });
    return () => unsub();
  }, []);

  const updatePopupAdConfig = async (newConfig) => {
    try {
      setPopupAdConfig(newConfig);
      await savePopupAdConfigToFirestore(newConfig);
      return true;
    } catch (e) {
      console.error('[AppContext] Save Popup Ad Error:', e);
      return false;
    }
  };

  // Moongold state
  const [moongoldConfig, setMoongoldConfigState] = useState(getMoongoldConfig());

  
  // Cloudflare R2 Storage State
  const [r2Config, setR2ConfigState] = useState(getR2Config());

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const saved = localStorage.getItem('mads_user_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.email || parsed.name || parsed.uid)) return true;
      } catch (e) {}
    }
    return false;
  });

  // User Profile
  const [userProfile, setUserProfileState] = useState(() => {
    const saved = localStorage.getItem('mads_user_profile');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved); 
        if (parsed && (parsed.walletUsdt === 49.64 || (parsed.walletUsdt > 49.6 && parsed.walletUsdt < 49.7))) {
          parsed.walletUsdt = 0;
          localStorage.setItem('mads_user_profile', JSON.stringify(parsed));
        }
        return parsed; 
      } catch (e) {}
    }
    return {
      uid: '',
      name: '',
      email: '',
      phone: '',
      walletBalance: 0,
      walletUsdt: 0,
      avatar: '',
      savedIds: []
    };
  });

  // Custom setter for userProfile that syncs with Firestore
  const setUserProfile = (updater) => {
    setUserProfileState(prev => {
      let next = typeof updater === 'function' ? updater(prev) : updater;
      if (next && (next.name || next.email || next.uid)) {
        if (!next.uid && prev?.uid) {
          next.uid = prev.uid;
        } else if (!next.uid) {
          next.uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        }
        setIsLoggedIn(true);
        updateUserProfileInFirestore(next.uid, next);
        syncUserProfileToFirestore(next);
      }
      return next;
    });
  };

  // Listen for /admin in browser URL
  useEffect(() => {
    const checkAdminRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (path === '/admin' || path.startsWith('/admin/') || hash === '#admin' || search.includes('admin')) {
        setIsAdminOpen(true);
      }
    };
    checkAdminRoute();
    window.addEventListener('popstate', checkAdminRoute);
    return () => window.removeEventListener('popstate', checkAdminRoute);
  }, []);

  // Sync Firebase Auth & Firestore live profile/wallet data
  const lastSyncedUidRef = React.useRef(null); // { uid, ts } — deduplicates double-sync after Google auth
  useEffect(() => {
    if (!auth) return;

    // Process Google redirect result if mobile redirect login occurred
    if (typeof getRedirectResult === 'function') {
      getRedirectResult(auth).then(async (result) => {
        if (result && result.user) {
          const user = result.user;
          setIsLoggedIn(true);
          const profile = await syncUserProfileToFirestore({
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Verified Gamer',
            email: user.email || '',
            photoURL: user.photoURL || ''
          });
          if (profile) {
            setUserProfileState(profile);
          }
          showToast(`Welcome back, ${user.displayName || 'Gamer'}!`);
        }
      }).catch((err) => {
        console.warn('Redirect auth result note:', err);
      });
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsLoggedIn(true);

        // Deduplicate: if handleGoogleAuth already synced this user within the last 8s,
        // skip the heavy DB sync to avoid a redundant 2-6 second round-trip.
        const lastSync = lastSyncedUidRef.current;
        const alreadySynced = lastSync && lastSync.uid === firebaseUser.uid && (Date.now() - lastSync.ts < 8000);

        if (!alreadySynced) {
          const profile = await syncUserProfileToFirestore({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Verified Gamer',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || ''
          });
          if (profile) {
            setUserProfileState(profile);
          }
          lastSyncedUidRef.current = { uid: firebaseUser.uid, ts: Date.now() };
        }

        // Always subscribe to live Firestore updates
        const unsubFirestore = subscribeUserProfile(firebaseUser.uid, (liveData) => {
          if (liveData) {
            const cleanData = { ...liveData };
            if (cleanData.walletUsdt === 49.64 || (cleanData.walletUsdt > 49.6 && cleanData.walletUsdt < 49.7)) cleanData.walletUsdt = 0;
            setUserProfileState(prev => ({ ...prev, ...cleanData }));
          }
        });
        return () => unsubFirestore();
      } else {
        setIsLoggedIn(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutGoogle();
    } catch (e) {
      console.warn('[Logout Note]:', e);
    }

    setIsLoggedIn(false);
    setUserProfileState({
      uid: '',
      name: '',
      email: '',
      phone: '',
      walletBalance: 0,
      walletUsdt: 0,
      avatar: '',
      savedIds: []
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('mads_user_profile');
        sessionStorage.clear();
      } catch (e) {}
    }

    setIsUserProfileOpen(false);
    setIsResellerDashboardOpen(false);
    setIsResellerLoginPageOpen(false);
    setIsResellerPageOpen(false);
    setIsWalletModalOpen(false);
    setSelectedGame(null);
    setIsGameCatalogOpen(false);

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showToast('Logged out successfully!');
  };

  // Orders
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('mads_orders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'ORD-98215',
        gameId: 'pubg',
        gameName: 'PUBG Mobile',
        packageName: '60 UC',
        amount: 60,
        playerId: '52247852395',
        zoneId: '',
        ign: 'Hr199jdjekek',
        paymentMethod: 'MADS Wallet Balance',
        priceLkr: 360,
        status: 'COMPLETED',
        moongoldRef: 'MG-88219472',
        createdAt: new Date().toISOString()
      },
      {
        id: 'ORD-98210',
        gameId: 'freefire',
        gameName: 'Free Fire',
        packageName: '530 Diamonds',
        amount: 530,
        playerId: '248901234',
        zoneId: '',
        ign: '🔥 S L _ S L A Y E R 🔥',
        paymentMethod: 'Bank Transfer',
        priceLkr: 1580,
        status: 'COMPLETED',
        moongoldRef: 'MG-88910245',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'ORD-98205',
        gameId: 'pubg',
        gameName: 'PUBG Mobile',
        packageName: '325 UC',
        amount: 325,
        playerId: '5123984712',
        zoneId: '',
        ign: 'MADS〆NOOB',
        paymentMethod: 'eZ Cash',
        priceLkr: 1850,
        status: 'PROCESSING',
        moongoldRef: 'MG-88910112',
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
      }
    ];
  });

  // Toasts / Banner
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    localStorage.setItem('mads_user_profile', JSON.stringify(userProfile));

    // Automatically register and sync logged-in / active user into usersList
    if (userProfile && (userProfile.email || userProfile.uid || userProfile.name)) {
      setUsersList(prev => {
        const emailMatch = userProfile.email && prev.some(u => u.email && u.email.toLowerCase() === userProfile.email.toLowerCase());
        const uidMatch = userProfile.uid && prev.some(u => u.uid === userProfile.uid);
        if (emailMatch || uidMatch) {
          return prev.map(u => {
            const matches = (userProfile.email && u.email && u.email.toLowerCase() === userProfile.email.toLowerCase()) || (userProfile.uid && u.uid === userProfile.uid);
            if (matches) {
              return {
                ...u,
                name: userProfile.name || u.name,
                email: userProfile.email || u.email,
                phone: userProfile.phone || u.phone,
                walletBalance: userProfile.walletBalance ?? u.walletBalance,
                walletUsdt: userProfile.walletUsdt ?? u.walletUsdt,
                avatar: userProfile.avatar || u.avatar
              };
            }
            return u;
          });
        }
        // New user registered! Append to usersList
        const newUserEntry = {
          uid: userProfile.uid || `USR-${Math.floor(10000 + Math.random() * 90000)}`,
          name: userProfile.name || 'Registered Gamer',
          email: userProfile.email || '',
          phone: userProfile.phone || '',
          walletBalance: userProfile.walletBalance || 0,
          walletUsdt: userProfile.walletUsdt || 0,
          isVerified: true,
          status: 'ACTIVE',
          joinedAt: new Date().toISOString().split('T')[0],
          totalOrders: 0,
          lifetimeSpendLkr: 0
        };
        return [newUserEntry, ...prev];
      });
    }
  }, [userProfile]);

  // Subscribe to all users in Firestore / RTDB for real-time admin user list sync
  useEffect(() => {
    const unsubAll = subscribeAllUsersFromFirestore((remoteUsersList) => {
      if (remoteUsersList && remoteUsersList.length > 0) {
        setUsersList(prev => {
          const merged = [...prev];
          remoteUsersList.forEach(ru => {
            const index = merged.findIndex(u => (ru.uid && u.uid === ru.uid) || (ru.email && u.email && u.email.toLowerCase() === ru.email.toLowerCase()));
            if (index >= 0) {
              merged[index] = { ...merged[index], ...ru };
            } else {
              merged.push({
                uid: ru.uid || `USR-${Math.floor(10000 + Math.random() * 90000)}`,
                name: ru.name || 'Gamer',
                email: ru.email || '',
                phone: ru.phone || '',
                walletBalance: ru.walletBalance || 0,
                walletUsdt: ru.walletUsdt || 0,
                isVerified: ru.isVerified || false,
                status: ru.status || 'ACTIVE',
                joinedAt: ru.createdAt ? ru.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
                totalOrders: 0,
                lifetimeSpendLkr: 0
              });
            }
          });
          return merged;
        });

        // Live sync current logged-in user / reseller wallet balance in real time
        setUserProfileState(prev => {
          if (!prev) return prev;
          const match = remoteUsersList.find(ru => 
            (ru.uid && prev.uid && ru.uid === prev.uid) || 
            (ru.email && prev.email && ru.email.toLowerCase() === prev.email.toLowerCase()) ||
            (ru.securityKey && prev.securityKey && ru.securityKey.trim() === prev.securityKey.trim()) ||
            (ru.resellerCode && prev.resellerCode && ru.resellerCode.trim() === prev.resellerCode.trim()) ||
            (ru.key && prev.key && ru.key.trim() === prev.key.trim())
          );
          if (match && (match.walletBalance !== prev.walletBalance || match.walletUsdt !== prev.walletUsdt)) {
            return {
              ...prev,
              ...match,
              walletBalance: match.walletBalance !== undefined ? match.walletBalance : prev.walletBalance,
              walletUsdt: match.walletUsdt !== undefined ? match.walletUsdt : prev.walletUsdt
            };
          }
          return prev;
        });
      }
    });
    return () => unsubAll();
  }, []);


  // Realtime subscribe to live orders from Firestore / RTDB
  useEffect(() => {
    const unsubOrders = subscribeOrdersFromFirestore(userProfile?.uid, (remoteOrders) => {
      if (remoteOrders && remoteOrders.length > 0) {
        setOrders(prev => {
          const merged = [...prev];
          remoteOrders.forEach(ro => {
            const idx = merged.findIndex(o => o.id === ro.id);
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...ro };
            } else {
              merged.unshift(ro);
            }
          });
          return merged;
        });
      }
    });
    return () => unsubOrders();
  }, [userProfile?.uid]);

  useEffect(() => {
    localStorage.setItem('mads_orders', JSON.stringify(orders));
  }, [orders]);

  const updateMoongoldConfig = (newConfig) => {
    setMoongoldConfigState(newConfig);
    saveMoongoldConfig(newConfig);
    showToast('Moongold API settings saved successfully!');
  };

  const updateR2Config = (newConfig) => {
    setR2ConfigState(newConfig);
    saveR2Config(newConfig);
    showToast('Cloudflare R2 Bucket settings saved successfully!');
  };

  const openTopup = (game) => {
    if (!isLoggedIn && (!auth || !auth.currentUser)) {
      openAuth('login');
      showToast('🔒 Please log in or register an account to view game top-ups!', 'error');
      return;
    }
    setSelectedGame(game);
    setIsTopupModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addOrder = (newOrder) => {
    setOrders(prev => [newOrder, ...prev]);
    saveOrderToFirestore(userProfile?.uid || 'guest', newOrder);
  };

  const updateOrderStatus = (orderId, newStatus, moongoldRef = null) => {
    setOrders(prev => prev.map(ord => {
      if (ord.id === orderId) {
        return {
          ...ord,
          status: newStatus,
          moongoldRef: moongoldRef || ord.moongoldRef
        };
      }
      return ord;
    }));
    updateOrderStatusInFirestore(orderId, newStatus, moongoldRef);
  };

  const formatPrice = (priceLkr) => {
    if (priceLkr === null || priceLkr === undefined || isNaN(priceLkr)) return 'Rs. 0';
    return `Rs. ${Number(priceLkr).toLocaleString('en-US')}`;
  };

  const savePlayerId = (gameId, gameName, playerId, nickName) => {
    setUserProfile(prev => {
      const exists = prev.savedIds.some(s => s.gameId === gameId && s.playerId === playerId);
      if (exists) return prev;
      const newEntry = { id: Date.now(), gameId, gameName, playerId, nickName: nickName || 'My ID' };
      const updated = [
        ...prev.savedIds,
        newEntry
      ];
      // Persist savedIds to database so they survive across devices and sessions
      if (prev.uid) {
        updateUserProfileInFirestore(prev.uid, { savedIds: updated });
      }
      return {
        ...prev,
        savedIds: updated
      };
    });
    showToast('Game ID saved to profile for fast top-up!');
  };

  // Vouchers state synced with Realtime Database & Firestore
  const [vouchers, setVouchers] = useState(() => [
    { code: 'MADS-GIFT-500', value: 500, currency: 'LKR', maxUses: 100, usedCount: 14, active: true, usedByUsers: [] },
    { code: 'WELCOME100', value: 100, currency: 'LKR', maxUses: 500, usedCount: 88, active: true, usedByUsers: [] },
    { code: 'BINANCE-USDT-5', value: 5, currency: 'USDT', maxUses: 50, usedCount: 12, active: true, usedByUsers: [] }
  ]);

  // Subscribe to real-time vouchers from Database
  useEffect(() => {
    const unsub = subscribeVouchersFromFirestore((realtimeVouchers) => {
      if (Array.isArray(realtimeVouchers) && realtimeVouchers.length > 0) {
        setVouchers(realtimeVouchers);
      }
    });
    return () => unsub();
  }, []);

  // Ticker message state
  const [tickerNotice, setTickerNotice] = useState(() => {
    return localStorage.getItem('mads_ticker_notice') || '🔥 SPECIAL PROMO: GET 10% EXTRA DIAMONDS ON ALL EZ CASH & BINANCE TOP-UPS! INSTANT DISPATCH ACTIVE 24/7.';
  });

  useEffect(() => {
    localStorage.setItem('mads_ticker_notice', tickerNotice);
  }, [tickerNotice]);

  const addVoucher = async (newVoucher) => {
    const updated = [newVoucher, ...(vouchers || [])];
    setVouchers(updated);
    await saveVouchersToFirestore(updated);
    showToast(`Voucher code ${newVoucher.code} created successfully!`);
  };

  const deleteVoucher = async (code) => {
    const updated = (vouchers || []).filter(v => v.code !== code);
    setVouchers(updated);
    await saveVouchersToFirestore(updated);
    showToast(`Voucher code ${code} deleted.`);
  };

  const redeemVoucher = async (code) => {
    if (!userProfile || (!userProfile.uid && !userProfile.email)) {
      showToast('Please log in to redeem voucher codes!', 'error');
      return { success: false, message: 'Please log in to redeem voucher codes!' };
    }
    const result = await redeemVoucherInDatabase(code, userProfile);
    if (result.success) {
      showToast(result.message, 'success');
      // Credit local user profile state immediately
      if (result.currency === 'USDT') {
        creditUserWallet(0, result.value);
      } else {
        creditUserWallet(result.value, 0);
      }
    } else {
      showToast(result.message, 'error');
    }
    return result;
  };

  const creditUserWallet = (amountLkr, amountUsdt = 0) => {
    setUserProfile(prev => {
      const updatedLkr = Math.max(0, (prev.walletBalance || 0) + amountLkr);
      const updatedUsdt = Math.max(0, (prev.walletUsdt || 0) + amountUsdt);
      const nextProfile = {
        ...prev,
        walletBalance: updatedLkr,
        walletUsdt: updatedUsdt
      };
      // Only persist to DB for POSITIVE credits (deposits, voucher redemptions, etc.)
      // Negative calls (deductions) must NOT write to DB — the backend server already
      // deducted atomically in Firebase RTDB, and the real-time listener will sync the
      // accurate server balance. Writing a locally-computed negative value would overwrite
      // the server's authoritative balance with a potentially stale or double-deducted value.
      if (prev.uid && (amountLkr > 0 || amountUsdt > 0)) {
        updateUserProfileInFirestore(prev.uid, { walletBalance: updatedLkr, walletUsdt: updatedUsdt });
      }
      return nextProfile;
    });
    if (amountLkr > 0 || amountUsdt > 0) {
      showToast(`Wallet credited: +Rs. ${amountLkr} LKR / +$${amountUsdt} USDT!`);
    } else if (amountLkr < 0) {
      showToast(`Wallet updated: Paid Rs. ${Math.abs(amountLkr).toFixed(2)} from LKR wallet.`);
    } else if (amountUsdt < 0) {
      showToast(`Wallet updated: Paid $${Math.abs(amountUsdt).toFixed(2)} USDT from USDT wallet.`);
    }
  };

  // Users List State (User Management & Verification)
  const [usersList, setUsersList] = useState(() => {
    const saved = localStorage.getItem('mads_users_list');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved); 
        // Filter out old fake test balances
        return parsed.map(u => ({
          ...u,
          walletUsdt: (u.walletUsdt === 49.64 || (u.walletUsdt > 49.6 && u.walletUsdt < 49.7)) ? 0 : (u.walletUsdt || 0)
        }));
      } catch (e) {}
    }
    return [
      {
        uid: 'USR-98210',
        name: 'Dilneth Madushanka',
        email: 'madsruzza@gmail.com',
        phone: '+94 77 123 4567',
        walletBalance: 0,
        walletUsdt: 0.00,
        isVerified: true,
        status: 'ACTIVE',
        joinedAt: '2026-09-01',
        totalOrders: 12,
        lifetimeSpendLkr: 18500
      },
      {
        uid: 'USR-98205',
        name: 'Kasun SLAyer',
        email: 'kasun.gamer@gmail.com',
        phone: '+94 71 889 0123',
        walletBalance: 0,
        walletUsdt: 0.00,
        isVerified: false,
        status: 'ACTIVE',
        joinedAt: '2026-09-05',
        totalOrders: 4,
        lifetimeSpendLkr: 4800
      },
      {
        uid: 'USR-98201',
        name: 'Nuwan Perera',
        email: 'nuwan.ff@yahoo.com',
        phone: '+94 78 445 9901',
        walletBalance: 0,
        walletUsdt: 0.00,
        isVerified: false,
        status: 'BLOCKED',
        joinedAt: '2026-09-08',
        totalOrders: 1,
        lifetimeSpendLkr: 1580
      }
    ];
  });

  // Manual Payments Verification Queue State
  const [manualPayments, setManualPayments] = useState(() => {
    const saved = localStorage.getItem('mads_manual_payments');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'PAY-1001',
        userEmail: 'kasun.gamer@gmail.com',
        userName: 'Kasun SLAyer',
        method: 'EZ Cash',
        referenceNumber: '20260910982314',
        amount: 1500,
        currency: 'LKR',
        slipUrl: '',
        status: 'PENDING',
        createdAt: '2026-09-10 14:15'
      },
      {
        id: 'PAY-1002',
        userEmail: 'madsruzza@gmail.com',
        userName: 'Dilneth Madushanka',
        method: 'Binance Pay',
        referenceNumber: '298102451901',
        amount: 25,
        currency: 'USDT',
        slipUrl: '',
        status: 'PENDING',
        createdAt: '2026-09-10 14:30'
      },
      {
        id: 'PAY-1003',
        userEmail: 'nuwan.ff@yahoo.com',
        userName: 'Nuwan Perera',
        method: 'Bank Slip',
        referenceNumber: 'BOC-TXN-881902',
        amount: 5000,
        currency: 'LKR',
        slipUrl: 'https://mads-topup.r2.cloudflarestorage.com/slips/boc_1003.jpg',
        status: 'VERIFIED',
        createdAt: '2026-09-10 12:00'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('mads_users_list', JSON.stringify(usersList));
  }, [usersList]);

  useEffect(() => {
    localStorage.setItem('mads_manual_payments', JSON.stringify(manualPayments));
  }, [manualPayments]);

  useEffect(() => {
    const unsub = subscribeManualPaymentsFromFirestore((liveList) => {
      if (liveList && Array.isArray(liveList) && liveList.length > 0) {
        setManualPayments(prev => {
          const map = new Map();
          (prev || []).forEach(item => {
            if (item && item.id) map.set(item.id, item);
          });
          liveList.forEach(item => {
            if (item && item.id) map.set(item.id, { ...map.get(item.id), ...item });
          });
          return Array.from(map.values());
        });
      }
    });
    return () => unsub();
  }, []);

  const verifyUserAccount = async (uid) => {
    setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, isVerified: true } : u));
    try {
      const { db, rtdb } = await import('../services/firebaseAuth');
      const { doc, setDoc } = await import('firebase/firestore');
      // Correct collection: 'users' (not 'resellerApplications')
      await setDoc(doc(db, 'users', uid), { isVerified: true }, { merge: true });
      if (rtdb) {
        const rtdbMod = await import('firebase/database');
        await rtdbMod.update(rtdbMod.ref(rtdb, `users/${uid}`), { isVerified: true });
      }
    } catch (e) { console.warn('verifyUserAccount DB note:', e); }
    showToast('User account verified & badge granted!');
  };

  const toggleBlockUser = async (uid) => {
    let newStatus = 'ACTIVE';
    setUsersList(prev => prev.map(u => {
      if (u.uid === uid) {
        newStatus = u.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
        return { ...u, status: newStatus };
      }
      return u;
    }));
    try {
      const { db, rtdb } = await import('../services/firebaseAuth');
      const { doc, setDoc } = await import('firebase/firestore');
      // Correct collection: 'users' (not 'resellerApplications')
      await setDoc(doc(db, 'users', uid), { status: newStatus }, { merge: true });
      if (rtdb) {
        const rtdbMod = await import('firebase/database');
        await rtdbMod.update(rtdbMod.ref(rtdb, `users/${uid}`), { status: newStatus });
      }
    } catch (e) { console.warn('toggleBlockUser DB note:', e); }
    showToast(`User account status updated to ${newStatus}.`);
  };

  const updateUserBalance = async (userEmailOrId, lkrAmount, usdtAmount = 0) => {
    if (!userEmailOrId) return;
    const cleanId = String(userEmailOrId).trim();
    const cleanIdLower = cleanId.toLowerCase();

    // 1. Write balance adjustment to DB (RTDB & Firestore) across UID, Email, Reseller Code, or Security Key
    await creditUserWalletInDatabase(cleanId, lkrAmount, usdtAmount);

    // 2. Update local usersList state
    setUsersList(prev => prev.map(u => {
      const matchEmail = u.email && String(u.email).toLowerCase() === cleanIdLower;
      const matchUid = u.uid && String(u.uid).toLowerCase() === cleanIdLower;
      const matchCode = u.resellerCode && String(u.resellerCode).toLowerCase() === cleanIdLower;

      if (matchEmail || matchUid || matchCode) {
        const newLkr = Math.max(0, (u.walletBalance || 0) + lkrAmount);
        const newUsdt = Math.max(0, (u.walletUsdt || 0) + usdtAmount);
        return {
          ...u,
          walletBalance: newLkr,
          walletUsdt: newUsdt
        };
      }
      return u;
    }));

    // 3. Update self userProfile if applicable
    if (userProfile) {
      const matchSelfEmail = userProfile.email && String(userProfile.email).toLowerCase() === cleanIdLower;
      const matchSelfUid = userProfile.uid && String(userProfile.uid).toLowerCase() === cleanIdLower;
      const matchSelfCode = userProfile.resellerCode && String(userProfile.resellerCode).toLowerCase() === cleanIdLower;

      if (matchSelfEmail || matchSelfUid || matchSelfCode) {
        creditUserWallet(lkrAmount, usdtAmount);
      }
    }
  };

  const setUserExactBalance = async (userEmailOrId, exactLkr, exactUsdt) => {
    if (!userEmailOrId) return;
    const cleanId = String(userEmailOrId).trim();
    const cleanIdLower = cleanId.toLowerCase();
    const newLkr = Math.max(0, parseFloat(exactLkr) || 0);
    const newUsdt = Math.max(0, parseFloat(exactUsdt) || 0);

    // 1. Write exact balance to DB (RTDB & Firestore)
    await setUserExactBalanceInDatabase(cleanId, newLkr, newUsdt);

    // 2. Update local usersList state
    setUsersList(prev => prev.map(u => {
      const matchEmail = u.email && String(u.email).toLowerCase() === cleanIdLower;
      const matchUid = u.uid && String(u.uid).toLowerCase() === cleanIdLower;
      const matchCode = u.resellerCode && String(u.resellerCode).toLowerCase() === cleanIdLower;

      if (matchEmail || matchUid || matchCode) {
        return {
          ...u,
          walletBalance: newLkr,
          walletUsdt: newUsdt
        };
      }
      return u;
    }));

    // 3. Update self userProfile if applicable
    if (userProfile) {
      const matchSelfEmail = userProfile.email && String(userProfile.email).toLowerCase() === cleanIdLower;
      const matchSelfUid = userProfile.uid && String(userProfile.uid).toLowerCase() === cleanIdLower;
      const matchSelfCode = userProfile.resellerCode && String(userProfile.resellerCode).toLowerCase() === cleanIdLower;

      if (matchSelfEmail || matchSelfUid || matchSelfCode) {
        setUserProfile(prev => ({
          ...prev,
          walletBalance: newLkr,
          walletUsdt: newUsdt
        }));
      }
    }
  };

  const approveManualPayment = async (paymentId) => {
    const pay = manualPayments.find(p => p.id === paymentId);
    if (!pay) return;

    setManualPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'VERIFIED' } : p));
    updateManualPaymentStatusInFirestore(paymentId, 'VERIFIED');
    
    // 24H Launch Wallet Recharge Bonus Calculation
    let bonusLkr = 0;
    const amt = parseFloat(pay.amount) || 0;
    if (pay.currency !== 'USDT') {
      if (amt >= 20000) bonusLkr = 600;
      else if (amt >= 10000) bonusLkr = 250;
      else if (amt >= 5000) bonusLkr = 100;
    }

    const totalLkr = pay.currency === 'USDT' ? 0 : (amt + bonusLkr);
    const totalUsdt = pay.currency === 'USDT' ? amt : 0;

    // 1. Write balance to DB once via updateUserBalance (which internally calls creditUserWalletInDatabase)
    // NOTE: Do NOT call creditUserWalletInDatabase here separately — updateUserBalance already does that,
    // calling it again would DOUBLE the credit in the database.
    await updateUserBalance(pay.userId || pay.userEmail || pay.resellerCode, totalLkr, totalUsdt);

    if (pay.currency === 'USDT') {
      showToast(`Payment ${paymentId} approved! Credited $${pay.amount} USDT to ${pay.userName}`);
    } else {
      const bonusMsg = bonusLkr > 0 ? ` (+Rs. ${bonusLkr} Launch Bonus)` : '';
      showToast(`Payment ${paymentId} approved! Credited Rs. ${totalLkr.toLocaleString()} LKR${bonusMsg} to ${pay.userName}`);
    }
  };

  const rejectManualPayment = (paymentId) => {
    setManualPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'REJECTED' } : p));
    updateManualPaymentStatusInFirestore(paymentId, 'REJECTED');
    showToast(`Payment ${paymentId} rejected.`, 'error');
  };

  const addManualPayment = (newPay) => {
    const fullPay = {
      ...newPay,
      id: newPay.id || `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: newPay.userId || userProfile?.uid || '',
      userEmail: newPay.userEmail || userProfile?.email || '',
      userName: newPay.userName || userProfile?.name || 'Gamer',
      resellerCode: newPay.resellerCode || userProfile?.resellerCode || '',
      createdAt: newPay.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setManualPayments(prev => [fullPay, ...prev]);
    saveManualPaymentToFirestore(fullPay);
    showToast(`Manual payment record created!`);
  };

  // -------------------------------------------------------------
  // CUSTOMER SUPPORT TICKET SYSTEM STATE & METHODS
  // -------------------------------------------------------------
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState(null);

  const [supportTickets, setSupportTickets] = useState(() => {
    const saved = localStorage.getItem('mads_support_tickets');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'TCK-8921',
        userId: 'USR-98210',
        userEmail: 'madsruzza@gmail.com',
        userName: 'Dilneth Madushanka',
        subject: 'Diamond topup delay check for ORD-31699',
        category: 'Order Issue',
        orderId: 'ORD-31699',
        status: 'OPEN',
        priority: 'HIGH',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
        messages: [
          {
            id: 'MSG-1',
            sender: 'user',
            senderName: 'Dilneth Madushanka',
            text: 'Hi support team, I placed an order for 25 Diamonds. Can you verify status?',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: 'MSG-2',
            sender: 'admin',
            senderName: 'MADS Support Team',
            text: 'Hello Dilneth! We checked your order ORD-31699. Reference 46388090 is verified & active!',
            timestamp: new Date(Date.now() - 1800000).toISOString()
          }
        ]
      },
      {
        id: 'TCK-8915',
        userId: 'USR-98205',
        userEmail: 'kasun.gamer@gmail.com',
        userName: 'Kasun SLAyer',
        subject: 'eZ Cash Topup verification slip',
        category: 'Wallet Deposit',
        orderId: 'ORD-29104',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 7200000).toISOString(),
        messages: [
          {
            id: 'MSG-101',
            sender: 'user',
            senderName: 'Kasun SLAyer',
            text: 'Uploaded my eZ Cash receipt screenshot. TRX ID: EZ-991823. Please verify my wallet credit.',
            attachmentUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
            timestamp: new Date(Date.now() - 86400000).toISOString()
          }
        ]
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('mads_support_tickets', JSON.stringify(supportTickets));
  }, [supportTickets]);

  const createSupportTicket = ({ subject, category, message, orderId, attachmentUrl }) => {
    const newTicket = {
      id: 'TCK-' + Math.floor(1000 + Math.random() * 9000),
      userId: userProfile?.uid || 'USR-' + Math.floor(10000 + Math.random() * 90000),
      userEmail: userProfile?.email || 'customer@madstopup.com',
      userName: userProfile?.name || 'Verified Gamer',
      subject: subject || 'General Customer Support',
      category: category || 'General Inquiry',
      orderId: orderId || null,
      status: 'OPEN',
      priority: 'MEDIUM',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'MSG-' + Date.now(),
          sender: 'user',
          senderName: userProfile?.name || 'Verified Gamer',
          text: message,
          attachmentUrl: attachmentUrl || null,
          timestamp: new Date().toISOString()
        }
      ]
    };
    setSupportTickets(prev => [newTicket, ...prev]);
    setActiveTicketId(newTicket.id);
    showToast('Support ticket submitted! Our 24/7 team will respond shortly.');
    return newTicket;
  };

  const sendTicketMessage = (ticketId, text, senderRole = 'user', attachmentUrl = null) => {
    setSupportTickets(prev => prev.map(tck => {
      if (tck.id === ticketId) {
        const newMessage = {
          id: 'MSG-' + Date.now(),
          sender: senderRole,
          senderName: senderRole === 'admin' ? 'MADS Support Team' : (tck.userName || 'Customer'),
          text,
          attachmentUrl: attachmentUrl || null,
          timestamp: new Date().toISOString()
        };
        return {
          ...tck,
          status: senderRole === 'admin' ? (tck.status === 'OPEN' ? 'IN_PROGRESS' : tck.status) : 'OPEN',
          updatedAt: new Date().toISOString(),
          messages: [...tck.messages, newMessage]
        };
      }
      return tck;
    }));
  };

  const updateTicketStatus = (ticketId, newStatus) => {
    setSupportTickets(prev => prev.map(tck => {
      if (tck.id === ticketId) {
        return { ...tck, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return tck;
    }));
    showToast(`Ticket ${ticketId} status set to ${newStatus}`);
  };

  const updateTicketPriority = (ticketId, newPriority) => {
    setSupportTickets(prev => prev.map(tck => {
      if (tck.id === ticketId) {
        return { ...tck, priority: newPriority, updatedAt: new Date().toISOString() };
      }
      return tck;
    }));
    showToast(`Ticket ${ticketId} priority set to ${newPriority}`);
  };

  // Reseller Applications State & Handlers
  const [resellerApplications, setResellerApplications] = useState(() => {
    const saved = localStorage.getItem('mads_reseller_applications');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'APP-90182',
        userId: 'usr-101',
        realName: 'Kasun Priyashantha',
        storeName: 'Kasun TopUp Store',
        whatsappNumber: '+94 77 987 6543',
        emailAddress: 'kasun@madstopup.com',
        isRunningStore: true,
        hasSocialReach: true,
        dailySale: '5,000 - 10,000 LKR',
        status: 'PENDING',
        submittedAt: new Date(Date.now() - 3600000).toISOString()
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('mads_reseller_applications', JSON.stringify(resellerApplications));
  }, [resellerApplications]);

  useEffect(() => {
    const unsub = subscribeResellerApplicationsFromFirestore((remoteApps) => {
      if (remoteApps && remoteApps.length > 0) {
        setResellerApplications(prev => {
          const map = new Map();
          remoteApps.forEach(item => {
            const key = item.id || item.firestoreId || item.userId;
            if (key) map.set(key, { ...item, id: key });
          });
          prev.forEach(item => {
            const key = item.id || item.firestoreId || item.userId;
            if (key) {
              const existing = map.get(key);
              if (!existing || item.status === 'APPROVED' || item.status === 'REJECTED') {
                map.set(key, { ...item, id: key });
              }
            }
          });
          return Array.from(map.values());
        });
      }
    });
    return () => unsub();
  }, []);

  const addResellerApplication = (appData) => {
    const newId = appData.id || appData.firestoreId || `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullApp = { ...appData, id: newId };
    setResellerApplications(prev => [fullApp, ...prev]);
    saveResellerApplicationToFirestore(fullApp);
    setUserProfileState(prev => ({ ...prev, resellerStatus: 'PENDING' }));
  };

  const updateResellerApplicationStatus = async (appId, userId, newStatus, appObject = null) => {
    const targetApp = appObject || resellerApplications.find(app => (appId && (app.id === appId || app.firestoreId === appId)) || (userId && app.userId === userId));
    const targetId = appId || targetApp?.id || targetApp?.firestoreId;
    const targetUserId = userId || targetApp?.userId;

    if (!targetId && !targetUserId) {
      console.warn('[updateResellerApplicationStatus] No valid target ID found.');
      return;
    }

    setResellerApplications(prev => {
      const updated = prev.map(app => {
        const matchesById = Boolean(targetId && (app.id === targetId || app.firestoreId === targetId));
        const matchesByUserId = Boolean(targetUserId && app.userId === targetUserId);
        const matchesTargetApp = Boolean(targetApp && ((targetApp.id && app.id === targetApp.id) || (targetApp.firestoreId && app.firestoreId === targetApp.firestoreId)));

        if (matchesById || matchesByUserId || matchesTargetApp) {
          return { ...app, status: newStatus, updatedAt: new Date().toISOString() };
        }
        return app;
      });
      localStorage.setItem('mads_reseller_applications', JSON.stringify(updated));
      return updated;
    });

    // Generate / retrieve credentials for email dispatch and database save
    const creds = ensureResellerCredentials({
      uid: targetUserId,
      email: targetApp?.emailAddress || targetApp?.email,
      name: targetApp?.realName || targetApp?.name,
      resellerCode: targetApp?.resellerCode,
      securityKey: targetApp?.securityKey
    });

    const resellerCode = creds.resellerCode;
    const securityKey = creds.securityKey;

    const targetFirestoreId = targetApp?.firestoreId || (targetId && targetId !== targetUserId ? targetId : null);
    updateResellerApplicationStatusInFirestore(targetId || targetUserId, targetUserId, newStatus, targetFirestoreId, securityKey, resellerCode);
    
    if (newStatus === 'APPROVED') {
      if (userId && userProfile?.uid === userId) {
        setUserProfileState(prev => ({ ...prev, isReseller: true, role: 'reseller', resellerStatus: 'APPROVED', resellerCode, securityKey }));
      }
      
      const targetEmail = 
        targetApp?.emailAddress || 
        targetApp?.email || 
        targetApp?.userEmail || 
        usersList.find(u => u.uid === userId || (targetApp?.userId && u.uid === targetApp.userId))?.email || 
        (userId && userProfile?.uid === userId ? userProfile?.email : '');

      const targetName = 
        targetApp?.realName || 
        targetApp?.fullName || 
        targetApp?.name || 
        targetApp?.userName || 
        targetApp?.storeName || 
        'Valued Reseller';

      if (targetEmail) {
        let sentSuccess = false;
        const apiEndpoints = [
          '/api/send-reseller-approval',
          'https://madstopup.com/api/send-reseller-approval'
        ];

        for (const endpoint of apiEndpoints) {
          if (sentSuccess) break;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000);

            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: targetEmail,
                name: targetName,
                resellerCode,
                securityKey
              }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              if (data && data.success && !data.simulated) {
                sentSuccess = true;
                showToast(`Reseller Approved! Approval email sent to ${targetEmail} via ${data.provider || 'Zoho SMTP'}`, 'success');
              } else if (data && data.simulated) {
                console.warn(`[Approval Email Note]: ${endpoint} returned simulated: true (Server needs git pull & pm2 restart).`);
              }
            }
          } catch (e) {
            console.warn(`[Approval Email Note for ${endpoint}]:`, e.message);
          }
        }

        if (!sentSuccess) {
          // Attempt EmailJS fallback directly from browser
          const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_42ovub5';
          const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_e9m409d';
          const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'UL_Cr3VmylKk8r2Dp';

          try {
            let emailjsModule;
            try { emailjsModule = await import('@emailjs/browser'); } catch (e) {}
            const emailjsLib = emailjsModule?.default || emailjsModule || window.emailjs;

            if (emailjsLib && typeof emailjsLib.send === 'function') {
              if (typeof emailjsLib.init === 'function') {
                try { emailjsLib.init(publicKey); } catch (e) {}
              }
              await emailjsLib.send(
                serviceId,
                templateId,
                {
                  to_email: targetEmail,
                  email: targetEmail,
                  user_name: targetName,
                  otp_code: `RS CODE: ${resellerCode} | KEY: ${securityKey}`,
                  passcode: `RS CODE: ${resellerCode} | KEY: ${securityKey}`,
                  message: `🎉 Official Reseller Partner Approved!\nReseller Code: ${resellerCode}\nSecurity Key: ${securityKey}\nTelegram Bot Auth: /auth ${securityKey}\nReseller Portal: https://madstopup.com/reseller-login`,
                  time: 'Immediate'
                },
                publicKey
              );
              sentSuccess = true;
              showToast(`Reseller Approved! Credentials email sent to ${targetEmail}`, 'success');
            }
          } catch (ejsErr) {
            console.warn('[EmailJS Reseller Approval Fallback Note]:', ejsErr.message);
          }
        }

        if (!sentSuccess) {
          showToast(`Reseller Approved! Credentials: Code ${resellerCode} | Key ${securityKey} (Restart live server for Zoho SMTP)`, 'warning');
        }
      } else {
        showToast(`Reseller Application ${appId} APPROVED successfully!`);
      }
    } else {
      showToast(`Reseller Application ${appId} set to ${newStatus}`);
    }
  };

  return (
    <AppContext.Provider value={{
      currency,
      setCurrency,
      exchangeRate,
      searchQuery,
      setSearchQuery,
      selectedGame,
      setSelectedGame,
      isTopupModalOpen,
      setIsTopupModalOpen,
      openTopup,
      isUserProfileOpen,
      setIsUserProfileOpen,
      openUserProfilePage,
      closeUserProfilePage,
      isAdminOpen,
      setIsAdminOpen,
      isGameCatalogOpen,
      setIsGameCatalogOpen,
      openCatalog,
      closeCatalog,
      isReviewsPageOpen,
      setIsReviewsPageOpen,
      openReviewsPage,
      closeReviewsPage,
      isContactPageOpen,
      setIsContactPageOpen,
      openContactPage,
      closeContactPage,
      isReferralPageOpen,
      setIsReferralPageOpen,
      openReferralPage,
      closeReferralPage,
      isResellerPageOpen,
      setIsResellerPageOpen,
      openResellerPage,
      closeResellerPage,
      isResellerLoginPageOpen,
      setIsResellerLoginPageOpen,
      openResellerLoginPage,
      closeResellerLoginPage,
      isResellerDashboardOpen,
      setIsResellerDashboardOpen,
      openResellerDashboard,
      closeResellerDashboard,
      resellerApplications,
      addResellerApplication,
      updateResellerApplicationStatus,
      userReviews,
      addReview,
      userProfile,
      setUserProfile,
      orders,
      addOrder,
      updateOrderStatus,
      gamesCatalog,
      updateGamePrices,
      moongoldConfig,

      updateMoongoldConfig,
      r2Config,
      updateR2Config,
      toast,
      showToast,
      formatPrice,
      savePlayerId,
      isAuthModalOpen,
      setIsAuthModalOpen,
      authMode,
      setAuthMode,
      openAuth,
      isLoggedIn,
      setIsLoggedIn,
      handleLogout,
      isNoticeModalOpen,
      setIsNoticeModalOpen,
      isWalletModalOpen,
      setIsWalletModalOpen,
      walletActiveTab,
      setWalletActiveTab,
      openWalletModal,
      isDownloadAppModalOpen,
      setIsDownloadAppModalOpen,
      vouchers,
      addVoucher,
      deleteVoucher,
      redeemVoucher,
      tickerNotice,
      setTickerNotice,
      creditUserWallet,
      usersList,
      verifyUserAccount,
      toggleBlockUser,
      updateUserBalance,
      setUserExactBalance,
      manualPayments,
      approveManualPayment,
      rejectManualPayment,
      addManualPayment,
      isSupportOpen,
      setIsSupportOpen,
      activeTicketId,
      setActiveTicketId,
      supportTickets,
      createSupportTicket,
      sendTicketMessage,
      updateTicketStatus,
      updateTicketPriority,
      popupAdConfig,
      updatePopupAdConfig,
      isPolicyModalOpen,
      setIsPolicyModalOpen,
      activePolicyTab,
      setActivePolicyTab,
      openPolicyModal,
      closePolicyModal
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
