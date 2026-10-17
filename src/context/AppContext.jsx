
import React, { createContext, useContext, useState, useEffect } from 'react';
import { GAMES_DATA } from '../data/games';
import { newDepositId } from '../data/depositRules';
import { HOME_SEO, SITE_URL, seoPageForPath } from '../data/seoPages';
import { pageForPath, pagePathFor, gamePathFor, gameForPath } from '../data/sitePages';
import { initAnalytics, trackPageView } from '../services/analytics';

// Demo deposits older versions seeded into every browser's saved list.
const DEMO_PAYMENT_IDS = new Set(['PAY-1001', 'PAY-1002', 'PAY-1003']);
// Demo accounts older versions seeded into every browser's saved user list.
const DEMO_USER_IDS = new Set(['USR-98210', 'USR-98205', 'USR-98201']);

// A date as an ISO string, or null. Accepts ISO strings, ms numbers and
// Firestore Timestamps; never throws (an invalid date used to crash the page).
const safeIso = (v) => {
  if (v === undefined || v === null || v === '') return null;
  try {
    const d = typeof v === 'object' && typeof v.seconds === 'number' ? new Date(v.seconds * 1000)
      : typeof v === 'object' && typeof v.toDate === 'function' ? v.toDate()
      : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  } catch { return null; }
};
const safeDay = (v) => (safeIso(v) || new Date().toISOString()).split('T')[0];
const str = (v) => String(v ?? '').trim();
const lc = (v) => str(v).toLowerCase();

// The page to open on load: the one in the address bar (/wallet, /reviews …),
// none on "/" or a game URL, otherwise the one saved for this tab.
const initialPageName = () => {
  try {
    const path = window.location.pathname;
    const page = pageForPath(path);
    if (page) return page.name;
    if (path === '/' || gameForPath(path)) return null;
    return sessionStorage.getItem('mads_page');
  } catch { return null; }
};
import { getMoongoldConfig, saveMoongoldConfig } from '../services/moongoldApi';
import { subscribeFfAccounts } from '../services/ffAccountsService';
import { getR2Config, saveR2Config } from '../services/storageService';
import { auth, onAuthStateChanged, logoutGoogle, getRedirectResult } from '../services/firebaseAuth';
import { postServerApi, clearSessionToken, getUserAuthToken, endExpiredSessionOnlyLogin } from '../services/serverApi';
import { 
  syncUserProfileToFirestore, updateUserProfileInFirestore, subscribeUserProfile, 
  saveOrderToFirestore, subscribeAllUsersFromFirestore, subscribeOrdersFromFirestore, updateOrderStatusInFirestore,
  saveResellerApplicationToFirestore, subscribeResellerApplicationsFromFirestore, approveResellerOnServer, setResellerStatusOnServer, sendResellerApprovalEmail,
  saveCustomGamePricesToFirestore, subscribeCustomGamePricesFromFirestore, generateUniqueSecurityKey, ensureResellerCredentials,
  saveManualPaymentToFirestore, rejectManualPaymentOnServer, createManualPaymentOnServer, approveManualPaymentOnServer, subscribeManualPaymentsFromFirestore, adjustUserWalletOnServer, fetchAdminWalletLog,
  createVoucherOnServer, updateVoucherOnServer, deleteVoucherOnServer, fetchVoucherLog, subscribeVouchersFromFirestore, redeemVoucherInDatabase,
  savePopupAdConfigToFirestore, subscribePopupAdConfigFromFirestore, DEFAULT_POPUP_AD_CONFIG,
  saveGameStripConfig, subscribeGameStripConfig, DEFAULT_GAME_STRIP_CONFIG,
  saveTickerNotice, subscribeTickerNotice,
  saveSupportTicketToFirestore, updateSupportTicketInFirestore, subscribeSupportTicketsFromFirestore,
  saveReviewToFirestore, subscribeReviewsFromFirestore, deleteReviewInDatabase,
  saveReferralClick, isAccountBlockedAsync, ACCOUNT_BLOCKED_MESSAGE
} from '../services/firestoreService';


const INITIAL_REVIEWS = [];

