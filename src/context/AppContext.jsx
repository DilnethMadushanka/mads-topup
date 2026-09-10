import React, { createContext, useContext, useState, useEffect } from 'react';
import { GAMES_DATA } from '../data/games';
import { getMoongoldConfig, saveMoongoldConfig } from '../services/moongoldApi';
import { getR2Config, saveR2Config } from '../services/storageService';

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

  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // User Profile
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('mads_user_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      name: 'DM Gadgets',
      email: 'dmgadgets26@gmail.com',
      phone: '+94 77 987 6543',
      walletBalance: 2500, // LKR
      savedIds: [
        { id: 1, gameId: 'freefire', gameName: 'Free Fire', playerId: '248901234', nickName: 'SL Slayer' },
        { id: 2, gameId: 'pubg', gameName: 'PUBG Mobile', playerId: '5123984712', nickName: 'MADS Noob' }
      ]
    };
  });

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
      setIsLoggedIn
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
