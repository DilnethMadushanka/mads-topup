
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAdminToken } from '../services/adminSession.js';
import { GAMES_DATA } from '../data/games';
import { getMoongoldConfig, saveMoongoldConfig } from '../services/moongoldApi';
import { getR2Config, saveR2Config } from '../services/storageService';
import { auth, onAuthStateChanged, logoutGoogle, getRedirectResult } from '../services/firebaseAuth';
import { 
  syncUserProfileToFirestore, updateUserProfileInFirestore, subscribeUserProfile, 
  saveOrderToFirestore, subscribeAllUsersFromFirestore, fetchAllUsersFromRtdb, subscribeOrdersFromFirestore, updateOrderStatusInFirestore,
  saveResellerApplicationToFirestore, subscribeResellerApplicationsFromFirestore, updateResellerApplicationStatusInFirestore,
  saveCustomGamePricesToFirestore, subscribeCustomGamePricesFromFirestore, generateUniqueSecurityKey, ensureResellerCredentials,
  saveManualPaymentToFirestore, updateManualPaymentStatusInFirestore, subscribeManualPaymentsFromFirestore, creditUserWalletInDatabase, setUserExactBalanceInDatabase,
  saveVouchersToFirestore, subscribeVouchersFromFirestore, redeemVoucherInDatabase,
  savePopupAdConfigToFirestore, subscribePopupAdConfigFromFirestore, DEFAULT_POPUP_AD_CONFIG,
  saveSupportTicketToFirestore, updateSupportTicketInFirestore, subscribeSupportTicketsFromFirestore, normalizeTicket,
  saveReviewToFirestore, subscribeReviewsFromFirestore,
  saveReferralClick, lookupReferrerByCode, processReferralCashback
} from '../services/firestoreService';


