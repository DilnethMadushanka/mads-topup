import React, { createContext, useContext, useState, useEffect } from 'react';
import { GAMES_DATA } from '../data/games';
import { getMoongoldConfig, saveMoongoldConfig } from '../services/moongoldApi';
import { getR2Config, saveR2Config } from '../services/storageService';
import { auth, onAuthStateChanged, logoutGoogle } from '../services/firebaseAuth';
import { syncUserProfileToFirestore, updateUserProfileInFirestore, subscribeUserProfile, saveOrderToFirestore } from '../services/firestoreService';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currency, setCurrency] = useState('LKR'); // 'LKR' | 'USD'
  const [exchangeRate] = useState(305); // 1 USD = 305 LKR
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isGameCatalogOpen, setIsGameCatalogOpen] = useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletActiveTab, setWalletActiveTab] = useState('binance'); // 'ezcash' | 'binance' | 'redeem'

  const openWalletModal = (tab = 'binance') => {
    setWalletActiveTab(tab);
    setIsWalletModalOpen(true);
  };

  const openAuth = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const openCatalog = () => {
    setIsGameCatalogOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeCatalog = () => {
    setIsGameCatalogOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Moongold state
  const [moongoldConfig, setMoongoldConfigState] = useState(getMoongoldConfig());
  
  // Cloudflare R2 Storage State
  const [r2Config, setR2ConfigState] = useState(getR2Config());

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // User Profile
  const [userProfile, setUserProfileState] = useState(() => {
    const saved = localStorage.getItem('mads_user_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
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
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next && next.uid) {
        updateUserProfileInFirestore(next.uid, next);
      }
      return next;
    });
  };

  // Sync Firebase Auth & Firestore live profile/wallet data
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsLoggedIn(true);
        const profile = await syncUserProfileToFirestore({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Verified Gamer',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || ''
        });
        if (profile) {
          setUserProfileState(profile);
        }

        // Subscribe to live Firestore updates
        const unsubFirestore = subscribeUserProfile(firebaseUser.uid, (liveData) => {
          if (liveData) {
            setUserProfileState(prev => ({ ...prev, ...liveData }));
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
    await logoutGoogle();
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
    localStorage.removeItem('mads_user_profile');
    setIsUserProfileOpen(false);
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
  }, [userProfile]);

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
    setSelectedGame(game);
    setIsTopupModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addOrder = (newOrder) => {
    setOrders(prev => [newOrder, ...prev]);
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
  };

  const formatPrice = (priceLkr) => {
    if (currency === 'USD') {
      const usdVal = priceLkr / exchangeRate;
      return `$${usdVal.toFixed(2)}`;
    }
    return `Rs. ${priceLkr.toLocaleString('en-US')}`;
  };

  const savePlayerId = (gameId, gameName, playerId, nickName) => {
    setUserProfile(prev => {
      const exists = prev.savedIds.some(s => s.gameId === gameId && s.playerId === playerId);
      if (exists) return prev;
      return {
        ...prev,
        savedIds: [
          ...prev.savedIds,
          { id: Date.now(), gameId, gameName, playerId, nickName: nickName || 'My ID' }
        ]
      };
    });
    showToast('Game ID saved to profile for fast top-up!');
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
      isAdminOpen,
      setIsAdminOpen,
      isGameCatalogOpen,
      setIsGameCatalogOpen,
      openCatalog,
      closeCatalog,
      userProfile,
      setUserProfile,
      orders,
      addOrder,
      updateOrderStatus,
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
      openWalletModal
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
