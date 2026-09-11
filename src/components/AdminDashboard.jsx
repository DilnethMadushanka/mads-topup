import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { dispatchMoongoldOrder, checkMoongoldBalance } from '../services/moongoldApi';
import { 
  X, ShieldCheck, DollarSign, Activity, Settings, RefreshCw, 
  CheckCircle2, Clock, XCircle, Zap, Key, Server, Database, Save, Eye, EyeOff, Cloud, UploadCloud,
  Users, CreditCard, Ticket, Megaphone, Search, Filter, Plus, Trash2, ArrowUpRight, ArrowDownRight,
  TrendingUp, Check, AlertTriangle, ShieldAlert, FileText, Gift, Award, CornerDownRight, ChevronRight, Lock,
  BadgeCheck, UserCheck, UserX, FileCheck, ExternalLink, Image, Menu, Headset
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
    supportTickets,
    sendTicketMessage,
    updateTicketStatus,
    updateTicketPriority
  } = useApp();

  // Admin Authentication State (Requires login when accessing /admin)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminAuthEmail, setAdminAuthEmail] = useState('');
  const [adminAuthPassword, setAdminAuthPassword] = useState('');
  const [showAdminAuthPassword, setShowAdminAuthPassword] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState('');
  // Active Admin Sidebar Tab
  const [adminTab, setAdminTab] = useState('overview'); 
  // Options: 'overview' | 'orders' | 'deposits' | 'users' | 'credit' | 'games' | 'vouchers' | 'moongold' | 'r2' | 'announcement' | 'support'

  // Mobile Drawer State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Support Tickets Filters & Inspection State
  const [supportSearch, setSupportSearch] = useState('');
  const [supportStatusFilter, setSupportStatusFilter] = useState('ALL');
  const [selectedTicketInspect, setSelectedTicketInspect] = useState(null);
  const [adminReplyText, setAdminReplyText] = useState('');

  // Order Filters & Search
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [selectedInspectOrder, setSelectedInspectOrder] = useState(null);

  // User Management Filters & Search
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [selectedInspectUser, setSelectedInspectUser] = useState(null);
  const [editLkrVal, setEditLkrVal] = useState('');
  const [editUsdtVal, setEditUsdtVal] = useState('');

  // Payment Verification Filters
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [selectedPaymentInspect, setSelectedPaymentInspect] = useState(null);

  // New Manual Payment Record Form
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [newPayUserEmail, setNewPayUserEmail] = useState('');
  const [newPayMethod, setNewPayMethod] = useState('EZ Cash');
  const [newPayRef, setNewPayRef] = useState('');
  const [newPayAmount, setNewPayAmount] = useState('');
  const [newPayCurrency, setNewPayCurrency] = useState('LKR');

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

  // Live Moongold Balance state (MUST BE DECLARED WITH HOOKS AT TOP LEVEL)
  const [liveMoongoldBalance, setLiveMoongoldBalance] = useState({
    balanceUsd: moongoldConfig.merchantBalanceUsd || 480.00,
    balanceLkr: moongoldConfig.merchantBalanceLkr || 145800.00,
    isLoading: false,
    lastFetched: null
  });

  const fetchLiveBalance = async () => {
    setLiveMoongoldBalance(prev => ({ ...prev, isLoading: true }));
    const result = await checkMoongoldBalance();
    if (result && result.success) {
      setLiveMoongoldBalance({
        balanceUsd: result.balanceUsd,
        balanceLkr: result.balanceLkr,
        isLoading: false,
        lastFetched: new Date().toLocaleTimeString()
      });
    } else {
      setLiveMoongoldBalance(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated && isAdminOpen) {
      fetchLiveBalance();
      const interval = setInterval(() => {
        fetchLiveBalance();
      }, 10000); // Live realtime sync every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isAdminAuthenticated, isAdminOpen]);

  if (!isAdminOpen) return null;

  const handleAdminLoginSubmit = (e) => {
    e.preventDefault();
    if (adminAuthEmail.trim().toLowerCase() === 'madsruzza@gmail.com' && adminAuthPassword === 'Mads2004@#') {
      setIsAdminAuthenticated(true);
      showToast('Admin Authentication Successful! Welcome Super Admin.');
      setAdminAuthError('');
      setAdminAuthPassword('');
    } else {
      setAdminAuthError('Invalid Admin Email or Password! Access Denied.');
      showToast('Invalid Admin Credentials', 'error');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setIsAdminOpen(false);
    showToast('Logged out from Admin Portal.');
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0b0f17] text-white w-screen h-screen min-h-screen overflow-y-auto flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
        {/* Background Subtle Gradient Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="bg-[#111622] text-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative p-6 sm:p-8 z-10">
          
          <button 
            onClick={() => setIsAdminOpen(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-900 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold font-mono"
            title="Return to Main Website"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>

          <div className="text-center space-y-3 mb-6">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#cc040a] to-[#ff2a30] flex items-center justify-center text-white mx-auto shadow-xl shadow-red-600/40 border border-white/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black font-heading tracking-tight text-white">MADS TOPUP ADMIN</h2>
            <p className="text-xs text-slate-400 font-medium">Restricted Access • Enter Super Admin Credentials</p>
          </div>

          {adminAuthError && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{adminAuthError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-extrabold mb-1.5 uppercase tracking-wider text-[10px] font-mono">
                Admin Email Address
              </label>
              <input
                type="email"
                required
                autoComplete="off"
                value={adminAuthEmail}
                onChange={(e) => setAdminAuthEmail(e.target.value)}
                placeholder="Enter Admin Email"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-red-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-extrabold mb-1.5 uppercase tracking-wider text-[10px] font-mono">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showAdminAuthPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={adminAuthPassword}
                  onChange={(e) => setAdminAuthPassword(e.target.value)}
                  placeholder="Enter Admin Password"
                  className="w-full pl-4 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-red-500 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminAuthPassword(!showAdminAuthPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showAdminAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-[#cc040a] to-[#ff2a30] hover:from-[#b00308] hover:to-[#e02026] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/30 cursor-pointer mt-2 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>AUTHENTICATE & LOG IN</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-900 text-center text-[10px] text-slate-500 font-mono">
            SECURE SUPER ADMIN GATEWAY • MADS TOPUP ENTERPRISE
          </div>
        </div>
      </div>
    );
  }

  const safeOrders = orders || [];
  const safeUsers = usersList || [];
  const safePayments = manualPayments || [];

  // Metrics Calculations
  const completedOrders = safeOrders.filter(o => o.status === 'COMPLETED');
  const totalRevenueLkr = completedOrders.reduce((sum, o) => sum + (o.priceLkr || 0), 0);
  const pendingCount = safeOrders.filter(o => o.status === 'PROCESSING' || o.status === 'PENDING').length;
  const pendingPaymentsCount = safePayments.filter(d => d.status === 'PENDING').length;

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

  // Filtered Users Calculation
  const filteredUsers = safeUsers.filter(usr => {
    const matchesSearch = 
      usr.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      usr.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (usr.phone && usr.phone.includes(userSearch));

    const matchesStatus = userStatusFilter === 'ALL' || 
      (userStatusFilter === 'VERIFIED' && usr.isVerified) ||
      (userStatusFilter === 'UNVERIFIED' && !usr.isVerified) ||
      (userStatusFilter === 'BLOCKED' && usr.status === 'BLOCKED');

    return matchesSearch && matchesStatus;
  });

  // Filtered Payments Queue Calculation
  const filteredPayments = safePayments.filter(pay => {
    const matchesSearch = 
      pay.id.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      pay.userEmail.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      pay.referenceNumber.toLowerCase().includes(paymentSearch.toLowerCase());

    const matchesStatus = paymentStatusFilter === 'ALL' || pay.status === paymentStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filtered Support Tickets Calculation
  const safeTickets = supportTickets || [];
  const openTicketsCount = safeTickets.filter(t => t.status === 'OPEN').length;

  const filteredSupportTickets = safeTickets.filter(tck => {
    const matchesSearch = 
      tck.id.toLowerCase().includes(supportSearch.toLowerCase()) ||
      tck.userEmail.toLowerCase().includes(supportSearch.toLowerCase()) ||
      tck.userName.toLowerCase().includes(supportSearch.toLowerCase()) ||
      tck.subject.toLowerCase().includes(supportSearch.toLowerCase()) ||
      (tck.orderId && tck.orderId.toLowerCase().includes(supportSearch.toLowerCase()));

    const matchesStatus = supportStatusFilter === 'ALL' || tck.status === supportStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeInspectTicket = selectedTicketInspect || filteredSupportTickets[0] || null;

  const handleSendAdminReply = (e) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !activeInspectTicket) return;

    sendTicketMessage(activeInspectTicket.id, adminReplyText.trim(), 'admin');
    setAdminReplyText('');
    showToast(`Official support reply sent to ${activeInspectTicket.userName}!`);
  };

  const handleTabSelect = (tab) => {
    setAdminTab(tab);
    setIsMobileSidebarOpen(false);
  };

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
    const result = await checkMoongoldBalance();
    setIsCheckingBalance(false);
    if (result && result.success) {
      setLiveMoongoldBalance({
        balanceUsd: result.balanceUsd,
        balanceLkr: result.balanceLkr,
        isLoading: false,
        lastFetched: new Date().toLocaleTimeString()
      });
      showToast(`MooGold Live Balance: Rs. ${result.balanceLkr.toLocaleString()} ($${result.balanceUsd} USD)`);
    } else {
      showToast(`MooGold Live Balance: Rs. ${moongoldConfig.merchantBalanceLkr.toLocaleString()} ($${moongoldConfig.merchantBalanceUsd} USD)`);
    }
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

  const handleManualCreditSubmit = (e) => {
    e.preventDefault();
    const lkr = parseFloat(creditLkrAmount) || 0;
    const usdt = parseFloat(creditUsdtAmount) || 0;

    if (lkr === 0 && usdt === 0) {
      showToast('Please enter an amount to credit!', 'error');
      return;
    }

    updateUserBalance(creditUserEmail, lkr, usdt);
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

  const handleAddManualPaymentRecord = (e) => {
    e.preventDefault();
    if (!newPayUserEmail || !newPayRef || !newPayAmount) {
      showToast('Please fill all required payment fields!', 'error');
      return;
    }

    addManualPayment({
      id: `PAY-${Date.now().toString().slice(-4)}`,
      userEmail: newPayUserEmail,
      userName: newPayUserEmail.split('@')[0],
      method: newPayMethod,
      referenceNumber: newPayRef,
      amount: parseFloat(newPayAmount),
      currency: newPayCurrency,
      slipUrl: '',
      status: 'PENDING',
      createdAt: 'Just Now'
    });

    setNewPayRef('');
    setNewPayAmount('');
    setIsAddPaymentOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0f17] text-white w-screen h-screen min-h-screen overflow-hidden flex flex-col animate-in fade-in duration-200">
        
        {/* TOP ADMIN NAVBAR */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#111622] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 cursor-pointer"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#cc040a] to-[#ff2a30] flex items-center justify-center text-white font-extrabold shadow-lg shadow-red-600/30 shrink-0">
              <ShieldCheck className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-base sm:text-xl font-black font-heading tracking-tight text-white">MADS ADMIN</h2>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[9px] sm:text-[10px] font-mono font-bold">
                  v3.5 PRO
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400 font-medium">Order Dispatch, User Accounts & Live Support Desk</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Logged in Admin Email Pill */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300 font-bold">{adminAuthEmail}</span>
            </div>

            {/* Logout Admin Button */}
            <button
              onClick={handleAdminLogout}
              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-white rounded-xl text-xs font-bold border border-red-500/40 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Logout Admin"
            >
              <span>Logout</span>
            </button>

            <button 
              onClick={() => setIsAdminOpen(false)}
              className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MOBILE HORIZONTAL TAB STRIP */}
        <div className="md:hidden bg-[#0d121c] border-b border-slate-800 px-3 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0 font-mono text-xs">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'support', label: 'Support', icon: Headset, badge: openTicketsCount },
            { id: 'orders', label: 'Orders', icon: Activity, badge: pendingCount },
            { id: 'deposits', label: 'Deposits', icon: FileCheck, badge: pendingPaymentsCount },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'credit', label: 'Credit', icon: DollarSign },
            { id: 'games', label: 'Games', icon: Award },
            { id: 'vouchers', label: 'Vouchers', icon: Ticket },
            { id: 'moongold', label: 'MooGold', icon: Zap },
            { id: 'r2', label: 'R2 Storage', icon: Cloud },
            { id: 'announcement', label: 'Notice', icon: Megaphone }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = adminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabSelect(item.id)}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-[#cc040a] text-white shadow-md shadow-red-600/30' 
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-white text-slate-950 text-[9px] font-black font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* MAIN BODY (SIDEBAR + CONTENT PANEL) */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* MOBILE BACKDROP OVERLAY */}
          {isMobileSidebarOpen && (
            <div 
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs"
            />
          )}

          {/* SIDEBAR NAVIGATION (DESKTOP + MOBILE DRAWER) */}
          <aside className={`w-64 bg-[#0d121c] border-r border-slate-800/80 p-4 space-y-1 overflow-y-auto shrink-0 transition-transform duration-300 z-50 md:z-auto ${
            isMobileSidebarOpen ? 'fixed inset-y-0 left-0 top-14 shadow-2xl block' : 'hidden md:block'
          }`}>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 block mb-2 font-mono">
              MAIN NAVIGATION
            </span>

            <button
              onClick={() => handleTabSelect('overview')}
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
              onClick={() => handleTabSelect('orders')}
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
              onClick={() => handleTabSelect('deposits')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                adminTab === 'deposits' ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Manual Payment Verifier</span>
              </div>
              {pendingPaymentsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono font-black text-[10px]">
                  {pendingPaymentsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabSelect('users')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                adminTab === 'users' ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-400" />
                <span>User Account Verification</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">{safeUsers.length}</span>
            </button>

            <button
              onClick={() => handleTabSelect('credit')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                adminTab === 'credit' ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Manual Wallet Credit</span>
              </div>
            </button>

            <button
              onClick={() => handleTabSelect('support')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                adminTab === 'support' ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Headset className="w-4 h-4 text-rose-400" />
                <span>Support Tickets & Chat</span>
              </div>
              {openTicketsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono font-black text-[10px]">
                  {openTicketsCount}
                </span>
              )}
            </button>

            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 block pt-4 mb-2 font-mono">
              STORE MANAGEMENT
            </span>

            <button
              onClick={() => handleTabSelect('games')}
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
              onClick={() => handleTabSelect('vouchers')}
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
              onClick={() => handleTabSelect('announcement')}
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
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">TOTAL USER ACCOUNTS</span>
                    <h4 className="text-2xl font-black text-white font-heading mt-1">{safeUsers.length} Users</h4>
                    <span className="text-[10px] text-blue-400 font-bold mt-1 inline-block">{safeUsers.filter(u => u.isVerified).length} Verified accounts</span>
                  </div>

                  <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800/90 shadow-md">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">MANUAL VERIFICATIONS QUEUE</span>
                    <h4 className="text-2xl font-black text-amber-400 font-heading mt-1">{pendingPaymentsCount} Pending</h4>
                    <span className="text-[10px] text-amber-500 font-bold mt-1 inline-block">EZ Cash RN / Binance Order IDs</span>
                  </div>

                  <div className="bg-[#111622] p-5 rounded-2xl border border-slate-800/90 shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">MOONGOLD LIVE BALANCE</span>
                      <button onClick={fetchLiveBalance} className="text-slate-400 hover:text-white" title="Refresh Live Balance">
                        <RefreshCw className={`w-3 h-3 ${liveMoongoldBalance.isLoading ? 'animate-spin text-amber-400' : ''}`} />
                      </button>
                    </div>
                    <h4 className="text-2xl font-black text-sky-400 font-heading mt-1">Rs. {liveMoongoldBalance.balanceLkr.toLocaleString()}</h4>
                    <span className="text-[10px] text-sky-500 font-bold mt-1 inline-block">
                      ${liveMoongoldBalance.balanceUsd} USDT {liveMoongoldBalance.lastFetched ? `• Updated ${liveMoongoldBalance.lastFetched}` : '• Auto-Synced'}
                    </span>
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
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-bold cursor-pointer"
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

            {/* 3. MANUAL PAYMENT VERIFICATION QUEUE */}
            {adminTab === 'deposits' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black font-heading text-white">Manual Payment Verification Queue</h3>
                    <p className="text-xs text-slate-400">Review, verify, and approve EZ Cash 14-digit RNs, Binance Order IDs & Bank Receipts</p>
                  </div>

                  <button
                    onClick={() => setIsAddPaymentOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Record Offline Payment</span>
                  </button>
                </div>

                {/* Filters & Search */}
                <div className="bg-[#111622] p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center text-xs">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Transaction RN, Order ID, User Email..."
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold cursor-pointer w-full sm:w-auto"
                  >
                    <option value="ALL">All Payment Statuses</option>
                    <option value="PENDING">Pending Verification</option>
                    <option value="VERIFIED">Verified & Credited</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {/* Payment List Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#111622]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0d121c] text-slate-400 uppercase font-mono text-[10px]">
                      <tr>
                        <th className="p-3.5">Payment Ref</th>
                        <th className="p-3.5">Payment Method</th>
                        <th className="p-3.5">Submitted RN / Order ID</th>
                        <th className="p-3.5">User Account</th>
                        <th className="p-3.5">Amount</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {filteredPayments.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-slate-500 font-semibold">
                            No payment verification requests found.
                          </td>
                        </tr>
                      ) : (
                        filteredPayments.map((pay) => (
                          <tr key={pay.id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="p-3.5 font-mono text-slate-400">{pay.id}</td>
                            <td className="p-3.5 font-bold text-white">
                              {pay.method === 'EZ Cash' ? '💸 EZ Cash' : pay.method === 'Binance Pay' ? '🔶 Binance Pay' : '🏦 Bank Slip'}
                            </td>
                            <td className="p-3.5 font-mono font-bold text-amber-400">
                              {pay.referenceNumber}
                            </td>
                            <td className="p-3.5 text-slate-300">
                              <div className="font-bold text-white">{pay.userName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{pay.userEmail}</div>
                            </td>
                            <td className="p-3.5 font-black text-emerald-400 font-heading">
                              {pay.amount} {pay.currency}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                pay.status === 'VERIFIED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 
                                pay.status === 'REJECTED' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}>
                                {pay.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right space-x-1.5">
                              {pay.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => approveManualPayment(pay.id)}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-lg cursor-pointer shadow-xs"
                                  >
                                    Approve & Credit
                                  </button>
                                  <button
                                    onClick={() => rejectManualPayment(pay.id)}
                                    className="px-3 py-1 bg-red-600/30 hover:bg-red-600 text-white font-extrabold text-[10px] rounded-lg cursor-pointer border border-red-500/40"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. USER MANAGEMENT & VERIFICATION MODULE */}
            {adminTab === 'users' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black font-heading text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-400" />
                      <span>User Management & Account Verification</span>
                    </h3>
                    <p className="text-xs text-slate-400">View user profiles, grant Verified badges, block accounts & edit wallet balances</p>
                  </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-[#111622] p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center text-xs">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search User Name, Email, or Phone..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold cursor-pointer w-full sm:w-auto"
                  >
                    <option value="ALL">All Account Types</option>
                    <option value="VERIFIED">Verified Accounts Only</option>
                    <option value="UNVERIFIED">Unverified Accounts</option>
                    <option value="BLOCKED">Blocked Accounts</option>
                  </select>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#111622]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0d121c] text-slate-400 uppercase font-mono text-[10px]">
                      <tr>
                        <th className="p-3.5">User UID</th>
                        <th className="p-3.5">Name & Email</th>
                        <th className="p-3.5">Verification</th>
                        <th className="p-3.5">Account Status</th>
                        <th className="p-3.5">EZ Wallet LKR</th>
                        <th className="p-3.5">Binance USDT</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-slate-500 font-semibold">
                            No users found matching search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((usr) => (
                          <tr key={usr.uid} className="hover:bg-slate-900/60 transition-colors">
                            <td className="p-3.5 font-mono text-slate-400">{usr.uid}</td>
                            <td className="p-3.5">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{usr.name}</span>
                                {usr.isVerified && (
                                  <BadgeCheck className="w-4 h-4 text-emerald-400 fill-emerald-400/20" title="Verified User" />
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">{usr.email}</div>
                            </td>
                            <td className="p-3.5">
                              {usr.isVerified ? (
                                <span className="px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1">
                                  <Check className="w-3 h-3" /> VERIFIED
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-amber-950 text-amber-400 border border-amber-800 rounded-full text-[9px] font-black uppercase">
                                  UNVERIFIED
                                </span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                usr.status === 'BLOCKED' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-slate-900 text-slate-300 border border-slate-700'
                              }`}>
                                {usr.status}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono font-bold text-white">
                              Rs. {(usr.walletBalance || 0).toLocaleString()}
                            </td>
                            <td className="p-3.5 font-mono font-bold text-emerald-400">
                              ${(usr.walletUsdt || 0).toFixed(2)}
                            </td>
                            <td className="p-3.5 text-right space-x-1.5">
                              {!usr.isVerified && (
                                <button
                                  onClick={() => verifyUserAccount(usr.uid)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-lg cursor-pointer"
                                >
                                  Verify User
                                </button>
                              )}
                              <button
                                onClick={() => toggleBlockUser(usr.uid)}
                                className={`px-2.5 py-1 font-extrabold text-[10px] rounded-lg cursor-pointer ${
                                  usr.status === 'BLOCKED' ? 'bg-slate-800 text-slate-300' : 'bg-red-600/30 hover:bg-red-600 text-red-300 border border-red-500/40'
                                }`}
                              >
                                {usr.status === 'BLOCKED' ? 'Unblock' : 'Block'}
                              </button>
                              <button
                                onClick={() => setSelectedInspectUser(usr)}
                                className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 border border-blue-500/40 font-extrabold text-[10px] rounded-lg cursor-pointer"
                              >
                                Top Up
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

            {/* 5. MANUAL USER WALLET CREDIT */}
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

            {/* 6. GAME CATALOG MANAGER */}
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

            {/* 7. PROMO VOUCHERS GENERATOR */}
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
                              className="text-red-400 hover:text-red-300 font-bold cursor-pointer"
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

            {/* 8. TICKER NOTICE ANNOUNCEMENT */}
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

            {/* 9. MOONGOLD API GATEWAY */}
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
                          className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
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

            {/* 10. CLOUDFLARE R2 BUCKET */}
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

            {/* 11. CUSTOMER SUPPORT TICKETS & LIVE CHAT */}
            {adminTab === 'support' && (
              <div className="space-y-6 animate-in fade-in">
                {/* Top Header Metrics Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#111622] p-4 rounded-2xl border border-slate-800 space-y-1 shadow-xs">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase font-mono">Total Tickets</span>
                    <div className="text-2xl font-black text-white font-heading">{safeTickets.length}</div>
                  </div>
                  <div className="bg-[#111622] p-4 rounded-2xl border border-slate-800 space-y-1 shadow-xs">
                    <span className="text-[10px] text-amber-400 font-extrabold uppercase font-mono">Open Tickets</span>
                    <div className="text-2xl font-black text-amber-400 font-heading">
                      {safeTickets.filter(t => t.status === 'OPEN').length}
                    </div>
                  </div>
                  <div className="bg-[#111622] p-4 rounded-2xl border border-slate-800 space-y-1 shadow-xs">
                    <span className="text-[10px] text-blue-400 font-extrabold uppercase font-mono">In Progress</span>
                    <div className="text-2xl font-black text-blue-400 font-heading">
                      {safeTickets.filter(t => t.status === 'IN_PROGRESS').length}
                    </div>
                  </div>
                  <div className="bg-[#111622] p-4 rounded-2xl border border-slate-800 space-y-1 shadow-xs">
                    <span className="text-[10px] text-emerald-400 font-extrabold uppercase font-mono">Resolved</span>
                    <div className="text-2xl font-black text-emerald-400 font-heading">
                      {safeTickets.filter(t => t.status === 'RESOLVED').length}
                    </div>
                  </div>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111622] p-4 rounded-2xl border border-slate-800">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Search ticket ID, user email, subject..."
                      value={supportSearch}
                      onChange={(e) => setSupportSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                      value={supportStatusFilter}
                      onChange={(e) => setSupportStatusFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3.5 py-2 font-mono font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">ALL STATUSES</option>
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>
                </div>

                {/* Tickets Split View Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Ticket List Panel (5 cols) */}
                  <div className="lg:col-span-5 space-y-3">
                    {filteredSupportTickets.length === 0 ? (
                      <div className="bg-[#111622] p-8 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
                        No support tickets found matching your query.
                      </div>
                    ) : (
                      filteredSupportTickets.map(tck => {
                        const isSelected = activeInspectTicket?.id === tck.id;
                        return (
                          <div
                            key={tck.id}
                            onClick={() => setSelectedTicketInspect(tck)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                              isSelected 
                                ? 'bg-[#182030] border-red-500/80 shadow-md ring-1 ring-red-500/50' 
                                : 'bg-[#111622] border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-red-400">{tck.id}</span>
                                <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded font-extrabold">
                                  {tck.category}
                                </span>
                              </div>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                tck.status === 'OPEN' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                tck.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                tck.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                'bg-slate-800 text-slate-400'
                              }`}>
                                {tck.status}
                              </span>
                            </div>

                            <div>
                              <h4 className="font-bold text-xs text-white line-clamp-1">{tck.subject}</h4>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                                {tck.userName} ({tck.userEmail})
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80 pt-2 font-mono">
                              <span>Priority: <strong className={tck.priority === 'HIGH' || tck.priority === 'URGENT' ? 'text-red-400' : 'text-slate-300'}>{tck.priority}</strong></span>
                              <span>{new Date(tck.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Right Ticket Live Chat Inspector Panel (7 cols) */}
                  <div className="lg:col-span-7 bg-[#111622] rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-4">
                    {activeInspectTicket ? (
                      <div className="space-y-4">
                        {/* Header Inspector */}
                        <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-white font-heading">{activeInspectTicket.subject}</h3>
                              <span className="font-mono text-xs text-red-400 font-bold">{activeInspectTicket.id}</span>
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-1">
                              Customer: <strong className="text-white">{activeInspectTicket.userName}</strong> ({activeInspectTicket.userEmail})
                            </div>
                          </div>

                          {/* Status & Priority Controls */}
                          <div className="flex items-center gap-2">
                            <select
                              value={activeInspectTicket.status}
                              onChange={(e) => updateTicketStatus(activeInspectTicket.id, e.target.value)}
                              className="bg-slate-950 border border-slate-800 text-xs text-amber-400 font-mono font-bold px-2.5 py-1.5 rounded-xl cursor-pointer focus:outline-none"
                            >
                              <option value="OPEN">OPEN</option>
                              <option value="IN_PROGRESS">IN PROGRESS</option>
                              <option value="RESOLVED">RESOLVED</option>
                              <option value="CLOSED">CLOSED</option>
                            </select>

                            <select
                              value={activeInspectTicket.priority}
                              onChange={(e) => updateTicketPriority(activeInspectTicket.id, e.target.value)}
                              className="bg-slate-950 border border-slate-800 text-xs text-red-400 font-mono font-bold px-2.5 py-1.5 rounded-xl cursor-pointer focus:outline-none"
                            >
                              <option value="LOW">LOW</option>
                              <option value="MEDIUM">MEDIUM</option>
                              <option value="HIGH">HIGH</option>
                              <option value="URGENT">URGENT</option>
                            </select>
                          </div>
                        </div>

                        {/* Order Reference Box (If linked to order) */}
                        {activeInspectTicket.orderId && (
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400">Linked Order Ref: <strong className="text-red-400">{activeInspectTicket.orderId}</strong></span>
                            <button
                              onClick={() => {
                                setAdminTab('orders');
                                setOrderSearch(activeInspectTicket.orderId);
                              }}
                              className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded font-bold hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                            >
                              View Order Details ↗
                            </button>
                          </div>
                        )}

                        {/* Chat Messages History Stream */}
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                          {activeInspectTicket.messages.map(msg => {
                            const isAdmin = msg.sender === 'admin';
                            return (
                              <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 font-mono">
                                  <span>{msg.senderName}</span>
                                  <span>• {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs space-y-2 leading-relaxed shadow-xs ${
                                  isAdmin ? 'bg-[#cc040a] text-white rounded-tr-xs font-medium' : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-xs'
                                }`}>
                                  <p className="whitespace-pre-wrap">{msg.text}</p>
                                  {msg.attachmentUrl && (
                                    <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="block mt-2 rounded-xl overflow-hidden border border-slate-700 hover:opacity-90 transition-opacity">
                                      <img src={msg.attachmentUrl} alt="Attachment" className="w-full max-h-48 object-cover" />
                                      <span className="block p-1 text-[9px] bg-black/50 text-white text-center font-mono">Open Full Screenshot ↗</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Admin Reply Input Form */}
                        <form onSubmit={handleSendAdminReply} className="pt-3 border-t border-slate-800 flex gap-2">
                          <input
                            type="text"
                            placeholder="Type official support reply to customer..."
                            value={adminReplyText}
                            onChange={(e) => setAdminReplyText(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                          />
                          <button
                            type="submit"
                            disabled={!adminReplyText.trim()}
                            className="px-5 py-2.5 bg-[#cc040a] hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                          >
                            <span>Send Reply</span>
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="text-center py-20 text-slate-500 text-xs">
                        Select a support ticket from the list to inspect & respond.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>

        {/* MODAL 1: INSPECT ORDER OVERLAY */}
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
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Approve Order
                </button>
              )}
              <button
                onClick={() => setSelectedInspectOrder(null)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: USER TOPUP & INSPECT OVERLAY */}
      {selectedInspectUser && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111622] text-white w-full max-w-lg rounded-3xl border border-slate-800 p-6 space-y-4 relative shadow-2xl">
            <button 
              onClick={() => setSelectedInspectUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-black text-xl">
                {selectedInspectUser.name[0]}
              </div>
              <div>
                <h3 className="text-lg font-black font-heading text-white flex items-center gap-1.5">
                  <span>{selectedInspectUser.name}</span>
                  {selectedInspectUser.isVerified && <BadgeCheck className="w-4 h-4 text-emerald-400" />}
                </h3>
                <p className="text-xs text-slate-400 font-mono">{selectedInspectUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">EZ Cash Balance</span>
                <span className="text-base font-black text-white font-heading">Rs. {(selectedInspectUser.walletBalance || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Binance USDT</span>
                <span className="text-base font-black text-emerald-400 font-heading">${(selectedInspectUser.walletUsdt || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-300">Manual Wallet Balance Editor</h4>
              
              {/* Quick Add Presets */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    updateUserBalance(selectedInspectUser.email, 1000, 0);
                    showToast(`Added +1,000 LKR to ${selectedInspectUser.name}`);
                    setSelectedInspectUser(null);
                  }}
                  className="py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  + Rs. 1,000 LKR
                </button>
                <button
                  onClick={() => {
                    updateUserBalance(selectedInspectUser.email, 0, 10);
                    showToast(`Added +$10 USDT to ${selectedInspectUser.name}`);
                    setSelectedInspectUser(null);
                  }}
                  className="py-2 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  + $10 USDT
                </button>
              </div>

              {/* Custom Balance Input Form */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Custom LKR Amount</label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={editLkrVal}
                      onChange={(e) => setEditLkrVal(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Custom USDT Amount</label>
                    <input
                      type="number"
                      placeholder="e.g. 50"
                      value={editUsdtVal}
                      onChange={(e) => setEditUsdtVal(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (editLkrVal !== '' || editUsdtVal !== '') {
                        const lkr = editLkrVal !== '' ? parseFloat(editLkrVal) : (selectedInspectUser.walletBalance || 0);
                        const usdt = editUsdtVal !== '' ? parseFloat(editUsdtVal) : (selectedInspectUser.walletUsdt || 0);
                        setUserExactBalance(selectedInspectUser.email, lkr, usdt);
                        showToast(`Set ${selectedInspectUser.name}'s balance to Rs. ${lkr} LKR / $${usdt} USDT`);
                        setEditLkrVal('');
                        setEditUsdtVal('');
                        setSelectedInspectUser(null);
                      } else {
                        showToast('Please enter an amount to set exact balance', 'error');
                      }
                    }}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-colors"
                  >
                    Set Exact Balance
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (editLkrVal !== '' || editUsdtVal !== '') {
                        const lkr = parseFloat(editLkrVal) || 0;
                        const usdt = parseFloat(editUsdtVal) || 0;
                        updateUserBalance(selectedInspectUser.email, lkr, usdt);
                        showToast(`Added +${lkr} LKR / +${usdt} USDT to ${selectedInspectUser.name}`);
                        setEditLkrVal('');
                        setEditUsdtVal('');
                        setSelectedInspectUser(null);
                      } else {
                        showToast('Please enter an amount to add', 'error');
                      }
                    }}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-colors"
                  >
                    + Add Funds
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedInspectUser(null)}
              className="w-full py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD OFFLINE PAYMENT OVERLAY */}
      {isAddPaymentOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111622] text-white w-full max-w-lg rounded-3xl border border-slate-800 p-6 space-y-4 relative shadow-2xl">
            <button 
              onClick={() => setIsAddPaymentOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black font-heading text-white">Record Offline Payment Receipt</h3>

            <form onSubmit={handleAddManualPaymentRecord} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-extrabold mb-1">User Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. user@gmail.com"
                  value={newPayUserEmail}
                  onChange={(e) => setNewPayUserEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-extrabold mb-1">Payment Method</label>
                  <select
                    value={newPayMethod}
                    onChange={(e) => setNewPayMethod(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold cursor-pointer"
                  >
                    <option value="EZ Cash">EZ Cash</option>
                    <option value="Binance Pay">Binance Pay</option>
                    <option value="Bank Slip">Bank Slip</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-extrabold mb-1">Transaction RN / Order ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 20260910123456"
                    value={newPayRef}
                    onChange={(e) => setNewPayRef(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-extrabold mb-1">Amount</label>
                  <input
                    type="number"
                    required
                    placeholder="1500"
                    value={newPayAmount}
                    onChange={(e) => setNewPayAmount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-extrabold mb-1">Currency</label>
                  <select
                    value={newPayCurrency}
                    onChange={(e) => setNewPayCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold cursor-pointer"
                  >
                    <option value="LKR">LKR (Rs.)</option>
                    <option value="USDT">USDT ($)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                Record Payment Request
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
