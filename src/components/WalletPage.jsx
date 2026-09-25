import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { auth } from '../services/firebaseAuth';
import {
  Wallet, Copy, Check, ArrowLeft, Zap, Clock, Crown,
  Building2, Upload, ChevronRight, X, RefreshCw, AlertTriangle,
  CreditCard, Smartphone, DollarSign, Gift
} from 'lucide-react';

export const WalletPage = () => {
  const {
    setIsWalletModalOpen, walletActiveTab, setWalletActiveTab,
    userProfile, showToast, addManualPayment, vouchers,
    creditUserWallet, redeemVoucher, setSelectedGame, closeCatalog, manualPayments
  } = useApp();

  const [binanceOrderId, setBinanceOrderId] = useState('');
  const [binancePayId, setBinancePayId] = useState('');
  const [binanceAmount, setBinanceAmount] = useState('10');
  const [ezCashRnNumber, setEzCashRnNumber] = useState('');
  const [ezCashAmount, setEzCashAmount] = useState('1000');
  const [voucherCode, setVoucherCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isBinanceVerifying, setIsBinanceVerifying] = useState(false);
  const [genieAmount, setGenieAmount] = useState('1000');
  const [isGenieLoading, setIsGenieLoading] = useState(false);
  const [bankAmount, setBankAmount] = useState('1000');
  const [bankRef, setBankRef] = useState('');
  const [bankSlipPreview, setBankSlipPreview] = useState('');
  const [bankSlipFileName, setBankSlipFileName] = useState('');
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const isSubmittingBankRef = React.useRef(false);
  const [isEzCashVerifying, setIsEzCashVerifying] = useState(false);
  const [isRedeemingVoucher, setIsRedeemingVoucher] = useState(false);
  const [activePanel, setActivePanel] = useState(null);

  // ── Auto-verify Genie return ────────────────────────────────
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const genieStatus = urlParams.get('genie');

    // Retrieve pending transaction state from sessionStorage or fallback localStorage
    let storedTxnId = null;
    let storedOrderRef = null;
    try {
      storedTxnId = sessionStorage.getItem('mads_pending_genie_txnid') || localStorage.getItem('mads_pending_genie_txnid');
      storedOrderRef = sessionStorage.getItem('mads_pending_genie_orderref') || localStorage.getItem('mads_pending_genie_orderref');
    } catch (_) {}

    const txnId = urlParams.get('txnId') || urlParams.get('id') || urlParams.get('transactionId') || storedTxnId;
    const orderRef = urlParams.get('orderRef') || urlParams.get('localId') || storedOrderRef;

    if (genieStatus && (txnId || orderRef)) {
      showToast('Verifying Genie payment...');
      // The server (webhook or this same verify-status call, whichever runs
      // first) is what actually credits the wallet in RTDB — idempotently, so
      // this call is safe to retry. We only display feedback here and let the
      // real-time user listener reflect the true server balance; we must NOT
      // also call creditUserWallet() locally, or a payment already credited
      // by the webhook would be double-added.
      fetch('/api/genie/verify-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txnId || '', orderRef: orderRef || '' })
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.isPaid) {
            // Clean up session and local storage ONLY after payment is confirmed/credited
            try {
              sessionStorage.removeItem('mads_pending_genie_txnid');
              sessionStorage.removeItem('mads_pending_genie_orderref');
              localStorage.removeItem('mads_pending_genie_txnid');
              localStorage.removeItem('mads_pending_genie_orderref');
              localStorage.removeItem('mads_pending_genie_data');
            } catch (_) {}

            const amt = parseFloat(data.amount || 0);
            if (data.credited) {
              addManualPayment({
                id: 'PAY-GENIE-' + (data.transactionId ? String(data.transactionId).slice(-6).toUpperCase() : Math.floor(1000 + Math.random() * 9000)),
                userId: userProfile?.uid || '',
                userEmail: userProfile?.email || 'guest@madstopup.com',
                userName: userProfile?.name || 'Gamer',
                method: 'Online Card / eZ Cash',
                referenceNumber: `Txn: ${data.transactionId || txnId || orderRef}`,
                amount: amt,
                currency: 'LKR',
                slipUrl: '',
                status: 'VERIFIED',
                createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
              });
              showToast(`⚡ CARD PAYMENT VERIFIED! +LKR ${amt.toLocaleString()} credited!`);
            } else if (data.alreadyCredited) {
              showToast(`⚡ Payment already verified — Rs. ${amt.toLocaleString()} is in your wallet!`);
            } else {
              showToast('Payment verified! Wallet balance is syncing...');
            }
          } else {
            showToast(`Genie transaction: ${data.state || 'Pending'}. If you were charged, your wallet will be credited automatically once payment is confirmed.`);
          }
        }).catch(err => {
          console.warn('Genie verify error:', err.message);
          showToast('Could not confirm payment status right now. If you were charged, your wallet will still be credited automatically — check back shortly.', 'error');
        });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // ── Handlers ────────────────────────────────────────────────
  const handleGenieSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(genieAmount);
    if (!amt || amt < 50) { showToast('Minimum deposit is Rs. 50!', 'error'); return; }
    setIsGenieLoading(true);
    try {
      const userId = userProfile?.uid || auth?.currentUser?.uid || '';
      const userEmail = userProfile?.email || auth?.currentUser?.email || 'customer@madstopup.com';
      const userName = userProfile?.name || auth?.currentUser?.displayName || 'Gamer';
      const localId = 'DEP-GENIE-' + Date.now();
      const returnUrl = `${window.location.origin}/wallet?genie=success&orderRef=${encodeURIComponent(localId)}`;
      const response = await fetch('/api/genie/create-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, userId, userEmail, userName, redirectUrl: returnUrl, orderRef: localId })
      });
      const resData = await response.json();
      if (resData.success && resData.redirectUrl) {
        // Persist pending checkout state across tabs and external redirects in both sessionStorage & localStorage
        const pendingRecord = {
          transactionId: resData.transactionId || '',
          orderRef: localId,
          amount: amt,
          timestamp: Date.now()
        };
        try {
          if (resData.transactionId) {
            sessionStorage.setItem('mads_pending_genie_txnid', resData.transactionId);
            localStorage.setItem('mads_pending_genie_txnid', resData.transactionId);
          }
          sessionStorage.setItem('mads_pending_genie_orderref', localId);
          localStorage.setItem('mads_pending_genie_orderref', localId);
          localStorage.setItem('mads_pending_genie_data', JSON.stringify(pendingRecord));
        } catch (_) {}

        showToast('Redirecting to payment gateway...');
        const sep = resData.redirectUrl.includes('?') ? '&' : '?';
        window.location.href = resData.transactionId ? `${resData.redirectUrl}${sep}txnId=${resData.transactionId}` : resData.redirectUrl;
      } else {
        let errText = resData.error || 'Failed to connect to payment gateway';
        if (errText.toLowerCase().includes('unauthorized')) errText = 'Gateway auth failed. Use EZ Cash, Bank, or Binance!';
        showToast(errText, 'error');
      }
    } catch { showToast('Network error connecting to payment gateway!', 'error'); }
    finally { setIsGenieLoading(false); }
  };

  const bankAccountDetails = { bankName: 'Hatton National Bank (HNB)', accountName: 'DILNETH MADUSHANKA', accountNumber: '011020433679', branch: 'Badulla Branch' };

  const handleBankFileChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB!', 'error'); return; }
    setBankSlipFileName(file.name);
    const reader = new FileReader(); reader.onloadend = () => setBankSlipPreview(reader.result); reader.readAsDataURL(file);
  };

  const handleBankDepositSubmit = (e) => {
    e.preventDefault();
    // Synchronous ref guard (not just the isSubmittingBank state) so a rapid
    // double-click can't both pass the check before either click's own
    // handler finishes — state alone can't be relied on within this file's
    // fully synchronous handler.
    if (isSubmittingBankRef.current) return;
    if (!bankAmount || parseFloat(bankAmount) <= 0) { showToast('Please enter a valid amount!', 'error'); return; }
    if (!bankRef.trim()) { showToast('Please enter your name or reference!', 'error'); return; }
    if (!bankSlipPreview) { showToast('Please upload your deposit receipt!', 'error'); return; }
    isSubmittingBankRef.current = true;
    setIsSubmittingBank(true);
    addManualPayment({ id: 'PAY-' + Math.floor(1000 + Math.random() * 9000), userEmail: userProfile?.email || 'guest@madstopup.com', userName: userProfile?.name || 'Gamer', method: 'Bank Deposit', referenceNumber: bankRef.trim(), amount: parseFloat(bankAmount), currency: 'LKR', slipUrl: bankSlipPreview, receiptUrl: bankSlipPreview, status: 'PENDING', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16) });
    showToast('🏦 Bank receipt submitted! Admin will verify shortly.');
    setBankRef(''); setBankSlipPreview(''); setBankSlipFileName(''); setActivePanel(null);
    setTimeout(() => { isSubmittingBankRef.current = false; setIsSubmittingBank(false); }, 1000);
  };

  const binanceMerchantId = '547785111';
  const ezCashMerchantNumber = '0740436276';

  const handleCopy = (text, label = 'Value') => {
    navigator.clipboard.writeText(text); setIsCopied(true);
    showToast(`${label} copied!`); setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePasteBinanceOrder = async () => {
    try { const text = await navigator.clipboard.readText(); if (text) { setBinanceOrderId(text); showToast('Order ID pasted!'); } }
    catch { showToast('Please manually paste your Order ID', 'error'); }
  };

  const handleBinanceSubmit = async (e) => {
    e.preventDefault();
    if (!binanceOrderId) { showToast('Please enter your Binance Order ID!', 'error'); return; }
    if (!binancePayId) { showToast('Please enter your Binance Pay ID!', 'error'); return; }
    const amt = parseFloat(binanceAmount) || 10;
    setIsBinanceVerifying(true);
    try {
      const response = await fetch('/api/binance/verify-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: binanceOrderId, payId: binancePayId, amount: amt }) });
      const resData = await response.json();
      if (resData.verified && resData.autoApproved) {
        creditUserWallet(0, amt);
        addManualPayment({ id: 'PAY-' + Math.floor(1000 + Math.random() * 9000), userEmail: userProfile?.email || 'guest@madstopup.com', userName: userProfile?.name || 'Gamer', method: 'Binance Pay (Automated)', referenceNumber: `Order: ${binanceOrderId} | PayID: ${binancePayId}`, amount: amt, currency: 'USDT', slipUrl: '', status: 'VERIFIED', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16) });
        showToast(`⚡ BINANCE VERIFIED! +${amt} USDT credited!`);
      } else {
        addManualPayment({ id: 'PAY-' + Math.floor(1000 + Math.random() * 9000), userEmail: userProfile?.email || 'guest@madstopup.com', userName: userProfile?.name || 'Gamer', method: 'Binance Pay', referenceNumber: `Order: ${binanceOrderId} | PayID: ${binancePayId}`, amount: amt, currency: 'USDT', slipUrl: '', status: 'PENDING', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16) });
        showToast('Binance deposit submitted for admin verification.');
      }
      setBinanceOrderId(''); setBinancePayId('');
    } catch {
      addManualPayment({ id: 'PAY-' + Math.floor(1000 + Math.random() * 9000), userEmail: userProfile?.email || 'guest@madstopup.com', userName: userProfile?.name || 'Gamer', method: 'Binance Pay', referenceNumber: `Order: ${binanceOrderId} | PayID: ${binancePayId}`, amount: amt, currency: 'USDT', slipUrl: '', status: 'PENDING', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16) });
      showToast('Deposit submitted for admin verification.'); setBinanceOrderId(''); setBinancePayId('');
    } finally { setIsBinanceVerifying(false); }
  };

  const handleEzCashSubmit = async (e) => {
    e.preventDefault();
    const cleanRn = String(ezCashRnNumber || '').trim();
    if (!cleanRn || cleanRn.length < 10) { showToast('Please enter a valid 14-digit RN Number!', 'error'); return; }
    const amt = parseFloat(ezCashAmount) || 1000;
    const userEmail = userProfile?.email || auth?.currentUser?.email || '';
    const userName = userProfile?.name || auth?.currentUser?.displayName || (userEmail ? userEmail.split('@')[0] : 'Gamer');
    const userId = userProfile?.uid || auth?.currentUser?.uid || '';
    const resellerCode = userProfile?.resellerCode || '';
    setIsEzCashVerifying(true);
    try {
      const res = await fetch('/api/ezcash/verify-rn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rnNumber: cleanRn, amount: amt, userEmail }) });
      const resData = await res.json();
      if (resData.verified && resData.autoApproved) {
        creditUserWallet(amt, 0);
        addManualPayment({ id: 'PAY-' + Math.floor(1000 + Math.random() * 9000), userId, userEmail, userName, resellerCode, method: 'EZ Cash (Automated)', referenceNumber: cleanRn, amount: amt, currency: 'LKR', slipUrl: '', status: 'VERIFIED', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16) });
        showToast(`⚡ EZ CASH VERIFIED! +Rs. ${amt.toLocaleString()} LKR credited!`);
      } else {
        addManualPayment({ id: 'PAY-' + Math.floor(1000 + Math.random() * 9000), userId, userEmail, userName, resellerCode, method: 'EZ Cash', referenceNumber: cleanRn, amount: amt, currency: 'LKR', slipUrl: '', status: 'PENDING', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16) });
        showToast('EZ Cash deposit submitted for admin verification.');
      }
      setEzCashRnNumber('');
    } catch {
      addManualPayment({ id: 'PAY-' + Math.floor(1000 + Math.random() * 9000), userId, userEmail, userName, resellerCode, method: 'EZ Cash', referenceNumber: cleanRn, amount: amt, currency: 'LKR', slipUrl: '', status: 'PENDING', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16) });
      showToast('EZ Cash submitted for admin verification.'); setEzCashRnNumber('');
    } finally { setIsEzCashVerifying(false); }
  };

  const handleRedeemSubmit = async (e) => {
    e.preventDefault();
    if (!voucherCode.trim()) { showToast('Please enter a valid voucher code!', 'error'); return; }
    setIsRedeemingVoucher(true);
    try { const result = await redeemVoucher(voucherCode.trim()); if (result?.success) setVoucherCode(''); }
    finally { setIsRedeemingVoucher(false); }
  };

  const goHome = () => { setIsWalletModalOpen(false); setSelectedGame(null); closeCatalog(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const userPayments = (manualPayments || []).filter(p => !userProfile?.email || (p.userEmail && p.userEmail.toLowerCase() === userProfile.email.toLowerCase()));
  const isApprovedReseller = Boolean(userProfile?.isReseller || userProfile?.role === 'reseller');
  const resellerWalletId = `RS-${(userProfile?.uid || '882104').slice(-6).toUpperCase()}`;
  const QUICK_LKR = ['500', '1000', '2000', '5000'];
  const QUICK_USDT = ['5', '10', '20', '50'];

  // ── Shared style tokens ──────────────────────────────────────
  const inputCls = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cc040a]/20 focus:border-[#cc040a]/50 transition-all';
  const btnRed = 'w-full py-3.5 rounded-xl bg-gradient-to-r from-[#cc040a] to-red-600 hover:from-[#b00308] hover:to-red-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const QuickBtn = ({ amounts, current, set, color = '[#cc040a]' }) => (
    <div className="flex gap-2 mt-2">
      {amounts.map(a => (
        <button key={a} type="button" onClick={() => set(a)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border ${current === a
            ? `bg-[#cc040a] border-[#cc040a] text-white shadow-sm`
            : 'bg-white border-slate-200 text-slate-600 hover:border-[#cc040a]/40 hover:text-[#cc040a]'}`}>
          {a}
        </button>
      ))}
    </div>
  );

  const CopyBtn = ({ text, label }) => (
    <button type="button" onClick={() => handleCopy(text, label)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#cc040a]/8 hover:bg-[#cc040a]/15 border border-[#cc040a]/20 rounded-lg text-[#cc040a] text-xs font-black transition-all cursor-pointer">
      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {isCopied ? 'Copied' : 'Copy'}
    </button>
  );

  const methods = [
    {
      id: 'genie', icon: '💳', label: 'Card & eZ Cash',
      sub: 'Instant automated credit', badge: 'INSTANT',
      accent: 'from-[#cc040a] to-red-600', iconBg: 'bg-red-50', iconColor: 'text-[#cc040a]',
      badgeBg: 'bg-emerald-100 text-emerald-700', border: 'hover:border-[#cc040a]/30',
    },
    {
      id: 'ezcash', icon: '📱', label: 'EZ Cash Manual',
      sub: 'Submit RN number for credit', badge: 'FAST',
      accent: 'from-orange-500 to-amber-500', iconBg: 'bg-orange-50', iconColor: 'text-orange-500',
      badgeBg: 'bg-amber-100 text-amber-700', border: 'hover:border-orange-300',
    },
    {
      id: 'binance', icon: '🔶', label: 'Binance Pay',
      sub: 'Pay with USDT crypto', badge: 'USDT',
      accent: 'from-yellow-500 to-amber-400', iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600',
      badgeBg: 'bg-yellow-100 text-yellow-700', border: 'hover:border-yellow-300',
    },
    {
      id: 'bank', icon: '🏦', label: 'Bank Transfer',
      sub: 'HNB bank deposit', badge: 'MANUAL',
      accent: 'from-blue-600 to-indigo-600', iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
      badgeBg: 'bg-blue-100 text-blue-700', border: 'hover:border-blue-300',
    },
  ];
  const activeMethod = methods.find(m => m.id === activePanel);

  return (
    <div className="min-h-screen bg-[#F8FAFF] pb-20 pt-6 animate-in fade-in duration-300 font-sans text-slate-900">

      {/* ── BREADCRUMB NAV ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-6">
        <div className="flex items-center justify-between">
          <button onClick={goHome}
            className="inline-flex items-center gap-2 text-xs font-black text-slate-600 hover:text-[#cc040a] bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Store</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400 font-mono">
            <span onClick={goHome} className="hover:underline cursor-pointer hover:text-[#cc040a] transition-colors">Home</span>
            <span>/</span>
            <span className="text-[#cc040a] font-bold">My Wallet</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">

        {/* ── HERO BALANCE BANNER ── */}
        {isApprovedReseller ? (
          <div className="bg-gradient-to-r from-slate-950 via-[#1E1656] to-slate-950 rounded-3xl p-6 sm:p-10 text-white text-center shadow-2xl relative overflow-hidden border-2 border-amber-500/40">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest">
                <Crown className="w-4 h-4 fill-amber-400" /> RESELLER PARTNER WALLET
              </div>
              <div>
                <span className="text-xs font-black text-slate-300 uppercase tracking-widest block mb-1">Available Balance</span>
                <div className="text-4xl sm:text-6xl font-black font-heading text-white tracking-tight">LKR {(userProfile?.walletBalance || 0).toFixed(2)}</div>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                <div className="inline-flex items-center gap-2 bg-slate-900/80 px-4 py-1.5 rounded-full text-xs font-bold text-white border border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {(userProfile?.walletUsdt || 0).toFixed(2)} USDT
                </div>
                <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-slate-700 px-4 py-1.5 rounded-full text-xs font-mono font-bold text-amber-300">
                  WALLET ID: <span className="text-white font-black">{resellerWalletId}</span>
                  <button onClick={() => handleCopy(resellerWalletId, 'Wallet ID')} className="hover:text-white transition-colors cursor-pointer">
                    {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-[#cc040a] via-[#dc2626] to-[#990207] rounded-3xl p-6 sm:p-10 text-white text-center shadow-2xl relative overflow-hidden border border-red-600/30">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-950/40 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <span className="text-xs font-black text-red-100 uppercase tracking-widest block mb-1">Account Total Balance</span>
              <div className="text-4xl sm:text-6xl font-black font-heading text-white tracking-tight">LKR {(userProfile?.walletBalance || 0).toFixed(2)}</div>
              <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-white border border-white/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  {(userProfile?.walletUsdt || 0).toFixed(2)} USDT
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── RECHARGE SECTION ── */}
        {!activePanel ? (
          <div className="space-y-5">

            {/* Section heading */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 font-heading">Recharge Wallet</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Select your preferred payment method</p>
              </div>
            </div>

            {/* ── METHOD CARDS 2×2 GRID ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {methods.map(m => (
                <button key={m.id} onClick={() => setActivePanel(m.id)}
                  className={`group bg-white rounded-2xl p-4 sm:p-5 text-left border border-slate-200/80 shadow-sm ${m.border} hover:shadow-md transition-all cursor-pointer active:scale-[0.98] relative overflow-hidden`}>
                  {/* Top accent line */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${m.accent} opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl`} />
                  <div className={`w-10 h-10 ${m.iconBg} rounded-xl flex items-center justify-center mb-3 text-xl`}>{m.icon}</div>
                  <div className="text-sm font-black text-slate-900 leading-tight group-hover:text-[#cc040a] transition-colors">{m.label}</div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5 leading-snug">{m.sub}</div>
                  <div className={`inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${m.badgeBg}`}>
                    <Zap className="w-2.5 h-2.5" />{m.badge}
                  </div>
                  <ChevronRight className="absolute top-4 right-4 w-4 h-4 text-slate-300 group-hover:text-[#cc040a] group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>

            {/* ── VOUCHER REDEEM ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
                  <Gift className="w-4 h-4 text-[#cc040a]" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">Redeem Voucher Code</div>
                  <div className="text-[11px] text-slate-400 font-medium">Enter your gift or promotional code</div>
                </div>
              </div>
              <form onSubmit={handleRedeemSubmit} className="flex gap-2">
                <input type="text" placeholder="Enter code e.g. MADS-XXXX-XXXX" value={voucherCode}
                  onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                  className={inputCls + ' flex-1'} />
                <button type="submit" disabled={isRedeemingVoucher || !voucherCode.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-[#cc040a] to-red-600 hover:from-[#b00308] hover:to-red-700 text-white font-black text-xs rounded-xl shrink-0 shadow-md shadow-red-600/20 transition-all disabled:opacity-50 cursor-pointer">
                  {isRedeemingVoucher ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
              </form>
            </div>

          </div>
        ) : (
          /* ── PAYMENT FORM PANEL ── */
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

            {/* Panel header — red gradient matching other pages */}
            <div className={`bg-gradient-to-r ${activeMethod?.accent} p-5 sm:p-6 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl">{activeMethod?.icon}</div>
                <div>
                  <div className="text-base font-black text-white font-heading">{activeMethod?.label}</div>
                  <div className="text-xs text-white/75 font-medium">{activeMethod?.sub}</div>
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="p-2 rounded-xl bg-white/15 hover:bg-white/30 transition-all cursor-pointer">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5">

              {/* ── GENIE (Card / eZ Cash Instant) ── */}
              {activePanel === 'genie' && (
                <form onSubmit={handleGenieSubmit} className="space-y-5">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold text-emerald-700">Accepts Visa, Mastercard, Dialog eZ Cash and Genie Wallet. Balance credited instantly after payment.</span>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Recharge Amount (LKR)</label>
                    <input type="number" value={genieAmount} onChange={e => setGenieAmount(e.target.value)} placeholder="Enter amount in LKR..." className={inputCls} min="50" />
                    <QuickBtn amounts={QUICK_LKR} current={genieAmount} set={setGenieAmount} />
                  </div>
                  <button type="submit" disabled={isGenieLoading} className={btnRed}>
                    {isGenieLoading
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Connecting to Gateway...</span></>
                      : <><Zap className="w-4 h-4 fill-white" /><span>Pay Now — Rs. {Number(genieAmount || 0).toLocaleString()}</span></>}
                  </button>
                  <p className="text-center text-[11px] text-slate-400 font-medium">You will be redirected to Dialog Genie Business IPG secure checkout</p>
                </form>
              )}

              {/* ── EZ CASH MANUAL ── */}
              {activePanel === 'ezcash' && (
                <form onSubmit={handleEzCashSubmit} className="space-y-5">
                  {/* Step 1 — Send money */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full bg-[#cc040a] text-white text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Send EZ Cash to this number</span>
                    </div>
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Dialog eZ Cash Merchant</div>
                        <div className="text-2xl font-black text-slate-900 font-mono tracking-wider">{ezCashMerchantNumber}</div>
                      </div>
                      <CopyBtn text={ezCashMerchantNumber} label="Merchant number" />
                    </div>
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-amber-700 font-medium">After sending, note the 14-digit <strong>RN number</strong> from your Dialog SMS or Genie App transaction history.</span>
                    </div>
                  </div>

                  {/* Step 2 — Submit RN */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#cc040a] text-white text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Enter the amount you sent</span>
                    </div>
                    <input type="number" value={ezCashAmount} onChange={e => setEzCashAmount(e.target.value)} placeholder="Amount sent in LKR..." className={inputCls} min="100" />
                    <QuickBtn amounts={QUICK_LKR} current={ezCashAmount} set={setEzCashAmount} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">14-Digit RN Number</label>
                    <input type="text" value={ezCashRnNumber} onChange={e => setEzCashRnNumber(e.target.value)} placeholder="e.g. 20260910XXXXXXXX" className={inputCls} maxLength={16} />
                  </div>

                  <button type="submit" disabled={isEzCashVerifying}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    {isEzCashVerifying ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Verifying RN...</span></> : <><Zap className="w-4 h-4 fill-white" /><span>Verify & Credit Wallet</span></>}
                  </button>
                </form>
              )}

              {/* ── BINANCE PAY ── */}
              {activePanel === 'binance' && (
                <form onSubmit={handleBinanceSubmit} className="space-y-5">
                  {/* Merchant info */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full bg-[#cc040a] text-white text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Send USDT to this Binance Pay ID</span>
                    </div>
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Binance Pay ID</div>
                        <div className="text-2xl font-black text-slate-900 font-mono tracking-wider">{binanceMerchantId}</div>
                      </div>
                      <CopyBtn text={binanceMerchantId} label="Binance Pay ID" />
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                      📱 After paying: Binance App → <strong>Pay</strong> → <strong>History</strong> → copy your Order ID
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Amount (USDT)</label>
                    <input type="number" value={binanceAmount} onChange={e => setBinanceAmount(e.target.value)} placeholder="USDT amount..." className={inputCls} min="1" step="0.01" />
                    <QuickBtn amounts={QUICK_USDT} current={binanceAmount} set={setBinanceAmount} />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Binance Order ID</label>
                    <div className="relative">
                      <input type="text" value={binanceOrderId} onChange={e => setBinanceOrderId(e.target.value)} placeholder="Paste Order ID from Binance App..." className={inputCls + ' pr-20'} />
                      <button type="button" onClick={handlePasteBinanceOrder}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black rounded-lg transition-all cursor-pointer">Paste</button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Your Binance Pay ID</label>
                    <input type="text" value={binancePayId} onChange={e => setBinancePayId(e.target.value)} placeholder="Your own Binance Pay ID..." className={inputCls} />
                  </div>

                  <button type="submit" disabled={isBinanceVerifying}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-600 hover:to-amber-500 text-slate-900 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    {isBinanceVerifying ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Submitting...</span></> : <><span>🔶</span><span>Submit Binance Deposit</span></>}
                  </button>
                </form>
              )}

              {/* ── BANK TRANSFER ── */}
              {activePanel === 'bank' && (
                <form onSubmit={handleBankDepositSubmit} className="space-y-5">
                  {/* Bank details card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-5 h-5 rounded-full bg-[#cc040a] text-white text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Deposit to this bank account</span>
                    </div>
                    {[['Bank', bankAccountDetails.bankName], ['Account Name', bankAccountDetails.accountName], ['Account No.', bankAccountDetails.accountNumber], ['Branch', bankAccountDetails.branch]].map(([label, value], i, arr) => (
                      <div key={label} className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? 'border-b border-slate-200' : ''}`}>
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</div>
                          <div className="text-sm font-black text-slate-900 font-mono">{value}</div>
                        </div>
                        <button type="button" onClick={() => handleCopy(value, label)}
                          className="p-1.5 hover:bg-slate-200 rounded-lg transition-all cursor-pointer">
                          <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Amount You Deposited (LKR)</label>
                    <input type="number" value={bankAmount} onChange={e => setBankAmount(e.target.value)} placeholder="Exact deposited amount..." className={inputCls} min="100" />
                    <QuickBtn amounts={QUICK_LKR} current={bankAmount} set={setBankAmount} />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Your Name / Bank Reference</label>
                    <input type="text" value={bankRef} onChange={e => setBankRef(e.target.value)} placeholder="Name used at the bank..." className={inputCls} />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Upload Deposit Receipt (Respit)</label>
                    <label className="block border-2 border-dashed border-slate-300 hover:border-[#cc040a]/40 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50 hover:bg-red-50/30">
                      <input type="file" accept="image/*" onChange={handleBankFileChange} className="hidden" />
                      {bankSlipPreview ? (
                        <div className="space-y-2">
                          <img src={bankSlipPreview} alt="Receipt" className="w-full max-h-48 object-contain rounded-xl border border-slate-200" />
                          <span className="text-xs text-slate-500 font-medium block truncate">{bankSlipFileName}</span>
                          <span className="text-[11px] text-emerald-600 font-bold">✓ Receipt uploaded</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center mx-auto">
                            <Upload className="w-6 h-6 text-slate-400" />
                          </div>
                          <div className="text-sm font-bold text-slate-500">Tap to upload deposit slip</div>
                          <div className="text-xs text-slate-400">JPG, PNG · Max 5MB</div>
                        </div>
                      )}
                    </label>
                  </div>

                  <button type="submit" disabled={isSubmittingBank}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                    <Building2 className="w-4 h-4" />
                    <span>{isSubmittingBank ? 'Submitting...' : 'Submit Bank Receipt'}</span>
                  </button>
                </form>
              )}

            </div>
          </div>
        )}

        {/* ── TRANSACTION HISTORY ── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#cc040a]" />
            <h3 className="text-base font-black text-slate-900 font-heading">Recent Deposit History</h3>
            {userPayments.length > 0 && (
              <span className="ml-auto text-[11px] text-slate-400 font-mono">{userPayments.length} record{userPayments.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {userPayments.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-3xl mb-2">📭</div>
              <div className="text-sm font-bold text-slate-400">No deposit history yet</div>
              <div className="text-xs text-slate-300 font-medium mt-1">Your recharge transactions will appear here</div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {userPayments.slice(0, 10).map(pay => (
                <div key={pay.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${pay.status === 'VERIFIED' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                      {pay.status === 'VERIFIED' ? '✅' : '⏳'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900 font-mono">{pay.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${pay.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {pay.status}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-700 mt-0.5 truncate">{pay.method}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">Ref: {pay.referenceNumber}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-12 sm:pl-0">
                    <div className={`text-base font-black font-heading ${pay.status === 'VERIFIED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      +{pay.amount} {pay.currency}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{pay.createdAt}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
