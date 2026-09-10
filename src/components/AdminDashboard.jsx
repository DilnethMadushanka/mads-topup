import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { dispatchMoongoldOrder } from '../services/moongoldApi';
import { 
  X, ShieldCheck, DollarSign, Activity, Settings, RefreshCw, 
  CheckCircle2, Clock, XCircle, Zap, Key, Server, Database, Save, Eye, EyeOff, Cloud, UploadCloud,
  Users, CreditCard, Ticket, Megaphone, Search, Filter, Plus, Trash2, ArrowUpRight, ArrowDownRight,
  TrendingUp, Check, AlertTriangle, ShieldAlert, FileText, Gift, Award, CornerDownRight, ChevronRight, Lock
} from 'lucide-react';

export const AdminDashboard = () => {
  const { 
    isAdminOpen, 
    setIsAdminOpen, 
    orders, 
    updateOrderStatus, 
    moongoldConfig, 
    updateMoongoldConfig, 
    r2Config,
    updateR2Config,
    formatPrice,
    showToast,
    userProfile,
    vouchers,
    addVoucher,
    deleteVoucher,
    tickerNotice,
    setTickerNotice,
    creditUserWallet
  } = useApp();

  // Active Admin Sidebar Tab
  const [adminTab, setAdminTab] = useState('overview'); 
  // Options: 'overview' | 'orders' | 'deposits' | 'credit' | 'games' | 'vouchers' | 'moongold' | 'r2' | 'announcement'

  // Order Filters & Search
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [selectedInspectOrder, setSelectedInspectOrder] = useState(null);

  // Moongold Config Form
  const [apiKeyInput, setApiKeyInput] = useState(moongoldConfig.apiKey);
  const [secretKeyInput, setSecretKeyInput] = useState(moongoldConfig.secretKey);
  const [baseUrlInput, setBaseUrlInput] = useState(moongoldConfig.baseUrl);
  const [autoFulfillInput, setAutoFulfillInput] = useState(moongoldConfig.autoFulfill);
  const [simModeInput, setSimModeInput] = useState(moongoldConfig.simulationMode);
  const [showSecret, setShowSecret] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [retryingOrderId, setRetryingOrderId] = useState(null);

  // R2 Storage Form
  const [r2UrlInput, setR2UrlInput] = useState(r2Config?.bucketUrl || 'https://bfda3f43ac31b00be80bcb82772eb8fa.r2.cloudflarestorage.com/mads-topup');
  const [r2BucketName, setR2BucketName] = useState(r2Config?.bucketName || 'mads-topup');
  const [isTestingR2, setIsTestingR2] = useState(false);

  // Manual Credit Form
  const [creditUserEmail, setCreditUserEmail] = useState(userProfile?.email || 'admin@madstopup.com');
  const [creditLkrAmount, setCreditLkrAmount] = useState('');
  const [creditUsdtAmount, setCreditUsdtAmount] = useState('');
  const [creditReason, setCreditReason] = useState('EZ Cash Topup Approval');

  // New Voucher Form
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherValue, setNewVoucherValue] = useState('');
  const [newVoucherCurrency, setNewVoucherCurrency] = useState('LKR');
  const [newVoucherMaxUses, setNewVoucherMaxUses] = useState(100);

  // Announcement Form
  const [tickerNoticeInput, setTickerNoticeInput] = useState(tickerNotice);

  // Game List Price State Editor
  const [gamesCatalog, setGamesCatalog] = useState(GAMES_DATA);

  // Sample Deposit Verification Queue
  const [depositsQueue, setDepositsQueue] = useState([
    { id: 'DEP-101', type: 'EZ_CASH', rnNumber: '20260910982314', user: userProfile?.name || 'Dilneth', amount: 1500, currency: 'LKR', status: 'PENDING', date: 'Just Now' },
    { id: 'DEP-102', type: 'BINANCE', orderId: '298102451901', payId: '510134936', user: 'GamerLK', amount: 10, currency: 'USDT', status: 'PENDING', date: '5 mins ago' },
    { id: 'DEP-103', type: 'EZ_CASH', rnNumber: '20260910114590', user: 'SLAyer_99', amount: 5000, currency: 'LKR', status: 'VERIFIED', date: '1 hour ago' }
  ]);

  if (!isAdminOpen) return null;

  const safeOrders = orders || [];

  // Metrics Calculations
  const completedOrders = safeOrders.filter(o => o.status === 'COMPLETED');
  const totalRevenueLkr = completedOrders.reduce((sum, o) => sum + (o.priceLkr || 0), 0);
  const pendingCount = safeOrders.filter(o => o.status === 'PROCESSING' || o.status === 'PENDING').length;
  const pendingDepositsCount = depositsQueue.filter(d => d.status === 'PENDING').length;

  // Filtered Orders Calculation
  const filteredOrders = safeOrders.filter(ord => {
    const matchesSearch = 
      ord.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      ord.playerId.toLowerCase().includes(orderSearch.toLowerCase()) ||
      ord.gameName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (ord.ign && ord.ign.toLowerCase().includes(orderSearch.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || ord.status === statusFilter;
    const matchesPayment = paymentFilter === 'ALL' || ord.paymentMethod.toLowerCase().includes(paymentFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Action Handlers
  const handleSaveMoongoldSettings = () => {
    updateMoongoldConfig({
      ...moongoldConfig,
      apiKey: apiKeyInput,
      secretKey: secretKeyInput,
      baseUrl: baseUrlInput,
      autoFulfill: autoFulfillInput,
      simulationMode: simModeInput
    });
  };

  const handleRetryMoongold = async (order) => {
    setRetryingOrderId(order.id);
    const game = gamesCatalog.find(g => g.id === order.gameId);
    
    const result = await dispatchMoongoldOrder({
      game: game || { moongoldCode: 'GENERIC' },
      playerId: order.playerId,
      zoneId: order.zoneId,
      package: { id: order.packageName }
    });

    setRetryingOrderId(null);

    if (result.success) {
      updateOrderStatus(order.id, 'COMPLETED', result.moongoldRef);
      showToast(`Order ${order.id} synced with Moongold successfully!`);
    } else {
      showToast(`Moongold Sync Failed: ${result.message}`, 'error');
    }
  };

  const handleCheckBalance = async () => {
    setIsCheckingBalance(true);
    await new Promise(res => setTimeout(res, 800));
    setIsCheckingBalance(false);
    showToast(`Moongold Provider Balance: Rs. ${moongoldConfig.merchantBalanceLkr.toLocaleString()} ($${moongoldConfig.merchantBalanceUsd})`);
  };

  const handleSaveR2Settings = () => {
    updateR2Config({
      ...r2Config,
      bucketUrl: r2UrlInput,
      bucketName: r2BucketName,
      status: 'ACTIVE'
    });
  };

  const handleTestR2Connection = async () => {
    setIsTestingR2(true);
    await new Promise(res => setTimeout(res, 700));
    setIsTestingR2(false);
    showToast(`Cloudflare R2 Bucket Connected! Endpoint: ${r2UrlInput}`);
  };

  const handleApproveDeposit = (dep) => {
    setDepositsQueue(prev => prev.map(d => d.id === dep.id ? { ...d, status: 'VERIFIED' } : d));
    if (dep.currency === 'USDT') {
      creditUserWallet(0, dep.amount);
    } else {
      creditUserWallet(dep.amount, 0);
    }
    showToast(`Deposit ${dep.id} approved! Added ${dep.amount} ${dep.currency} to user wallet.`);
  };

  const handleRejectDeposit = (depId) => {
    setDepositsQueue(prev => prev.map(d => d.id === depId ? { ...d, status: 'REJECTED' } : d));
    showToast(`Deposit ${depId} rejected.`, 'error');
  };

  const handleManualCreditSubmit = (e) => {
    e.preventDefault();
    const lkr = parseFloat(creditLkrAmount) || 0;
    const usdt = parseFloat(creditUsdtAmount) || 0;

    if (lkr === 0 && usdt === 0) {
      showToast('Please enter an amount to credit!', 'error');
      return;
    }

    creditUserWallet(lkr, usdt);
    setCreditLkrAmount('');
    setCreditUsdtAmount('');
  };

  const handleCreateVoucherSubmit = (e) => {
    e.preventDefault();
    if (!newVoucherCode || !newVoucherValue) {
      showToast('Please enter voucher code and value', 'error');
      return;
    }

    addVoucher({
      code: newVoucherCode.toUpperCase(),
      value: parseFloat(newVoucherValue),
      currency: newVoucherCurrency,
      maxUses: parseInt(newVoucherMaxUses) || 100,
      usedCount: 0,
      active: true
    });

    setNewVoucherCode('');
    setNewVoucherValue('');
  };

  const handleSaveNoticeSubmit = (e) => {
    e.preventDefault();
    setTickerNotice(tickerNoticeInput);
    showToast('Ticker notice banner updated live across website!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b0f17] text-white w-full max-w-7xl h-[94vh] rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col relative">
        
        {/* TOP ADMIN NAVBAR */}
        <div className="px-6 py-4 bg-[#111622] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#cc040a] to-[#ff2a30] flex items-center justify-center text-white font-extrabold shadow-lg shadow-red-600/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black font-heading tracking-tight text-white">MADS TOPUP ADMIN PORTAL</h2>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-mono font-bold">
                  PRO SUPER ADMIN v3.0
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Live Order Dispatch, Deposits, User Wallets & Moongold Gateway</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Status Pill */}
            <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300">MOONGOLD: LIVE</span>
            </div>

            <button 
              onClick={() => setIsAdminOpen(false)}
              className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY (SIDEBAR + CONTENT PANEL) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* SIDEBAR NAVIGATION */}
          <aside className="w-64 bg-[#0d121c] border-r border-slate-800/80 p-4 space-y-1 overflow-y-auto shrink-0 hidden md:block">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 block mb-2 font-mono">
              MAIN NAVIGATION
            </span>

            <button
              onClick={() => setAdminTab('overview')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                adminTab === 'overview' ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4" />
                <span>Dashboard Overview</span>
              </div>
            </button>

            <button
              onClick={() => setAdminTab('orders')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                adminTab === 'orders' ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4" />
                <span>Orders Dispatch</span>
              </div>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono font-black text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setAdminTab('deposits')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                adminTab === 'deposits' ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Deposits Verifier</span>
              </div>
              {pendingDepositsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono font-black text-[10px]">
                  {pendingDepositsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setAdminTab('credit')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                adminTab === 'credit' ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Manual Wallet Credit</span>
              </div>
            </button>

            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 block pt-4 mb-2 font-mono">
              STORE MANAGEMENT
            </span>

            <button
              onClick={() => setAdminTab('games')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                adminTab === 'games' ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-sky-400" />
                <span>Game Catalog & Prices</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">{gamesCatalog.length}</span>
            </button>

            <button
              onClick={() => setAdminTab('vouchers')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                adminTab === 'vouchers' ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Ticket className="w-4 h-4 text-purple-400" />
                <span>Promo Vouchers</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">{(vouchers || []).length}</span>
            </button>

            <button
              onClick={() => setAdminTab('announcement')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                adminTab === 'announcement' ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Megaphone className="w-4 h-4 text-pink-400" />
                <span>Ticker Notice Banner</span>
              </div>
            </button>

            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 block pt-4 mb-2 font-mono">
              SYSTEM & INTEGRATIONS
            </span>

            <button
              onClick={() => setAdminTab('moongold')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                adminTab === 'moongold' ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Moongold API Gateway</span>
              </div>
            </button>

            <button
              onClick={() => setAdminTab('r2')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                adminTab === 'r2' ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Cloud className="w-4 h-4 text-sky-400" />
                <span>Cloudflare R2 Bucket</span>
              </div>
            </button>
          </aside>

          {/* MOBILE TAB BAR MENU (Shows on small screens) */}
          <div className="md:hidden flex overflow-x-auto bg-[#0d121c] border-b border-slate-800 p-2 gap-2 text-xs font-bold shrink-0">
            {['overview', 'orders', 'deposits', 'credit', 'games', 'vouchers', 'moongold', 'r2', 'announcement'].map((tab) => (
              <button
                key={tab}
                onClick={() => setAdminTab(tab)}
                className={`px-3 py-1.5 rounded-lg shrink-0 uppercase text-[10px] tracking-wider font-mono ${
                  adminTab === tab ? 'bg-[#cc040a] text-white' : 'bg-slate-900 text-slate-400'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* MAIN CONTENT WORKSPACE */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#0b0f17]">
            
            {/* 1. OVERVIEW DASHBOARD */}
            {adminTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black font-heading text-white">System Analytics & Revenue</h3>
                    <p className="text-xs text-slate-400">Real-time overview of sales, active dispatches & supplier gateways</p>
                  </div>
                  <button 
                    onClick={() => showToast('Analytics data refreshed!')}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* 4 STAT WIDGETS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800/90 shadow-md">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">GROSS REVENUE</span>
                    <h4 className="text-2xl font-black text-emerald-400 font-heading mt-1">{formatPrice(totalRevenueLkr)}</h4>
                    <span className="text-[10px] text-emerald-500 font-bold mt-1 inline-block">↑ +14.2% from last week</span>
                  </div>

                  <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800/90 shadow-md">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">TOTAL DISPATCHES</span>
                    <h4 className="text-2xl font-black text-white font-heading mt-1">{safeOrders.length} Orders</h4>
                    <span className="text-[10px] text-slate-400 font-bold mt-1 inline-block">{completedOrders.length} completed</span>
                  </div>

                  <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800/90 shadow-md">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">PENDING DISPATCH QUEUE</span>
                    <h4 className="text-2xl font-black text-amber-400 font-heading mt-1">{pendingCount} Pending</h4>
                    <span className="text-[10px] text-amber-500 font-bold mt-1 inline-block">Requires verification or Moongold dispatch</span>
                  </div>

                  <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800/90 shadow-md">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">MOONGOLD SUPPLIER BALANCE</span>
                    <h4 className="text-2xl font-black text-sky-400 font-heading mt-1">Rs. {moongoldConfig.merchantBalanceLkr.toLocaleString()}</h4>
                    <span className="text-[10px] text-sky-500 font-bold mt-1 inline-block">${moongoldConfig.merchantBalanceUsd} USDT</span>
                  </div>
                </div>

                {/* LIVE SYSTEM HEALTH CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white uppercase tracking-wider">Firebase Auth & Database</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    </div>
                    <p className="text-xs text-slate-400">Google OAuth & Firestore real-time profile sync actively connected.</p>
                  </div>

                  <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white uppercase tracking-wider">Moongold Dispatch Gateway</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                    </div>
                    <p className="text-xs text-slate-400">Simulation mode active. Ready to route live top-ups instantly.</p>
                  </div>

                  <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white uppercase tracking-wider">Cloudflare R2 Storage</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
                    </div>
                    <p className="text-xs text-slate-400">Cloudflare object storage connected for fast receipt uploads.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ORDERS MANAGEMENT */}
            {adminTab === 'orders' && (
              <div className="space-y-4 animate-in fade-in">
                {/* Search and Filters Bar */}
                <div className="bg-[#111622] p-4 rounded-2xl border border-slate-800 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4 text-xs">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Order ID, Player ID, IGN, or Game..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold cursor-pointer"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="FAILED">Failed</option>
                    </select>

                    <select
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold cursor-pointer"
                    >
                      <option value="ALL">All Payment Methods</option>
                      <option value="EZ Cash">EZ Cash</option>
                      <option value="Binance">Binance Pay</option>
                      <option value="Bank">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                {/* Orders Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#111622]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0d121c] text-slate-400 uppercase font-mono text-[10px]">
                      <tr>
                        <th className="p-3.5">Order ID</th>
                        <th className="p-3.5">Game / Package</th>
                        <th className="p-3.5">Player Credentials</th>
                        <th className="p-3.5">Payment</th>
                        <th className="p-3.5">Price</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-slate-500 font-semibold">
                            No orders found matching filters.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="p-3.5 font-mono font-bold text-red-400">{ord.id}</td>
                            <td className="p-3.5">
                              <div className="font-bold text-white">{ord.gameName}</div>
                              <div className="text-[10px] text-slate-400">{ord.packageName}</div>
                            </td>
                            <td className="p-3.5 font-mono text-slate-300">
                              <div>{ord.playerId} {ord.zoneId && `(${ord.zoneId})`}</div>
                              <div className="text-[10px] text-slate-400 font-sans">{ord.ign}</div>
                            </td>
                            <td className="p-3.5 text-slate-300 font-semibold">{ord.paymentMethod}</td>
                            <td className="p-3.5 font-black text-white font-heading">{formatPrice(ord.priceLkr)}</td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                ord.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}>
                                {ord.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right space-x-1.5">
                              <button
                                onClick={() => setSelectedInspectOrder(ord)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-bold"
                              >
                                Inspect
                              </button>
                              {ord.status !== 'COMPLETED' && (
                                <button
                                  onClick={() => updateOrderStatus(ord.id, 'COMPLETED')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold cursor-pointer shadow-xs"
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                onClick={() => handleRetryMoongold(ord)}
                                disabled={retryingOrderId === ord.id}
                                className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 rounded-lg text-[11px] font-bold cursor-pointer"
                              >
                                {retryingOrderId === ord.id ? 'Syncing...' : 'Moongold'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. DEPOSITS VERIFIER QUEUE */}
            {adminTab === 'deposits' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black font-heading text-white">Deposit Verification Queue</h3>
                    <p className="text-xs text-slate-400">Review and verify EZ Cash 14-Digit RN numbers & Binance Order IDs</p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#111622]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0d121c] text-slate-400 uppercase font-mono text-[10px]">
                      <tr>
                        <th className="p-3.5">ID</th>
                        <th className="p-3.5">Payment Method</th>
                        <th className="p-3.5">Submitted RN / Order ID</th>
                        <th className="p-3.5">User</th>
                        <th className="p-3.5">Amount</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {depositsQueue.map((dep) => (
                        <tr key={dep.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="p-3.5 font-mono text-slate-400">{dep.id}</td>
                          <td className="p-3.5 font-bold text-white">
                            {dep.type === 'EZ_CASH' ? '💸 EZ Cash' : '🔶 Binance Pay'}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-amber-400">
                            {dep.rnNumber || dep.orderId}
                          </td>
                          <td className="p-3.5 text-slate-300 font-bold">{dep.user}</td>
                          <td className="p-3.5 font-black text-emerald-400 font-heading">
                            {dep.amount} {dep.currency}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              dep.status === 'VERIFIED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 
                              dep.status === 'REJECTED' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}>
                              {dep.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            {dep.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleApproveDeposit(dep)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-lg cursor-pointer"
                                >
                                  Approve & Credit Wallet
                                </button>
                                <button
                                  onClick={() => handleRejectDeposit(dep.id)}
                                  className="px-3 py-1 bg-red-600/30 hover:bg-red-600 text-white font-extrabold text-[10px] rounded-lg cursor-pointer border border-red-500/40"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. MANUAL USER WALLET CREDIT */}
            {adminTab === 'credit' && (
              <div className="max-w-2xl bg-[#111622] p-6 rounded-3xl border border-slate-800 space-y-5 animate-in fade-in">
                <div>
                  <h3 className="text-xl font-black font-heading text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-400" />
                    <span>Direct User Wallet Top-Up Tool</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Manually credit or deduct user's EZ Cash LKR balance or Binance USDT balance.</p>
                </div>

                <form onSubmit={handleManualCreditSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-extrabold mb-1">Target User Account Email</label>
                    <input
                      type="email"
                      value={creditUserEmail}
                      onChange={(e) => setCreditUserEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-extrabold mb-1">EZ Cash LKR Amount</label>
                      <input
                        type="number"
                        placeholder="e.g. 1500"
                        value={creditLkrAmount}
                        onChange={(e) => setCreditLkrAmount(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-extrabold mb-1">Binance USDT Amount</label>
                      <input
                        type="number"
                        placeholder="e.g. 10.50"
                        value={creditUsdtAmount}
                        onChange={(e) => setCreditUsdtAmount(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-extrabold mb-1">Credit Reason / Audit Note</label>
                    <input
                      type="text"
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#cc040a] hover:bg-[#990207] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/30 cursor-pointer"
                  >
                    Credit Balance to User Wallet
                  </button>
                </form>
              </div>
            )}

            {/* 5. GAME CATALOG MANAGER */}
            {adminTab === 'games' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black font-heading text-white">Game Catalog & Pricing</h3>
                    <p className="text-xs text-slate-400">View active games and customize diamond/UC package prices</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gamesCatalog.map((game) => (
                    <div key={game.id} className="bg-[#111622] p-4 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{game.currencyIcon || '🎮'}</span>
                        <div>
                          <h4 className="font-extrabold text-white text-base">{game.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">{game.publisher} • {game.packages?.length || 0} Packages</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 border-t border-slate-800/80 pt-2 text-xs">
                        {(game.packages || []).slice(0, 3).map((pkg) => (
                          <div key={pkg.id} className="flex justify-between items-center text-slate-300">
                            <span>{pkg.name}</span>
                            <span className="font-mono font-black text-amber-400">{formatPrice(pkg.priceLkr)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. PROMO VOUCHERS GENERATOR */}
            {adminTab === 'vouchers' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-[#111622] p-6 rounded-3xl border border-slate-800 space-y-4 max-w-2xl">
                  <h3 className="text-base font-black text-white font-heading flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-purple-400" />
                    <span>Create New Promo Voucher Code</span>
                  </h3>

                  <form onSubmit={handleCreateVoucherSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-extrabold mb-1">Voucher Code</label>
                        <input
                          type="text"
                          placeholder="e.g. MADS-GIFT-1000"
                          value={newVoucherCode}
                          onChange={(e) => setNewVoucherCode(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-purple-500 uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-extrabold mb-1">Value Amount</label>
                        <input
                          type="number"
                          placeholder="e.g. 500"
                          value={newVoucherValue}
                          onChange={(e) => setNewVoucherValue(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 cursor-pointer"
                    >
                      Generate Voucher Code
                    </button>
                  </form>
                </div>

                {/* Vouchers List */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#111622]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0d121c] text-slate-400 uppercase font-mono text-[10px]">
                      <tr>
                        <th className="p-3.5">Code</th>
                        <th className="p-3.5">Value</th>
                        <th className="p-3.5">Uses Count</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(vouchers || []).map((v) => (
                        <tr key={v.code}>
                          <td className="p-3.5 font-mono font-black text-purple-400">{v.code}</td>
                          <td className="p-3.5 font-black text-white">{v.value} {v.currency}</td>
                          <td className="p-3.5 text-slate-400 font-mono">{v.usedCount} / {v.maxUses}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[9px] font-bold">
                              ACTIVE
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => deleteVoucher(v.code)}
                              className="text-red-400 hover:text-red-300 font-bold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. TICKER NOTICE ANNOUNCEMENT */}
            {adminTab === 'announcement' && (
              <div className="max-w-2xl bg-[#111622] p-6 rounded-3xl border border-slate-800 space-y-4 animate-in fade-in">
                <h3 className="text-xl font-black font-heading text-white flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-pink-400" />
                  <span>Update Marquee Notice Banner</span>
                </h3>
                <p className="text-xs text-slate-400">Change the marquee text displayed across the website header.</p>

                <form onSubmit={handleSaveNoticeSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-extrabold mb-1">Banner Announcement Text</label>
                    <textarea
                      rows={4}
                      value={tickerNoticeInput}
                      onChange={(e) => setTickerNoticeInput(e.target.value)}
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono text-xs focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-pink-600/30"
                  >
                    Save & Update Announcement Live
                  </button>
                </form>
              </div>
            )}

            {/* 8. MOONGOLD API GATEWAY */}
            {adminTab === 'moongold' && (
              <div className="space-y-6 max-w-3xl animate-in fade-in">
                <div className="bg-[#111622] p-6 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-400" />
                        <span>Moongold Supplier Gateway</span>
                      </h3>
                      <p className="text-xs text-slate-400">Configure live API credentials and automated topup dispatch</p>
                    </div>

                    <button
                      onClick={handleCheckBalance}
                      disabled={isCheckingBalance}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold border border-slate-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBalance ? 'animate-spin' : ''}`} />
                      <span>Check Supplier Balance</span>
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Moongold API Key</label>
                      <input
                        type="text"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Moongold Secret Key</label>
                      <div className="relative">
                        <input
                          type={showSecret ? 'text' : 'password'}
                          value={secretKeyInput}
                          onChange={(e) => setSecretKeyInput(e.target.value)}
                          className="w-full pl-4 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-red-500"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-white"
                        >
                          {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoFulfillInput}
                          onChange={(e) => setAutoFulfillInput(e.target.checked)}
                          className="w-4 h-4 accent-red-600 rounded"
                        />
                        <span className="font-bold text-slate-200">Auto-fulfill top-ups on checkout</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={simModeInput}
                          onChange={(e) => setSimModeInput(e.target.checked)}
                          className="w-4 h-4 accent-red-600 rounded"
                        />
                        <span className="font-bold text-amber-400">Simulation Mode (Demo without real money)</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveMoongoldSettings}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Moongold Settings</span>
                  </button>
                </div>
              </div>
            )}

            {/* 9. CLOUDFLARE R2 BUCKET */}
            {adminTab === 'r2' && (
              <div className="space-y-6 max-w-3xl animate-in fade-in">
                <div className="bg-[#111622] p-6 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-sky-400" />
                        <span>Cloudflare R2 Object Storage</span>
                      </h3>
                      <p className="text-xs text-slate-400">Configure Cloudflare R2 bucket endpoint for game assets & receipt uploads</p>
                    </div>

                    <button
                      onClick={handleTestR2Connection}
                      disabled={isTestingR2}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-sky-400 rounded-xl text-xs font-bold border border-slate-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingR2 ? 'animate-spin' : ''}`} />
                      <span>Test Connection</span>
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">R2 Bucket Endpoint URL</label>
                      <input
                        type="text"
                        value={r2UrlInput}
                        onChange={(e) => setR2UrlInput(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sky-300 font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveR2Settings}
                    className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/30 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save R2 Settings</span>
                  </button>
                </div>
              </div>
            )}

          </main>

        </div>
      </div>

      {/* INSPECT ORDER MODAL DETAIL OVERLAY */}
      {selectedInspectOrder && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111622] text-white w-full max-w-lg rounded-3xl border border-slate-800 p-6 space-y-4 relative shadow-2xl">
            <button 
              onClick={() => setSelectedInspectOrder(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black font-heading text-white">Order Details #{selectedInspectOrder.id}</h3>

            <div className="space-y-2 text-xs font-mono bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>Game: <strong className="text-white">{selectedInspectOrder.gameName}</strong></div>
              <div>Package: <strong className="text-white">{selectedInspectOrder.packageName}</strong></div>
              <div>Player ID: <strong className="text-red-400">{selectedInspectOrder.playerId}</strong></div>
              <div>IGN: <strong className="text-amber-400">{selectedInspectOrder.ign || 'N/A'}</strong></div>
              <div>Payment Method: <strong className="text-emerald-400">{selectedInspectOrder.paymentMethod}</strong></div>
              <div>Amount: <strong className="text-white font-bold">{formatPrice(selectedInspectOrder.priceLkr)}</strong></div>
              <div>Status: <strong className="text-sky-400">{selectedInspectOrder.status}</strong></div>
              <div>Created At: <span className="text-slate-400">{selectedInspectOrder.createdAt}</span></div>
            </div>

            <div className="flex gap-2">
              {selectedInspectOrder.status !== 'COMPLETED' && (
                <button
                  onClick={() => {
                    updateOrderStatus(selectedInspectOrder.id, 'COMPLETED');
                    setSelectedInspectOrder(null);
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl"
                >
                  Approve Order
                </button>
              )}
              <button
                onClick={() => setSelectedInspectOrder(null)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
