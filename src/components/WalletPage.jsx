import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { auth } from '../services/firebaseAuth';
import { getUserAuthToken } from '../services/serverApi';
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
  const [ezCashPayerPhone, setEzCashPayerPhone] = useState('');
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

  // ── Bonus helper (stable ref via useCallback) ────────────────
  // Defined before useEffect so the .then() closure can safely reference it.
  const getGenieBonus = React.useCallback((amt) => {
    const n = parseFloat(amt) || 0;
    if (n >= 10000) return 200;
    if (n >= 5000) return 100;
    return 0;
  }, []);

  // ── Auto-verify Genie return ────────────────────────────────
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const genieStatus = urlParams.get('genie');
    const storedTxnId = sessionStorage.getItem('mads_pending_genie_txnid');
    const storedOrderRef = sessionStorage.getItem('mads_pending_genie_orderref');
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
          sessionStorage.removeItem('mads_pending_genie_txnid');
          sessionStorage.removeItem('mads_pending_genie_orderref');
          if (data.success && data.isPaid) {
            const amt = parseFloat(data.amount || 0);
            if (data.credited) {
              const bonus = getGenieBonus(amt);
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
              if (bonus > 0) {
                creditUserWallet(bonus, 0);
                addManualPayment({
                  id: 'BONUS-' + Math.floor(1000 + Math.random() * 9000),
                  userId: userProfile?.uid || '',
                  userEmail: userProfile?.email || 'guest@madstopup.com',
                  userName: userProfile?.name || 'Gamer',
                  method: '🎁 Recharge Bonus',
                  referenceNumber: `Bonus for Rs.${amt.toLocaleString()} recharge`,
                  amount: bonus,
                  currency: 'LKR',
                  slipUrl: '',
                  status: 'VERIFIED',
                  createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
                });
                showToast(`⚡ CARD PAYMENT VERIFIED! +LKR ${amt.toLocaleString()} + 🎁 Rs.${bonus} BONUS credited!`);
              } else {
                showToast(`⚡ CARD PAYMENT VERIFIED! +LKR ${amt.toLocaleString()} credited!`);
              }
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
        if (resData.transactionId) {
          sessionStorage.setItem('mads_pending_genie_txnid', resData.transactionId);
        }
        sessionStorage.setItem('mads_pending_genie_orderref', localId);
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
    const cleanRn = String(ezCashRnNumber || '').replace(/\D/g, '');
    if (!cleanRn || cleanRn.length < 10) { showToast('Please enter a valid 14-digit RN Number!', 'error'); return; }
    const phoneDigits = String(ezCashPayerPhone || '').replace(/\D/g, '');
    if (phoneDigits.length < 9) { showToast('Please enter the mobile number you sent the EZ Cash from!', 'error'); return; }
    const amt = parseFloat(ezCashAmount) || 1000;
    const userEmail = userProfile?.email || auth?.currentUser?.email || '';
    const userName = userProfile?.name || auth?.currentUser?.displayName || (userEmail ? userEmail.split('@')[0] : 'Gamer');
    const userId = userProfile?.uid || auth?.currentUser?.uid || '';
    const resellerCode = userProfile?.resellerCode || '';
    const pendingRecord = () => ({ id: 'PAY-' + Math.floor(1000 + Math.random() * 9000), userId, userEmail, userName, resellerCode, method: 'EZ Cash', referenceNumber: cleanRn, payerPhone: '0' + phoneDigits.slice(-9), amount: amt, currency: 'LKR', slipUrl: '', status: 'PENDING', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16) });
    setIsEzCashVerifying(true);
    try {
      // Signed-in token so the server can credit this account itself on auto-approval.
      const token = await getUserAuthToken(userProfile);
      const res = await fetch('/api/ezcash/verify-rn', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ rnNumber: cleanRn, amount: amt, payerPhone: phoneDigits }) });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(resData.error || 'Could not submit this RN. Please try again.', 'error'); return; }
      if (resData.verified && resData.autoApproved) {
        // The server already credited the wallet and saved the deposit record.
        creditUserWallet(Number(resData.amountLkr) || amt, 0);
        showToast(`⚡ EZ CASH VERIFIED! +Rs. ${(Number(resData.amountLkr) || amt).toLocaleString()} LKR credited!`);
      } else {
        addManualPayment(pendingRecord());
        showToast('EZ Cash deposit submitted for admin verification.');
      }
      setEzCashRnNumber('');
    } catch {
      addManualPayment(pendingRecord());
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
  const inputCls = 'w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 text-sm font-bold placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:border-[#cc040a] focus:ring-4 focus:ring-[#cc040a]/10 transition-all';
  const labelCls = 'text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2';
  const btnRed = 'w-full py-4 rounded-xl bg-[#cc040a] hover:bg-[#b00308] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const cardCls = 'bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5';

  const stepHead = (n, text) => (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="w-6 h-6 rounded-full bg-[#cc040a] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-sm shadow-red-600/30">{n}</span>
      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{text}</span>
    </div>
  );

  const QuickBtn = ({ amounts, current, set }) => (
    <div className="flex flex-wrap gap-2 mt-2.5">
      {amounts.map(a => (
        <button key={a} type="button" onClick={() => set(a)}
          className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer border-2 ${current === a
            ? 'bg-[#cc040a] border-[#cc040a] text-white shadow-sm shadow-red-600/25'
            : 'bg-white border-slate-200 text-slate-600 hover:border-[#cc040a]/50 hover:text-[#cc040a]'}`}>
          {Number(a).toLocaleString()}
        </button>
      ))}
    </div>
  );

  const CopyBtn = ({ text, label }) => (
    <button type="button" onClick={() => handleCopy(text, label)}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#cc040a] hover:bg-[#b00308] rounded-lg text-white text-xs font-black transition-all cursor-pointer shrink-0 shadow-sm shadow-red-600/25">
      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {isCopied ? 'Copied' : 'Copy'}
    </button>
  );

  const payToCard = ({ icon, kicker, value, copyLabel }) => (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#cc040a] via-[#b00308] to-[#7a0105] p-5 text-white shadow-lg shadow-red-700/25">
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-14 -left-8 w-36 h-36 rounded-full bg-black/10 pointer-events-none" />
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg">{icon}</div>
          <span className="text-[11px] font-black uppercase tracking-widest text-red-100">{kicker}</span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">Pay to</span>
      </div>
      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-red-200 mb-1">Number</div>
          <div className="text-2xl sm:text-3xl font-black font-mono tracking-[0.12em] truncate">{value}</div>
        </div>
        <button type="button" onClick={() => handleCopy(value, copyLabel)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-red-50 text-[#cc040a] rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 shadow-md active:scale-95">
          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );

  const noteBox = (children) => (
    <div className="flex items-start gap-2.5 bg-white border border-slate-200 border-l-4 border-l-[#cc040a] rounded-xl px-3.5 py-3 mt-3 text-[11px] text-slate-600 font-medium leading-relaxed">
      {children}
    </div>
  );

  const methods = [
    { id: 'genie',   icon: '💳', label: 'Card & eZ Cash', sub: 'Instant automated credit',     badge: 'INSTANT' },
    { id: 'ezcash',  icon: '📱', label: 'EZ Cash Manual', sub: 'Submit RN number for credit',  badge: 'FAST' },
    { id: 'binance', icon: '🔶', label: 'Binance Pay',    sub: 'Pay with USDT crypto',         badge: 'USDT' },
    { id: 'bank',    icon: '🏦', label: 'Bank Transfer',  sub: 'HNB bank deposit',             badge: 'MANUAL' },
  ];
  const activeMethod = methods.find(m => m.id === activePanel);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-6 animate-in fade-in duration-300 font-sans text-slate-900">

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
                <h2 className="text-lg font-black text-slate-900 font-heading leading-none">Recharge Wallet</h2>
                <div className="w-12 h-1 bg-[#cc040a] rounded-full mt-1.5 mb-1.5"></div>
                <p className="text-xs text-slate-500 font-medium">Select your preferred payment method</p>
              </div>
            </div>

            {/* ── METHOD CARDS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {methods.map(m => (
                <button key={m.id} onClick={() => setActivePanel(m.id)}
                  className="group bg-white rounded-2xl p-4 text-left border-2 border-slate-200 hover:border-[#cc040a]/50 hover:shadow-md hover:shadow-red-600/5 transition-all cursor-pointer active:scale-[0.99] flex items-center gap-4">
                  <div className="w-14 h-14 shrink-0 rounded-2xl bg-slate-100 group-hover:bg-[#cc040a] flex items-center justify-center text-2xl transition-colors">{m.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900 font-heading leading-tight">{m.label}</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5 leading-snug">{m.sub}</div>
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-[#cc040a] border border-red-100">
                      <Zap className="w-2.5 h-2.5" />{m.badge}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 shrink-0 text-slate-300 group-hover:text-[#cc040a] group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>

            {/* ── VOUCHER REDEEM ── */}
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-[#cc040a] rounded-xl flex items-center justify-center shadow-md shadow-red-600/25">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900 font-heading">Redeem Voucher Code</div>
                  <div className="text-xs text-slate-500 font-medium">Enter your gift or promotional code</div>
                </div>
              </div>
              <form onSubmit={handleRedeemSubmit} className="flex flex-col sm:flex-row gap-2">
                <input type="text" placeholder="MADS-XXXX-XXXX" value={voucherCode}
                  onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                  className={inputCls + ' flex-1 font-mono tracking-wider'} />
                <button type="submit" disabled={isRedeemingVoucher || !voucherCode.trim()}
                  className="px-7 py-3 bg-[#cc040a] hover:bg-[#b00308] text-white font-black text-sm rounded-xl shrink-0 shadow-md shadow-red-600/25 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center">
                  {isRedeemingVoucher ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
              </form>
            </div>

          </div>
        ) : (
          /* ── PAYMENT FORM PANEL ── */
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

            {/* Panel header — red gradient matching other pages */}
            <div className={`bg-gradient-to-r from-[#cc040a] to-[#990207] p-5 sm:p-6 flex items-center justify-between`}>
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
              {activePanel === 'genie' && (() => {
                const gAmt = parseFloat(genieAmount) || 0;
                const gBonus = getGenieBonus(genieAmount);
                const nextTier = gAmt < 5000 ? 5000 : gAmt < 10000 ? 10000 : null;
                const prevTier = gAmt < 5000 ? 0 : 5000;
                const tierPct = nextTier ? Math.min(100, Math.max(0, ((gAmt - prevTier) / (nextTier - prevTier)) * 100)) : 100;
                const gBonusNext = nextTier === 5000 ? 100 : 200;
                return (
                <form onSubmit={handleGenieSubmit} className="space-y-5">
                  {/* Accepted methods strip */}
                  <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-700">
                      <span className="relative flex w-2.5 h-2.5"><span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" /><span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500" /></span>
                      Instant credit after payment
                    </div>
                    <div className="flex items-center gap-1.5">
                      {['VISA', 'Mastercard', 'eZ Cash', 'Genie'].map(b => (
                        <span key={b} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-black text-slate-600 tracking-wide">{b}</span>
                      ))}
                    </div>
                  </div>

                  {/* Amount hero */}
                  <div className="rounded-3xl border-2 border-slate-200 bg-white p-5 sm:p-6 text-center">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-3">Recharge Amount (LKR)</label>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-slate-300 font-heading">Rs.</span>
                      <input type="number" value={genieAmount} onChange={e => setGenieAmount(e.target.value)} placeholder="0" min="50"
                        className="w-44 sm:w-56 bg-transparent text-4xl sm:text-5xl font-black font-heading text-slate-900 text-center placeholder:text-slate-300 focus:outline-none border-b-4 border-slate-200 focus:border-[#cc040a] transition-colors pb-1" />
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {QUICK_LKR.concat(['10000']).map(a => (
                        <button key={a} type="button" onClick={() => setGenieAmount(a)}
                          className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer border-2 ${genieAmount === a
                            ? 'bg-[#cc040a] border-[#cc040a] text-white shadow-sm shadow-red-600/25'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-[#cc040a]/50 hover:text-[#cc040a]'}`}>
                          {Number(a).toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bonus progress */}
                  <div className="bg-red-50/60 border border-red-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-[#cc040a] shrink-0" />
                        <span className="text-xs font-black text-[#990207] uppercase tracking-wider">Recharge Bonus</span>
                      </div>
                      <span className="text-[11px] font-black text-[#cc040a]">
                        {nextTier ? `Rs. ${(nextTier - gAmt > 0 ? nextTier - gAmt : 0).toLocaleString()} more → +Rs. ${gBonusNext}` : 'Max bonus unlocked 🎉'}
                      </span>
                    </div>
                    <div className="h-2.5 bg-white rounded-full overflow-hidden border border-red-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#cc040a] to-red-500 transition-all duration-500" style={{ width: `${tierPct}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 mt-3">
                      {[[100, 'Rs. 5,000+', (b) => b >= 100], [200, 'Rs. 10,000+', (b) => b === 200]].map(([amt, tier, isActive]) => {
                        const on = isActive(gBonus);
                        return (
                          <div key={amt} className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 border-2 transition-all ${on ? 'bg-[#cc040a] border-[#cc040a] shadow-md shadow-red-600/25' : 'bg-white border-red-100'}`}>
                            <span className={`text-[10px] font-black uppercase tracking-wider ${on ? 'text-red-100' : 'text-slate-500'}`}>{tier}</span>
                            <span className={`text-base font-black font-heading ${on ? 'text-white' : 'text-[#cc040a]'}`}>+Rs. {amt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order summary */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl divide-y divide-slate-200 text-sm">
                    <div className="flex items-center justify-between px-4 py-3"><span className="text-slate-500 font-semibold">Amount</span><span className="font-black text-slate-900">Rs. {gAmt.toLocaleString()}</span></div>
                    <div className="flex items-center justify-between px-4 py-3"><span className="text-slate-500 font-semibold">Bonus</span><span className={`font-black ${gBonus > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{gBonus > 0 ? `+ Rs. ${gBonus}` : '—'}</span></div>
                    <div className="flex items-center justify-between px-4 py-3.5 bg-white rounded-b-2xl"><span className="text-slate-900 font-black">You receive</span><span className="text-xl font-black font-heading text-[#cc040a]">Rs. {(gAmt + gBonus).toLocaleString()}</span></div>
                  </div>

                  <button type="submit" disabled={isGenieLoading} className={btnRed}>
                    {isGenieLoading
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Connecting to Gateway...</span></>
                      : <><Zap className="w-4 h-4 fill-white" /><span>Pay Now — Rs. {Number(genieAmount || 0).toLocaleString()}{gBonus > 0 ? ` + 🎁 Rs.${gBonus} Bonus` : ''}</span></>}
                  </button>
                  <p className="text-center text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5"><span>🔒</span>You will be redirected to Dialog Genie Business IPG secure checkout</p>
                </form>
                );
              })()}

              {/* ── EZ CASH MANUAL ── */}
              {activePanel === 'ezcash' && (() => {
                const rnLen = String(ezCashRnNumber || '').trim().length;
                const rnOk = rnLen >= 10 && String(ezCashPayerPhone || '').replace(/\D/g, '').length >= 9;
                const eAmt = parseFloat(ezCashAmount) || 0;
                return (
                <form onSubmit={handleEzCashSubmit} className="space-y-5">
                  {/* Progress stepper */}
                  <div className="flex items-center justify-between px-1">
                    {[['Send', true], ['Amount', eAmt > 0], ['Verify', rnOk]].map(([label, done], i, arr) => (
                      <React.Fragment key={label}>
                        <div className="flex flex-col items-center gap-1.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${done ? 'bg-[#cc040a] border-[#cc040a] text-white shadow-md shadow-red-600/25' : 'bg-white border-slate-300 text-slate-400'}`}>
                            {done && i > 0 ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${done ? 'text-[#cc040a]' : 'text-slate-400'}`}>{label}</span>
                        </div>
                        {i < arr.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-5 rounded-full transition-colors ${arr[i + 1][1] ? 'bg-[#cc040a]' : 'bg-slate-200'}`} />}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className={cardCls}>
                    {stepHead(1, 'Send EZ Cash to this number')}
                    {payToCard({ icon: '📱', kicker: 'Dialog eZ Cash Merchant', value: ezCashMerchantNumber, copyLabel: 'Merchant number' })}
                    {noteBox(<><AlertTriangle className="w-4 h-4 text-[#cc040a] shrink-0 mt-0.5" /><span>After sending, note the 14-digit <strong className="text-slate-900">RN number</strong> from your Dialog SMS or Genie App transaction history.</span></>)}
                  </div>

                  <div className={cardCls}>
                    {stepHead(2, 'Enter the amount you sent')}
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rs.</span>
                      <input type="number" value={ezCashAmount} onChange={e => setEzCashAmount(e.target.value)} placeholder="Amount sent in LKR..." className={inputCls + ' pl-12 text-base'} min="100" />
                    </div>
                    <QuickBtn amounts={QUICK_LKR} current={ezCashAmount} set={setEzCashAmount} />
                  </div>

                  <div className={cardCls}>
                    {stepHead(3, '14-Digit RN Number')}
                    <div className="relative">
                      <input type="text" value={ezCashRnNumber} onChange={e => setEzCashRnNumber(e.target.value)} placeholder="e.g. 20260910XXXXXXXX" className={inputCls + ' font-mono tracking-wider pr-16'} maxLength={16} />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-black font-mono px-2 py-1 rounded-md ${rnOk ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{rnLen}/14</span>
                    </div>
                  </div>

                  <div className={cardCls}>
                    {stepHead(4, 'Mobile number you paid from')}
                    <input type="tel" value={ezCashPayerPhone} onChange={e => setEzCashPayerPhone(e.target.value)} placeholder="e.g. 077XXXXXXX" className={inputCls + ' font-mono tracking-wider'} maxLength={15} />
                    <p className="text-[11px] text-slate-500 font-medium mt-2">The eZ Cash number the money was sent from. We match it with the payment so nobody else can use your RN.</p>
                  </div>

                  <div className="flex items-center justify-between bg-red-50/60 border border-red-100 rounded-2xl px-4 py-3">
                    <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Wallet credit</span>
                    <span className="text-lg font-black font-heading text-[#cc040a]">Rs. {eAmt.toLocaleString()}</span>
                  </div>

                  <button type="submit" disabled={isEzCashVerifying} className={btnRed}>
                    {isEzCashVerifying ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Verifying RN...</span></> : <><Zap className="w-4 h-4 fill-white" /><span>Verify & Credit Wallet</span></>}
                  </button>
                </form>
                );
              })()}

              {/* ── BINANCE PAY ── */}
              {activePanel === 'binance' && (
                <form onSubmit={handleBinanceSubmit} className="space-y-5">
                  <div className={cardCls}>
                    {stepHead(1, 'Send USDT to this Binance Pay ID')}
                    {payToCard({ icon: '🔶', kicker: 'Binance Pay ID', value: binanceMerchantId, copyLabel: 'Binance Pay ID' })}
                    {noteBox(<><span className="shrink-0">📱</span><span>After paying: Binance App → <strong className="text-slate-900">Pay</strong> → <strong className="text-slate-900">History</strong> → copy your Order ID</span></>)}
                  </div>

                  <div className={cardCls}>
                    {stepHead(2, 'Amount (USDT)')}
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">$</span>
                      <input type="number" value={binanceAmount} onChange={e => setBinanceAmount(e.target.value)} placeholder="USDT amount..." className={inputCls + ' pl-9'} min="1" step="0.01" />
                    </div>
                    <QuickBtn amounts={QUICK_USDT} current={binanceAmount} set={setBinanceAmount} />
                  </div>

                  <div className={cardCls + ' space-y-4'}>
                    {stepHead(3, 'Confirm your payment')}
                    <div>
                      <label className={labelCls}>Binance Order ID</label>
                      <div className="relative">
                        <input type="text" value={binanceOrderId} onChange={e => setBinanceOrderId(e.target.value)} placeholder="Paste Order ID from Binance App..." className={inputCls + ' pr-20'} />
                        <button type="button" onClick={handlePasteBinanceOrder}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-100 hover:bg-[#cc040a] hover:text-white text-slate-700 text-[11px] font-black rounded-lg transition-all cursor-pointer">Paste</button>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Your Binance Pay ID</label>
                      <input type="text" value={binancePayId} onChange={e => setBinancePayId(e.target.value)} placeholder="Your own Binance Pay ID..." className={inputCls} />
                    </div>
                  </div>

                  <button type="submit" disabled={isBinanceVerifying} className={btnRed}>
                    {isBinanceVerifying ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Submitting...</span></> : <><span>🔶</span><span>Submit Binance Deposit</span></>}
                  </button>
                </form>
              )}

              {/* ── BANK TRANSFER ── */}
              {activePanel === 'bank' && (
                <form onSubmit={handleBankDepositSubmit} className="space-y-5">
                  <div className={cardCls}>
                    {stepHead(1, 'Deposit to this bank account')}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#cc040a] via-[#b00308] to-[#7a0105] p-5 text-white shadow-lg shadow-red-700/25">
                      <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
                      <div className="absolute -bottom-16 -left-10 w-40 h-40 rounded-full bg-black/10 pointer-events-none" />
                      <div className="relative flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0"><Building2 className="w-4.5 h-4.5 text-white" /></div>
                          <span className="text-xs font-black uppercase tracking-wider truncate">{bankAccountDetails.bankName}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full shrink-0">Deposit</span>
                      </div>
                      <div className="relative flex items-end justify-between gap-3 mb-5">
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-red-200 mb-1">Account Number</div>
                          <div className="text-2xl sm:text-3xl font-black font-mono tracking-[0.12em] truncate">{bankAccountDetails.accountNumber}</div>
                        </div>
                        <button type="button" onClick={() => handleCopy(bankAccountDetails.accountNumber, 'Account No.')}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-red-50 text-[#cc040a] rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 shadow-md active:scale-95">
                          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {isCopied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="relative grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
                        {[['Account Name', bankAccountDetails.accountName], ['Branch', bankAccountDetails.branch]].map(([label, value]) => (
                          <button key={label} type="button" onClick={() => handleCopy(value, label)} className="text-left min-w-0 group cursor-pointer">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-red-200 mb-0.5 flex items-center gap-1">{label}<Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                            <div className="text-sm font-black truncate">{value}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={cardCls + ' space-y-4'}>
                    {stepHead(2, 'Your deposit details')}
                    <div>
                      <label className={labelCls}>Amount You Deposited (LKR)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rs.</span>
                        <input type="number" value={bankAmount} onChange={e => setBankAmount(e.target.value)} placeholder="Exact deposited amount..." className={inputCls + ' pl-12'} min="100" />
                      </div>
                      <QuickBtn amounts={QUICK_LKR} current={bankAmount} set={setBankAmount} />
                    </div>
                    <div>
                      <label className={labelCls}>Your Name / Bank Reference</label>
                      <input type="text" value={bankRef} onChange={e => setBankRef(e.target.value)} placeholder="Name used at the bank..." className={inputCls} />
                    </div>
                  </div>

                  <div className={cardCls}>
                    {stepHead(3, 'Upload deposit receipt')}
                    <label className="block border-2 border-dashed border-slate-300 hover:border-[#cc040a] rounded-2xl p-6 text-center cursor-pointer transition-all bg-white hover:bg-red-50/30">
                      <input type="file" accept="image/*" onChange={handleBankFileChange} className="hidden" />
                      {bankSlipPreview ? (
                        <div className="space-y-2">
                          <img src={bankSlipPreview} alt="Receipt" className="w-full max-h-48 object-contain rounded-xl border border-slate-200" />
                          <span className="text-xs text-slate-500 font-medium block truncate">{bankSlipFileName}</span>
                          <span className="text-[11px] text-emerald-600 font-bold">✓ Receipt uploaded — tap to change</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto">
                            <Upload className="w-6 h-6 text-[#cc040a]" />
                          </div>
                          <div className="text-sm font-black text-slate-700">Tap to upload deposit slip</div>
                          <div className="text-xs text-slate-400">JPG, PNG · Max 5MB</div>
                        </div>
                      )}
                    </label>
                  </div>

                  <button type="submit" disabled={isSubmittingBank} className={btnRed}>
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#cc040a] flex items-center justify-center shadow-md shadow-red-600/25">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 font-heading leading-none">Recent Deposit History</h3>
              <div className="w-10 h-1 bg-[#cc040a] rounded-full mt-1.5"></div>
            </div>
            {userPayments.length > 0 && (
              <span className="ml-auto text-[11px] font-black text-[#cc040a] bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">{userPayments.length} record{userPayments.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {userPayments.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <div className="text-3xl mb-2">📭</div>
              <div className="text-sm font-bold text-slate-500">No deposit history yet</div>
              <div className="text-xs text-slate-400 font-medium mt-1">Your recharge transactions will appear here</div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {userPayments.slice(0, 10).map(pay => {
                const ok = pay.status === 'VERIFIED';
                return (
                  <div key={pay.id} className={`p-4 bg-white rounded-2xl border border-slate-200 border-l-4 ${ok ? 'border-l-emerald-500' : 'border-l-amber-400'} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base ${ok ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                        {ok ? '✅' : '⏳'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900 font-mono">{pay.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {pay.status}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-slate-700 mt-0.5 truncate">{pay.method}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">Ref: {pay.referenceNumber}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-[52px] sm:pl-0">
                      <div className={`text-base font-black font-heading ${ok ? 'text-emerald-600' : 'text-amber-600'}`}>
                        +{pay.amount} {pay.currency}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{pay.createdAt}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