// Sample orders and tickets that older builds put in every new browser.
// They never existed in the database; drop them from saved copies.
const DEMO_ORDER_IDS = new Set(['ORD-98215', 'ORD-98210', 'ORD-98205']);
const DEMO_TICKET_IDS = new Set(['TCK-8921', 'TCK-8915']);

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currency, setCurrency] = useState('LKR'); // 'LKR' | 'USD'
  const [exchangeRate] = useState(340); // 1 USD = 340 LKR
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGameRaw] = useState(() => {
    // A game landing URL (/pubg-uc-sri-lanka/ etc.) opens that game straight away
    try {
      const landingGame = gameForPath(window.location.pathname);
      if (landingGame) {
        sessionStorage.setItem('mads_selected_game_id', landingGame.id);
        return landingGame;
      }
      // Plain "/" is the home page now that an open game has its own URL (a refresh
      // lands on the game's path), so only restore the saved game on other paths.
      if (window.location.pathname === '/' || pageForPath(window.location.pathname)) {
        sessionStorage.removeItem('mads_selected_game_id');
        return null;
      }
    } catch {}
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
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(() => { return initialPageName() === 'profile'; });
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
  const [isGameCatalogOpen, setIsGameCatalogOpen] = useState(() => { return initialPageName() === 'catalog'; });
  const [isReviewsPageOpen, setIsReviewsPageOpen] = useState(() => { return initialPageName() === 'reviews'; });
  const [isContactPageOpen, setIsContactPageOpen] = useState(() => { return initialPageName() === 'contact'; });
  const [isReferralPageOpen, setIsReferralPageOpen] = useState(() => { return initialPageName() === 'referral'; });
  const [isResellerPageOpen, setIsResellerPageOpen] = useState(() => { return initialPageName() === 'reseller'; });
  const [isResellerLoginPageOpen, setIsResellerLoginPageOpen] = useState(() => { return initialPageName() === 'reseller-login'; });
  const [isResellerDashboardOpen, setIsResellerDashboardOpen] = useState(() => { return initialPageName() === 'reseller-dashboard'; });
  const [isBlogPageOpen, setIsBlogPageOpen] = useState(() => {
    return initialPageName() === 'blog';
  });
  const [isLeaderboardPageOpen, setIsLeaderboardPageOpen] = useState(() => {
    return initialPageName() === 'leaderboard';
  });
  const [isFfAccountsPageOpen, setIsFfAccountsPageOpen] = useState(() => initialPageName() === 'ff-accounts');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(() => initialPageName() === 'wallet');
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
    setIsFfAccountsPageOpen(false);
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
    setIsFfAccountsPageOpen(false);
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

  // Free Fire accounts for sale ("Other Services")
  const openFfAccountsPage = () => {
    _clearAllPages();
    setIsFfAccountsPageOpen(true);
    _savePage('ff-accounts');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeFfAccountsPage = () => { setIsFfAccountsPageOpen(false); _savePage(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };

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
    // The live list replaces the local one, so deleted reviews go away.
    const unsub = subscribeReviewsFromFirestore((liveReviews) => {
      if (!Array.isArray(liveReviews)) return;
      // Newest first: database keys (rev-<time>) come back oldest first.
      const reviewTime = (r) => Number(String(r.id).replace(/^rev-/, '')) || new Date(r.date || 0).getTime() || 0;
      setUserReviews(liveReviews.filter(r => r && r.id).sort((a, b) => reviewTime(b) - reviewTime(a)));
    });
    return () => unsub();
  }, []);

  const addReview = (newRev) => {
    setUserReviews(prev => [newRev, ...prev]);
    // Bug 5: persist to Firestore so all users/devices see the new review
    saveReviewToFirestore(newRev);
    if (showToast) showToast('Thank you! Your review has been published successfully.');
  };
  
  const deleteReview = async (review) => {
    const { ok, error } = await deleteReviewInDatabase(review);
    if (ok) {
      setUserReviews(prev => prev.filter(r => r.id !== review.id));
      showToast('Review deleted.');
    } else {
      showToast(error || 'Could not delete the review.', 'error');
    }
    return ok;
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
          // Remember the built-in price once, so a removed override goes back to it live.
          if (pkg.basePriceLkr === undefined) {
            pkg.basePriceLkr = pkg.priceLkr;
            pkg.basePriceUsd = pkg.priceUsd;
          }
          const newPrice = Number(customPricesMap[pkg.id]);
          const hasOverride = customPricesMap[pkg.id] != null && !isNaN(newPrice) && newPrice > 0;
          // Also patch GAMES_DATA so getVerifiedPackagePriceLkr and the open game page stay in sync
          pkg.priceLkr = hasOverride ? newPrice : pkg.basePriceLkr;
          pkg.priceUsd = hasOverride ? Number((newPrice / 340).toFixed(2)) : pkg.basePriceUsd;
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
  const [popupAdConfig, setPopupAdConfig] = useState({ ...DEFAULT_POPUP_AD_CONFIG, enabled: false });

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
      const published = await savePopupAdConfigToFirestore(newConfig);
      if (published) setPopupAdConfig(newConfig);
      return published;
    } catch (e) {
      console.error('[AppContext] Save Popup Ad Error:', e);
      return false;
    }
  };

  // "Discover more games" icon bar (admin: Games Bar tab)
  const [gameStripConfig, setGameStripConfig] = useState(DEFAULT_GAME_STRIP_CONFIG);

  useEffect(() => subscribeGameStripConfig((config) => { if (config) setGameStripConfig(config); }), []);

  // Free Fire accounts for sale (admin: FF Accounts tab)
  const [ffAccounts, setFfAccounts] = useState([]);
  useEffect(() => subscribeFfAccounts(setFfAccounts), []);

  const updateGameStripConfig = async (newConfig) => {
    try {
      const ok = await saveGameStripConfig(newConfig);
      if (ok) setGameStripConfig(newConfig);
      return ok;
    } catch (e) {
      console.error('[AppContext] Save Game Strip Error:', e);
      return false;
    }
  };

  // Moongold state
  const [moongoldConfig, setMoongoldConfigState] = useState(getMoongoldConfig());

  
  // Cloudflare R2 Storage State
  const [r2Config, setR2ConfigState] = useState(getR2Config());

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    endExpiredSessionOnlyLogin();
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

  // The page that is showing, in the same order App.jsx picks it.
  const currentPage = isUserProfileOpen ? 'profile'
    : isWalletModalOpen ? 'wallet'
    : isResellerDashboardOpen ? 'reseller-dashboard'
    : isResellerLoginPageOpen ? 'reseller-login'
    : isResellerPageOpen ? 'reseller'
    : isReferralPageOpen ? 'referral'
    : isContactPageOpen ? 'contact'
    : isReviewsPageOpen ? 'reviews'
    : isLeaderboardPageOpen ? 'leaderboard'
    : isFfAccountsPageOpen ? 'ff-accounts'
    : isBlogPageOpen ? 'blog'
    : isGameCatalogOpen ? 'catalog'
    : null;

  // Keep the address bar and <head> in step with the open game or page, so each one has
  // its own shareable URL (/free-fire-diamonds-sri-lanka/, /game/<id>, /wallet, /reviews …)
  // and Back / Forward move between them. Only "/", game and page URLs are touched;
  // /admin, /ref/… etc. are left alone.
  const seoUrlFirstRun = React.useRef(true);
  useEffect(() => {
    const firstRun = seoUrlFirstRun.current;
    seoUrlFirstRun.current = false;
    const path = window.location.pathname;
    const onAppPath = path === '/' || Boolean(gameForPath(path)) || Boolean(pageForPath(path));
    const gamePath = selectedGame ? gamePathFor(selectedGame.id) : null;
    const pagePath = !selectedGame && currentPage ? pagePathFor(currentPage) : null;
    const target = gamePath || pagePath || '/';
    if (path !== target && onAppPath) {
      const url = target + window.location.search + window.location.hash;
      if (firstRun) window.history.replaceState(window.history.state, '', url);
      else window.history.pushState(null, '', url);
    }

    const seoPage = gamePath ? seoPageForPath(gamePath) : null;
    const sitePage = pagePath ? pageForPath(pagePath) : null;
    const title = seoPage ? seoPage.title
      : selectedGame ? `${selectedGame.name} Top Up Sri Lanka | MADS TOPUP`
      : sitePage ? sitePage.title : HOME_SEO.title;
    const description = seoPage ? seoPage.description
      : selectedGame ? `Top up ${selectedGame.name} in Sri Lanka with your Player ID. Pay in LKR with eZ Cash, bank transfer or Binance USDT.`
      : sitePage ? sitePage.description : HOME_SEO.description;
    const canonical = SITE_URL + (gamePath || pagePath || '/');
    document.title = title;
    const setAttr = (selector, attr, value) => {
      const el = document.head.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };
    setAttr('meta[name="description"]', 'content', description);
    setAttr('link[rel="canonical"]', 'href', canonical);
    setAttr('meta[property="og:url"]', 'content', canonical);
    setAttr('meta[property="og:title"]', 'content', title);
    setAttr('meta[property="og:description"]', 'content', description);
    setAttr('meta[name="twitter:url"]', 'content', canonical);
    setAttr('meta[name="twitter:title"]', 'content', title);
    setAttr('meta[name="twitter:description"]', 'content', description);
    if (firstRun) initAnalytics();
    else trackPageView();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGame?.id, currentPage]);

  // Browser Back/Forward between home, game and page URLs
  useEffect(() => {
    const pageSetters = {
      catalog: setIsGameCatalogOpen, leaderboard: setIsLeaderboardPageOpen, reviews: setIsReviewsPageOpen,
      contact: setIsContactPageOpen, reseller: setIsResellerPageOpen, 'reseller-login': setIsResellerLoginPageOpen,
      'reseller-dashboard': setIsResellerDashboardOpen, referral: setIsReferralPageOpen, blog: setIsBlogPageOpen,
      profile: setIsUserProfileOpen, wallet: setIsWalletModalOpen, 'ff-accounts': setIsFfAccountsPageOpen,
    };
    const onPopState = () => {
      const path = window.location.pathname;
      const game = gameForPath(path);
      const page = pageForPath(path);
      if (!game && !page && path !== '/') return;
      _clearAllPages();
      if (game) {
        setSelectedGame(game);
        _savePage(null);
      } else if (page) {
        pageSetters[page.name]?.(true);
        _savePage(page.name === 'wallet' ? null : page.name);
      } else {
        _savePage(null);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Accounts with an admin wallet change still saving (stops double clicks).
  const walletChangeLocksRef = React.useRef(new Set());
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

        let profileUid = alreadySynced ? (lastSync.profileUid || firebaseUser.uid) : firebaseUser.uid;
        if (!alreadySynced) {
          const profile = await syncUserProfileToFirestore({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Verified Gamer',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || ''
          });
          if (profile) {
            setUserProfileState(profile);
            // A Google login joined to an earlier account uses that account's uid.
            if (profile.uid) profileUid = profile.uid;
          }
          lastSyncedUidRef.current = { uid: firebaseUser.uid, profileUid, ts: Date.now() };
        }

        // Always subscribe to live Firestore updates
        const unsubFirestore = subscribeUserProfile(profileUid, (liveData) => {
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
        clearSessionToken();
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

  // Blocked accounts are logged out: when their live profile says BLOCKED,
  // when a check at login/page load finds any of their records blocked, or
  // when the server refuses an order because the account is blocked.
  const blockedLogoutRef = React.useRef(false);
  const logoutBlockedAccount = async () => {
    if (blockedLogoutRef.current) return;
    blockedLogoutRef.current = true;
    try {
      await handleLogout();
      showToast(ACCOUNT_BLOCKED_MESSAGE, 'error');
    } finally {
      blockedLogoutRef.current = false;
    }
  };

  useEffect(() => {
    if (isLoggedIn && userProfile?.status === 'BLOCKED') logoutBlockedAccount();
  }, [isLoggedIn, userProfile?.status]);

  useEffect(() => {
    const uid = userProfile?.uid;
    const email = userProfile?.email;
    if (!isLoggedIn || (!uid && !email)) return undefined;
    let cancelled = false;
    isAccountBlockedAsync(uid, email)
      .then((blocked) => { if (blocked && !cancelled) logoutBlockedAccount(); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isLoggedIn, userProfile?.uid, userProfile?.email]);

  // A password login from before signed sessions (or an expired session)
  // can't place orders any more — log out and ask for a fresh login.
  const sessionExpiredRef = React.useRef(false);
  useEffect(() => {
    const onExpired = async () => {
      if (sessionExpiredRef.current || (auth && auth.currentUser)) return;
      sessionExpiredRef.current = true;
      try {
        await handleLogout();
        showToast('Please log in again to continue.', 'error');
        openAuth('login');
      } finally {
        sessionExpiredRef.current = false;
      }
    };
    window.addEventListener('mads:session-expired', onExpired);
    return () => window.removeEventListener('mads:session-expired', onExpired);
  }, []);

  useEffect(() => {
    const onBlocked = () => logoutBlockedAccount();
    window.addEventListener('mads:account-blocked', onBlocked);
    return () => window.removeEventListener('mads:account-blocked', onBlocked);
  }, []);

  // Orders. Older builds seeded made-up sample orders into a fresh browser,
  // and the admin list then showed them as real orders with no account.
  const [orders, setOrders] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mads_orders') || '[]');
      return Array.isArray(saved) ? saved.filter(o => !DEMO_ORDER_IDS.has(o?.id)) : [];
    } catch (e) {
      return [];
    }
  });

  // Toasts: up to 3 on screen, newest on top. Each closes itself (the
  // ToastNotification component runs its timer, paused while hovered).
  const [toasts, setToasts] = useState([]);

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const showToast = (message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => {
      // The same message twice in a row just restarts the existing toast.
      const rest = prev.filter(t => !(t.message === message && t.type === type));
      return [{ id, message, type }, ...rest].slice(0, 3);
    });
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
          joinedAt: safeDay(userProfile.createdAt),
          totalOrders: 0,
          lifetimeSpendLkr: 0
        };
        return [newUserEntry, ...prev];
      });
    }
  }, [userProfile]);

  // Subscribe to all users in Firestore / RTDB for real-time admin user list sync (Admin only)
  useEffect(() => {
    if (!isAdminAuthenticated) return;
    const unsubAll = subscribeAllUsersFromFirestore((remoteUsersList) => {
      if (remoteUsersList && remoteUsersList.length > 0) {
        // The database is the source of truth: accounts deleted there must not
        // linger from this browser's cached copy (they inflate admin totals).
        setUsersList(prev => {
          const merged = [];
          remoteUsersList.forEach(ru => {
            const cached = prev.find(u => u && ((ru.uid && u.uid === ru.uid) || (ru.email && u.email && lc(u.email) === lc(ru.email))));
            // The sign-up date always comes from the database record, never
            // from this browser's copy (which may hold a made-up "now").
            const createdAt = safeIso(ru.createdAt) || safeIso(ru.joinedAt);
            if (cached) {
              merged.push({ ...cached, ...ru, createdAt });
            } else {
              merged.push({
                uid: ru.uid || `USR-${Math.floor(10000 + Math.random() * 90000)}`,
                name: ru.name || 'Gamer',
                email: ru.email || '',
                phone: ru.phone || '',
                walletBalance: ru.walletBalance || 0,
                walletUsdt: ru.walletUsdt || 0,
                isVerified: ru.isVerified || false,
                isReseller: ru.isReseller || false,
                resellerStatus: ru.resellerStatus,
                resellerTier: ru.resellerTier,
                resellerSalesLkr: ru.resellerSalesLkr || 0,
                status: ru.status || 'ACTIVE',
                createdAt: safeIso(ru.createdAt) || safeIso(ru.joinedAt),
                joinedAt: ru.createdAt ? safeDay(ru.createdAt) : (typeof ru.joinedAt === 'string' && ru.joinedAt ? ru.joinedAt : safeDay(ru.joinedAt)),
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
            (ru.email && prev.email && lc(ru.email) === lc(prev.email)) ||
            (ru.securityKey && prev.securityKey && str(ru.securityKey) === str(prev.securityKey)) ||
            (ru.resellerCode && prev.resellerCode && str(ru.resellerCode) === str(prev.resellerCode)) ||
            (ru.key && prev.key && str(ru.key) === str(prev.key))
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
    }, isAdminAuthenticated ? '' : userProfile?.email);
    return () => {
      if (typeof unsubOrders === 'function') unsubOrders();
    };
  }, [userProfile?.uid, userProfile?.email, isAdminAuthenticated]);

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

    // The 1.5% referral cashback is paid by the server when the order is
    // dispatched (dispatchMoongoldOrder sends the pending referral code).
  };

  // Resolves to true once the server saved it; on failure the old status comes back.
  const updateOrderStatus = async (orderId, newStatus, moongoldRef = null) => {
    const before = orders.find(ord => ord.id === orderId);
    setOrders(prev => prev.map(ord => {
      if (ord.id === orderId) {
        return {
          ...ord,
          status: newStatus,
          moongoldRef: moongoldRef || ord.moongoldRef,
          updatedAt: new Date().toISOString()
        };
      }
      return ord;
    }));
    const ok = await updateOrderStatusInFirestore(orderId, newStatus, moongoldRef);
    if (!ok && before) {
      setOrders(prev => prev.map(ord => (ord.id === orderId ? before : ord)));
    }
    return ok;
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

  const savePlayerId = (gameId, gameName, playerId, nickName, zoneId = '') => {
    setUserProfile(prev => {
      const zone = String(zoneId || '').trim();
      const exists = prev.savedIds.some(s => s.gameId === gameId && s.playerId === playerId && (s.zoneId || '') === zone);
      if (exists) return prev;
      const newEntry = { id: Date.now(), gameId, gameName, playerId, nickName: nickName || 'My ID', ...(zone ? { zoneId: zone } : {}) };
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
  // Admin voucher list (codes are for the admin only; customers just redeem).
  const [vouchers, setVouchers] = useState([]);


  // Subscribe to real-time vouchers from Database
  // The voucher list (with its codes) is for the admin only.
  useEffect(() => {
    if (!isAdminAuthenticated) return undefined;
    const unsub = subscribeVouchersFromFirestore((realtimeVouchers) => {
      if (Array.isArray(realtimeVouchers)) setVouchers(realtimeVouchers);
    });
    return () => unsub();
  }, [isAdminAuthenticated]);

  // Ticker message state
  const [tickerNotice, setTickerNotice] = useState(() => {
    return localStorage.getItem('mads_ticker_notice') || '🔥 SPECIAL PROMO: GET 10% EXTRA DIAMONDS ON ALL EZ CASH & BINANCE TOP-UPS! INSTANT DISPATCH ACTIVE 24/7.';
  });

  // Live from siteConfig/ticker, so an admin change reaches every open page.
  useEffect(() => subscribeTickerNotice((text) => setTickerNotice(text)), []);

  const updateTickerNotice = async (text) => {
    const ok = await saveTickerNotice(text);
    if (ok) setTickerNotice(String(text || '').trim().slice(0, 500));
    return ok;
  };

  // Admin voucher changes. The server changes one voucher inside a
  // transaction and returns the fresh list, which replaces ours.
  const runVoucherChange = async (call, success) => {
    const result = await call();
    if (!result.ok) { showToast(result.error, 'error'); return result; }
    if (Array.isArray(result.vouchers)) setVouchers(result.vouchers);
    if (success) showToast(success);
    return result;
  };
  const addVoucher = (voucher) => runVoucherChange(() => createVoucherOnServer(voucher), `Voucher ${String(voucher.code).toUpperCase()} created.`);
  const updateVoucher = (changes, message) => runVoucherChange(() => updateVoucherOnServer(changes), message || `Voucher ${changes.code} saved.`);
  const deleteVoucher = (code) => runVoucherChange(() => deleteVoucherOnServer(code), `Voucher ${code} deleted.`);

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
      // Local display only — the server has already saved the real balance
      // (browsers can't write wallet balances), and the real-time listener
      // will sync the exact value.
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
        // Drop the demo accounts older versions seeded into every browser
        // and old fake test balances.
        return (Array.isArray(parsed) ? parsed : []).filter(u => u && !DEMO_USER_IDS.has(u.uid)).map(u => ({
          ...u,
          walletUsdt: (u.walletUsdt === 49.64 || (u.walletUsdt > 49.6 && u.walletUsdt < 49.7)) ? 0 : (u.walletUsdt || 0)
        }));
      } catch (e) {}
    }
    return [];
  });

  // Deposit records. Customers keep their own submissions here (their wallet
  // history); the admin panel replaces the list with the server's copy.
  // Demo records that older versions seeded into every browser are dropped.
  const [manualPayments, setManualPayments] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mads_manual_payments') || '[]');
      return Array.isArray(saved) ? saved.filter(p => p && typeof p === 'object' && !DEMO_PAYMENT_IDS.has(p.id)) : [];
    } catch (e) {
      return [];
    }
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
      if (Array.isArray(liveList)) setManualPayments(liveList);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [isAdminAuthenticated]);

  // Persist a partial update for one user. Returns true only if it really saved.
  // Badge / block changes are saved by the server (admin session required).
  const saveAdminUserField = async (uid, fields) => {
    const { ok, data } = await postServerApi('/api/admin/user-fields', { identifier: uid, fields });
    if (!ok) console.warn('saveAdminUserField failed:', data?.error);
    return ok;
  };

  // Reseller tier: 'AUTO' follows their sales, or fix BRONZE / SILVER / GOLD.
  const setResellerTier = async (uid, tier) => {
    const { ok, data } = await postServerApi('/api/admin/user-fields', { identifier: uid, fields: { resellerTier: tier } });
    if (!ok) { showToast(data?.error || 'Could not change the tier.', 'error'); return false; }
    setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, resellerTier: tier === 'AUTO' ? undefined : tier } : u));
    return true;
  };

  // How much a reseller applicant has deposited towards joining.
  const fetchResellerDeposit = async (appId) => {
    const { ok, data } = await postServerApi('/api/admin/reseller-deposit', { appId });
    return ok ? data : null;
  };

  const verifyUserAccount = async (uid) => {
    const previous = usersList.find(u => u.uid === uid);
    setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, isVerified: true } : u));
    // RTDB first — it's the real backend of record (Firestore is disabled for this project).
    const saved = await saveAdminUserField(uid, { isVerified: true });
    if (!saved) {
      setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, isVerified: previous ? !!previous.isVerified : false } : u));
      showToast('Could not verify this user — the change was NOT saved.', 'error');
      return;
    }
    // Best-effort Firestore mirror — not awaited, so it can never block the RTDB write above.
    import('../services/firebaseAuth').then(({ db }) => {
      import('firebase/firestore').then(({ doc, setDoc }) => {
        setDoc(doc(db, 'users', uid), { isVerified: true }, { merge: true }).catch(() => {});
      });
    });
    showToast('User account verified & badge granted!');
  };

  const toggleBlockUser = async (uid) => {
    const current = usersList.find(u => u.uid === uid);
    const previousStatus = current ? current.status : undefined;
    const newStatus = previousStatus === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus } : u));
    const saved = await saveAdminUserField(uid, { status: newStatus });
    if (!saved) {
      setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, status: previousStatus } : u));
      showToast('Could not change account status — the change was NOT saved.', 'error');
      return;
    }
    // Best-effort Firestore mirror — not awaited.
    import('../services/firebaseAuth').then(({ db }) => {
      import('firebase/firestore').then(({ doc, setDoc }) => {
        setDoc(doc(db, 'users', uid), { status: newStatus }, { merge: true }).catch(() => {});
      });
    });
    showToast(`User account status updated to ${newStatus}.`);
  };

  // Admin: add to, deduct from or set a customer's wallet. The server does
  // the change, logs it with the reason and returns the real new balance,
  // which is what the list then shows. Returns the server's answer.
  const adjustUserWallet = async ({ user, mode, lkr = 0, usdt = 0, reason = '' }) => {
    const key = user?.uid || '';
    if (!key && !user?.email) return { ok: false, error: 'No account selected.' };
    const lockKey = key || String(user.email).toLowerCase();
    // A double click must not apply the same change twice.
    if (walletChangeLocksRef.current.has(lockKey)) return { ok: false, error: 'A change for this account is still saving.' };
    walletChangeLocksRef.current.add(lockKey);
    try {
      const result = await adjustUserWalletOnServer({ key, identifier: user?.email, mode, lkr, usdt, reason });
      if (!result.ok) {
        showToast(result.error || 'Wallet was not changed.', 'error');
        return result;
      }
      const apply = (u) => (u && (u.uid === result.key || u.uid === user?.uid)
        ? { ...u, walletBalance: result.newBalanceLkr, walletUsdt: result.newBalanceUsdt }
        : u);
      setUsersList(prev => prev.map(apply));
      if (userProfile?.uid && userProfile.uid === result.key) {
        setUserProfileState(prev => ({ ...prev, walletBalance: result.newBalanceLkr, walletUsdt: result.newBalanceUsdt }));
      }
      return result;
    } finally {
      walletChangeLocksRef.current.delete(lockKey);
    }
  };


  // Admin: approve a deposit. The server reads the amount and account from
  // the stored record and credits it once (with the bonus), so nothing here
  // is trusted. Returns the server's answer ({ ok, creditedLkr, ... }).
  const approveManualPayment = async (paymentId) => {
    const pay = manualPayments.find(p => p.id === paymentId);
    if (!pay) return { ok: false, error: 'Deposit not found.' };
    // A double click must not fire two requests; the server also refuses
    // to credit the same deposit twice.
    if (approvingPaymentIdsRef.current.has(paymentId)) return { ok: false, error: 'Already being approved.' };
    if (pay.credited) return { ok: false, error: 'This deposit was already credited.' };
    approvingPaymentIdsRef.current.add(paymentId);
    try {
      const result = await approveManualPaymentOnServer(paymentId);
      if (!result.ok) {
        showToast(result.error || 'Could not approve this deposit.', 'error');
        return result;
      }
      setManualPayments(prev => prev.map(p => p.id === paymentId
        ? { ...p, status: 'VERIFIED', credited: true, creditedTo: result.key, creditedLkr: result.creditedLkr, creditedUsdt: result.creditedUsdt, creditedAt: new Date().toISOString() }
        : p));
      const who = pay.userName || pay.userEmail || 'the customer';
      showToast(result.creditedUsdt > 0
        ? `Approved ${paymentId}: $${result.creditedUsdt} USDT credited to ${who}`
        : `Approved ${paymentId}: Rs. ${Number(result.creditedLkr || 0).toLocaleString()} credited to ${who}`);
      return result;
    } finally {
      approvingPaymentIdsRef.current.delete(paymentId);
    }
  };

  // Admin: reject a pending deposit. The list only changes once the server
  // has saved it.
  const rejectManualPayment = async (paymentId, reason = '') => {
    const result = await rejectManualPaymentOnServer(paymentId, reason);
    if (!result.ok) {
      showToast(result.error || 'Could not reject this deposit.', 'error');
      return result;
    }
    setManualPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'REJECTED', rejectReason: reason || null } : p));
    showToast(`Deposit ${paymentId} rejected.`);
    return result;
  };

  // Admin: record a payment received outside the site (server finds the account).
  const recordOfflinePayment = async (fields) => {
    const result = await createManualPaymentOnServer(fields);
    if (!result.ok) {
      showToast(result.error || 'Could not record this payment.', 'error');
      return result;
    }
    if (result.payment) setManualPayments(prev => [result.payment, ...prev.filter(p => p.id !== result.payment.id)]);
    showToast(`Payment recorded for ${result.payment?.userEmail || fields.email}. Approve it to credit the wallet.`);
    return result;
  };

  // Customer: save a deposit request (EZ Cash / Binance / bank slip).
  const addManualPayment = (newPay) => {
    // Old short ids ("PAY-1234") clash easily, and the database refuses to
    // overwrite an existing deposit, which used to lose the new one.
    const shortId = !newPay.id || /^PAY-\d{4}$/.test(newPay.id);
    const fullPay = {
      ...newPay,
      id: shortId ? newDepositId() : newPay.id,
      userId: newPay.userId || userProfile?.uid || '',
      userEmail: newPay.userEmail || userProfile?.email || '',
      userName: newPay.userName || userProfile?.name || 'Gamer',
      resellerCode: newPay.resellerCode || userProfile?.resellerCode || '',
      createdAt: newPay.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setManualPayments(prev => [fullPay, ...prev]);
    saveManualPaymentToFirestore(fullPay);
  };

  // -------------------------------------------------------------
  // CUSTOMER SUPPORT TICKET SYSTEM STATE & METHODS
  // -------------------------------------------------------------
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState(null);

  const [supportTickets, setSupportTickets] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mads_support_tickets') || '[]');
      return Array.isArray(saved) ? saved.filter(t => !DEMO_TICKET_IDS.has(t?.id)) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('mads_support_tickets', JSON.stringify(supportTickets));
  }, [supportTickets]);

  // Real-time Firestore sync for support tickets (connects admin ↔ customer)
  useEffect(() => {
    if (!isAdminAuthenticated) return;
    const unsub = subscribeSupportTicketsFromFirestore((liveTickets) => {
      if (!Array.isArray(liveTickets) || liveTickets.length === 0) return;
      setSupportTickets(prev => {
        const map = new Map();
        (prev || []).forEach(t => { if (t?.id) map.set(t.id, t); });
        liveTickets.forEach(t => {
          if (t?.id) map.set(t.id, { ...map.get(t.id), ...t });
        });
        return Array.from(map.values());
      });
    }, { admin: true });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [isAdminAuthenticated]);

  // Bug 2 fix: also subscribe for logged-in customers so admin replies appear live.
  // Admin subscription above already covers admin view; this covers the customer side.
  useEffect(() => {
    if (!userProfile?.uid && !userProfile?.email) return;
    if (isAdminAuthenticated) return; // admin already subscribed above
    const unsub = subscribeSupportTicketsFromFirestore((liveTickets) => {
      if (!Array.isArray(liveTickets) || liveTickets.length === 0) return;
      setSupportTickets(prev => {
        const map = new Map();
        (prev || []).forEach(t => { if (t?.id) map.set(t.id, t); });
        // Only merge tickets belonging to this user (uid or email match)
        liveTickets.forEach(t => {
          if (!t?.id) return;
          const matchUid = Boolean(userProfile.uid) && t.userId === userProfile.uid;
          const matchEmail = Boolean(userProfile.email) && Boolean(t.userEmail) &&
            t.userEmail.toLowerCase() === userProfile.email.toLowerCase();
          if (matchUid || matchEmail) {
            map.set(t.id, { ...map.get(t.id), ...t });
          }
        });
        return Array.from(map.values());
      });
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [userProfile?.uid, userProfile?.email, isAdminAuthenticated]);

  const createSupportTicket = ({ subject, category, message, orderId, attachmentUrl }) => {
    const newTicket = {
      id: 'TCK-' + Date.now().toString().slice(-6) + Math.floor(10 + Math.random() * 90),
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
    // Persist to Firestore so admin sees ticket immediately
    // Bug 5 fix: catch Firestore errors so they're not silently swallowed
    saveSupportTicketToFirestore(newTicket).catch(err => {
      console.warn('[createSupportTicket] Firestore save error:', err);
      showToast('Ticket saved locally. Sync may be delayed — contact support if unresolved.', 'error');
    });
    showToast('Support ticket submitted! Our 24/7 team will respond shortly.');
    return newTicket;
  };

  const sendTicketMessage = async (ticketId, text, senderRole = 'user', attachmentUrl = null) => {
    // Replies are saved by the server (browsers can only create a ticket).
    const isAdmin = senderRole === 'admin';
    // Admin requests carry the HttpOnly admin cookie instead of a token.
    const token = isAdmin ? null : await getUserAuthToken(userProfile);
    const { ok, data } = await postServerApi(isAdmin ? '/api/admin/tickets/message' : '/api/tickets/message', { ticketId, text, attachmentUrl }, token);
    if (!ok || !data?.ticket) {
      showToast(data?.error || 'Could not send the reply. Please try again.', 'error');
      return false;
    }
    setSupportTickets(prev => prev.map(tck => (tck.id === ticketId ? { ...tck, ...data.ticket } : tck)));
    // Keep the Firestore copy in step (the ticket listener also reads it).
    saveSupportTicketToFirestore(data.ticket).catch(() => {});
    return true;
  };

  const updateTicketStatus = (ticketId, newStatus) => {
    setSupportTickets(prev => prev.map(tck => {
      if (tck.id === ticketId) {
        const updated = { ...tck, status: newStatus, updatedAt: new Date().toISOString() };
        postServerApi('/api/admin/tickets/update', { ticketId, status: newStatus });
        updateSupportTicketInFirestore(ticketId, { status: newStatus, updatedAt: updated.updatedAt });
        return updated;
      }
      return tck;
    }));
    showToast(`Ticket ${ticketId} status set to ${newStatus}`);
  };

  const updateTicketPriority = (ticketId, newPriority) => {
    setSupportTickets(prev => prev.map(tck => {
      if (tck.id === ticketId) {
        const updated = { ...tck, priority: newPriority, updatedAt: new Date().toISOString() };
        postServerApi('/api/admin/tickets/update', { ticketId, priority: newPriority });
        updateSupportTicketInFirestore(ticketId, { priority: newPriority, updatedAt: updated.updatedAt });
        return updated;
      }
      return tck;
    }));
    showToast(`Ticket ${ticketId} priority set to ${newPriority}`);
  };

  // Reseller Applications State & Handlers
  // Reseller applications. The admin panel replaces this with the server's
  // list; a customer's browser only keeps the application they sent.
  const [resellerApplications, setResellerApplications] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mads_reseller_applications') || '[]');
      // APP-90182 was a demo application seeded into every browser.
      return Array.isArray(saved) ? saved.filter(a => a && typeof a === 'object' && a.id !== 'APP-90182') : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('mads_reseller_applications', JSON.stringify(resellerApplications));
  }, [resellerApplications]);

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    const unsub = subscribeResellerApplicationsFromFirestore((remoteApps) => {
      if (Array.isArray(remoteApps)) setResellerApplications(remoteApps);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [isAdminAuthenticated]);

  const addResellerApplication = (appData) => {
    // Short random ids ("APP-12345") clash, and the database refuses to
    // overwrite an existing application, which lost the new one.
    const newId = appData.id && !/^APP-\d{5}$/.test(appData.id) ? appData.id : newDepositId('APP');
    const fullApp = { ...appData, id: newId };
    setResellerApplications(prev => [fullApp, ...prev]);
    saveResellerApplicationToFirestore(fullApp);
    setUserProfileState(prev => ({ ...prev, resellerStatus: 'PENDING' }));
  };

  // Admin: approve, reject, suspend or re-open a reseller application.
  // Everything is decided and saved by the server; this updates the lists
  // only after it said yes. Returns { ok, error, emailSent }.
  const updateResellerApplicationStatus = async (app, newStatus, reason = '') => {
    if (!app?.id) return { ok: false, error: 'Application not found.' };
    const appId = app.id;
    const markApp = (fields) => setResellerApplications(prev => prev.map(a => (a.id === appId ? { ...a, ...fields, updatedAt: new Date().toISOString() } : a)));
    const markUser = (key, fields) => setUsersList(prev => prev.map(u => (u.uid === key ? { ...u, ...fields } : u)));

    if (newStatus !== 'APPROVED') {
      const result = await setResellerStatusOnServer(appId, newStatus, reason);
      if (!result.ok) { showToast(result.error, 'error'); return result; }
      markApp({ status: newStatus, statusReason: reason || null });
      if (result.revokedKey) markUser(result.revokedKey, { isReseller: false, resellerStatus: newStatus, role: undefined });
      showToast(result.revokedKey
        ? `${app.storeName || appId} ${newStatus === 'SUSPENDED' ? 'suspended' : 'rejected'}. Reseller prices are off for this account.`
        : `${app.storeName || appId} set to ${newStatus.toLowerCase()}.`);
      return result;
    }

    // Codes the email will show. The server keeps an account's existing ones
    // and returns what it saved.
    const creds = ensureResellerCredentials({ uid: app.userId, email: app.emailAddress, name: app.realName, resellerCode: app.resellerCode, securityKey: app.securityKey });
    const result = await approveResellerOnServer(appId, { userId: app.userId, resellerCode: creds.resellerCode, securityKey: creds.securityKey });
    if (!result.ok) { showToast(result.error, 'error'); return result; }
    const resellerCode = result.resellerCode || creds.resellerCode;
    const securityKey = result.securityKey || creds.securityKey;
    const key = result.keys?.[0];
    markApp({ status: 'APPROVED', approvedKey: key, resellerCode, securityKey });
    if (key) markUser(key, { isReseller: true, role: 'reseller', resellerStatus: 'APPROVED', resellerCode, securityKey });

    const email = app.emailAddress || app.email || usersList.find(u => u.uid === key)?.email || '';
    let emailSent = false;
    if (email) {
      const mail = await sendResellerApprovalEmail({ email, name: app.realName || app.storeName || 'Valued Reseller', resellerCode, securityKey });
      emailSent = mail.ok;
    }
    showToast(emailSent
      ? `${app.storeName || 'Reseller'} approved. Codes emailed to ${email}.`
      : `${app.storeName || 'Reseller'} approved, but the email was not sent. Send it again from the application.`, emailSent ? 'success' : 'warning');
    return { ...result, ok: true, emailSent, resellerCode, securityKey };
  };

  // Admin: send the approval email again with the account's saved codes.
  const resendResellerEmail = async (app) => {
    const email = app?.emailAddress || app?.email;
    if (!email || !app?.resellerCode || !app?.securityKey) {
      showToast('This application has no saved codes yet. Approve it first.', 'error');
      return { ok: false };
    }
    const mail = await sendResellerApprovalEmail({ email, name: app.realName || app.storeName || 'Valued Reseller', resellerCode: app.resellerCode, securityKey: app.securityKey });
    showToast(mail.ok ? `Approval email sent to ${email}.` : mail.error, mail.ok ? 'success' : 'error');
    return mail;
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
      isFfAccountsPageOpen,
      openFfAccountsPage,
      closeFfAccountsPage,
      ffAccounts,
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
      resendResellerEmail,
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
      toasts,
      dismissToast,
      showToast,
      setResellerTier,
      fetchResellerDeposit,
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
      updateVoucher,
      deleteVoucher,
      fetchVoucherLog,
      deleteReview,
      redeemVoucher,
      tickerNotice,
      setTickerNotice,
      updateTickerNotice,
      creditUserWallet,
      usersList,
      verifyUserAccount,
      toggleBlockUser,
      adjustUserWallet,
      fetchAdminWalletLog,
      manualPayments,
      approveManualPayment,
      rejectManualPayment,
      addManualPayment,
      recordOfflinePayment,
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
      gameStripConfig,
      updateGameStripConfig,
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
