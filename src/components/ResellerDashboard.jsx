import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import confetti from 'canvas-confetti';
import { 
  Crown, Wallet, Zap, Copy, Check, ArrowLeft, Send, ShieldCheck, 
  TrendingUp, ShoppingBag, DollarSign, Clock, RefreshCw, CheckCircle2, 
  Search, Filter, Smartphone, Ticket, Award, Store, Edit3, Settings, HelpCircle, ArrowRight
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
    creditUserWallet,
    openWalletModal
  } = useApp();

  const [activeTab, setActiveTab] = useState('dispatch'); // 'dispatch' | 'orders' | 'pricing' | 'bot' | 'settings'

  // Instant Topup Dispatch Form State
  const [selectedGameId, setSelectedGameId] = useState(GAMES_DATA[0]?.id || 'freefire');
  const [customerUid, setCustomerUid] = useState('');
  const [customerZoneId, setCustomerZoneId] = useState('');
  const [customerIgn, setCustomerIgn] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [isFulfilling, setIsFulfilling] = useState(false);

  // Search & Filter States
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [isCopiedId, setIsCopiedId] = useState(false);

  // Store Settings Form State
  const [storeName, setStoreName] = useState(userProfile?.storeName || `${userProfile?.name || 'Gamer'}'s TopUp Store`);
  const [whatsappContact, setWhatsappContact] = useState(userProfile?.phone || '');
  const [storeEmail, setStoreEmail] = useState(userProfile?.email || '');

  const resellerWalletId = `RS-${(userProfile?.uid || '882104').slice(-6).toUpperCase()}`;

  const currentGame = GAMES_DATA.find(g => g.id === selectedGameId) || GAMES_DATA[0];
  const selectedPackage = currentGame?.packages?.find(p => p.id === selectedPackageId) || currentGame?.packages?.[0];

  // Calculate Reseller Wholesale Price (5% discount)
  const calculateWholesalePrice = (priceLkr) => Math.round(priceLkr * 0.95);
  const currentWholesalePrice = selectedPackage ? calculateWholesalePrice(selectedPackage.priceLkr) : 0;
  const currentSavings = selectedPackage ? (selectedPackage.priceLkr - currentWholesalePrice) : 0;

  // Filter orders fulfilled by this reseller
  const resellerOrders = (orders || []).filter(o => {
    if (!userProfile) return false;
    const matchUid = userProfile.uid && o.userId === userProfile.uid;
    const matchEmail = userProfile.email && o.userEmail?.toLowerCase() === userProfile.email.toLowerCase();
    const matchReseller = o.isResellerOrder || o.paymentMethod?.toLowerCase().includes('reseller');
    return (matchUid || matchEmail) && matchReseller;
  });

  const completedResellerOrders = resellerOrders.filter(o => o.status === 'COMPLETED' || o.status === 'DELIVERED');
  const totalWholesaleTurnover = resellerOrders.reduce((sum, o) => sum + (o.priceLkr || 0), 0);
  const totalWholesaleSavings = resellerOrders.reduce((sum, o) => sum + Math.round((o.priceLkr || 0) * 0.05), 0);

  const handleCopyResellerId = () => {
    navigator.clipboard.writeText(resellerWalletId);
    setIsCopiedId(true);
    showToast('Reseller Wallet ID copied to clipboard!');
    setTimeout(() => setIsCopiedId(false), 2000);
  };

  const handleFulfillOrder = (e) => {
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

    const availBalanceLkr = userProfile?.walletBalance || 0;
    if (availBalanceLkr < currentWholesalePrice) {
      showToast(`Insufficient Reseller Wallet Balance! Required: Rs. ${currentWholesalePrice.toLocaleString()} LKR. Available: Rs. ${availBalanceLkr.toLocaleString()} LKR. Please top up your wallet first!`, 'error');
      openWalletModal('ezcash');
      return;
    }

    setIsFulfilling(true);

    setTimeout(() => {
      // Deduct Wholesale Price from Reseller Wallet
      creditUserWallet(-currentWholesalePrice, 0);

      // Create Order
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
    }, 1000);
  };

  const handleSaveStoreProfile = (e) => {
    e.preventDefault();
    setUserProfile(prev => ({
      ...prev,
      storeName,
      phone: whatsappContact,
      email: storeEmail
    }));
    showToast('Reseller Store profile saved successfully!');
  };

  return (
    <div className="min-h-screen bg-[#0d121d] text-white pb-20 pt-6 font-sans">
      
      {/* Top Header Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={closeResellerDashboard}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Store</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-white font-black shadow-lg shadow-red-600/30">
                <Crown className="w-5 h-5 fill-amber-300 text-amber-300" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black font-heading tracking-tight text-white flex items-center gap-2">
                  <span>{storeName}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold uppercase">
                    PARTNER
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-medium">MADS Reseller Wholesale Control Panel & Instant Dispatch Desk</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openWalletModal('ezcash')}
              className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Wallet className="w-4 h-4" />
              <span>Recharge Wallet</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* HERO RESELLER STORE BANNER */}
        <div className="bg-gradient-to-r from-[#111827] via-[#1e1b4b] to-[#111827] rounded-3xl p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden border border-amber-500/30">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold uppercase tracking-widest">
                <Crown className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                <span>VERIFIED RESELLER PARTNER TIER</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black font-heading tracking-tight text-white">
                Reseller Partner Wholesale Dashboard
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Enjoy 5% wholesale discount across all Free Fire, PUBG, Mobile Legends & Garena Shell top-ups. Fulfill customer orders instantly via Website or Telegram Bot!
              </p>
            </div>

            {/* Reseller Wallet ID Card */}
            <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-5 text-center min-w-[240px] shadow-xl shrink-0">
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-1">
                YOUR RESELLER WALLET ID
              </span>
              <div className="flex items-center justify-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
                <span className="font-mono text-base font-black text-amber-300 tracking-wider">{resellerWalletId}</span>
                <button
                  onClick={handleCopyResellerId}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Copy Reseller Wallet ID"
                >
                  {isCopiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold font-mono block mt-2">
                🟢 5% WHOLESALE MARGIN ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* 4 KPI METRIC STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800/90 shadow-md">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">
              AVAILABLE RESELLER BALANCE
            </span>
            <h3 className="text-2xl font-black text-emerald-400 font-heading mt-1">
              LKR {(userProfile?.walletBalance || 0).toLocaleString()}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium block mt-1">
              {(userProfile?.walletUsdt || 0).toFixed(2)} USDT Available
            </span>
          </div>

          <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800/90 shadow-md">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">
              ORDERS FULFILLED
            </span>
            <h3 className="text-2xl font-black text-white font-heading mt-1">
              {completedResellerOrders.length} Orders
            </h3>
            <span className="text-[11px] text-sky-400 font-medium block mt-1">
              Automated Instant Delivery
            </span>
          </div>

          <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800/90 shadow-md">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">
              WHOLESALE SALES TURNOVER
            </span>
            <h3 className="text-2xl font-black text-amber-400 font-heading mt-1">
              LKR {totalWholesaleTurnover.toLocaleString()}
            </h3>
            <span className="text-[11px] text-amber-500 font-medium block mt-1">
              Customer Top-Up Sales Volume
            </span>
          </div>

          <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800/90 shadow-md">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">
              TOTAL WHOLESALE SAVINGS
            </span>
            <h3 className="text-2xl font-black text-purple-400 font-heading mt-1">
              LKR {totalWholesaleSavings.toLocaleString()}
            </h3>
            <span className="text-[11px] text-purple-300 font-medium block mt-1">
              Saved via 5% Reseller Margin
            </span>
          </div>

        </div>

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="bg-[#111622] p-2 rounded-2xl border border-slate-800 flex items-center gap-2 overflow-x-auto text-xs font-black">
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
                className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/25 font-black'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800/80 font-bold'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-white text-[10px] font-mono">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: INSTANT RESELLER TOPUP DISPATCH TOOL */}
        {activeTab === 'dispatch' && (
          <div className="bg-[#111622] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-black font-heading text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span>Instant Customer Top-Up Dispatch Tool</span>
                </h3>
                <p className="text-xs text-slate-400">Select game, enter customer UID, choose package and fulfill instantly using your Reseller Wallet</p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-mono font-bold">
                WHOLESALE 5% DISCOUNT AUTO-APPLIED
              </span>
            </div>

            <form onSubmit={handleFulfillOrder} className="space-y-6">
              
              {/* 1. Game Selection Cards */}
              <div>
                <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-3 font-mono">
                  1. Select Game
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {GAMES_DATA.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => {
                        setSelectedGameId(game.id);
                        setSelectedPackageId(game.packages[0]?.id || '');
                      }}
                      className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                        selectedGameId === game.id
                          ? 'border-red-500 bg-red-950/40 text-white shadow-md shadow-red-950/50 ring-2 ring-red-500/30'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-900 p-1 border border-slate-800 overflow-hidden shrink-0">
                        <img src={game.image} alt={game.name} className="w-full h-full object-cover rounded-lg" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white font-heading">{game.name}</h4>
                        <span className="text-[10px] text-slate-400 font-medium block">{game.currencyName}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Customer Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                    Customer Player ID (UID) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={currentGame.idPlaceholder || "e.g. 248901234"}
                    value={customerUid}
                    onChange={(e) => setCustomerUid(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-red-500 shadow-inner"
                  />
                </div>

                {currentGame.requiresServer && (
                  <div>
                    <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                      Zone / Server ID *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9821"
                      value={customerZoneId}
                      onChange={(e) => setCustomerZoneId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-red-500 shadow-inner"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                    Customer In-Game Name (IGN)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GamerLanka"
                    value={customerIgn}
                    onChange={(e) => setCustomerIgn(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-red-500 shadow-inner"
                  />
                </div>
              </div>

              {/* 3. Select Topup Package */}
              <div>
                <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-3 font-mono">
                  3. Select {currentGame.currencyName} Package
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {currentGame.packages.map((pkg) => {
                    const isSelected = selectedPackageId === pkg.id || (!selectedPackageId && pkg === currentGame.packages[0]);
                    const wholesalePrice = calculateWholesalePrice(pkg.priceLkr);

                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`p-4 rounded-2xl border text-center transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-red-500 bg-red-950/40 ring-2 ring-red-500/30'
                            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-white font-heading">{pkg.name}</h4>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{pkg.bonus || 'Instant Delivery'}</span>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800">
                          <span className="text-sm font-black text-emerald-400 font-heading block">
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
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block">CHARGED TO RESELLER WALLET</span>
                  <div className="flex items-center gap-3 mt-1">
                    <h3 className="text-2xl font-black text-emerald-400 font-heading">
                      Rs. {currentWholesalePrice.toLocaleString()} LKR
                    </h3>
                    <span className="text-xs text-amber-300 font-mono font-bold bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                      Save Rs. {currentSavings.toLocaleString()} (5% OFF)
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isFulfilling}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm tracking-widest uppercase rounded-2xl transition-all shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-60"
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
          <div className="bg-[#111622] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-black font-heading text-white">Reseller Order History</h3>
                <p className="text-xs text-slate-400">Complete log of customer orders fulfilled via your Reseller Wallet & Telegram Bot</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search order ID or Player UID..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Orders Table */}
            <div className="space-y-3">
              {resellerOrders
                .filter(o => {
                  return (
                    o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
                    o.playerId.toLowerCase().includes(orderSearch.toLowerCase()) ||
                    o.gameName.toLowerCase().includes(orderSearch.toLowerCase())
                  );
                })
                .map((ord) => (
                  <div key={ord.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold shrink-0">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-white">{ord.gameName} - {ord.packageName}</h4>
                          <span className="text-[10px] font-mono text-slate-400">({ord.id})</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          Customer UID: <span className="text-slate-200 font-mono font-bold">{ord.playerId}</span> {ord.zoneId ? `(Zone: ${ord.zoneId})` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="text-right">
                        <span className="font-black text-emerald-400 text-sm block">Rs. {ord.priceLkr.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{new Date(ord.createdAt).toLocaleString()}</span>
                      </div>

                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black font-mono uppercase">
                        COMPLETED
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 3: WHOLESALE PRICE CATALOG & PROFIT MARGIN VIEWER */}
        {activeTab === 'pricing' && (
          <div className="bg-[#111622] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6 animate-in fade-in">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-xl font-black font-heading text-white">Reseller Wholesale Price Catalog</h3>
              <p className="text-xs text-slate-400">Compare standard retail prices with your 5% wholesale partner prices & calculated profit margins</p>
            </div>

            <div className="space-y-6">
              {GAMES_DATA.map((game) => (
                <div key={game.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 p-1 border border-slate-800 shrink-0">
                      <img src={game.image} alt={game.name} className="w-full h-full object-cover rounded-lg" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white">{game.name}</h4>
                      <span className="text-xs text-slate-400">{game.packages.length} Packages Available</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    {game.packages.map((pkg) => {
                      const wholesalePrice = calculateWholesalePrice(pkg.priceLkr);
                      const profitMargin = pkg.priceLkr - wholesalePrice;

                      return (
                        <div key={pkg.id} className="bg-[#111622] p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                          <div>
                            <h5 className="font-bold text-white">{pkg.name}</h5>
                            <span className="text-[10px] text-slate-400">Retail: Rs. {pkg.priceLkr.toLocaleString()}</span>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-emerald-400 block">Rs. {wholesalePrice.toLocaleString()}</span>
                            <span className="text-[10px] text-amber-400 font-mono font-bold block">Profit: +Rs. {profitMargin}</span>
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
          <div className="bg-[#111622] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-extrabold shadow-lg">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black font-heading text-white">Telegram Reseller Bot Integration</h3>
                  <p className="text-xs text-slate-400">Connect your Telegram account to execute topups inside Telegram chat 24/7</p>
                </div>
              </div>

              <a
                href="https://t.me/mads_shell_topup_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all uppercase tracking-wider shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Launch Bot (@mads_shell_topup_bot)</span>
              </a>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-sm font-black text-white font-heading">Link Reseller Wallet to Telegram</h4>
              <p className="text-xs text-slate-300">Copy your link command below and send it to the Telegram Bot:</p>
              
              <div className="bg-[#111622] p-4 rounded-xl font-mono text-amber-300 font-black text-sm flex items-center justify-between border border-slate-800">
                <span>/link {resellerWalletId}</span>
                <button
                  onClick={handleCopyResellerId}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-sans font-extrabold rounded-lg cursor-pointer"
                >
                  Copy Command
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STORE PROFILE SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-[#111622] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6 animate-in fade-in max-w-2xl mx-auto">
            <div className="pb-4 border-b border-slate-800">
              <h3 className="text-xl font-black font-heading text-white">Reseller Store Profile Settings</h3>
              <p className="text-xs text-slate-400">Manage your Store Name and Business Contact details</p>
            </div>

            <form onSubmit={handleSaveStoreProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-extrabold mb-1.5 uppercase font-mono">
                  Store / Shop Name
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-red-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-extrabold mb-1.5 uppercase font-mono">
                  WhatsApp Contact Number
                </label>
                <input
                  type="text"
                  required
                  value={whatsappContact}
                  onChange={(e) => setWhatsappContact(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-red-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-extrabold mb-1.5 uppercase font-mono">
                  Store Email Address
                </label>
                <input
                  type="email"
                  required
                  value={storeEmail}
                  onChange={(e) => setStoreEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold text-sm focus:outline-none focus:border-red-500 shadow-inner"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/30 cursor-pointer mt-2"
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
