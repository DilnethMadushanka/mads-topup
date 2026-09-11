
import React, { createContext, useContext, useState, useEffect } from 'react';
import { GAMES_DATA } from '../data/games';
import { getMoongoldConfig, saveMoongoldConfig } from '../services/moongoldApi';
import { getR2Config, saveR2Config } from '../services/storageService';
import { auth, onAuthStateChanged, logoutGoogle } from '../services/firebaseAuth';
import { syncUserProfileToFirestore, updateUserProfileInFirestore, subscribeUserProfile, saveOrderToFirestore, subscribeAllUsersFromFirestore } from '../services/firestoreService';

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
      if (next && (next.uid || next.name || next.email)) {
        setIsLoggedIn(true);
        if (next.uid) {
          updateUserProfileInFirestore(next.uid, next);
        }
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
      }
    });
    return () => unsubAll();
  }, []);

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

  // Vouchers state
  const [vouchers, setVouchers] = useState(() => {
    const saved = localStorage.getItem('mads_vouchers');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { code: 'MADS-GIFT-500', value: 500, currency: 'LKR', maxUses: 100, usedCount: 14, active: true },
      { code: 'WELCOME100', value: 100, currency: 'LKR', maxUses: 500, usedCount: 88, active: true },
      { code: 'BINANCE-USDT-5', value: 5, currency: 'USDT', maxUses: 50, usedCount: 12, active: true }
    ];
  });

  // Ticker message state
  const [tickerNotice, setTickerNotice] = useState(() => {
    return localStorage.getItem('mads_ticker_notice') || '🔥 SPECIAL PROMO: GET 10% EXTRA DIAMONDS ON ALL EZ CASH & BINANCE TOP-UPS! INSTANT DISPATCH ACTIVE 24/7.';
  });

  useEffect(() => {
    localStorage.setItem('mads_vouchers', JSON.stringify(vouchers));
  }, [vouchers]);

  useEffect(() => {
    localStorage.setItem('mads_ticker_notice', tickerNotice);
  }, [tickerNotice]);

  const addVoucher = (newVoucher) => {
    setVouchers(prev => [newVoucher, ...prev]);
    showToast(`Voucher code ${newVoucher.code} created successfully!`);
  };

  const deleteVoucher = (code) => {
    setVouchers(prev => prev.filter(v => v.code !== code));
    showToast(`Voucher code ${code} deleted.`);
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
      if (prev.uid) {
        updateUserProfileInFirestore(prev.uid, { walletBalance: updatedLkr, walletUsdt: updatedUsdt });
      }
      return nextProfile;
    });
    if (amountLkr > 0 || amountUsdt > 0) {
      showToast(`Wallet credited: +Rs. ${amountLkr} LKR / +$${amountUsdt} USDT!`);
    } else {
      showToast(`Wallet updated: Paid Rs. ${Math.abs(amountLkr)} from wallet balance.`);
    }
  };

  // Users List State (User Management & Verification)
  const [usersList, setUsersList] = useState(() => {
    const saved = localStorage.getItem('mads_users_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        uid: 'USR-98210',
        name: 'Dilneth Madushanka',
        email: 'madsruzza@gmail.com',
        phone: '+94 77 123 4567',
        walletBalance: 2500,
        walletUsdt: 15.00,
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
        walletBalance: 500,
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
        slipUrl: 'https://mads-topup.r2.cloudflarestorage.com/slips/ezcash_1001.jpg',
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
        slipUrl: 'https://mads-topup.r2.cloudflarestorage.com/slips/binance_1002.jpg',
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

  const verifyUserAccount = (uid) => {
    setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, isVerified: true } : u));
    showToast('User account verified & badge granted!');
  };

  const toggleBlockUser = (uid) => {
    setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, status: u.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED' } : u));
    showToast('User account status updated.');
  };

  const updateUserBalance = (userEmail, lkrAmount, usdtAmount = 0) => {
    if (!userEmail) return;
    setUsersList(prev => prev.map(u => {
      if (u.email && u.email.toLowerCase() === userEmail.toLowerCase()) {
        const newLkr = Math.max(0, (u.walletBalance || 0) + lkrAmount);
        const newUsdt = Math.max(0, (u.walletUsdt || 0) + usdtAmount);
        if (u.uid) {
          updateUserProfileInFirestore(u.uid, { walletBalance: newLkr, walletUsdt: newUsdt });
        }
        return {
          ...u,
          walletBalance: newLkr,
          walletUsdt: newUsdt
        };
      }
      return u;
    }));

    if (userProfile && userProfile.email && userProfile.email.toLowerCase() === userEmail.toLowerCase()) {
      creditUserWallet(lkrAmount, usdtAmount);
    }
  };

  const setUserExactBalance = (userEmail, exactLkr, exactUsdt) => {
    if (!userEmail) return;
    setUsersList(prev => prev.map(u => {
      if (u.email && u.email.toLowerCase() === userEmail.toLowerCase()) {
        const newLkr = Math.max(0, parseFloat(exactLkr) || 0);
        const newUsdt = Math.max(0, parseFloat(exactUsdt) || 0);
        if (u.uid) {
          updateUserProfileInFirestore(u.uid, { walletBalance: newLkr, walletUsdt: newUsdt });
        }
        return {
          ...u,
          walletBalance: newLkr,
          walletUsdt: newUsdt
        };
      }
      return u;
    }));

    if (userProfile && userProfile.email && userProfile.email.toLowerCase() === userEmail.toLowerCase()) {
      setUserProfile(prev => ({
        ...prev,
        walletBalance: Math.max(0, parseFloat(exactLkr) || 0),
        walletUsdt: Math.max(0, parseFloat(exactUsdt) || 0)
      }));
    }
  };

  const approveManualPayment = (paymentId) => {
    const pay = manualPayments.find(p => p.id === paymentId);
    if (!pay) return;

    setManualPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'VERIFIED' } : p));
    
    if (pay.currency === 'USDT') {
      updateUserBalance(pay.userEmail, 0, pay.amount);
    } else {
      updateUserBalance(pay.userEmail, pay.amount, 0);
    }

    showToast(`Payment ${paymentId} approved! Credited ${pay.amount} ${pay.currency} to ${pay.userName}`);
  };

  const rejectManualPayment = (paymentId) => {
    setManualPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'REJECTED' } : p));
    showToast(`Payment ${paymentId} rejected.`, 'error');
  };

  const addManualPayment = (newPay) => {
    setManualPayments(prev => [newPay, ...prev]);
    showToast(`Manual payment record created!`);
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
      openWalletModal,
      vouchers,
      addVoucher,
      deleteVoucher,
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
      addManualPayment
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
