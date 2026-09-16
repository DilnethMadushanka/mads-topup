import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { auth } from '../services/firebaseAuth';
import {
  Wallet, Copy, Check, ArrowLeft, Zap, Clock, Crown,
  Building2, Upload, ChevronRight, X, RefreshCw, AlertTriangle
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
  const [isEzCashVerifying, setIsEzCashVerifying] = useState(false);
  const [isRedeemingVoucher, setIsRedeemingVoucher] = useState(false);
  const [activePanel, setActivePanel] = useState(null);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const genieStatus = urlParams.get('genie');
    const txnId = urlParams.get('txnId') || urlParams.get('id') || urlParams.get('transactionId');
    if (genieStatus && txnId) {
      showToast('Verifying Genie payment...');
      fetch('/api/genie/verify-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId: txnId }) })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.isPaid) {
            let amt = parseFloat(data.amount || 0);
            if (amt > 1000) amt = amt / 100;
            if (amt > 0) {
              creditUserWallet(amt, 0);
              addManualPayment({ id: 'PAY-GENIE-' + Math.floor(1000 + Math.random() * 9000), userId: userProfile?.uid || '', userEmail: userProfile?.email || 'guest@madstopup.com', userName: userProfile?.name || 'Gamer', method: 'Online Card / eZ Cash', referenceNumber: `Txn: ${txnId}`, amount: amt, currency: 'LKR', slipUrl: '', status: 'VERIFIED', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16) });
              showToast(`CARD PAYMENT VERIFIED! +LKR ${amt.toLocaleString()} credited!`);
            }
          } else { showToast(`Genie transaction: ${data.state || 'Pending'}`); }
        }).catch(err => console.warn('Genie verify error:', err.message));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGenieSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(genieAmount);
    if (!amt || amt < 50) { showToast('Minimum deposit is Rs. 50!', 'error'); return; }
    setIsGenieLoading(true);
    try {
      const userEmail = userProfile?.email || auth?.currentUser?.email || 'customer@madstopup.com';
      const userName = userProfile?.name || auth?.currentUser?.displayName || 'Gamer';
      const returnUrl = `${window.location.origin}/wallet?genie=success`;
      const response = await fetch('/api/genie/create-transaction', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amt, userEmail, userName, redirectUrl: returnUrl, orderRef: 'DEP-GENIE-' + Date.now() }) });
      const resData = await response.json();
      if (resData.success && resData.redirectUrl) {
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
    if (!bankAmount || parseFloat(bankAmount) <= 0) { showToast('Please enter a valid amount!', 'error'); return; }
    if (!bankRef.trim()) { showToast('Please enter your name or reference!', 'error'); return; }
    if (!bankSlipPreview) { showToast('Please upload your deposit receipt!', 'error'); return; }
    addManualPayment({ id: 'PAY-' + Math.floor(1000 + Math.random() * 9000), userEmail: userProfile?.email || 'guest@madstopup.com', userName: userProfile?.name || 'Gamer', method: 'Bank Deposit', referenceNumber: bankRef.trim(), amount: parseFloat(bankAmount), currency: 'LKR', slipUrl: bankSlipPreview, receiptUrl: bankSlipPreview, status: 'PENDING', createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16) });
    showToast('Bank receipt submitted! Admin will verify shortly.');
    setBankRef(''); setBankSlipPreview(''); setBankSlipFileName(''); setActivePanel(null);
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
        showToast(`BINANCE VERIFIED! +${amt} USDT credited!`);
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
        showToast(`EZ CASH VERIFIED! +Rs. ${amt.toLocaleString()} credited!`);
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

  const inputCls = 'w-full px-4 py-3 bg-slate-800/60 border border-slate-700/80 rounded-2xl text-white text-sm font-semibold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 transition-all';

  const methods = [
    { id: 'genie',   icon: '💳', label: 'Card & eZ Cash', sub: 'Instant automated credit', badge: 'INSTANT', badgeBg: 'bg-emerald-500', grad: 'from-[#cc040a] to-red-700',       border: 'border-red-500/20'    },
    { id: 'ezcash',  icon: '📱', label: 'EZ Cash Manual',  sub: 'Submit RN for credit',      badge: 'FAST',    badgeBg: 'bg-amber-500',   grad: 'from-orange-600 to-amber-600',  border: 'border-orange-500/20' },
    { id: 'binance', icon: '🔶', label: 'Binance Pay',     sub: 'Pay with USDT crypto',      badge: 'USDT',    badgeBg: 'bg-yellow-500',  grad: 'from-yellow-600 to-amber-500',  border: 'border-yellow-500/20' },
    { id: 'bank',    icon: '🏦', label: 'Bank Transfer',   sub: 'HNB bank deposit',          badge: 'MANUAL',  badgeBg: 'bg-blue-500',    grad: 'from-blue-600 to-indigo-600',   border: 'border-blue-500/20'   },
  ];
  const activeMethod = methods.find(m => m.id === activePanel);

  const QuickBtn = ({ amounts, current, set, activeClass }) => (
    <div className="flex gap-2 mt-2">
      {amounts.map(a => (
        <button key={a} type="button" onClick={() => set(a)}
          className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${current === a ? activeClass : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
          {a}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0F1E] pb-16 font-sans text-white animate-in fade-in duration-300">

      {/* NAV */}
      <div className="sticky top-0 z-20 bg-[#0A0F1E]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={goHome} className="w-9 h-9 rounded-xl bg-white/8 hover:bg-white/15 flex items-center justify-center transition-all cursor-pointer shrink-0">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-black text-white">My Wallet</h1>
          <p className="text-[10px] text-slate-400 font-medium">Recharge and manage balance</p>
        </div>
        {isApprovedReseller && (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <Crown className="w-3 h-3 fill-amber-400" /> Reseller
          </span>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* BALANCE CARDS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-[#cc040a] to-red-800 rounded-2xl p-4 relative overflow-hidden shadow-xl shadow-red-950/40">
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-2">
                <Wallet className="w-3.5 h-3.5 text-red-200" />
                <span className="text-[10px] font-black text-red-100 uppercase tracking-widest">LKR</span>
              </div>
              <div className="text-2xl font-black text-white leading-none">{(userProfile?.walletBalance || 0).toFixed(2)}</div>
              <div className="text-xs text-red-200/80 font-semibold mt-0.5">Sri Lankan Rupees</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-2xl p-4 relative overflow-hidden shadow-xl shadow-emerald-950/40">
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-3.5 h-3.5 rounded-full bg-white text-emerald-700 font-black text-[8px] flex items-center justify-center italic shrink-0">B</span>
                <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">USDT</span>
              </div>
              <div className="text-2xl font-black text-white leading-none">{(userProfile?.walletUsdt || 0).toFixed(2)}</div>
              <div className="text-xs text-emerald-200/80 font-semibold mt-0.5">Tether USD</div>
            </div>
          </div>
        </div>

        {/* RESELLER ID */}
        {isApprovedReseller && (
          <div className="bg-slate-800/50 border border-amber-500/20 rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Reseller Wallet ID</div>
              <div className="text-sm font-black text-white font-mono">{resellerWalletId}</div>
            </div>
            <button onClick={() => handleCopy(resellerWalletId, 'Wallet ID')} className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer">
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
            </button>
          </div>
        )}

        {/* RECHARGE */}
        {!activePanel ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Recharge Wallet</h2>
              <span className="text-[10px] text-slate-500 font-semibold">Choose a method</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {methods.map(m => (
                <button key={m.id} onClick={() => setActivePanel(m.id)}
                  className={`bg-gradient-to-br ${m.grad} ${m.border} border rounded-2xl p-4 text-left relative overflow-hidden group hover:scale-[1.02] active:scale-[0.97] transition-all shadow-lg cursor-pointer`}>
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="text-2xl mb-2">{m.icon}</div>
                    <div className="text-sm font-black text-white leading-tight">{m.label}</div>
                    <div className="text-[11px] text-white/65 font-medium mt-0.5">{m.sub}</div>
                    <div className={`inline-flex items-center gap-1 mt-2.5 px-2 py-0.5 rounded-full ${m.badgeBg} text-white text-[9px] font-black uppercase tracking-wider`}>
                      <Zap className="w-2.5 h-2.5" />{m.badge}
                    </div>
                  </div>
                  <ChevronRight className="absolute bottom-3 right-3 w-4 h-4 text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>

            {/* VOUCHER */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🎟️</span>
                <span className="text-sm font-black text-white">Redeem Voucher</span>
              </div>
              <form onSubmit={handleRedeemSubmit} className="flex gap-2">
                <input type="text" placeholder="Enter voucher code..." value={voucherCode}
                  onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                  className={inputCls + ' py-2.5 text-xs'} />
                <button type="submit" disabled={isRedeemingVoucher || !voucherCode.trim()}
                  className="px-4 py-2.5 bg-[#cc040a] hover:bg-[#b00308] text-white font-black text-xs rounded-xl shrink-0 transition-all disabled:opacity-50 cursor-pointer">
                  {isRedeemingVoucher ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* FORM PANEL */
          <div className="bg-slate-900/80 border border-white/8 rounded-3xl overflow-hidden animate-in slide-in-from-bottom-3 duration-300">
            <div className={`bg-gradient-to-r ${activeMethod?.grad} p-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeMethod?.icon}</span>
                <div>
                  <div className="text-sm font-black text-white">{activeMethod?.label}</div>
                  <div className="text-[11px] text-white/65">{activeMethod?.sub}</div>
                </div>
              </div>
              <button onClick={() => setActivePanel(null)} className="p-1.5 rounded-xl bg-black/20 hover:bg-black/40 transition-all cursor-pointer">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-5 space-y-4">

              {activePanel === 'genie' && (
                <form onSubmit={handleGenieSubmit} className="space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold text-emerald-200">Accepts Visa, Mastercard, eZ Cash and Genie Wallet. Balance credited instantly.</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Amount (LKR)</label>
                    <input type="number" value={genieAmount} onChange={e => setGenieAmount(e.target.value)} placeholder="Enter amount..." className={inputCls} min="50" />
                    <QuickBtn amounts={QUICK_LKR} current={genieAmount} set={setGenieAmount} activeClass="bg-[#cc040a] border-[#cc040a] text-white" />
                  </div>
                  <button type="submit" disabled={isGenieLoading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#cc040a] to-red-600 hover:from-[#b00308] hover:to-red-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50">
                    {isGenieLoading ? <><RefreshCw className="w-4 h-4 animate-spin" />Connecting...</> : <><Zap className="w-4 h-4 fill-white" />Pay Now — Rs. {genieAmount || '0'}</>}
                  </button>
                </form>
              )}

              {activePanel === 'ezcash' && (
                <form onSubmit={handleEzCashSubmit} className="space-y-4">
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Send EZ Cash to</div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400">Merchant Number</div>
                        <div className="text-xl font-black text-white font-mono">{ezCashMerchantNumber}</div>
                      </div>
                      <button type="button" onClick={() => handleCopy(ezCashMerchantNumber, 'Merchant number')}
                        className="px-3 py-2 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 rounded-xl text-orange-300 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer">
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy
                      </button>
                    </div>
                    <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-amber-200">Note the 14-digit RN from your Dialog SMS or Genie App history.</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Amount Sent (LKR)</label>
                    <input type="number" value={ezCashAmount} onChange={e => setEzCashAmount(e.target.value)} placeholder="Amount sent..." className={inputCls} min="100" />
                    <QuickBtn amounts={QUICK_LKR} current={ezCashAmount} set={setEzCashAmount} activeClass="bg-orange-500 border-orange-500 text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">14-Digit RN Number</label>
                    <input type="text" value={ezCashRnNumber} onChange={e => setEzCashRnNumber(e.target.value)} placeholder="e.g. 20260910XXXXXX" className={inputCls} maxLength={16} />
                  </div>
                  <button type="submit" disabled={isEzCashVerifying}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50">
                    {isEzCashVerifying ? <><RefreshCw className="w-4 h-4 animate-spin" />Verifying...</> : <><Zap className="w-4 h-4 fill-white" />Verify and Credit Wallet</>}
                  </button>
                </form>
              )}

              {activePanel === 'binance' && (
                <form onSubmit={handleBinanceSubmit} className="space-y-4">
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Send USDT to Binance Pay</div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400">Binance Pay ID</div>
                        <div className="text-xl font-black text-white font-mono">{binanceMerchantId}</div>
                      </div>
                      <button type="button" onClick={() => handleCopy(binanceMerchantId, 'Pay ID')}
                        className="px-3 py-2 bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/30 rounded-xl text-yellow-300 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer">
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-400">After paying: Binance App → Pay → History → copy Order ID</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Amount (USDT)</label>
                    <input type="number" value={binanceAmount} onChange={e => setBinanceAmount(e.target.value)} placeholder="USDT amount..." className={inputCls} min="1" step="0.01" />
                    <QuickBtn amounts={QUICK_USDT} current={binanceAmount} set={setBinanceAmount} activeClass="bg-yellow-500 border-yellow-500 text-slate-900" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Binance Order ID</label>
                    <div className="relative">
                      <input type="text" value={binanceOrderId} onChange={e => setBinanceOrderId(e.target.value)} placeholder="Paste Order ID..." className={inputCls + ' pr-20'} />
                      <button type="button" onClick={handlePasteBinanceOrder} className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-black rounded-lg transition-all cursor-pointer">Paste</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Your Binance Pay ID</label>
                    <input type="text" value={binancePayId} onChange={e => setBinancePayId(e.target.value)} placeholder="Your Binance Pay ID..." className={inputCls} />
                  </div>
                  <button type="submit" disabled={isBinanceVerifying}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-slate-900 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/25 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50">
                    {isBinanceVerifying ? <><RefreshCw className="w-4 h-4 animate-spin" />Submitting...</> : <><span>🔶</span>Submit Binance Deposit</>}
                  </button>
                </form>
              )}

              {activePanel === 'bank' && (
                <form onSubmit={handleBankDepositSubmit} className="space-y-4">
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Bank Account Details</div>
                    {[['Bank', bankAccountDetails.bankName], ['Account Name', bankAccountDetails.accountName], ['Account No.', bankAccountDetails.accountNumber], ['Branch', bankAccountDetails.branch]].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-700/30 last:border-0">
                        <div>
                          <div className="text-[10px] text-slate-500">{label}</div>
                          <div className="text-xs font-black text-white font-mono">{value}</div>
                        </div>
                        <button type="button" onClick={() => handleCopy(value, label)} className="p-1.5 hover:bg-white/10 rounded-lg transition-all cursor-pointer">
                          <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Amount Deposited (LKR)</label>
                    <input type="number" value={bankAmount} onChange={e => setBankAmount(e.target.value)} placeholder="Exact amount..." className={inputCls} min="100" />
                    <QuickBtn amounts={QUICK_LKR} current={bankAmount} set={setBankAmount} activeClass="bg-blue-600 border-blue-600 text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Your Name / Reference</label>
                    <input type="text" value={bankRef} onChange={e => setBankRef(e.target.value)} placeholder="Name used at the bank..." className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Upload Deposit Receipt</label>
                    <label className="block border-2 border-dashed border-slate-600 hover:border-blue-500/50 rounded-2xl p-5 text-center cursor-pointer transition-all">
                      <input type="file" accept="image/*" onChange={handleBankFileChange} className="hidden" />
                      {bankSlipPreview ? (
                        <div className="space-y-2">
                          <img src={bankSlipPreview} alt="Receipt" className="w-full max-h-40 object-contain rounded-xl" />
                          <span className="text-[10px] text-slate-400 font-medium block truncate">{bankSlipFileName}</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                          <div className="text-xs font-bold text-slate-400">Tap to upload receipt</div>
                          <div className="text-[10px] text-slate-600">JPG, PNG up to 5MB</div>
                        </div>
                      )}
                    </label>
                  </div>
                  <button type="submit"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] cursor-pointer">
                    <Building2 className="w-4 h-4" />Submit Bank Receipt
                  </button>
                </form>
              )}

            </div>
          </div>
        )}

        {/* HISTORY */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-black text-white">Recent Deposits</h2>
            {userPayments.length > 0 && <span className="ml-auto text-[10px] text-slate-600 font-mono">{userPayments.length} records</span>}
          </div>
          {userPayments.length === 0 ? (
            <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl py-10 text-center">
              <div className="text-2xl mb-2">📭</div>
              <div className="text-xs text-slate-500 font-semibold">No deposit history yet</div>
            </div>
          ) : (
            <div className="space-y-2">
              {userPayments.slice(0, 10).map(pay => (
                <div key={pay.id} className="bg-slate-800/35 border border-slate-700/35 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm ${pay.status === 'VERIFIED' ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                    {pay.status === 'VERIFIED' ? '✅' : '⏳'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-white truncate">{pay.method}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">Ref: {pay.referenceNumber}</div>
                    <div className="text-[10px] text-slate-600 font-mono">{pay.createdAt}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-black ${pay.status === 'VERIFIED' ? 'text-emerald-400' : 'text-amber-400'}`}>+{pay.amount} {pay.currency}</div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${pay.status === 'VERIFIED' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>{pay.status}</span>
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
