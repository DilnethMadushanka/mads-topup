import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { auth } from '../services/firebaseAuth';
import { getUserAuthToken } from '../services/serverApi';
import { WalletHistory } from './WalletHistory';
import {
  Wallet, Copy, Check, ArrowLeft, Zap, Crown,
  Building2, Upload, ChevronRight, X, RefreshCw, AlertTriangle,
  CreditCard, Smartphone, DollarSign, Gift, Coins, Landmark, ShieldCheck
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
      const token = await getUserAuthToken(userProfile);
      if (!token) { showToast('Please log in again to deposit.', 'error'); return; }
      const response = await fetch('/api/genie/create-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
    const orderId = binanceOrderId.trim();
    if (!orderId) { showToast('Please enter your Binance Order ID!', 'error'); return; }
    if (!binancePayId) { showToast('Please enter your Binance Pay ID!', 'error'); return; }
    const amt = parseFloat(binanceAmount) || 10;
    const userEmail = userProfile?.email || auth?.currentUser?.email || '';
    const userId = userProfile?.uid || auth?.currentUser?.uid || '';
    const pendingRecord = () => ({ id: 'PAY-' + Math.floor(1000 + Math.random() * 9000), userId, userEmail: userEmail || 'guest@madstopup.com', userName: userProfile?.name || 'Gamer', method: 'Binance Pay', referenceNumber: `Order: ${orderId} | PayID: ${binancePayId}`, amount: amt, currency: 'USDT', slipUrl: '', status: 'PENDING', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16) });
    setIsBinanceVerifying(true);
    try {
      // The server checks the Order ID against our Binance Pay history and credits the wallet itself.
      const token = await getUserAuthToken(userProfile);
      const response = await fetch('/api/binance/verify-order', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ orderId, payId: binancePayId, amount: amt }) });
      const resData = await response.json().catch(() => ({}));
      if (!response.ok) { showToast(resData.error || 'Could not submit this Binance order. Please try again.', 'error'); return; }
      if (resData.verified && resData.autoApproved) {
        const credited = Number(resData.amountUsdt) || amt;
        creditUserWallet(0, credited);
        showToast(`⚡ BINANCE VERIFIED! +$${credited} USDT credited!`);
      } else {
        addManualPayment(pendingRecord());
        showToast('Binance deposit submitted for admin verification.');
      }
      setBinanceOrderId(''); setBinancePayId('');
    } catch {
      addManualPayment(pendingRecord());
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
  const inputCls = 'wf-input';
  const labelCls = 'wf-label';
  const btnRed = 'wf-submit';
  const cardCls = 'wf-step';

  const stepHead = (n, text) => (
    <div className="wf-step-head">
      <span className="wf-step-num">{n}</span>
      <span className="wf-step-title">{text}</span>
    </div>
  );

  const QuickBtn = ({ amounts, current, set }) => (
    <div className="wf-chips">
      {amounts.map(a => (
        <button key={a} type="button" onClick={() => set(a)} className={`wf-chip${current === a ? ' is-active' : ''}`}>
          {Number(a).toLocaleString()}
        </button>
      ))}
    </div>
  );

  const CopyBtn = ({ text, label }) => (
    <button type="button" onClick={() => handleCopy(text, label)}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1677ff] hover:bg-[#0d68e6] rounded-lg text-white text-xs font-black transition-all cursor-pointer shrink-0 shadow-sm shadow-brand-600/25">
      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {isCopied ? 'Copied' : 'Copy'}
    </button>
  );

  const payToCard = ({ icon, kicker, value, copyLabel }) => (
    <div className="wf-payto">
      <div className="wf-payto-top">
        <span className="wf-payto-brand"><span className="wf-payto-ico">{icon}</span>{kicker}</span>
        <span className="wf-payto-tag">Pay to</span>
      </div>
      <div className="wf-payto-row">
        <div className="wf-payto-val">
          <small>Number</small>
          <strong>{value}</strong>
        </div>
        <button type="button" onClick={() => handleCopy(value, copyLabel)} className="wf-copy">
          {isCopied ? <Check /> : <Copy />}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );

  const noteBox = (children) => (
    <div className="wf-note">{children}</div>
  );

  const methods = [
    { id: 'genie',   icon: '💳', Icon: CreditCard, tone: 'blue',  label: 'Card & eZ Cash', sub: 'Instant automated credit',     badge: 'INSTANT', featured: true },
    { id: 'ezcash',  icon: '📱', Icon: Smartphone, tone: 'teal',  label: 'EZ Cash Manual', sub: 'Submit RN number for credit',  badge: 'FAST' },
    { id: 'binance', icon: '🔶', Icon: Coins,      tone: 'gold',  label: 'Binance Pay',    sub: 'Pay with USDT crypto',         badge: 'USDT' },
    { id: 'bank',    icon: '🏦', Icon: Landmark,   tone: 'violet', label: 'Bank Transfer', sub: 'HNB bank deposit',             badge: 'MANUAL' },
  ];
  const activeMethod = methods.find(m => m.id === activePanel);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-6 animate-in fade-in duration-300 font-sans text-slate-900">

      {/* ── BREADCRUMB NAV ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-6">
        <div className="flex items-center justify-between">
          <button onClick={goHome}
            className="inline-flex items-center gap-2 text-xs font-black text-slate-600 hover:text-[#1677ff] bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Store</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400 font-mono">
            <span onClick={goHome} className="hover:underline cursor-pointer hover:text-[#1677ff] transition-colors">Home</span>
            <span>/</span>
            <span className="text-[#1677ff] font-bold">My Wallet</span>
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
          <div className="bg-gradient-to-r from-[#1677ff] via-[#1764f5] to-[#0b5ed7] rounded-3xl p-6 sm:p-10 text-white text-center shadow-2xl relative overflow-hidden border border-brand-600/30">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-950/40 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <span className="text-xs font-black text-brand-100 uppercase tracking-widest block mb-1">Account Total Balance</span>
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
            <div className="wm-head">
              <span className="wm-head-ico"><Wallet /></span>
              <div>
                <h2 className="wm-head-title">Recharge Wallet</h2>
                <p className="wm-head-sub">Select your preferred payment method</p>
              </div>
            </div>

            {/* ── METHOD CARDS ── */}
            <div className="wm-grid">
              {methods.map(({ id, Icon, tone, label, sub, badge, featured }) => (
                <button key={id} onClick={() => setActivePanel(id)} className={`wm-card is-${tone}${featured ? ' is-featured' : ''}`}>
                  <Icon className="wm-mark" aria-hidden="true" />
                  <span className="wm-ico"><Icon /></span>
                  <span className="wm-body">
                    <span className="wm-title">{label}{featured && <em>Fastest</em>}</span>
                    <span className="wm-sub">{sub}</span>
                    <span className="wm-badge"><Zap />{badge}</span>
                  </span>
                  <span className="wm-go" aria-hidden="true"><ChevronRight /></span>
                </button>
              ))}
            </div>

            {/* ── VOUCHER REDEEM ── */}
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-[#1677ff] rounded-xl flex items-center justify-center shadow-md shadow-brand-600/25">
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
                  className="px-7 py-3 bg-[#1677ff] hover:bg-[#0d68e6] text-white font-black text-sm rounded-xl shrink-0 shadow-md shadow-brand-600/25 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center">
                  {isRedeemingVoucher ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
              </form>
            </div>

          </div>
        ) : (
          /* ── PAYMENT FORM PANEL ── */
          <div className={`wf-panel is-${activeMethod?.tone || 'blue'}`}>

            <div className="wf-head">
              {activeMethod?.Icon && <activeMethod.Icon className="wf-head-mark" aria-hidden="true" />}
              <button type="button" onClick={() => setActivePanel(null)} className="wf-back">
                <ArrowLeft />
                <span>All methods</span>
              </button>
              <div className="wf-head-main">
                <span className="wf-head-ico">{activeMethod?.Icon && <activeMethod.Icon />}</span>
                <div className="min-w-0">
                  <span className="wf-head-badge"><Zap />{activeMethod?.badge}</span>
                  <div className="wf-head-title">{activeMethod?.label}</div>
                  <div className="wf-head-sub">{activeMethod?.sub}</div>
                </div>
              </div>
              <button type="button" onClick={() => setActivePanel(null)} className="wf-close" aria-label="Close">
                <X />
              </button>
            </div>

            <div className="wf-body">

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
                  <div className="wf-accept">
                    <span className="wf-live"><i />Instant credit after payment</span>
                    <span className="wf-brands">
                      {['VISA', 'Mastercard', 'eZ Cash', 'Genie'].map(b => <span key={b}>{b}</span>)}
                    </span>
                  </div>

                  {/* Amount hero */}
                  <div className="wf-amount">
                    <label className="wf-label">Recharge amount (LKR)</label>
                    <div className="wf-amount-row">
                      <span className="wf-amount-cur">Rs.</span>
                      {/* No type attribute: the global 16px !important input rule targets typed inputs only. */}
                      <input inputMode="numeric" value={genieAmount} onChange={e => setGenieAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" aria-label="Recharge amount" className="wf-amount-input" />
                    </div>
                    <div className="wf-chips is-center">
                      {QUICK_LKR.concat(['10000']).map(a => (
                        <button key={a} type="button" onClick={() => setGenieAmount(a)} className={`wf-chip${genieAmount === a ? ' is-active' : ''}`}>
                          {Number(a).toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bonus progress */}
                  <div className="wf-bonus">
                    <div className="wf-bonus-top">
                      <span className="wf-bonus-title"><span><Gift /></span>Recharge bonus</span>
                      <span className="wf-bonus-next">
                        {nextTier ? `Rs. ${(nextTier - gAmt > 0 ? nextTier - gAmt : 0).toLocaleString()} more → +Rs. ${gBonusNext}` : 'Max bonus unlocked 🎉'}
                      </span>
                    </div>
                    <div className="wf-bar"><span style={{ width: `${tierPct}%` }} /></div>
                    <div className="wf-tiers">
                      {[[100, 'Rs. 5,000+', (b) => b >= 100], [200, 'Rs. 10,000+', (b) => b === 200]].map(([amt, tier, isActive]) => {
                        const on = isActive(gBonus);
                        return (
                          <div key={amt} className={`wf-tier${on ? ' is-on' : ''}`}>
                            <span>{tier}</span>
                            <strong>+Rs. {amt}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order summary */}
                  <div className="wf-summary">
                    <div><span>Amount</span><b>Rs. {gAmt.toLocaleString()}</b></div>
                    <div><span>Bonus</span><b className={gBonus > 0 ? 'is-plus' : 'is-none'}>{gBonus > 0 ? `+ Rs. ${gBonus}` : '—'}</b></div>
                    <div className="is-total"><span>You receive</span><strong>Rs. {(gAmt + gBonus).toLocaleString()}</strong></div>
                  </div>

                  <button type="submit" disabled={isGenieLoading} className={btnRed}>
                    {isGenieLoading
                      ? <><RefreshCw className="animate-spin" /><span>Connecting to gateway...</span></>
                      : <><Zap /><span>Pay Rs. {Number(genieAmount || 0).toLocaleString()}{gBonus > 0 ? ` + Rs.${gBonus} bonus` : ''}</span></>}
                  </button>
                  <p className="wf-fine"><ShieldCheck />You will be redirected to the Dialog Genie Business secure checkout</p>
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
                  <div className="wf-stepper">
                    {[['Send', true], ['Amount', eAmt > 0], ['Verify', rnOk]].map(([label, done], i, arr) => (
                      <React.Fragment key={label}>
                        <div className={`wf-stepper-item${done ? ' is-done' : ''}`}>
                          <span>{done && i > 0 ? <Check strokeWidth={3} /> : i + 1}</span>
                          <small>{label}</small>
                        </div>
                        {i < arr.length - 1 && <i className={`wf-stepper-line${arr[i + 1][1] ? ' is-done' : ''}`} />}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className={cardCls}>
                    {stepHead(1, 'Send EZ Cash to this number')}
                    {payToCard({ icon: '📱', kicker: 'Dialog eZ Cash Merchant', value: ezCashMerchantNumber, copyLabel: 'Merchant number' })}
                    {noteBox(<><AlertTriangle /><span>After sending, note the 14-digit <strong>RN number</strong> from your Dialog SMS or Genie App transaction history.</span></>)}
                  </div>

                  <div className={cardCls}>
                    {stepHead(2, 'Enter the amount you sent')}
                    <div className="wf-field">
                      <span className="wf-prefix">Rs.</span>
                      <input type="number" value={ezCashAmount} onChange={e => setEzCashAmount(e.target.value)} placeholder="Amount sent in LKR..." className="wf-input has-prefix" min="100" />
                    </div>
                    <QuickBtn amounts={QUICK_LKR} current={ezCashAmount} set={setEzCashAmount} />
                  </div>

                  <div className={cardCls}>
                    {stepHead(3, '14-Digit RN Number')}
                    <div className="wf-field">
                      <input type="text" value={ezCashRnNumber} onChange={e => setEzCashRnNumber(e.target.value)} placeholder="e.g. 20260910XXXXXXXX" className="wf-input is-mono has-suffix" maxLength={16} />
                      <span className={`wf-suffix${rnOk ? ' is-ok' : ''}`}>{rnLen}/14</span>
                    </div>
                  </div>

                  <div className={cardCls}>
                    {stepHead(4, 'Mobile number you paid from')}
                    <input type="tel" value={ezCashPayerPhone} onChange={e => setEzCashPayerPhone(e.target.value)} placeholder="e.g. 077XXXXXXX" className="wf-input is-mono" maxLength={15} />
                    <p className="wf-hint">The eZ Cash number the money was sent from. We match it with the payment so nobody else can use your RN.</p>
                  </div>

                  <div className="wf-summary">
                    <div className="is-total"><span>Wallet credit</span><strong>Rs. {eAmt.toLocaleString()}</strong></div>
                  </div>

                  <button type="submit" disabled={isEzCashVerifying} className={btnRed}>
                    {isEzCashVerifying ? <><RefreshCw className="animate-spin" /><span>Verifying RN...</span></> : <><Zap /><span>Verify &amp; credit wallet</span></>}
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
                    {noteBox(<><Smartphone /><span>After paying, open Binance App → <strong>Pay</strong> → <strong>History</strong> and copy your Order ID. Your wallet is credited instantly once we find it.</span></>)}
                  </div>

                  <div className={cardCls}>
                    {stepHead(2, 'Amount (USDT)')}
                    <div className="wf-field">
                      <span className="wf-prefix">$</span>
                      <input type="number" value={binanceAmount} onChange={e => setBinanceAmount(e.target.value)} placeholder="USDT amount..." className="wf-input has-prefix" min="1" step="0.01" />
                    </div>
                    <QuickBtn amounts={QUICK_USDT} current={binanceAmount} set={setBinanceAmount} />
                  </div>

                  <div className={'wf-step is-stack'}>
                    {stepHead(3, 'Confirm your payment')}
                    <div>
                      <label className={labelCls}>Binance Order ID</label>
                      <div className="wf-field">
                        <input type="text" value={binanceOrderId} onChange={e => setBinanceOrderId(e.target.value)} placeholder="Paste Order ID from Binance App..." className="wf-input has-suffix" />
                        <button type="button" onClick={handlePasteBinanceOrder} className="wf-suffix is-btn">Paste</button>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Your Binance Pay ID</label>
                      <input type="text" value={binancePayId} onChange={e => setBinancePayId(e.target.value)} placeholder="Your own Binance Pay ID..." className={inputCls} />
                    </div>
                  </div>

                  <button type="submit" disabled={isBinanceVerifying} className={btnRed}>
                    {isBinanceVerifying ? <><RefreshCw className="animate-spin" /><span>Submitting...</span></> : <><Coins /><span>Verify &amp; credit wallet</span></>}
                  </button>
                </form>
              )}

              {/* ── BANK TRANSFER ── */}
              {activePanel === 'bank' && (
                <form onSubmit={handleBankDepositSubmit} className="space-y-5">
                  <div className={cardCls}>
                    {stepHead(1, 'Deposit to this bank account')}
                    <div className="wf-payto">
                      <div className="wf-payto-top">
                        <span className="wf-payto-brand"><span className="wf-payto-ico"><Building2 /></span>{bankAccountDetails.bankName}</span>
                        <span className="wf-payto-tag">Deposit</span>
                      </div>
                      <div className="wf-payto-row">
                        <div className="wf-payto-val">
                          <small>Account number</small>
                          <strong>{bankAccountDetails.accountNumber}</strong>
                        </div>
                        <button type="button" onClick={() => handleCopy(bankAccountDetails.accountNumber, 'Account No.')} className="wf-copy">
                          {isCopied ? <Check /> : <Copy />}
                          {isCopied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="wf-payto-meta">
                        {[['Account name', bankAccountDetails.accountName], ['Branch', bankAccountDetails.branch]].map(([label, value]) => (
                          <button key={label} type="button" onClick={() => handleCopy(value, label)}>
                            <small>{label}<Copy /></small>
                            <b>{value}</b>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={'wf-step is-stack'}>
                    {stepHead(2, 'Your deposit details')}
                    <div>
                      <label className={labelCls}>Amount You Deposited (LKR)</label>
                      <div className="wf-field">
                        <span className="wf-prefix">Rs.</span>
                        <input type="number" value={bankAmount} onChange={e => setBankAmount(e.target.value)} placeholder="Exact deposited amount..." className="wf-input has-prefix" min="100" />
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
                    <label className="wf-upload">
                      <input type="file" accept="image/*" onChange={handleBankFileChange} className="hidden" />
                      {bankSlipPreview ? (
                        <div className="wf-upload-done">
                          <img src={bankSlipPreview} alt="Receipt" />
                          <span>{bankSlipFileName}</span>
                          <em><Check /> Receipt uploaded. Tap to change.</em>
                        </div>
                      ) : (
                        <div className="wf-upload-empty">
                          <span className="wf-upload-ico"><Upload /></span>
                          <strong>Tap to upload deposit slip</strong>
                          <small>JPG, PNG · Max 5MB</small>
                        </div>
                      )}
                    </label>
                  </div>

                  <button type="submit" disabled={isSubmittingBank} className={btnRed}>
                    <Building2 />
                    <span>{isSubmittingBank ? 'Submitting...' : 'Submit bank receipt'}</span>
                  </button>
                </form>
              )}

            </div>
          </div>
        )}

        {/* ── WALLET HISTORY (from the server) ── */}
        <WalletHistory localPayments={userPayments} />

      </div>
    </div>
  );
};