const INITIAL_REVIEWS = [];

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currency, setCurrency] = useState('LKR'); // 'LKR' | 'USD'
  const [exchangeRate] = useState(340); // 1 USD = 340 LKR
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGameRaw] = useState(() => {
    try {
      const saved = sessionStorage.getItem('mads_selected_game_id');
      if (saved) {
        const found = GAMES_DATA.find(g => g.id === saved);
        if (found) return found;
      }
    } catch {}
    return null;
  });

  const setSelectedGame = (game) => {
    setSelectedGameRaw(game);
    try {
      if (game?.id) sessionStorage.setItem('mads_selected_game_id', game.id);
      else sessionStorage.removeItem('mads_selected_game_id');
    } catch {}
  };
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(() => { try { return sessionStorage.getItem('mads_page') === 'profile'; } catch { return false; } });
  const [isAdminOpen, setIsAdminOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      return path === '/admin' || path.startsWith('/admin/') || hash === '#admin' || search.includes('admin');
    }
    return false;
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isGameCatalogOpen, setIsGameCatalogOpen] = useState(() => { try { return sessionStorage.getItem('mads_page') === 'catalog'; } catch { return false; } });
  const [isReviewsPageOpen, setIsReviewsPageOpen] = useState(() => { try { return sessionStorage.getItem('mads_page') === 'reviews'; } catch { return false; } });
  const [isContactPageOpen, setIsContactPageOpen] = useState(() => { try { return sessionStorage.getItem('mads_page') === 'contact'; } catch { return false; } });
  const [isReferralPageOpen, setIsReferralPageOpen] = useState(() => { try { return sessionStorage.getItem('mads_page') === 'referral'; } catch { return false; } });
  const [isResellerPageOpen, setIsResellerPageOpen] = useState(() => { try { return sessionStorage.getItem('mads_page') === 'reseller'; } catch { return false; } });
  const [isResellerLoginPageOpen, setIsResellerLoginPageOpen] = useState(() => { try { return sessionStorage.getItem('mads_page') === 'reseller-login'; } catch { return false; } });
  const [isResellerDashboardOpen, setIsResellerDashboardOpen] = useState(() => { try { return sessionStorage.getItem('mads_page') === 'reseller-dashboard'; } catch { return false; } });
  const [isBlogPageOpen, setIsBlogPageOpen] = useState(() => {
    try { return sessionStorage.getItem('mads_page') === 'blog'; } catch { return false; }
  });
  const [isLeaderboardPageOpen, setIsLeaderboardPageOpen] = useState(() => {
    try { return sessionStorage.getItem('mads_page') === 'leaderboard'; } catch { return false; }
  });

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
    setIsBlogPageOpen(false);
    setSelectedGame(null);
    _savePage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAuth = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  // ── Page persistence helpers ──────────────────────────────────────────────
  const _savePage = (name) => { try { if (name) sessionStorage.setItem('mads_page', name); else sessionStorage.removeItem('mads_page'); } catch {} };
  const _clearAllPages = () => {
    setIsGameCatalogOpen(false); setIsReviewsPageOpen(false); setIsContactPageOpen(false);
    setIsReferralPageOpen(false); setIsResellerPageOpen(false); setIsResellerLoginPageOpen(false);
    setIsResellerDashboardOpen(false); setIsBlogPageOpen(false); setIsUserProfileOpen(false);
    setIsWalletModalOpen(false); setSelectedGame(null); setIsLeaderboardPageOpen(false);
  };

  const openBlogPage = () => {
    _clearAllPages();
    setIsBlogPageOpen(true);
    _savePage('blog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeBlogPage = () => { setIsBlogPageOpen(false); _savePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const openLeaderboardPage = () => {
    _clearAllPages();
    setIsLeaderboardPageOpen(true);
    _savePage('leaderboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeLeaderboardPage = () => { setIsLeaderboardPageOpen(false); _savePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const openCatalog = () => {
    if (!isLoggedIn && (!auth || !auth.currentUser)) {
      openAuth('login');
      showToast('🔒 Please log in or register an account to access the game catalog!', 'error');
      return;
    }
    _clearAllPages();
    setIsGameCatalogOpen(true);
    _savePage('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeCatalog = () => { setIsGameCatalogOpen(false); _savePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const openReviewsPage = () => {
    _clearAllPages();
    setIsReviewsPageOpen(true);
    _savePage('reviews');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeReviewsPage = () => { setIsReviewsPageOpen(false); _savePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const openContactPage = () => {
    _clearAllPages();
    setIsContactPageOpen(true);
    _savePage('contact');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeContactPage = () => { setIsContactPageOpen(false); _savePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const openReferralPage = () => {
    _clearAllPages();
    setIsReferralPageOpen(true);
    _savePage('referral');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeReferralPage = () => { setIsReferralPageOpen(false); _savePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const openResellerPage = () => {
    _clearAllPages();
    setIsResellerPageOpen(true);
    _savePage('reseller');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeResellerPage = () => { setIsResellerPageOpen(false); _savePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const openResellerLoginPage = () => {
    _clearAllPages();
    setIsResellerLoginPageOpen(true);
    _savePage('reseller-login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeResellerLoginPage = () => { setIsResellerLoginPageOpen(false); _savePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const openResellerDashboard = () => {
    _clearAllPages();
    setIsResellerDashboardOpen(true);
    _savePage('reseller-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeResellerDashboard = () => { setIsResellerDashboardOpen(false); _savePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const openUserProfilePage = () => {
    _clearAllPages();
    setIsUserProfileOpen(true);
    _savePage('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeUserProfilePage = () => { setIsUserProfileOpen(false); _savePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const [userReviews, setUserReviews] = useState(() => {
    const saved = localStorage.getItem('mads_user_reviews');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Bug 4 fix: keep ALL saved reviews (old filter wrongly stripped 'rev-' prefix IDs)
        if (Array.isArray(parsed)) return parsed.filter(r => r && r.id);
      } catch (e) {}
    }
    return INITIAL_REVIEWS;
  });

  useEffect(() => {
    localStorage.setItem('mads_user_reviews', JSON.stringify(userReviews));
  }, [userReviews]);

  // Bug 5: real-time Firestore subscription so all browsers see new reviews
  useEffect(() => {
    const unsub = subscribeReviewsFromFirestore((liveReviews) => {
      if (!Array.isArray(liveReviews) || liveReviews.length === 0) return;
      setUserReviews(prev => {
        const map = new Map();
        (prev || []).forEach(r => { if (r?.id) map.set(r.id, r); });
        liveReviews.forEach(r => { if (r?.id) map.set(r.id, r); });
        return Array.from(map.values());
      });
    });
    return () => unsub();
  }, []);

  const addReview = (newRev) => {
    setUserReviews(prev => [newRev, ...prev]);
    // Bug 5: persist to Firestore so all users/devices see the new review
    saveReviewToFirestore(newRev);
    if (showToast) showToast('Thank you! Your review has been published successfully.');
  };
  
  // Dynamic Games Catalog State & Realtime Custom Prices Sync
  const [gamesCatalog, setGamesCatalog] = useState(GAMES_DATA);

  useEffect(() => {
    const unsub = subscribeCustomGamePricesFromFirestore((customPricesMap) => {
      if (!customPricesMap || typeof customPricesMap !== 'object') return;

      // Build updated catalog immutably — do not rely on GAMES_DATA mutation for React state
      const updatedCatalog = GAMES_DATA.map(game => ({
        ...game,
        packages: (game.packages || []).map(pkg => {
          const override = customPricesMap[pkg.id];
          if (override !== undefined && override !== null) {
            const newPrice = Number(override);
            if (!isNaN(newPrice) && newPrice > 0) {
              // Also patch GAMES_DATA so getVerifiedPackagePriceLkr stays in sync
              pkg.priceLkr = newPrice;
              pkg.priceUsd = Number((newPrice / 340).toFixed(2));
              return { ...pkg, priceLkr: newPrice, priceUsd: Number((newPrice / 340).toFixed(2)) };
            }
          }
          return { ...pkg };
        })
      }));

      setGamesCatalog(updatedCatalog);
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

  // Payment ids currently being approved or already approved this session —
  // a plain ref (not React state) so it's checked/set synchronously and
  // can't be raced by two Approve clicks firing before a re-render commits.
  const approvingPaymentIdsRef = React.useRef(new Set());

  // Debounce map for updateUserBalance — see its own comment for why.
  const balanceUpdateDebounceRef = React.useRef(new Map());
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

  // ── Referral URL capture (runs once on mount) ─────────────────────
  // Detects /ref/:code or ?ref=:code in the URL, saves it to localStorage
  // so it survives until the user registers / logs in.
  useEffect(() => {
    try {
      let refCode = '';
      const path = window.location.pathname; // e.g. /ref/MADS-DIL1234
      const search = new URLSearchParams(window.location.search);
      const pathMatch = path.match(/\/ref\/([^/?#]+)/i);
      if (pathMatch) refCode = pathMatch[1].toUpperCase();
      else if (search.get('ref')) refCode = search.get('ref').toUpperCase();

      if (refCode && !localStorage.getItem('mads_ref_used')) {
        // Store the pending referral code
        localStorage.setItem('mads_pending_ref', refCode);
        // Save click record to DB (anonymous — user not yet logged in)
        saveReferralClick(refCode, `anon-${Date.now()}`).catch(() => {});
      }
    } catch (_) {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          createdAt: userProfile.createdAt || new Date().toISOString(),
          joinedAt: userProfile.createdAt
            ? new Date(userProfile.createdAt).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          totalOrders: 0,
          lifetimeSpendLkr: 0
        };
        return [newUserEntry, ...prev];
      });
    }
  }, [userProfile]);

  // Admin: Refresh all users list directly from RTDB
  const [isUsersRefreshing, setIsUsersRefreshing] = useState(false);
  const refreshUsersList = async () => {
    setIsUsersRefreshing(true);
    try {
      const remoteUsers = await fetchAllUsersFromRtdb();
      if (remoteUsers && remoteUsers.length > 0) {
        setUsersList(prev => {
          const merged = [...prev];
          remoteUsers.forEach(ru => {
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
                createdAt: ru.createdAt || (ru.joinedAt ? new Date(ru.joinedAt).toISOString() : null),
                joinedAt: ru.createdAt
                  ? new Date(ru.createdAt).toISOString().split('T')[0]
                  : (ru.joinedAt || new Date().toISOString().split('T')[0]),
                totalOrders: ru.totalOrders || 0,
                lifetimeSpendLkr: ru.lifetimeSpendLkr || 0
              });
            }
          });
          return merged;
        });
      }
    } catch (err) {
      console.warn('refreshUsersList note:', err.message);
    } finally {
      setIsUsersRefreshing(false);
    }
  };

  // Subscribe to all users in Firestore / RTDB for real-time admin user list sync (Admin only)
  useEffect(() => {
    if (!isAdminAuthenticated) return;
    refreshUsersList();
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
                createdAt: ru.createdAt || (ru.joinedAt ? new Date(ru.joinedAt).toISOString() : null),
                joinedAt: ru.createdAt
                  ? new Date(ru.createdAt).toISOString().split('T')[0]
                  : (ru.joinedAt || new Date().toISOString().split('T')[0]),
                totalOrders: ru.totalOrders || 0,
                lifetimeSpendLkr: ru.lifetimeSpendLkr || 0
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
    return () => {
      if (typeof unsubAll === 'function') unsubAll();
    };
  }, [isAdminAuthenticated]);


  // Realtime subscribe to live orders from Firestore / RTDB
  useEffect(() => {
    // Only subscribe if logged in as customer (for own orders) or authenticated as admin (for all orders)
    if (!userProfile?.uid && !isAdminAuthenticated) return;
    const targetUid = isAdminAuthenticated ? null : userProfile?.uid;
    const unsubOrders = subscribeOrdersFromFirestore(targetUid, (remoteOrders) => {
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
    return () => {
      if (typeof unsubOrders === 'function') unsubOrders();
    };
  }, [userProfile?.uid, isAdminAuthenticated]);

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
    // Use best available identifier so reseller orders don't save under 'guest'
    const saveKey = userProfile?.uid || userProfile?.resellerCode || userProfile?.email || 'guest';
    saveOrderToFirestore(saveKey, newOrder);

    // ── Referral cashback: credit referrer 1.5% on this user's first order ──
    // Only runs if a pending referral code was captured from the URL on load,
    // and has not yet been paid out (guarded by 'mads_ref_used' localStorage flag).
    const pendingRef = (() => { try { return localStorage.getItem('mads_pending_ref'); } catch(_) { return null; } })();
    const refAlreadyPaid = (() => { try { return !!localStorage.getItem('mads_ref_used'); } catch(_) { return true; } })();

    if (pendingRef && !refAlreadyPaid && newOrder.priceLkr && newOrder.status !== 'FAILED') {
      // Mark as paid first (optimistic) to prevent double-credit on rapid re-renders
      try { localStorage.setItem('mads_ref_used', '1'); localStorage.removeItem('mads_pending_ref'); } catch(_) {}

      // Async — does not block order placement
      (async () => {
        try {
          const referrer = await lookupReferrerByCode(pendingRef);
          if (referrer) {
            const cashback = await processReferralCashback(
              referrer.uid,
              referrer.email,
              newOrder.priceLkr,
              pendingRef,
              userProfile?.email || saveKey
            );
            if (cashback > 0) {
              // Update the referrer's balance in the local usersList if they are in it
              setUsersList(prev => prev.map(u => {
                if ((referrer.uid && u.uid === referrer.uid) || (referrer.email && u.email && u.email.toLowerCase() === referrer.email.toLowerCase())) {
                  return { ...u, walletBalance: (u.walletBalance || 0) + cashback };
                }
                return u;
              }));
            }
          }
        } catch (e) {
          console.warn('[referral] cashback processing error:', e);
          // If something fails, revert the paid flag so it can retry
          try { localStorage.removeItem('mads_ref_used'); localStorage.setItem('mads_pending_ref', pendingRef); } catch(_) {}
        }
      })();
    }
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

  const formatPrice = (priceLkr, priceUsd) => {
    if (currency === 'USD') {
      const usd = priceUsd != null ? priceUsd : Number((priceLkr / 340).toFixed(2));
      if (isNaN(usd)) return '$ 0.00';
      return `$ ${Number(usd).toFixed(2)}`;
    }
    if (priceLkr === null || priceLkr === undefined || isNaN(priceLkr)) return 'Rs. 0';
    return `Rs. ${Number(priceLkr).toLocaleString('en-US')}`;
  };

  // Always formats in LKR regardless of currency toggle
  // Use this for: order history, admin totals, wallet balance, receipts
  const formatLkr = (priceLkr) => {
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
        createdAt: '2026-09-01T00:00:00.000Z',
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
        createdAt: '2026-09-05T00:00:00.000Z',
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
        createdAt: '2026-09-08T00:00:00.000Z',
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
    if (!isAdminAuthenticated) return;
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
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [isAdminAuthenticated]);

  const verifyUserAccount = async (uid) => {
    setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, isVerified: true } : u));
    // RTDB first — it's the real backend of record. Firestore is disabled
    // for this project, so awaiting it BEFORE the RTDB write (the previous
    // order) meant a rejected setDoc threw straight into the catch block
    // and skipped the RTDB update entirely — "Verify" appeared to succeed
    // (toast + optimistic UI) but never actually persisted anywhere.
    try {
      const { rtdb } = await import('../services/firebaseAuth');
      if (rtdb) {
        const rtdbMod = await import('firebase/database');
        await rtdbMod.update(rtdbMod.ref(rtdb, `users/${uid}`), { isVerified: true });
      }
    } catch (e) { console.warn('verifyUserAccount RTDB note:', e); }
    // Best-effort Firestore mirror — not awaited, so it can never block or
    // abort the RTDB write above.
    import('../services/firebaseAuth').then(({ db }) => {
      import('firebase/firestore').then(({ doc, setDoc }) => {
        setDoc(doc(db, 'users', uid), { isVerified: true }, { merge: true }).catch(() => {});
      });
    });
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
    // RTDB first — same reasoning as verifyUserAccount above.
    try {
      const { rtdb } = await import('../services/firebaseAuth');
      if (rtdb) {
        const rtdbMod = await import('firebase/database');
        await rtdbMod.update(rtdbMod.ref(rtdb, `users/${uid}`), { status: newStatus });
      }
    } catch (e) { console.warn('toggleBlockUser RTDB note:', e); }
    // Best-effort Firestore mirror — not awaited.
    import('../services/firebaseAuth').then(({ db }) => {
      import('firebase/firestore').then(({ doc, setDoc }) => {
        setDoc(doc(db, 'users', uid), { status: newStatus }, { merge: true }).catch(() => {});
      });
    });
    showToast(`User account status updated to ${newStatus}.`);
  };

  const updateUserBalance = async (userEmailOrId, lkrAmount, usdtAmount = 0) => {
    if (!userEmailOrId) return;
    const cleanId = String(userEmailOrId).trim();
    const cleanIdLower = cleanId.toLowerCase();

    // Debounce guard against a rapid double-click applying the same admin
    // credit twice — the quick "+Rs.1,000"/"+$10" buttons and the Credit
    // tab form have no loading/disabled state, so two clicks fired close
    // together would otherwise both call creditUserWalletInDatabase and
    // double-credit the user. A short window is enough to absorb a double
    // click while still allowing a deliberate second credit of the exact
    // same amount moments later.
    const debounceKey = `${cleanIdLower}:${lkrAmount}:${usdtAmount}`;
    const now = Date.now();
    const lastCall = balanceUpdateDebounceRef.current.get(debounceKey);
    if (lastCall && now - lastCall < 2000) {
      showToast('Please wait a moment before repeating that credit.', 'error');
      return;
    }
    balanceUpdateDebounceRef.current.set(debounceKey, now);

    // 1. OPTIMISTIC UPDATE FIRST: Immediately update usersList in React state & localStorage
    setUsersList(prev => {
      const next = prev.map(u => {
        const uEmailLower = u.email ? String(u.email).toLowerCase() : '';
        const uUidLower = u.uid ? String(u.uid).toLowerCase() : '';
        const uIdLower = u.id ? String(u.id).toLowerCase() : '';
        const uCodeLower = u.resellerCode ? String(u.resellerCode).toLowerCase() : '';

        const matchEmail = (cleanIdLower && uEmailLower === cleanIdLower) || (cleanSecEmail && uEmailLower === cleanSecEmail);
        const matchUid = cleanIdLower && (uUidLower === cleanIdLower || uIdLower === cleanIdLower);
        const matchCode = cleanIdLower && uCodeLower === cleanIdLower;

        if (matchEmail || matchUid || matchCode) {
          const newLkr = Math.max(0, (parseFloat(u.walletBalance) || 0) + lkrDiff);
          const newUsdt = Math.max(0, (parseFloat(u.walletUsdt) || 0) + usdtDiff);
          return {
            ...u,
            walletBalance: newLkr,
            walletUsdt: newUsdt
          };
        }
        return u;
      });
      try {
        localStorage.setItem('mads_users_list', JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    // Update self userProfile locally if applicable
    if (userProfile) {
      const pEmailLower = userProfile.email ? String(userProfile.email).toLowerCase() : '';
      const pUidLower = userProfile.uid ? String(userProfile.uid).toLowerCase() : '';
      const matchSelf = (cleanIdLower && (pEmailLower === cleanIdLower || pUidLower === cleanIdLower)) || (cleanSecEmail && pEmailLower === cleanSecEmail);
      if (matchSelf) {
        setUserProfileState(prev => ({
          ...prev,
          walletBalance: Math.max(0, (parseFloat(prev?.walletBalance) || 0) + lkrDiff),
          walletUsdt: Math.max(0, (parseFloat(prev?.walletUsdt) || 0) + usdtDiff)
        }));
      }
    }

    // 2. Persist to DB (direct REST PATCH)
    try {
      await creditUserWalletInDatabase(cleanId || cleanSecEmail, lkrDiff, usdtDiff);
    } catch (err) {
      console.warn('updateUserBalance note:', err);
    }
  };

  const setUserExactBalance = async (userEmailOrId, exactLkr, exactUsdt, secondaryEmail = null) => {
    if (!userEmailOrId && !secondaryEmail) return;
    const cleanId = String(userEmailOrId || '').trim();
    const cleanIdLower = cleanId.toLowerCase();
    const cleanSecEmail = String(secondaryEmail || '').trim().toLowerCase();
    const newLkr = Math.max(0, parseFloat(exactLkr) || 0);
    const newUsdt = Math.max(0, parseFloat(exactUsdt) || 0);

    // 1. OPTIMISTIC UPDATE FIRST: Immediately update usersList in React state & localStorage
    setUsersList(prev => {
      const next = prev.map(u => {
        const uEmailLower = u.email ? String(u.email).toLowerCase() : '';
        const uUidLower = u.uid ? String(u.uid).toLowerCase() : '';
        const uIdLower = u.id ? String(u.id).toLowerCase() : '';
        const uCodeLower = u.resellerCode ? String(u.resellerCode).toLowerCase() : '';

        const matchEmail = (cleanIdLower && uEmailLower === cleanIdLower) || (cleanSecEmail && uEmailLower === cleanSecEmail);
        const matchUid = cleanIdLower && (uUidLower === cleanIdLower || uIdLower === cleanIdLower);
        const matchCode = cleanIdLower && uCodeLower === cleanIdLower;

        if (matchEmail || matchUid || matchCode) {
          return {
            ...u,
            walletBalance: newLkr,
            walletUsdt: newUsdt
          };
        }
        return u;
      });
      try {
        localStorage.setItem('mads_users_list', JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    // Update self userProfile if applicable
    if (userProfile) {
      const pEmailLower = userProfile.email ? String(userProfile.email).toLowerCase() : '';
      const pUidLower = userProfile.uid ? String(userProfile.uid).toLowerCase() : '';
      const matchSelf = (cleanIdLower && (pEmailLower === cleanIdLower || pUidLower === cleanIdLower)) || (cleanSecEmail && pEmailLower === cleanSecEmail);
      if (matchSelf) {
        setUserProfile(prev => ({
          ...prev,
          walletBalance: newLkr,
          walletUsdt: newUsdt
        }));
      }
    }

    // 2. Persist to DB (direct REST PATCH)
    try {
      await setUserExactBalanceInDatabase(cleanId || cleanSecEmail, newLkr, newUsdt);
    } catch (err) {
      console.warn('setUserExactBalance note:', err);
    }
  };

  const approveManualPayment = async (paymentId) => {
    const pay = manualPayments.find(p => p.id === paymentId);
    if (!pay) return;
    // Idempotency guard against double-crediting: checked/set synchronously
    // via a ref (not React state) so two Approve clicks fired back-to-back —
    // before either state update re-renders and hides the button — can't
    // both pass this check. React state (pay.status === 'VERIFIED') alone
    // isn't enough here because both calls would read the same stale value.
    if (approvingPaymentIdsRef.current.has(paymentId) || pay.status === 'VERIFIED') return;
    approvingPaymentIdsRef.current.add(paymentId);

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
  const [activeTicketId, setActiveTicketId] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('mads_active_ticket_id')) || null;
  });

  const [supportTickets, setSupportTickets] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('mads_support_tickets') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    if (activeTicketId) {
      try { localStorage.setItem('mads_active_ticket_id', activeTicketId); } catch (e) {}
    }
  }, [activeTicketId]);

  useEffect(() => {
    try { localStorage.setItem('mads_support_tickets', JSON.stringify(supportTickets)); } catch (e) {}
  }, [supportTickets]);

  // Real-time bidirectional database sync for support tickets (connects customer ↔ admin in real time)
  useEffect(() => {
    const unsub = subscribeSupportTicketsFromFirestore((liveTickets) => {
      if (!Array.isArray(liveTickets) || liveTickets.length === 0) return;
      setSupportTickets(prev => {
        const map = new Map();
        // 1. Seed with previous tickets
        (prev || []).forEach(t => {
          if (t && t.id) map.set(t.id, t);
        });

        // 2. Merge live tickets
        liveTickets.forEach(remote => {
          if (!remote || !remote.id) return;
          const existing = map.get(remote.id);

          const getMsgs = (tck) => {
            if (!tck || !tck.messages) return [];
            if (Array.isArray(tck.messages)) return tck.messages;
            if (typeof tck.messages === 'object') return Object.values(tck.messages).filter(Boolean);
            return [];
          };

          const existingMsgs = getMsgs(existing);
          const remoteMsgs = getMsgs(remote);

          // Deduplicate messages by id or timestamp+text
          const msgMap = new Map();
          existingMsgs.forEach(m => {
            if (m?.id) msgMap.set(m.id, m);
            else if (m?.text && m?.timestamp) msgMap.set(`${m.timestamp}_${m.text}`, m);
          });
          remoteMsgs.forEach(m => {
            if (m?.id) msgMap.set(m.id, m);
            else if (m?.text && m?.timestamp) msgMap.set(`${m.timestamp}_${m.text}`, m);
          });

          const mergedMsgs = Array.from(msgMap.values()).sort((a, b) => {
            const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return ta - tb;
          });

          map.set(remote.id, {
            ...existing,
            ...remote,
            messages: mergedMsgs.length > 0 ? mergedMsgs : (remoteMsgs.length > 0 ? remoteMsgs : existingMsgs)
          });
        });

        return Array.from(map.values()).sort((a, b) => {
          const ta = b.updatedAt || b.createdAt ? new Date(b.updatedAt || b.createdAt).getTime() : 0;
          const tb = a.updatedAt || a.createdAt ? new Date(a.updatedAt || a.createdAt).getTime() : 0;
          return ta - tb;
        });
      });
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const createSupportTicket = ({ subject, category, message, orderId, attachmentUrl, userName, userEmail, userPhone }) => {
    const ticketId = 'TCK-' + Math.floor(1000 + Math.random() * 9000);
    const finalName = userName || userProfile?.name || 'Verified Gamer';
    const finalEmail = userEmail || userProfile?.email || 'customer@madstopup.com';
    const finalPhone = userPhone || userProfile?.phone || '';
    const finalUid = userProfile?.uid || 'USR-' + Math.floor(10000 + Math.random() * 90000);

    const newTicket = {
      id: ticketId,
      userId: finalUid,
      userEmail: finalEmail,
      userName: finalName,
      phone: finalPhone,
      userPhone: finalPhone,
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
          senderName: finalName,
          text: message,
          attachmentUrl: attachmentUrl || null,
          timestamp: new Date().toISOString()
        }
      ]
    };

    // Keep track of this ticket on the current browser so guest or unauthenticated user always has access
    try {
      const myIds = JSON.parse(localStorage.getItem('mads_my_ticket_ids') || '[]');
      if (!myIds.includes(ticketId)) {
        myIds.push(ticketId);
        localStorage.setItem('mads_my_ticket_ids', JSON.stringify(myIds));
      }
    } catch (e) {}

    setSupportTickets(prev => [newTicket, ...(prev || []).filter(t => t.id !== ticketId)]);
    setActiveTicketId(ticketId);

    // Persist immediately to RTDB and Firestore
    saveSupportTicketToFirestore(newTicket);
    showToast('Support ticket submitted! Our 24/7 team will respond shortly.');
    return newTicket;
  };

  const sendTicketMessage = (ticketId, text, senderRole = 'user', attachmentUrl = null) => {
    if (!ticketId || (!text?.trim() && !attachmentUrl)) return;
    
    let updatedTicket = null;

    setSupportTickets(prev => {
      return (prev || []).map(tck => {
        if (tck.id === ticketId) {
          const currentMsgs = Array.isArray(tck.messages)
            ? tck.messages
            : Object.values(tck.messages || {}).filter(Boolean);

          const newMessage = {
            id: 'MSG-' + Date.now(),
            sender: senderRole,
            senderName: senderRole === 'admin' ? 'MADS Support Team' : (tck.userName || 'Customer'),
            text: text?.trim() || '',
            attachmentUrl: attachmentUrl || null,
            timestamp: new Date().toISOString()
          };

          const newStatus = senderRole === 'admin'
            ? (tck.status === 'OPEN' ? 'IN_PROGRESS' : tck.status)
            : (tck.status === 'RESOLVED' || tck.status === 'CLOSED' ? 'OPEN' : tck.status);

          updatedTicket = {
            ...tck,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            messages: [...currentMsgs, newMessage]
          };

          return updatedTicket;
        }
        return tck;
      });
    });

    if (updatedTicket) {
      saveSupportTicketToFirestore(updatedTicket);
    }
  };

  const updateTicketStatus = (ticketId, newStatus) => {
    if (!ticketId || !newStatus) return;
    let updatedTicket = null;
    const nowIso = new Date().toISOString();

    setSupportTickets(prev => (prev || []).map(tck => {
      if (tck.id === ticketId) {
        updatedTicket = { ...tck, status: newStatus, updatedAt: nowIso };
        return updatedTicket;
      }
      return tck;
    }));

    updateSupportTicketInFirestore(ticketId, { status: newStatus, updatedAt: nowIso });
    showToast(`Ticket ${ticketId} status updated to ${newStatus}`);
  };

  const updateTicketPriority = (ticketId, newPriority) => {
    if (!ticketId || !newPriority) return;
    let updatedTicket = null;
    const nowIso = new Date().toISOString();

    setSupportTickets(prev => (prev || []).map(tck => {
      if (tck.id === ticketId) {
        updatedTicket = { ...tck, priority: newPriority, updatedAt: nowIso };
        return updatedTicket;
      }
      return tck;
    }));

    updateSupportTicketInFirestore(ticketId, { priority: newPriority, updatedAt: nowIso });
    showToast(`Ticket ${ticketId} priority set to ${newPriority}`);
  };

  const refreshSupportTickets = async () => {
    try {
      const res = await fetch('https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app/supportTickets.json');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          const tickets = Object.entries(data)
            .map(([k, v]) => normalizeTicket(v, k))
            .filter(Boolean);
          if (tickets.length > 0) {
            setSupportTickets(tickets.sort((a, b) => {
              const ta = b.updatedAt || b.createdAt ? new Date(b.updatedAt || b.createdAt).getTime() : 0;
              const tb = a.updatedAt || a.createdAt ? new Date(a.updatedAt || a.createdAt).getTime() : 0;
              return ta - tb;
            }));
            return true;
          }
        }
      }
    } catch (e) {}
    return false;
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
    if (!isAdminAuthenticated) return;
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
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [isAdminAuthenticated]);

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
      // Bug 8: Update usersList so the approved user's record reflects reseller status
      setUsersList(prev => prev.map(u => {
        const matchUid = targetUserId && u.uid === targetUserId;
        const matchEmail = targetApp?.emailAddress && u.email &&
          u.email.toLowerCase() === targetApp.emailAddress.toLowerCase();
        if (matchUid || matchEmail) {
          return { ...u, isReseller: true, role: 'reseller', resellerStatus: 'APPROVED', resellerCode, securityKey };
        }
        return u;
      }));

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

            const sessionToken = getAdminToken() || '';
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
              },
              body: JSON.stringify({
                email: targetEmail,
                name: targetName,
                resellerCode,
                securityKey
              }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.status === 401) {
              showToast('Admin session expired — reseller was approved, but you need to log out/in to Admin Dashboard to resend the approval email.', 'error');
            } else if (res.ok) {
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
      isAdminAuthenticated,
      setIsAdminAuthenticated,
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
      isLeaderboardPageOpen,
      setIsLeaderboardPageOpen,
      openLeaderboardPage,
      closeLeaderboardPage,
      isResellerLoginPageOpen,
      setIsResellerLoginPageOpen,
      openResellerLoginPage,
      closeResellerLoginPage,
      isResellerDashboardOpen,
      setIsResellerDashboardOpen,
      openResellerDashboard,
      closeResellerDashboard,
      isBlogPageOpen,
      openBlogPage,
      closeBlogPage,
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
      formatLkr,
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
      refreshUsersList,
      isUsersRefreshing,
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
      refreshSupportTickets,
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
