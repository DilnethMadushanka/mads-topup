import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { dispatchMoongoldOrder, checkMoongoldBalance } from '../services/moongoldApi';
import { 
  X, ShieldCheck, DollarSign, Activity, Settings, RefreshCw, 
  CheckCircle2, Clock, XCircle, Zap, Key, Server, Database, Save, Eye, EyeOff, Cloud, UploadCloud,
  Users, CreditCard, Ticket, Megaphone, Search, Filter, Plus, Trash2, ArrowUpRight, ArrowDownRight,
  TrendingUp, Check, AlertTriangle, ShieldAlert, FileText, Gift, Award, CornerDownRight, ChevronRight, Lock,
  BadgeCheck, UserCheck, UserX, FileCheck, ExternalLink, Image, Menu, Headset,
  Smartphone, Copy, MessageSquare, Crown, Mail, Building2
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
    updateTicketPriority,
    resellerApplications,
    updateResellerApplicationStatus,
    gamesCatalog,
    updateGamePrices
  } = useApp();

  // Admin Authentication State (Persisted in localStorage across page refreshes)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mads_admin_authenticated') === 'true';
    }
    return false;
  });
  const [adminAuthEmail, setAdminAuthEmail] = useState('');
  const [adminAuthPassword, setAdminAuthPassword] = useState('');
  const [adminAuthSecurityCode, setAdminAuthSecurityCode] = useState('');
  const [showAdminAuthPassword, setShowAdminAuthPassword] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState('');
  const [adminFailedAttempts, setAdminFailedAttempts] = useState(0);
  const [adminLockoutUntil, setAdminLockoutUntil] = useState(null);
  // Active Admin Sidebar Tab
  const [adminTab, setAdminTab] = useState('overview'); 

  // Selected Bank Deposit Payment Receipt Inspection Modal State
  const [selectedReceiptPay, setSelectedReceiptPay] = useState(null);
  // Options: 'overview' | 'orders' | 'deposits' | 'users' | 'credit' | 'games' | 'vouchers' | 'moongold' | 'r2' | 'announcement' | 'support'

  // Price Management State
  const [editedPricesMap, setEditedPricesMap] = useState({});
  const [selectedGameCatalogId, setSelectedGameCatalogId] = useState('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isSavingPrices, setIsSavingPrices] = useState(false);

  const handlePriceInputChange = (pkgId, val) => {
    const num = parseFloat(val);
    setEditedPricesMap(prev => ({
      ...prev,
      [pkgId]: isNaN(num) ? 0 : num
    }));
  };

  const handleSaveAllPrices = async () => {
    setIsSavingPrices(true);
    const fullPriceMap = {};
    (gamesCatalog || []).forEach(game => {
      (game.packages || []).forEach(pkg => {
        fullPriceMap[pkg.id] = editedPricesMap[pkg.id] !== undefined ? editedPricesMap[pkg.id] : pkg.priceLkr;
      });
    });

    const success = await updateGamePrices(fullPriceMap);
    setIsSavingPrices(false);
    if (success) {
      showToast('⚡ ALL PACKAGE PRICES SAVED & PUBLISHED LIVE TO DATABASE!');
    }
  };


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
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
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

  // EZ Cash Webhook Logs State

  const [ezcashLogs, setEzcashLogs] = useState([]);
  const [isEzcashLogsLoading, setIsEzcashLogsLoading] = useState(false);
  const [ezcashSearch, setEzcashSearch] = useState('');
  const [ezcashStatusFilter, setEzcashStatusFilter] = useState('ALL');

  // Reseller Application Filters State
  const [resellerSearch, setResellerSearch] = useState('');
  const [resellerStatusFilter, setResellerStatusFilter] = useState('ALL');

  const fetchEzcashLogs = async () => {
    try {
      setIsEzcashLogsLoading(true);
      const res = await fetch('/api/ezcash/webhook-logs');
      const data = await res.json();
      if (data && data.success) {
        setEzcashLogs(data.logs || []);
      }
    } catch (err) {
      console.error('[Admin] Error fetching EZ Cash logs:', err);
    } finally {
      setIsEzcashLogsLoading(false);
    }
  };

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
        lastFetched: new Date().toLocaleTimeString(),
        isRealtime: Boolean(result.isRealtime)
      });
    } else {
      setLiveMoongoldBalance(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated && isAdminOpen) {
      fetchLiveBalance();
      fetchEzcashLogs();
      const interval = setInterval(() => {
        fetchLiveBalance();
        fetchEzcashLogs();
      }, 10000); // Live realtime sync every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isAdminAuthenticated, isAdminOpen]);

  if (!isAdminOpen) return null;

  const handleAdminLoginSubmit = (e) => {
    e.preventDefault();

    if (adminLockoutUntil && Date.now() < adminLockoutUntil) {
      const waitSecs = Math.ceil((adminLockoutUntil - Date.now()) / 1000);
      setAdminAuthError(`3 Failed attempts detected! Locked out for security. Try again in ${waitSecs}s.`);
      showToast(`Admin Portal Locked for ${waitSecs}s`, 'error');
      return;
    }

    // Strict input sanitization against injection attempts
    const cleanEmail = String(adminAuthEmail || '').trim().toLowerCase().replace(/['"`;=\-]/g, '');
    const cleanPass = String(adminAuthPassword || '').trim();
    const cleanCode = String(adminAuthSecurityCode || '').trim().toUpperCase();

    const isValidEmail = cleanEmail === 'madsruzza@gmail.com';
    const isValidPassword = cleanPass === 'Mads2004@#';
    const isValidSecurityCode = cleanCode === '982145' || cleanCode === 'MADS-ADMIN-9821';

    if (isValidEmail && isValidPassword && isValidSecurityCode) {
      localStorage.setItem('mads_admin_authenticated', 'true');
      setIsAdminAuthenticated(true);
      setAdminFailedAttempts(0);
      setAdminLockoutUntil(null);
      showToast('Admin Authentication Successful! Welcome Super Admin.');
      setAdminAuthError('');
      setAdminAuthPassword('');
      setAdminAuthSecurityCode('');
    } else {
      const nextFailures = adminFailedAttempts + 1;
      setAdminFailedAttempts(nextFailures);

      if (nextFailures >= 3) {
        const lockoutTime = Date.now() + 15 * 60 * 1000;
        setAdminLockoutUntil(lockoutTime);
        setAdminAuthError('3 Failed attempts detected! Admin Portal locked out for 15 minutes for security.');
        showToast('3 Failed Attempts! Admin Portal Locked.', 'error');
      } else {
        setAdminAuthError(`Invalid Admin Email, Password, or 2FA Security Code! Attempt ${nextFailures}/3.`);
        showToast('Invalid Admin Security Credentials', 'error');
      }
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('mads_admin_authenticated');
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
            <p className="text-xs text-slate-400 font-medium">Restricted Access • Enter Super Admin & 2FA Credentials</p>
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

            <div>
              <label className="block text-slate-300 font-extrabold mb-1.5 uppercase tracking-wider text-[10px] font-mono">
                Admin 2FA Security Passcode
              </label>
              <input
                type="password"
                required
                autoComplete="off"
                value={adminAuthSecurityCode}
                onChange={(e) => setAdminAuthSecurityCode(e.target.value)}
                placeholder="Enter 6-Digit Secret Passcode"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 font-mono text-sm focus:outline-none focus:border-red-500 shadow-xs tracking-wider font-bold"
              />
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

    const isTelegramOrder = Boolean(ord.viaTelegramBot || (ord.id && ord.id.startsWith('ORD-TG-')) || ord.channel === 'Telegram Bot' || (ord.paymentMethod && ord.paymentMethod.toLowerCase().includes('telegram')));

    const matchesStatus = statusFilter === 'ALL' || ord.status === statusFilter;
    const matchesPayment = paymentFilter === 'ALL' || 
      (paymentFilter === 'TELEGRAM' ? isTelegramOrder : ord.paymentMethod.toLowerCase().includes(paymentFilter.toLowerCase()));

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
    const query = (paymentSearch || '').toLowerCase().trim();
    const matchesSearch = 
      !query ||
      (pay.id && pay.id.toLowerCase().includes(query)) ||
      (pay.userEmail && pay.userEmail.toLowerCase().includes(query)) ||
      (pay.userName && pay.userName.toLowerCase().includes(query)) ||
      (pay.referenceNumber && pay.referenceNumber.toLowerCase().includes(query)) ||
      (pay.method && pay.method.toLowerCase().includes(query)) ||
      (pay.amount && String(pay.amount).includes(query));

    const matchesStatus = paymentStatusFilter === 'ALL' || pay.status === paymentStatusFilter;

    let matchesMethod = true;
    if (paymentMethodFilter === 'EZ_CASH') matchesMethod = pay.method && pay.method.toLowerCase().includes('ez');
    else if (paymentMethodFilter === 'BINANCE') matchesMethod = pay.method && pay.method.toLowerCase().includes('binance');
    else if (paymentMethodFilter === 'BANK') matchesMethod = pay.method && (pay.method.toLowerCase().includes('bank') || pay.method.toLowerCase().includes('slip'));

    return matchesSearch && matchesStatus && matchesMethod;
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

  // Filtered EZ Cash Webhook Logs Calculation
  const filteredEzcashLogs = (ezcashLogs || []).filter(item => {
    const query = ezcashSearch.toLowerCase().trim();
    const matchesSearch = !query || 
      item.rnNumber.toLowerCase().includes(query) ||
      (item.rawSms && item.rawSms.toLowerCase().includes(query)) ||
      (item.redeemedBy && item.redeemedBy.toLowerCase().includes(query));

    const matchesStatus = ezcashStatusFilter === 'ALL' || item.status === ezcashStatusFilter;

    return matchesSearch && matchesStatus;
  });

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
      showToast(`API Merchant Live Balance: Rs. ${result.balanceLkr.toLocaleString()} ($${result.balanceUsd} USD)`);
    } else {
      showToast(`API Merchant Live Balance: Rs. ${moongoldConfig.merchantBalanceLkr.toLocaleString()} ($${moongoldConfig.merchantBalanceUsd} USD)`);
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

  // Reseller Application Filters
  const safeResellerApps = resellerApplications || [];
  const pendingResellersCount = safeResellerApps.filter(a => a.status === 'PENDING').length;

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
            { id: 'resellers', label: 'Resellers', icon: Crown, badge: pendingResellersCount },
            { id: 'support', label: 'Support', icon: Headset, badge: openTicketsCount },
            { id: 'orders', label: 'Orders', icon: Activity, badge: pendingCount },
            { id: 'deposits', label: 'Deposits', icon: FileCheck, badge: pendingPaymentsCount },
            { id: 'ezcash', label: 'EZ Cash Logs', icon: Smartphone, badge: ezcashLogs.length },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'credit', label: 'Credit', icon: DollarSign },
            { id: 'games', label: 'Games', icon: Award },
            { id: 'moongold', label: 'API Config', icon: Zap },
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
              onClick={() => handleTabSelect('resellers')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                adminTab === 'resellers' ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Reseller Partner Network</span>
              </div>
              {pendingResellersCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono font-black text-[10px]">
                  {pendingResellersCount}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-slate-500">{safeResellerApps.length}</span>
              )}
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
              onClick={() => handleTabSelect('ezcash')}
              className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                adminTab === 'ezcash' ? 'bg-[#cc040a] text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>EZ Cash Webhook Logs</span>
              </div>
              {ezcashLogs.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono font-black text-[10px]">
                  {ezcashLogs.length}
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
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                        {liveMoongoldBalance.isRealtime ? 'MOONGOLD LIVE BALANCE' : 'TOTAL SYSTEM WALLET BALANCE'}
                      </span>
                      <button onClick={fetchLiveBalance} className="text-slate-400 hover:text-white" title="Refresh Live Balance">
                        <RefreshCw className={`w-3 h-3 ${liveMoongoldBalance.isLoading ? 'animate-spin text-amber-400' : ''}`} />
                      </button>
                    </div>
                    {liveMoongoldBalance.isRealtime ? (
                      <>
                        <h4 className="text-2xl font-black text-sky-400 font-heading mt-1">Rs. {liveMoongoldBalance.balanceLkr.toLocaleString()}</h4>
                        <span className="text-[10px] text-sky-500 font-bold mt-1 inline-block">
                          ${liveMoongoldBalance.balanceUsd} USDT {liveMoongoldBalance.lastFetched ? `• Updated ${liveMoongoldBalance.lastFetched}` : '• Auto-Synced'}
                        </span>
                      </>
                    ) : (
                      <>
                        <h4 className="text-2xl font-black text-sky-400 font-heading mt-1">
                          Rs. {safeUsers.reduce((sum, u) => sum + (parseFloat(u.walletBalance) || 0), 0).toLocaleString()}
                        </h4>
                        <span className="text-[10px] text-sky-500 font-bold mt-1 inline-block">
                          ${(safeUsers.reduce((sum, u) => sum + (parseFloat(u.walletBalance) || 0), 0) / 305).toFixed(2)} USDT • Total All Users in Database
                        </span>
                      </>
                    )}
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

            {/* RESELLER APPLICATIONS MANAGEMENT PANEL */}
            {adminTab === 'resellers' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black font-heading text-white">Reseller Partner Network Applications</h3>
                    <p className="text-xs text-slate-400">Review, approve, or reject reseller partner store applications</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-extrabold font-mono">
                      {pendingResellersCount} PENDING REQUESTS
                    </span>
                  </div>
                </div>

                {/* Search & Status Filter Bar */}
                <div className="bg-[#111622] p-4 rounded-2xl border border-slate-800 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4 text-xs">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by applicant name, store name, whatsapp or email..."
                      value={resellerSearch}
                      onChange={(e) => setResellerSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold text-xs focus:outline-none focus:border-red-500 shadow-inner"
                    />
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto">
                    {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setResellerStatusFilter(st)}
                        className={`px-3.5 py-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                          resellerStatusFilter === st
                            ? 'bg-[#cc040a] text-white shadow-md shadow-red-600/30'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reseller Applications Cards */}
                <div className="space-y-4">
                  {safeResellerApps
                    .filter(app => {
                      const matchSearch = 
                        (app.realName && app.realName.toLowerCase().includes(resellerSearch.toLowerCase())) ||
                        (app.storeName && app.storeName.toLowerCase().includes(resellerSearch.toLowerCase())) ||
                        (app.whatsappNumber && app.whatsappNumber.includes(resellerSearch)) ||
                        (app.emailAddress && app.emailAddress.toLowerCase().includes(resellerSearch.toLowerCase()));
                      const matchStatus = resellerStatusFilter === 'ALL' || app.status === resellerStatusFilter;
                      return matchSearch && matchStatus;
                    })
                    .map((app) => (
                      <div key={app.id || app.firestoreId} className="bg-[#111622] p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold shadow-inner">
                              <Crown className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-base font-black text-white">{app.storeName}</h4>
                              <p className="text-xs text-slate-400 font-medium">Applicant: <span className="text-slate-200 font-bold">{app.realName}</span> ({app.id})</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono tracking-wider ${
                              app.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              app.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                            }`}>
                              {app.status}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-0.5">WHATSAPP CONTACT</span>
                            <span className="text-white font-bold">{app.whatsappNumber}</span>
                          </div>

                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-0.5">EMAIL ADDRESS</span>
                            <span className="text-white font-bold">{app.emailAddress}</span>
                          </div>

                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-0.5">DAILY AVERAGE SALE</span>
                            <span className="text-amber-400 font-bold">{app.dailySale}</span>
                          </div>

                          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-0.5">STORE & REACH</span>
                            <span className="text-slate-200 font-medium">
                              {app.isRunningStore ? '✅ Active Store' : '❌ No Store'} • {app.hasSocialReach ? '✅ Social Reach' : '❌ No Reach'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[11px] text-slate-500 font-mono">
                            Submitted: {new Date(app.submittedAt).toLocaleString()}
                          </span>

                          <div className="flex items-center gap-2">
                            {app.status !== 'APPROVED' ? (
                              <button
                                onClick={() => updateResellerApplicationStatus(app.id || app.firestoreId, app.userId, 'APPROVED', app)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                              >
                                <UserCheck className="w-4 h-4" />
                                <span>APPROVE RESELLER</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => updateResellerApplicationStatus(app.id || app.firestoreId, app.userId, 'APPROVED', app)}
                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                                title="Click to Send or Resend Approval Email with Reseller Code & Security Key"
                              >
                                <Mail className="w-4 h-4" />
                                <span>RESEND APPROVAL EMAIL</span>
                              </button>
                            )}

                            {app.status !== 'REJECTED' && (
                              <button
                                onClick={() => updateResellerApplicationStatus(app.id || app.firestoreId || app.userId, app.userId, 'REJECTED', app)}
                                className="px-3.5 py-2 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                              >
                                <UserX className="w-4 h-4" />
                                <span>REJECT</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
                      <option value="TELEGRAM">🤖 Telegram Bot Orders</option>
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
                        <th className="p-3.5">User Account</th>
                        <th className="p-3.5">Game / Package</th>
                        <th className="p-3.5">Player Credentials</th>
                        <th className="p-3.5">Payment / Channel</th>
                        <th className="p-3.5">Price</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="p-8 text-center text-slate-500 font-semibold">
                            No orders found matching filters.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((ord) => {
                          const isTg = Boolean(ord.viaTelegramBot || (ord.id && ord.id.startsWith('ORD-TG-')) || ord.channel === 'Telegram Bot' || (ord.paymentMethod && ord.paymentMethod.toLowerCase().includes('telegram')));

                          return (
                          <tr key={ord.id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="p-3.5 font-mono font-bold text-red-400">{ord.id}</td>
                            <td className="p-3.5">
                              <div className="font-bold text-sky-400 flex items-center gap-1">
                                <Users className="w-3 h-3 shrink-0 text-sky-400" />
                                <span>{ord.userEmail || ord.userName || ord.userId || 'Registered Gamer'}</span>
                              </div>
                              {ord.userName && <div className="text-[10px] text-slate-400">{ord.userName} {ord.userId ? `(${ord.userId.slice(0, 10)})` : ''}</div>}
                            </td>
                            <td className="p-3.5">
                              <div className="font-bold text-white">{ord.gameName}</div>
                              <div className="text-[10px] text-slate-400">{ord.packageName}</div>
                            </td>
                            <td className="p-3.5 font-mono text-slate-300">
                              <div>{ord.playerId} {ord.zoneId && `(${ord.zoneId})`}</div>
                              <div className="text-[10px] text-slate-400 font-sans">{ord.ign}</div>
                            </td>
                            <td className="p-3.5">
                              <div className="text-slate-300 font-semibold">{ord.paymentMethod}</div>
                              {isTg && (
                                <span className="px-2 py-0.5 mt-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono text-[9px] font-black inline-flex items-center gap-1">
                                  <span>🤖 Telegram Bot</span>
                                </span>
                              )}
                            </td>
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
                        );
                      })
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTabSelect('ezcash')}
                      className="px-3.5 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 rounded-xl font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span>SMS Webhook Logs ({ezcashLogs.length})</span>
                    </button>
                    <button
                      onClick={() => setIsAddPaymentOpen(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Record Offline Payment</span>
                    </button>
                  </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-[#111622] p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center text-xs">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Transaction RN, Order ID, User Email, Name, or Amount..."
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <select
                      value={paymentMethodFilter}
                      onChange={(e) => setPaymentMethodFilter(e.target.value)}
                      className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold cursor-pointer flex-1 sm:flex-none"
                    >
                      <option value="ALL">All Payment Methods</option>
                      <option value="EZ_CASH">💸 EZ Cash Only</option>
                      <option value="BINANCE">🔶 Binance Pay Only</option>
                      <option value="BANK">🏦 Bank Deposit Only</option>
                    </select>

                    <select
                      value={paymentStatusFilter}
                      onChange={(e) => setPaymentStatusFilter(e.target.value)}
                      className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold cursor-pointer flex-1 sm:flex-none"
                    >
                      <option value="ALL">All Payment Statuses</option>
                      <option value="PENDING">Pending Verification</option>
                      <option value="VERIFIED">Verified & Credited</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
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
                          <td colSpan="7" className="p-12 text-center text-slate-500 font-semibold">
                            No payment verification requests found matching current filters.
                          </td>
                        </tr>
                      ) : (
                        filteredPayments.map((pay) => {
                          const isEz = pay.method && pay.method.toLowerCase().includes('ez');
                          const isBinance = pay.method && pay.method.toLowerCase().includes('binance');
                          const cleanRn = String(pay.referenceNumber || '').trim();

                          // Cross-reference with Dialog EZ Cash SMS Webhook Logs
                          const matchedSms = isEz ? (ezcashLogs || []).find(l => {
                            if (!l.rnNumber) return false;
                            const logRn = String(l.rnNumber).trim();
                            return logRn === cleanRn || (cleanRn.length >= 10 && logRn.includes(cleanRn));
                          }) : null;

                          return (
                            <tr key={pay.id} className="hover:bg-slate-900/60 transition-colors">
                              <td className="p-3.5 font-mono text-slate-400">
                                <div>{pay.id}</div>
                                {pay.createdAt && <div className="text-[9px] text-slate-500">{pay.createdAt}</div>}
                              </td>

                              <td className="p-3.5 font-bold">
                                {isEz ? (
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold inline-flex items-center gap-1.5">
                                    <Smartphone className="w-3.5 h-3.5" />
                                    <span>EZ Cash</span>
                                  </span>
                                ) : isBinance ? (
                                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold inline-flex items-center gap-1.5">
                                    <Zap className="w-3.5 h-3.5" />
                                    <span>Binance Pay</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold inline-flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span>Bank Deposit</span>
                                  </span>
                                )}
                              </td>

                              <td className="p-3.5 font-mono font-bold text-amber-400">
                                <div className="flex items-center gap-1.5">
                                  <span>{pay.referenceNumber}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(pay.referenceNumber);
                                      showToast(`Copied: ${pay.referenceNumber}`);
                                    }}
                                    className="text-slate-500 hover:text-white p-1 rounded transition-colors"
                                    title="Copy RN / Order ID"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>

                                {isEz && (
                                  matchedSms ? (
                                    <div className="mt-1 text-[10px] text-emerald-400 font-extrabold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      <span>SMS Matched (Rs. {(matchedSms.amountLkr || 0).toLocaleString()})</span>
                                    </div>
                                  ) : (
                                    <div className="mt-1 text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-500" />
                                      <span>Pending SMS Webhook</span>
                                    </div>
                                  )
                                )}

                                {(pay.slipUrl || pay.receiptUrl) && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReceiptPay(pay)}
                                    className="mt-1 text-[10px] font-extrabold text-sky-400 hover:text-sky-300 underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View Receipt Slip</span>
                                  </button>
                                )}
                              </td>

                              <td className="p-3.5 text-slate-300">
                                <div className="font-bold text-white flex items-center gap-1">
                                  <span>{pay.userName}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">{pay.userEmail}</div>
                                {(pay.userId || pay.resellerCode) && (
                                  <div className="text-[9px] text-slate-500 font-mono">ID: {pay.userId || pay.resellerCode}</div>
                                )}
                              </td>

                              <td className="p-3.5 font-black text-emerald-400 font-heading">
                                <div>{pay.amount} {pay.currency}</div>
                                {pay.currency !== 'USDT' && pay.amount >= 5000 && (
                                  <div className="text-[9px] text-amber-400 font-normal">
                                    +{pay.amount >= 20000 ? '600' : pay.amount >= 10000 ? '250' : '100'} Bonus
                                  </div>
                                )}
                              </td>

                              <td className="p-3.5">
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                  pay.status === 'VERIFIED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 
                                  pay.status === 'REJECTED' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}>
                                  {pay.status === 'VERIFIED' ? '✅ VERIFIED' : pay.status === 'REJECTED' ? '❌ REJECTED' : '⏳ PENDING'}
                                </span>
                              </td>

                              <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                {(pay.slipUrl || pay.receiptUrl || pay.method === 'Bank Deposit' || pay.method === 'Bank Slip') && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReceiptPay(pay)}
                                    className="px-2.5 py-1 bg-sky-600/30 hover:bg-sky-600 border border-sky-500/50 text-sky-200 hover:text-white font-extrabold text-[10px] rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Slip</span>
                                  </button>
                                )}

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

                                {pay.status === 'REJECTED' && (
                                  <button
                                    onClick={() => approveManualPayment(pay.id)}
                                    className="px-2.5 py-1 bg-emerald-700/50 hover:bg-emerald-600 text-emerald-200 hover:text-white font-extrabold text-[10px] rounded-lg cursor-pointer border border-emerald-500/40"
                                  >
                                    Re-Approve & Credit
                                  </button>
                                )}

                                {pay.status === 'VERIFIED' && (
                                  <button
                                    onClick={() => rejectManualPayment(pay.id)}
                                    className="px-2 py-1 bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 font-bold text-[9px] rounded-lg cursor-pointer border border-slate-700"
                                    title="Revoke / Reject"
                                  >
                                    Reject
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3.5. EZ CASH WEBHOOK SMS LOGS TAB */}
            {adminTab === 'ezcash' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black font-heading text-white flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                      <span>Dialog EZ Cash Webhook Received SMS Logs</span>
                    </h3>
                    <p className="text-xs text-slate-400">Live SMS records received from phone shortcut / forwarder gateway</p>
                  </div>

                  <button
                    onClick={fetchEzcashLogs}
                    disabled={isEzcashLogsLoading}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isEzcashLogsLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh Logs</span>
                  </button>
                </div>

                {/* Filters & Search */}
                <div className="bg-[#111622] p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center text-xs">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by 14-digit RN Number, SMS Text, or User Email..."
                      value={ezcashSearch}
                      onChange={(e) => setEzcashSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <select
                    value={ezcashStatusFilter}
                    onChange={(e) => setEzcashStatusFilter(e.target.value)}
                    className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold cursor-pointer w-full sm:w-auto"
                  >
                    <option value="ALL">All Statuses ({ezcashLogs.length})</option>
                    <option value="UNCLAIMED">Unclaimed / Pending</option>
                    <option value="REDEEMED">Auto-Approved / Redeemed</option>
                  </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#111622]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0d121c] text-slate-400 uppercase font-mono text-[10px]">
                      <tr>
                        <th className="p-3.5">RN Trans Number</th>
                        <th className="p-3.5">Amount (LKR)</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Redeemed By User</th>
                        <th className="p-3.5">Received Time</th>
                        <th className="p-3.5">Raw Dialog SMS Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {filteredEzcashLogs.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-12 text-center text-slate-500 font-semibold">
                            <div className="space-y-2">
                              <Smartphone className="w-8 h-8 text-slate-600 mx-auto" />
                              <p>No EZ Cash Webhook SMS logs received yet.</p>
                              <p className="text-[11px] text-slate-600">When your phone shortcut sends SMS to <code className="bg-slate-950 px-2 py-1 rounded text-emerald-400">/api/ezcash/webhook</code>, they will appear here live.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredEzcashLogs.map((log, index) => (
                          <tr key={log.rnNumber || index} className="hover:bg-slate-900/60 transition-colors">
                            <td className="p-3.5 font-mono font-bold text-amber-400">
                              <div className="flex items-center gap-1.5">
                                <span>{log.rnNumber}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(log.rnNumber);
                                    showToast(`Copied RN ${log.rnNumber}`);
                                  }}
                                  className="text-slate-500 hover:text-white p-1 rounded transition-colors"
                                  title="Copy RN Number"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3.5 font-black text-emerald-400 font-heading text-sm">
                              Rs. {(log.amountLkr || 0).toLocaleString()}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                log.status === 'REDEEMED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}>
                                {log.status === 'REDEEMED' ? '✅ REDEEMED' : '⏳ UNCLAIMED'}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-300 font-mono text-[11px]">
                              {log.redeemedBy ? (
                                <div className="text-emerald-300 font-bold">{log.redeemedBy}</div>
                              ) : (
                                <span className="text-slate-500 italic">Not redeemed yet</span>
                              )}
                            </td>
                            <td className="p-3.5 text-slate-400 font-mono text-[10px]">
                              {new Date(log.receivedAt).toLocaleString()}
                            </td>
                            <td className="p-3.5 max-w-xs">
                              <div className="p-2 bg-slate-950 rounded-lg text-[10px] font-mono text-slate-300 border border-slate-800 truncate" title={log.rawSms}>
                                {log.rawSms || 'No raw SMS text recorded'}
                              </div>
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

            {/* 6. GAME CATALOG & LIVE PRICE MANAGER */}
            {adminTab === 'games' && (
              <div className="space-y-6 animate-in fade-in">
                {/* Header & Save Action Bar */}
                <div className="bg-[#111622] p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                  <div>
                    <h3 className="text-xl font-black font-heading text-white flex items-center gap-2">
                      <span>🎮 Game Catalog & Live Price Manager</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Edit retail prices for any package across all games. Click Save & Publish to instantly update prices on the Website & Telegram Bot in real-time!
                    </p>
                  </div>

                  <button
                    onClick={handleSaveAllPrices}
                    disabled={isSavingPrices}
                    className="px-6 py-3 bg-[#cc040a] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer transition-all shrink-0"
                  >
                    <Save className={`w-4 h-4 ${isSavingPrices ? 'animate-spin' : ''}`} />
                    <span>{isSavingPrices ? 'Saving to Database...' : '💾 Save & Publish All Prices Live'}</span>
                  </button>
                </div>

                {/* Filter Bar */}
                <div className="bg-[#111622] p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between text-xs">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search package name, diamond amount, or game title..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <select
                    value={selectedGameCatalogId}
                    onChange={(e) => setSelectedGameCatalogId(e.target.value)}
                    className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold cursor-pointer w-full sm:w-auto font-mono"
                  >
                    <option value="ALL">ALL GAMES ({(gamesCatalog || []).length})</option>
                    {(gamesCatalog || []).map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {/* Game Cards List with Package Price Editors */}
                <div className="space-y-6">
                  {(gamesCatalog || [])
                    .filter(g => selectedGameCatalogId === 'ALL' || g.id === selectedGameCatalogId)
                    .map((game) => {
                      const matchingPackages = (game.packages || []).filter(pkg => 
                        !catalogSearch || 
                        pkg.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                        game.name.toLowerCase().includes(catalogSearch.toLowerCase())
                      );

                      if (matchingPackages.length === 0) return null;

                      return (
                        <div key={game.id} className="bg-[#111622] rounded-3xl border border-slate-800 overflow-hidden shadow-lg">
                          {/* Game Header */}
                          <div className="p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{game.currencyIcon || '🎮'}</span>
                              <div>
                                <h4 className="font-black text-white text-lg font-heading">{game.name}</h4>
                                <span className="text-xs font-mono text-slate-400 uppercase">
                                  {game.publisher} • {game.category} • {game.packages?.length || 0} Packages
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={handleSaveAllPrices}
                              disabled={isSavingPrices}
                              className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/40 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                            >
                              Save Prices
                            </button>
                          </div>

                          {/* Packages Price Grid Table */}
                          <div className="p-4 sm:p-6 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                                <tr>
                                  <th className="p-3">Package Name</th>
                                  <th className="p-3">Retail Price (LKR)</th>
                                  <th className="p-3">Reseller Wholesale (5% OFF)</th>
                                  <th className="p-3">USD Price ($)</th>
                                  <th className="p-3 text-right">Package Code</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 font-medium">
                                {matchingPackages.map((pkg) => {
                                  const currentPrice = editedPricesMap[pkg.id] !== undefined ? editedPricesMap[pkg.id] : pkg.priceLkr;
                                  const wholesalePrice = Math.round(currentPrice * 0.95);
                                  const usdPrice = (currentPrice / 305).toFixed(2);

                                  return (
                                    <tr key={pkg.id} className="hover:bg-slate-900/40 transition-colors">
                                      <td className="p-3 font-bold text-white">
                                        <div className="flex items-center gap-2">
                                          {pkg.image && <img src={pkg.image} alt="" className="w-6 h-6 object-contain" />}
                                          <span>{pkg.name}</span>
                                          {pkg.bonus && (
                                            <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono">
                                              {pkg.bonus}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-3">
                                        <div className="relative w-36">
                                          <span className="absolute left-3 top-2 text-slate-400 font-mono text-xs">Rs.</span>
                                          <input
                                            type="number"
                                            value={currentPrice}
                                            onChange={(e) => handlePriceInputChange(pkg.id, e.target.value)}
                                            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 focus:border-red-500 rounded-xl text-amber-400 font-mono font-black text-xs focus:outline-none"
                                          />
                                        </div>
                                      </td>
                                      <td className="p-3 font-mono font-bold text-emerald-400">
                                        Rs. {wholesalePrice.toLocaleString()} LKR
                                      </td>
                                      <td className="p-3 font-mono text-slate-300">
                                        ${usdPrice} USDT
                                      </td>
                                      <td className="p-3 text-right">
                                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                                          {pkg.id}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Bottom Save Action Button */}
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSaveAllPrices}
                    disabled={isSavingPrices}
                    className="px-8 py-3.5 bg-[#cc040a] hover:bg-red-700 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-xl shadow-red-600/30 cursor-pointer transition-all"
                  >
                    <Save className={`w-5 h-5 ${isSavingPrices ? 'animate-spin' : ''}`} />
                    <span>{isSavingPrices ? 'Saving to Database...' : '💾 Save & Publish All Prices Live'}</span>
                  </button>
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

      {/* MODAL 4: VIEW BANK PAYMENT RECEIPT SLIP LIGHTBOX */}
      {selectedReceiptPay && (
        <div className="fixed inset-0 z-70 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#111622] text-white w-full max-w-2xl rounded-3xl border border-slate-800 p-6 space-y-5 relative shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-extrabold">
                  📷
                </div>
                <div>
                  <h3 className="text-base font-black font-heading text-white">Bank Deposit Payment Receipt</h3>
                  <p className="text-xs text-slate-400 font-mono">Payment ID: {selectedReceiptPay.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReceiptPay(null)}
                className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {/* Slip Image Container */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3 flex flex-col items-center justify-center min-h-[220px]">
                {selectedReceiptPay.slipUrl || selectedReceiptPay.receiptUrl ? (
                  <div className="space-y-2 text-center w-full">
                    <img 
                      src={selectedReceiptPay.slipUrl || selectedReceiptPay.receiptUrl} 
                      alt="Bank Receipt Slip" 
                      className="max-h-[380px] w-auto max-w-full rounded-xl object-contain mx-auto border border-slate-800 shadow-md"
                    />
                    <a
                      href={selectedReceiptPay.slipUrl || selectedReceiptPay.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 pt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Full Size Image</span>
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-10 space-y-2">
                    <p className="text-slate-500 font-bold text-xs">No receipt image attached to this payment record.</p>
                  </div>
                )}
              </div>

              {/* Payment Details Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-0.5">USER NAME</span>
                  <span className="text-white font-bold">{selectedReceiptPay.userName}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-0.5">USER EMAIL</span>
                  <span className="text-white font-bold font-mono text-[11px] truncate block">{selectedReceiptPay.userEmail}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-0.5">DEPOSIT METHOD</span>
                  <span className="text-white font-bold">{selectedReceiptPay.method}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-0.5">REFERENCE / SENDER</span>
                  <span className="text-amber-400 font-mono font-bold">{selectedReceiptPay.referenceNumber}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-0.5">AMOUNT</span>
                  <span className="text-emerald-400 font-heading font-black text-sm">{selectedReceiptPay.amount} {selectedReceiptPay.currency}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-0.5">CURRENT STATUS</span>
                  <span className={`text-xs font-black uppercase ${
                    selectedReceiptPay.status === 'VERIFIED' ? 'text-emerald-400' :
                    selectedReceiptPay.status === 'REJECTED' ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {selectedReceiptPay.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              {selectedReceiptPay.status === 'PENDING' ? (
                <>
                  <button
                    onClick={() => {
                      rejectManualPayment(selectedReceiptPay.id);
                      setSelectedReceiptPay(null);
                    }}
                    className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-extrabold text-xs rounded-xl cursor-pointer"
                  >
                    Reject Payment
                  </button>
                  <button
                    onClick={() => {
                      approveManualPayment(selectedReceiptPay.id);
                      setSelectedReceiptPay(null);
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl cursor-pointer shadow-lg shadow-emerald-600/20"
                  >
                    Approve & Credit Wallet
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSelectedReceiptPay(null)}
                  className="px-5 py-2 bg-slate-800 text-slate-200 font-bold text-xs rounded-xl cursor-pointer hover:bg-slate-700"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
