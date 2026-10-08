import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA, getVerifiedPackagePriceLkr } from '../data/games';
import { generateUniqueSecurityKey, ensureResellerCredentials, getResellerProfileByKeyAsync, updateUserProfileInFirestore } from '../services/firestoreService';
import { dispatchMoongoldOrder } from '../services/moongoldApi';
import { orderBelongsToUser } from '../utils/ownership';
import confetti from 'canvas-confetti';
import { 
  Crown, Wallet, Zap, Copy, Check, ArrowLeft, Send, ShieldCheck, 
  TrendingUp, ShoppingBag, DollarSign, Clock, RefreshCw, CheckCircle2, 
  Search, Filter, Smartphone, Ticket, Award, Store, Edit3, Settings, HelpCircle, ArrowRight,
  Globe, Bot, Mail
} from 'lucide-react';

export const ResellerDashboard = () => {
  const { 
    userProfile, 
    setUserProfile,
    orders, 
    addOrder,
    formatPrice, 
    showToast, 
    closeResellerDashboard,
    openWalletModal,
    gamesCatalog
  } = useApp();


  const [activeTab, setActiveTab] = useState('dispatch'); // 'dispatch' | 'orders' | 'pricing' | 'bot' | 'settings'

  // Instant Topup Dispatch Form State
  const [selectedGameId, setSelectedGameId] = useState(GAMES_DATA[0]?.id || 'freefire');
  const [customerUid, setCustomerUid] = useState('');
  const [customerZoneId, setCustomerZoneId] = useState('');
  const [customerIgn, setCustomerIgn] = useState('');
  // Bug 4: Pre-select first package so wholesale price shows immediately
  const [selectedPackageId, setSelectedPackageId] = useState(GAMES_DATA[0]?.packages?.[0]?.id || '');
  const [isFulfilling, setIsFulfilling] = useState(false);

  // Search & Filter States
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderChannelFilter, setOrderChannelFilter] = useState('ALL'); // 'ALL' | 'TELEGRAM' | 'WEB'
  const [isCopiedId, setIsCopiedId] = useState(false);

  // Store Settings Form State
  const [storeName, setStoreName] = useState(userProfile?.storeName || `${userProfile?.name || 'Gamer'}'s TopUp Store`);
  const [whatsappContact, setWhatsappContact] = useState(userProfile?.phone || '');
  const [storeEmail, setStoreEmail] = useState(userProfile?.email || '');

  const profileWithCreds = ensureResellerCredentials(userProfile) || {};
  const resellerWalletId = profileWithCreds.resellerCode || userProfile?.resellerCode || 'RS-OFFICIAL';
  const resellerSecurityKey = profileWithCreds.securityKey || userProfile?.securityKey || 'MADS-SEC-OFFICIAL';
  const [isCopiedKey, setIsCopiedKey] = useState(false);

  // Bug 8 fix: persist generated credentials to Firestore if they weren't saved yet
  // This ensures the key in the dashboard matches the DB and the approval email
  useEffect(() => {
    if (!userProfile?.uid) return;
    const needsKeyUpdate = !userProfile.securityKey || userProfile.securityKey !== resellerSecurityKey;
    const needsCodeUpdate = !userProfile.resellerCode || userProfile.resellerCode !== resellerWalletId;
    if (needsKeyUpdate || needsCodeUpdate) {
      updateUserProfileInFirestore(userProfile.uid, {
        securityKey: resellerSecurityKey,
        resellerCode: resellerWalletId
      }).catch(e => console.warn('[ResellerDashboard] Key persist note:', e));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.uid]);

  const handleCopySecurityKey = () => {
    navigator.clipboard.writeText(resellerSecurityKey);
    setIsCopiedKey(true);
    showToast('Unique Security Key copied to clipboard!');
    setTimeout(() => setIsCopiedKey(false), 2000);
  };

  const currentGame = GAMES_DATA.find(g => g.id === selectedGameId) || GAMES_DATA[0];
  const selectedPackage = currentGame?.packages?.find(p => p.id === selectedPackageId) || currentGame?.packages?.[0];

  // Calculate Reseller Wholesale Price (5% discount) with Hardened Anti-Tamper Verification
  const untamperedPackagePrice = getVerifiedPackagePriceLkr(currentGame?.id, selectedPackage);
  const calculateWholesalePrice = (priceLkr) => Math.round(priceLkr * 0.95);
  const currentWholesalePrice = untamperedPackagePrice ? calculateWholesalePrice(untamperedPackagePrice) : 0;
  const currentSavings = untamperedPackagePrice ? (untamperedPackagePrice - currentWholesalePrice) : 0;

  // Filter orders fulfilled by this reseller
  const resellerOrders = (orders || []).filter(o => {
    if (!userProfile) return false;
    const matchIdentity = orderBelongsToUser(o, userProfile);
    const matchCode = userProfile.resellerCode && (o.resellerCode === userProfile.resellerCode || o.paymentMethod?.includes(userProfile.resellerCode));
    const matchReseller = o.isResellerOrder || o.paymentMethod?.toLowerCase().includes('reseller');
    return (matchIdentity || matchCode) && matchReseller;
  });

  const completedResellerOrders = resellerOrders.filter(o => o.status === 'COMPLETED' || o.status === 'DELIVERED');
  const totalWholesaleTurnover = resellerOrders.reduce((sum, o) => sum + (o.priceLkr || 0), 0);
  // True saving is originalPrice - wholesalePrice (5% of the ORIGINAL catalog
  // price), not 5% of the already-discounted wholesale price (0.95P * 0.05 =
  // 0.0475P, undercounting every order's saving). originalPriceLkr is set at
  // dispatch time (below); fall back to reconstructing it from the wholesale
  // price for any order that predates that field.
  const totalWholesaleSavings = resellerOrders.reduce((sum, o) => {
    const wholesale = o.priceLkr || 0;
    const original = o.originalPriceLkr || (wholesale / 0.95);
    return sum + Math.round(Math.max(0, original - wholesale));
  }, 0);

  const handleCopyResellerId = () => {
    navigator.clipboard.writeText(resellerWalletId);
    setIsCopiedId(true);
    showToast('Reseller Wallet ID copied to clipboard!');
    setTimeout(() => setIsCopiedId(false), 2000);
  };

  const handleFulfillOrder = async (e) => {
    e.preventDefault();

    if (!customerUid.trim()) {
      showToast('Please enter the customer Player ID (UID)!', 'error');
      return;
    }

    if (currentGame.requiresServer && !customerZoneId.trim()) {
      showToast('Please enter the customer Zone / Server ID!', 'error');
      return;
    }

    if (!selectedPackage) {
      showToast('Please select a top-up package!', 'error');
      return;
    }

    // Guard: block dispatch for games that don't have moongoldProductId configured.
    // Without it, dispatchMoongoldOrder falls back to the MLBB product ID (215570)
    // which causes a server-side price mismatch rejection on every order.
    if (currentGame?.resellerDisabled) {
      showToast(`⚠️ ${currentGame.name} is not yet available for reseller dispatch. Please contact admin to enable it.`, 'error');
      return;
    }

    setIsFulfilling(true);

    // Live Database check for Reseller Wallet Balance before dispatching order.
    // This is only a fast UX pre-check — the server (deductUserWallet inside
    // /api/moogold order/create_order below) is the real, atomic gate; it
    // will reject the order if the balance has actually run out even if this
    // check passes on stale data.
    let availBalanceLkr = userProfile?.walletBalance || 0;
    const keyToQuery = userProfile?.securityKey || userProfile?.resellerCode || userProfile?.uid || userProfile?.email;
    if (keyToQuery) {
      try {
        const freshProfile = await getResellerProfileByKeyAsync(keyToQuery);
        if (freshProfile && freshProfile.walletBalance !== undefined) {
          availBalanceLkr = freshProfile.walletBalance;
        }
      } catch (err) {
        console.error('[Reseller Web Dispatch] Live Firestore balance query warning:', err);
      }
    }

    if (availBalanceLkr < currentWholesalePrice) {
      setIsFulfilling(false);
      showToast(`Insufficient Reseller Wallet Balance! Required: Rs. ${currentWholesalePrice.toLocaleString()} LKR. Available: Rs. ${availBalanceLkr.toLocaleString()} LKR. Please top up your wallet first!`, 'error');
      openWalletModal('ezcash');
      return;
    }

    // Real dispatch through the same secure /api/moogold proxy customer
    // top-ups use — the server atomically deducts the reseller's wallet
    // (using the wholesale priceLkr below, verified server-side against the
    // catalog price with a reseller-specific tolerance) and actually sends
    // the order to MooGold. The previous version of this flow never called
    // MooGold at all and never persisted the wallet deduction — it just
    // faked a delay and marked the order COMPLETED locally.
    const orderPayload = {
      game: currentGame,
      gameId: currentGame.id,
      playerId: customerUid.trim(),
      zoneId: customerZoneId.trim(),
      package: selectedPackage,
      priceLkr: currentWholesalePrice,
      ign: customerIgn.trim() || 'Reseller Customer',
      userId: userProfile?.uid || '',
      userEmail: userProfile?.email || '',
      userProfile,
      isResellerOrder: true
    };

    let moongoldResult;
    try {
      moongoldResult = await dispatchMoongoldOrder(orderPayload);
    } catch (err) {
      moongoldResult = { success: false, status: 'FAILED', message: err.message || 'Gateway connection error' };
    }

    if (!moongoldResult.success) {
      setIsFulfilling(false);
      if (moongoldResult.blocked) return;
      const failedOrder = {
        id: 'ORD-RS-' + Math.floor(10000 + Math.random() * 90000),
        userId: userProfile?.uid || 'usr-reseller',
        userEmail: userProfile?.email || 'reseller@madstopup.com',
        gameId: currentGame.id,
        gameName: currentGame.name,
        packageName: selectedPackage.name,
        amount: selectedPackage.amount || 1,
        playerId: customerUid.trim(),
        zoneId: customerZoneId.trim(),
        ign: customerIgn.trim() || 'Reseller Customer',
        paymentMethod: '👑 Reseller Partner Wallet',
        priceLkr: currentWholesalePrice,
        originalPriceLkr: selectedPackage.priceLkr,
        status: 'FAILED',
        isResellerOrder: true,
        moongoldRef: moongoldResult.moongoldRef || 'GATEWAY_FAILED',
        failureReason: moongoldResult.message || 'Provider dispatch failed',
        createdAt: new Date().toISOString()
      };
      addOrder(failedOrder);
      showToast(`❌ Dispatch Failed: ${moongoldResult.message || 'Provider error'}.`, 'error');
      return;
    }

    // Sync local profile with the exact server-deducted balance (prevents
    // double deduction — never compute the new balance client-side here).
    if (moongoldResult?.newBalanceLkr !== undefined) {
      setUserProfile(prev => ({
        ...prev,
        walletBalance: moongoldResult.newBalanceLkr,
        walletUsdt: moongoldResult.newBalanceUsdt !== undefined ? moongoldResult.newBalanceUsdt : prev.walletUsdt
      }));
    }

    const newOrder = {
      id: 'ORD-RS-' + Math.floor(10000 + Math.random() * 90000),
      userId: userProfile?.uid || 'usr-reseller',
      userEmail: userProfile?.email || 'reseller@madstopup.com',
      gameId: currentGame.id,
      gameName: currentGame.name,
      packageName: selectedPackage.name,
      amount: selectedPackage.amount || 1,
      playerId: customerUid.trim(),
      zoneId: customerZoneId.trim(),
      ign: customerIgn.trim() || 'Reseller Customer',
      paymentMethod: '👑 Reseller Partner Wallet',
      priceLkr: currentWholesalePrice,
      originalPriceLkr: selectedPackage.priceLkr,
      status: 'COMPLETED',
      isResellerOrder: true,
      moongoldRef: moongoldResult.moongoldRef,
      partnerOrderId: moongoldResult.partnerOrderId || null,
      createdAt: new Date().toISOString()
    };

    addOrder(newOrder);

    setIsFulfilling(false);
    showToast(`⚡ TOPUP DISPATCHED! ${selectedPackage.name} sent to UID: ${customerUid.trim()}`);

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6']
      });
    } catch (err) {}

    setCustomerUid('');
    setCustomerZoneId('');
    setCustomerIgn('');
  };

  const handleSaveStoreProfile = async (e) => {
    e.preventDefault();
    setUserProfile(prev => ({
      ...prev,
      storeName,
      phone: whatsappContact,
      email: storeEmail
    }));
    // Bug 6: Persist to Firestore so settings survive page refresh
    if (userProfile?.uid) {
      try {
        await updateUserProfileInFirestore(userProfile.uid, { storeName, phone: whatsappContact, email: storeEmail });
      } catch (err) {
        console.warn('[ResellerDashboard] Store profile DB save note:', err);
      }
    }
    showToast('Reseller Store profile saved successfully!');
  };

  // ── Shared style tokens ──
  const inputCls = 'w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:border-[#cc040a] focus:ring-4 focus:ring-[#cc040a]/10 transition-all';
  const labelCls = 'block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2';
  const btnRed = 'bg-[#cc040a] hover:bg-[#b00308] text-white font-black rounded-xl transition-all shadow-lg shadow-red-600/25 cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed';
  const panelCls = 'bg-white rounded-3xl p-5 sm:p-8 border-2 border-slate-200 shadow-sm space-y-6 animate-in fade-in';

  const stepHead = (n, text) => (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="w-6 h-6 rounded-full bg-[#cc040a] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-sm shadow-red-600/30">{n}</span>
      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{text}</span>
    </div>
  );

  const panelHead = (icon, title, subtitle, right) => {
    const Icon = icon;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[#cc040a] text-white flex items-center justify-center shadow-md shadow-red-600/25 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-black font-heading text-slate-900 leading-tight">{title}</h3>
            <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
          </div>
        </div>
        {right}
      </div>
    );
  };

  const kpis = [
    { icon: Wallet, label: 'Available Reseller Balance', value: `LKR ${(userProfile?.walletBalance || 0).toLocaleString()}`, sub: `${(userProfile?.walletUsdt || 0).toFixed(2)} USDT Available`, valueCls: 'text-emerald-600' },
    { icon: ShoppingBag, label: 'Orders Fulfilled', value: `${completedResellerOrders.length} Orders`, sub: 'Automated Instant Delivery', valueCls: 'text-slate-900' },
    { icon: TrendingUp, label: 'Wholesale Sales Turnover', value: `LKR ${totalWholesaleTurnover.toLocaleString()}`, sub: 'Customer Top-Up Sales Volume', valueCls: 'text-[#cc040a]' },
    { icon: Award, label: 'Total Wholesale Savings', value: `LKR ${totalWholesaleSavings.toLocaleString()}`, sub: 'Saved via 5% Reseller Margin', valueCls: 'text-violet-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 pt-6 font-sans">

      {/* Top Header Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={closeResellerDashboard}
              className="px-4 py-2 bg-white hover:text-[#cc040a] hover:border-[#cc040a]/40 border border-slate-200 text-slate-600 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Store</span>
            </button>

            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ef1c25] to-[#990207] flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
                <Crown className="w-5 h-5 fill-amber-300 text-amber-300" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-black font-heading tracking-tight text-slate-900 flex items-center gap-2 flex-wrap">
                  <span className="truncate">{storeName}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#cc040a] text-white text-[10px] font-mono font-bold uppercase">
                    PARTNER
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium truncate">MADS Reseller Wholesale Control Panel & Instant Dispatch Desk</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => openWalletModal('ezcash')}
            className={`${btnRed} px-5 py-3 text-xs flex items-center justify-center gap-2 uppercase tracking-wider shrink-0`}
          >
            <Wallet className="w-4 h-4" />
            <span>Recharge Wallet</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* HERO RESELLER STORE BANNER */}
        <div className="relative rounded-3xl bg-white text-slate-900 border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ef1c25] via-[#cc040a] to-[#990207]"></div>
          <div className="absolute -top-24 -right-16 w-96 h-96 rounded-full bg-red-50 pointer-events-none"></div>
          <div className="absolute -bottom-28 -left-16 w-80 h-80 rounded-full bg-red-50/70 pointer-events-none"></div>
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #cc040a 1px, transparent 1px)', backgroundSize: '22px 22px' }}></div>

          <div className="relative z-10 p-6 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 lg:max-w-xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-100 text-[#cc040a] text-xs font-mono font-black uppercase tracking-widest">
                <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>Verified Reseller Partner Tier</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black font-heading tracking-tight leading-[1.1]">
                Reseller Partner Wholesale Dashboard
              </h2>

              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                Enjoy 5% wholesale discount across all Free Fire, PUBG, Mobile Legends & Garena Shell top-ups. Fulfill customer orders instantly via Website or Telegram Bot!
              </p>

              <div className="inline-flex items-center gap-2 text-[11px] font-black font-mono bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                5% WHOLESALE MARGIN ACTIVE
              </div>
            </div>

            {/* Reseller Wallet ID & Security Key Card */}
            <div className="bg-slate-50 text-slate-900 rounded-2xl p-5 w-full lg:w-[320px] border-2 border-slate-200 shrink-0 space-y-4">
              <div>
                <span className="text-[10px] text-slate-400 font-mono font-black uppercase tracking-wider block mb-1.5">
                  Your Unique Reseller Code
                </span>
                <div className="flex items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border-2 border-slate-200">
                  <span className="font-mono text-sm font-black text-[#cc040a] tracking-wider truncate">{resellerWalletId}</span>
                  <button
                    onClick={handleCopyResellerId}
                    className="p-1.5 rounded-lg bg-[#cc040a] hover:bg-[#b00308] text-white transition-colors cursor-pointer shrink-0"
                    title="Copy Reseller Code"
                  >
                    {isCopiedId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-mono font-black uppercase tracking-wider block mb-1.5">
                  Telegram Bot Security Key
                </span>
                <div className="flex items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border-2 border-slate-200">
                  <span className="font-mono text-xs font-black text-slate-800 tracking-wider truncate">{resellerSecurityKey}</span>
                  <button
                    onClick={handleCopySecurityKey}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white transition-colors cursor-pointer shrink-0"
                    title="Copy Security Key"
                  >
                    {isCopiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 KPI METRIC STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ icon: Icon, label, value, sub, valueCls }) => (
            <div key={label} className="relative bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden hover:-translate-y-0.5 hover:shadow-lg hover:border-[#cc040a]/30 transition-all">
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#cc040a]/5 pointer-events-none" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">{label}</span>
                  <h3 className={`text-2xl font-black font-heading mt-1.5 truncate ${valueCls}`}>{value}</h3>
                  <span className="text-[11px] text-slate-500 font-medium block mt-1">{sub}</span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-red-50 text-[#cc040a] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="bg-white p-2 rounded-2xl border-2 border-slate-200 flex items-center gap-2 overflow-x-auto text-xs font-black shadow-sm">
          {[
            { id: 'dispatch', label: 'Instant Topup Dispatch', icon: Zap },
            { id: 'orders', label: 'Order History', icon: ShoppingBag, count: resellerOrders.length },
            { id: 'pricing', label: 'Wholesale Price Catalog', icon: Award },
            { id: 'bot', label: 'Telegram Bot Connector', icon: Send },
            { id: 'settings', label: 'Store Settings', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/25 font-black'
                    : 'text-slate-500 hover:text-[#cc040a] hover:bg-red-50 font-bold'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${isActive ? 'bg-white/25 text-white' : 'bg-red-50 text-[#cc040a]'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: INSTANT RESELLER TOPUP DISPATCH TOOL */}
        {activeTab === 'dispatch' && (
          <div className={panelCls}>
            {panelHead(Zap, 'Instant Customer Top-Up Dispatch Tool', 'Select game, enter customer UID, choose package and fulfill instantly using your Reseller Wallet',
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-mono font-black self-start sm:self-center">
                WHOLESALE 5% DISCOUNT AUTO-APPLIED
              </span>
            )}

            <form onSubmit={handleFulfillOrder} className="space-y-7">

              {/* 1. Game Selection Cards */}
              <div>
                {stepHead(1, 'Select Game')}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(gamesCatalog || GAMES_DATA).map((game) => {
                    const on = selectedGameId === game.id;
                    return (
                      <button
                        key={game.id}
                        type="button"
                        onClick={() => {
                          setSelectedGameId(game.id);
                          setSelectedPackageId(game.packages[0]?.id || '');
                        }}
                        className={`relative p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer text-left ${
                          on
                            ? 'border-[#cc040a] bg-red-50/60 shadow-md shadow-red-600/10'
                            : 'border-slate-200 bg-white hover:border-[#cc040a]/40'
                        }`}
                      >
                        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {game.logo || game.banner || game.image ? (
                            <img
                              src={game.logo || game.banner || game.image}
                              alt={game.name}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/mads-logo.jpg';
                              }}
                            />
                          ) : (
                            <span className="text-xl flex items-center justify-center h-full">{game.currencyIcon || '🎮'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-900 font-heading truncate">{game.name}</h4>
                          <span className="text-[10px] text-slate-500 font-medium block truncate">{game.currencyName}</span>
                        </div>
                        {on && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#cc040a] flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Customer Credentials */}
              <div>
                {stepHead(2, 'Customer Details')}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Customer Player ID (UID) *</label>
                    <input
                      type="text"
                      required
                      placeholder={currentGame.idPlaceholder || "e.g. 248901234"}
                      value={customerUid}
                      onChange={(e) => setCustomerUid(e.target.value)}
                      className={inputCls + ' font-mono'}
                    />
                  </div>

                  {currentGame.requiresServer && (
                    <div>
                      <label className={labelCls}>Zone / Server ID *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 9821"
                        value={customerZoneId}
                        onChange={(e) => setCustomerZoneId(e.target.value)}
                        className={inputCls + ' font-mono'}
                      />
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>Customer In-Game Name (IGN)</label>
                    <input
                      type="text"
                      placeholder="e.g. GamerLanka"
                      value={customerIgn}
                      onChange={(e) => setCustomerIgn(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Select Topup Package */}
              <div>
                {stepHead(3, `Select ${currentGame.currencyName} Package`)}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {currentGame.packages.map((pkg) => {
                    const isSelected = selectedPackageId === pkg.id || (!selectedPackageId && pkg === currentGame.packages[0]);
                    const wholesalePrice = calculateWholesalePrice(pkg.priceLkr);

                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`relative p-4 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#cc040a] bg-red-50/60 shadow-md shadow-red-600/10'
                            : 'border-slate-200 bg-white hover:border-[#cc040a]/40'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#cc040a] flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </span>
                        )}
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 font-heading">{pkg.name}</h4>
                          <span className="text-[10px] text-slate-500 block mt-0.5">{pkg.bonus || 'Instant Delivery'}</span>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <span className="text-sm font-black text-[#cc040a] font-heading block">
                            Rs. {wholesalePrice.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 line-through block font-mono">
                            Rs. {pkg.priceLkr.toLocaleString()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Order Summary & Dispatch Submit Button */}
              <div className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono font-black uppercase tracking-wider block">Charged to Reseller Wallet</span>
                  <div className="flex items-center flex-wrap gap-3 mt-1">
                    <h3 className="text-2xl sm:text-3xl font-black text-[#cc040a] font-heading">
                      Rs. {currentWholesalePrice.toLocaleString()} LKR
                    </h3>
                    <span className="text-xs text-emerald-700 font-mono font-black bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      Save Rs. {currentSavings.toLocaleString()} (5% OFF)
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isFulfilling}
                  className={`${btnRed} w-full sm:w-auto px-8 py-4 text-xs sm:text-sm tracking-widest uppercase rounded-2xl flex items-center justify-center gap-2`}
                >
                  <span>{isFulfilling ? 'Fulfilling Topup...' : '⚡ DISPATCH TOPUP NOW'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          </div>
        )}

        {/* TAB 2: RESELLER ORDER HISTORY LOG */}
        {activeTab === 'orders' && (
          <div className={panelCls}>
            {panelHead(ShoppingBag, 'Reseller Order History', 'Complete log of customer orders fulfilled via your Reseller Wallet & Telegram Bot',
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <select
                  value={orderChannelFilter}
                  onChange={(e) => setOrderChannelFilter(e.target.value)}
                  className="px-3.5 py-2.5 bg-white border-2 border-slate-200 focus:border-[#cc040a] focus:outline-none rounded-xl text-slate-900 text-xs font-bold cursor-pointer"
                >
                  <option value="ALL">All Channels</option>
                  <option value="TELEGRAM">🤖 Telegram Bot Orders</option>
                  <option value="WEB">🌐 Web Dispatch Orders</option>
                </select>

                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search order ID or Player UID..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-slate-900 text-xs font-bold placeholder:font-medium focus:outline-none focus:border-[#cc040a]"
                  />
                </div>
              </div>
            )}

            {/* Orders Table */}
            <div className="space-y-3">
              {(() => {
                const filteredOrders = resellerOrders.filter(o => {
                  if (!o) return false;
                  const isTelegramOrder = Boolean(o.viaTelegramBot || (o.id && String(o.id).startsWith('ORD-TG-')) || o.channel === 'Telegram Bot' || (o.paymentMethod && String(o.paymentMethod).toLowerCase().includes('telegram')));

                  const search = (orderSearch || '').toLowerCase();
                  const oId = String(o.id || '').toLowerCase();
                  const oPlayerId = String(o.playerId || '').toLowerCase();
                  const oGameName = String(o.gameName || '').toLowerCase();

                  const matchesSearch =
                    oId.includes(search) ||
                    oPlayerId.includes(search) ||
                    oGameName.includes(search);

                  const matchesChannel = orderChannelFilter === 'ALL' ||
                    (orderChannelFilter === 'TELEGRAM' && isTelegramOrder) ||
                    (orderChannelFilter === 'WEB' && !isTelegramOrder);

                  return matchesSearch && matchesChannel;
                });

                // Bug 9: Empty state when no orders
                if (filteredOrders.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-14 text-center space-y-3 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-slate-300" />
                      </div>
                      <h4 className="text-sm font-black text-slate-600">
                        {orderSearch || orderChannelFilter !== 'ALL' ? 'No orders match your filter' : 'No orders yet'}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium max-w-xs">
                        {orderSearch || orderChannelFilter !== 'ALL'
                          ? 'Try adjusting your search or channel filter.'
                          : 'Your dispatched customer top-ups will appear here. Use the Instant Dispatch tab to fulfill your first order!'}
                      </p>
                    </div>
                  );
                }

                return filteredOrders.map((ord) => {
                  const isTelegramOrder = Boolean(ord.viaTelegramBot || (ord.id && ord.id.startsWith('ORD-TG-')) || ord.channel === 'Telegram Bot' || (ord.paymentMethod && ord.paymentMethod.toLowerCase().includes('telegram')));
                  const done = ord.status === 'COMPLETED';

                  return (
                    <div key={ord.id} className={`bg-white p-4 rounded-2xl border-2 border-slate-200 border-l-4 ${done ? 'border-l-emerald-500' : 'border-l-amber-400'} flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:shadow-md hover:border-[#cc040a]/30 transition-all`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-extrabold shrink-0 ${
                          isTelegramOrder ? 'bg-sky-50 text-sky-600' : 'bg-red-50 text-[#cc040a]'
                        }`}>
                          {isTelegramOrder ? <Send className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-black text-slate-900 font-heading text-sm">{ord.gameName} - {ord.packageName}</h4>
                            <span className="text-[10px] font-mono text-slate-400">({ord.id})</span>
                            {isTelegramOrder ? (
                              <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[9px] font-black font-mono inline-flex items-center gap-1">
                                <Send className="w-2.5 h-2.5" />
                                <span>🤖 Telegram Bot</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-red-50 text-[#cc040a] border border-red-100 text-[9px] font-black font-mono inline-flex items-center gap-1">
                                <Globe className="w-2.5 h-2.5" />
                                <span>🌐 Web Dispatch</span>
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5 font-medium break-words">
                            Customer UID: <span className="text-slate-900 font-mono font-bold">{ord.playerId}</span> {ord.zoneId ? `(Zone: ${ord.zoneId})` : ''} {ord.ign && ord.ign !== 'Reseller Customer' ? `• IGN: ${ord.ign}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <span className="font-black text-[#cc040a] text-base font-heading block">Rs. {(ord.priceLkr || 0).toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{new Date(ord.createdAt).toLocaleString()}</span>
                        </div>

                        <span className={`px-3 py-1 rounded-full text-[10px] font-black font-mono uppercase border ${
                          done ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {ord.status || 'COMPLETED'}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* TAB 3: WHOLESALE PRICE CATALOG & PROFIT MARGIN VIEWER */}
        {activeTab === 'pricing' && (
          <div className={panelCls}>
            {panelHead(Award, 'Reseller Wholesale Price Catalog', 'Compare standard retail prices with your 5% wholesale partner prices & calculated profit margins')}

            <div className="space-y-5">
              {GAMES_DATA.map((game) => (
                <div key={game.id} className="bg-slate-50 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <div className="w-11 h-11 rounded-xl bg-white p-1 border border-slate-200 shrink-0">
                      <img src={game.image} alt={game.name} className="w-full h-full object-cover rounded-lg" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900 font-heading">{game.name}</h4>
                      <span className="text-xs text-slate-500 font-medium">{game.packages.length} Packages Available</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    {game.packages.map((pkg) => {
                      const wholesalePrice = calculateWholesalePrice(pkg.priceLkr);
                      const profitMargin = pkg.priceLkr - wholesalePrice;

                      return (
                        <div key={pkg.id} className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-[#cc040a]/40 transition-colors flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h5 className="font-black text-slate-900">{pkg.name}</h5>
                            <span className="text-[10px] text-slate-400 font-medium">Retail: Rs. {pkg.priceLkr.toLocaleString()}</span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-black text-[#cc040a] block font-heading">Rs. {wholesalePrice.toLocaleString()}</span>
                            <span className="text-[10px] text-emerald-600 font-mono font-black block">Profit: +Rs. {profitMargin.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: TELEGRAM BOT CONNECTOR */}
        {activeTab === 'bot' && (
          <div className={panelCls}>
            {panelHead(Send, 'Telegram Reseller Bot Integration', 'Connect your Telegram account to execute topups inside Telegram chat 24/7',
              <a
                href="https://t.me/mads_shell_topup_bot"
                target="_blank"
                rel="noopener noreferrer"
                className={`${btnRed} px-4 py-3 text-xs flex items-center justify-center gap-2 uppercase tracking-wider shrink-0`}
              >
                <Send className="w-4 h-4" />
                <span>Launch Bot (@mads_shell_topup_bot)</span>
              </a>
            )}

            <div className="space-y-5">
              <div className="bg-slate-50 p-5 sm:p-6 rounded-2xl border-2 border-slate-200 space-y-4">
                {stepHead(1, 'Link Reseller Security Key to Telegram')}
                <p className="text-xs text-slate-600 font-medium">Copy your unique auth command below and send it to the Telegram Bot to link your wallet:</p>

                <div className="bg-white p-4 rounded-xl font-mono text-[#cc040a] font-black text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-slate-200">
                  <span className="break-all">/auth {resellerSecurityKey}</span>
                  <button
                    onClick={handleCopySecurityKey}
                    className={`${btnRed} px-4 py-2 text-xs font-sans rounded-lg flex items-center justify-center gap-1.5 shrink-0`}
                  >
                    {isCopiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Auth Key</span>
                  </button>
                </div>

                <div className="bg-white p-3 rounded-xl font-mono text-slate-700 font-bold text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-200">
                  <span className="break-all">Alternative Code: /link {resellerWalletId}</span>
                  <button
                    onClick={handleCopyResellerId}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-[#cc040a] hover:text-white text-slate-700 text-[11px] font-sans font-black rounded-lg cursor-pointer transition-colors shrink-0"
                  >
                    Copy Code
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-5 sm:p-6 rounded-2xl border-2 border-slate-200 space-y-4">
                {stepHead(2, 'Instant Topup Commands & Real IGN Lookup')}
                <p className="text-xs text-slate-600 font-medium">Send topup commands to Telegram Bot. Real IGN Name is fetched live from API and confirmed in the message:</p>

                <div className="space-y-2 text-xs font-mono">
                  {[
                    ['/topup ml 84218845 2168 86', 'Mobile Legends (86 Diamonds)', 'text-[#cc040a]'],
                    ['/topup ff 248901234 100', 'Free Fire (100 Diamonds)', 'text-[#cc040a]'],
                    ['/topup pubg 512345678 60', 'PUBG Mobile (60 UC)', 'text-[#cc040a]'],
                    ['/ml 84218845 2168', 'Check Real MLBB IGN Only', 'text-sky-600'],
                  ].map(([cmd, desc, cls]) => (
                    <div key={cmd} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
                      <span className={`${cls} font-black break-all`}>{cmd}</span>
                      <span className="text-slate-500 text-[11px] font-sans font-semibold">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STORE PROFILE SETTINGS */}
        {activeTab === 'settings' && (
          <div className={`${panelCls} max-w-2xl mx-auto`}>
            {panelHead(Settings, 'Reseller Store Profile Settings', 'Manage your Store Name and Business Contact details')}

            <form onSubmit={handleSaveStoreProfile} className="space-y-5 text-xs">
              <div>
                <label className={labelCls}>Store / Shop Name</label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className={inputCls + ' pl-11'}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>WhatsApp Contact Number</label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={whatsappContact}
                    onChange={(e) => setWhatsappContact(e.target.value)}
                    className={inputCls + ' pl-11'}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Store Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={storeEmail}
                    onChange={(e) => setStoreEmail(e.target.value)}
                    className={inputCls + ' pl-11'}
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`${btnRed} w-full py-4 text-xs uppercase tracking-wider mt-2`}
              >
                Save Store Profile
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
