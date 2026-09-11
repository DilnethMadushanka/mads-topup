import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Wallet, Copy, Check, Clipboard, DollarSign, Gift, ArrowLeft, ArrowRight, XCircle, 
  Ban, Key, Clock, RefreshCw, Zap, CheckCircle2, ShieldCheck, HelpCircle, Smartphone, AlertTriangle 
} from 'lucide-react';

export const WalletPage = () => {
  const { 
    setIsWalletModalOpen, 
    walletActiveTab, 
    setWalletActiveTab,
    userProfile,
    showToast,
    addManualPayment,
    vouchers,
    creditUserWallet,
    setSelectedGame,
    closeCatalog,
    manualPayments
  } = useApp();

  const [binanceOrderId, setBinanceOrderId] = useState('');
  const [binancePayId, setBinancePayId] = useState('');
  const [binanceAmount, setBinanceAmount] = useState('10');
  const [ezCashRnNumber, setEzCashRnNumber] = useState('');
  const [ezCashAmount, setEzCashAmount] = useState('1000');
  const [voucherCode, setVoucherCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isBinanceVerifying, setIsBinanceVerifying] = useState(false);

  const binanceMerchantId = "547785111";
  const ezCashMerchantNumber = "0740436276";

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    showToast('Merchant ID copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePasteBinanceOrder = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setBinanceOrderId(text);
        showToast('Order ID pasted from clipboard!');
      }
    } catch (e) {
      showToast('Please manually paste your Order ID', 'error');
    }
  };

  const handleBinanceSubmit = async (e) => {
    e.preventDefault();
    if (!binanceOrderId) {
      showToast('Please enter your Binance Order ID!', 'error');
      return;
    }
    if (!binancePayId) {
      showToast('Please enter your Binance Pay ID!', 'error');
      return;
    }
    const amt = parseFloat(binanceAmount) || 10;

    setIsBinanceVerifying(true);

    try {
      const response = await fetch('/api/binance/verify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: binanceOrderId,
          payId: binancePayId,
          amount: amt
        })
      });

      const resData = await response.json();

      if (resData.verified && resData.autoApproved) {
        creditUserWallet(0, amt);

        addManualPayment({
          id: 'PAY-' + Math.floor(1000 + Math.random() * 9000),
          userEmail: userProfile?.email || 'guest@madstopup.com',
          userName: userProfile?.name || 'Gamer',
          method: 'Binance Pay (Automated)',
          referenceNumber: `Order: ${binanceOrderId} | PayID: ${binancePayId}`,
          amount: amt,
          currency: 'USDT',
          slipUrl: '',
          status: 'VERIFIED',
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        });

        showToast(`⚡ BINANCE PAYMENT VERIFIED! +${amt} USDT credited to your wallet instantly!`);
        setBinanceOrderId('');
        setBinancePayId('');
      } else {
        addManualPayment({
          id: 'PAY-' + Math.floor(1000 + Math.random() * 9000),
          userEmail: userProfile?.email || 'guest@madstopup.com',
          userName: userProfile?.name || 'Gamer',
          method: 'Binance Pay',
          referenceNumber: `Order: ${binanceOrderId} | PayID: ${binancePayId}`,
          amount: amt,
          currency: 'USDT',
          slipUrl: '',
          status: 'PENDING',
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        });
        showToast('Deposit submitted for admin verification.');
        setBinanceOrderId('');
        setBinancePayId('');
      }
    } catch (err) {
      console.warn('Binance verify call note:', err.message);
      addManualPayment({
        id: 'PAY-' + Math.floor(1000 + Math.random() * 9000),
        userEmail: userProfile?.email || 'guest@madstopup.com',
        userName: userProfile?.name || 'Gamer',
        method: 'Binance Pay',
        referenceNumber: `Order: ${binanceOrderId} | PayID: ${binancePayId}`,
        amount: amt,
        currency: 'USDT',
        slipUrl: '',
        status: 'PENDING',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      });
      showToast('Deposit submitted for admin verification.');
      setBinanceOrderId('');
      setBinancePayId('');
    } finally {
      setIsBinanceVerifying(false);
    }
  };

  const handleEzCashSubmit = (e) => {
    e.preventDefault();
    if (!ezCashRnNumber || ezCashRnNumber.length < 10) {
      showToast('Please enter a valid 14-digit RN Transaction Number!', 'error');
      return;
    }
    const amt = parseFloat(ezCashAmount) || 1000;
    addManualPayment({
      id: 'PAY-' + Math.floor(1000 + Math.random() * 9000),
      userEmail: userProfile?.email || 'guest@madstopup.com',
      userName: userProfile?.name || 'Gamer',
      method: 'EZ Cash',
      referenceNumber: ezCashRnNumber,
      amount: amt,
      currency: 'LKR',
      slipUrl: '',
      status: 'PENDING',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    });
    showToast('EZ Cash deposit request submitted! Admin will verify and credit your wallet.');
    setEzCashRnNumber('');
  };

  const handleRedeemSubmit = (e) => {
    e.preventDefault();
    if (!voucherCode) {
      showToast('Please enter a valid voucher code!', 'error');
      return;
    }
    const foundVoucher = (vouchers || []).find(v => v.code.toUpperCase() === voucherCode.trim().toUpperCase() && v.active);
    if (foundVoucher) {
      if (foundVoucher.currency === 'USDT') {
        creditUserWallet(0, foundVoucher.value);
      } else {
        creditUserWallet(foundVoucher.value, 0);
      }
      showToast(`Voucher ${foundVoucher.code} redeemed! Credited ${foundVoucher.value} ${foundVoucher.currency}.`);
      setVoucherCode('');
    } else {
      showToast('Invalid or expired voucher code!', 'error');
    }
  };

  const goHome = () => {
    setIsWalletModalOpen(false);
    setSelectedGame(null);
    closeCatalog();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter payments for logged in user
  const userPayments = (manualPayments || []).filter(p => {
    if (!userProfile?.email) return true;
    return p.userEmail && p.userEmail.toLowerCase() === userProfile.email.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-[#F8FAFF] pb-20 pt-6 animate-in fade-in duration-300 font-sans text-slate-900">
      
      {/* Top Breadcrumb Header Bar */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={goHome}
            className="inline-flex items-center gap-2 text-xs font-black text-slate-600 hover:text-[#cc040a] bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Store</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 font-mono">
            <span onClick={goHome} className="hover:underline cursor-pointer">Home</span>
            <span>/</span>
            <span className="text-[#cc040a] font-bold">My Wallet & Deposit</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">

        {/* RICH RED THEME TOTAL BALANCE BANNER (Full Page Version) */}
        <div className="bg-gradient-to-r from-[#cc040a] via-[#dc2626] to-[#990207] rounded-3xl p-6 sm:p-10 text-white text-center shadow-2xl relative overflow-hidden border border-red-600/30">
          
          {/* Background Glow Shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-950/40 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            <span className="text-xs font-black text-red-100 uppercase tracking-widest font-mono block mb-1">
              ACCOUNT TOTAL BALANCE
            </span>
            <h1 className="text-4xl sm:text-6xl font-black font-heading text-white tracking-tight">
              LKR {(userProfile?.walletBalance || 0).toFixed(2)}
            </h1>

            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-white mt-4 border border-white/30 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span>{(userProfile?.walletUsdt || 0).toFixed(2)} USDT</span>
            </div>
          </div>
        </div>

        {/* TAB SWITCHER PILLS */}
        <div className="bg-white rounded-full p-2 border border-slate-200/90 shadow-sm max-w-lg mx-auto flex items-center justify-around text-xs font-black">
          <button
            onClick={() => setWalletActiveTab('binance')}
            className={`flex-1 py-3 px-4 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer ${
              walletActiveTab === 'binance'
                ? 'bg-[#cc040a] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🔶</span>
            <span>Binance Pay</span>
          </button>

          <button
            onClick={() => setWalletActiveTab('ezcash')}
            className={`flex-1 py-3 px-4 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer ${
              walletActiveTab === 'ezcash'
                ? 'bg-[#cc040a] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>💸</span>
            <span>EZ Cash</span>
          </button>

          <button
            onClick={() => setWalletActiveTab('redeem')}
            className={`flex-1 py-3 px-4 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer ${
              walletActiveTab === 'redeem'
                ? 'bg-[#cc040a] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎁</span>
            <span>Redeem Voucher</span>
          </button>
        </div>

        {/* TAB 1: BINANCE DEPOSIT PANEL WITH STEP-BY-STEP INSTRUCTIONS */}
        {walletActiveTab === 'binance' && (
          <div className="space-y-6 animate-in fade-in">
            
            {/* STEP-BY-STEP PAYMENT INSTRUCTION BOX (Singlish & English) */}
            <div className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 rounded-3xl p-6 border border-amber-500/30 text-white shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 text-amber-400 font-black text-sm font-heading">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <span>Binance Pay වලින් මුදල් ඩෙපොසිට් කරන පියවර (Instructions):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-semibold">
                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-black text-[11px] flex items-center justify-center">1</div>
                  <p className="text-slate-200 font-bold">1. Binance App යන්න</p>
                  <p className="text-[11px] text-slate-400 font-medium">Binance App -&gt; Pay -&gt; Send තෝරන්න.</p>
                </div>

                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-black text-[11px] flex items-center justify-center">2</div>
                  <p className="text-slate-200 font-bold">2. Pay ID එක ලබාදෙන්න</p>
                  <p className="text-[11px] text-slate-400 font-medium">Pay ID: <strong className="text-amber-300 font-mono">547785111</strong> එකතු කරන්න.</p>
                </div>

                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-black text-[11px] flex items-center justify-center">3</div>
                  <p className="text-slate-200 font-bold">3. USDT Send කරන්න</p>
                  <p className="text-[11px] text-slate-400 font-medium">USDT ගණන යවා Order ID & Pay ID Copy කරගන්න.</p>
                </div>

                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-black text-[11px] flex items-center justify-center">4</div>
                  <p className="text-slate-200 font-bold">4. Auto-Verify කරන්න</p>
                  <p className="text-[11px] text-slate-400 font-medium">පහතින් Order ID දාලා Verify ක්ලික් කරන්න.</p>
                </div>
              </div>
            </div>

            {/* FORM CONTAINER */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md space-y-6">
              
              {/* Green Dashed Merchant Box */}
              <div className="border-2 border-dashed border-emerald-400 bg-emerald-50/60 rounded-3xl p-6 text-center relative">
                <span className="text-xs font-black text-emerald-800 block uppercase tracking-wider font-mono">
                  OFFICIAL BINANCE PAY ID
                </span>
                <div className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono tracking-wider my-2">
                  {binanceMerchantId}
                </div>
                <span className="text-xs font-extrabold text-emerald-700 block mb-4">
                  MADS TOPUP Official Merchant Account
                </span>

                <button
                  type="button"
                  onClick={() => handleCopy(binanceMerchantId)}
                  className="px-6 py-2.5 bg-white text-emerald-700 font-extrabold text-xs rounded-2xl border border-emerald-300 hover:bg-emerald-100 transition-all shadow-sm cursor-pointer inline-flex items-center gap-2"
                >
                  {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? 'COPIED TO CLIPBOARD' : 'COPY BINANCE PAY ID'}</span>
                </button>
              </div>

              {/* Form Input Fields */}
              <form onSubmit={handleBinanceSubmit} className="space-y-4 text-xs">
                {/* Order ID */}
                <div>
                  <label className="font-extrabold text-slate-800 block mb-1.5 text-sm">
                    Binance Order ID / Txn Hash
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Paste your Binance Order ID here"
                      value={binanceOrderId}
                      onChange={(e) => setBinanceOrderId(e.target.value)}
                      className="w-full px-4 py-3.5 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-xs pr-14"
                    />
                    <button
                      type="button"
                      onClick={handlePasteBinanceOrder}
                      className="absolute right-2 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                      title="Paste from clipboard"
                    >
                      <Clipboard className="w-4 h-4" />
                      <span>Paste</span>
                    </button>
                  </div>
                </div>

                {/* Your Pay ID */}
                <div>
                  <label className="font-extrabold text-slate-800 block mb-1.5 text-sm">
                    Your Binance Pay ID / Binance Email
                  </label>
                  <input
                    type="text"
                    placeholder="Your Binance Pay ID or Email"
                    value={binancePayId}
                    onChange={(e) => setBinancePayId(e.target.value)}
                    className="w-full px-4 py-3.5 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-xs"
                  />
                </div>

                {/* Deposit Amount USDT */}
                <div>
                  <label className="font-extrabold text-slate-800 block mb-1.5 text-sm">
                    Deposit Amount (USDT)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={binanceAmount}
                    onChange={(e) => setBinanceAmount(e.target.value)}
                    className="w-full px-4 py-3.5 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-xs"
                  />
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isBinanceVerifying}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20 mt-3 flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {isBinanceVerifying ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>VERIFYING WITH BINANCE REAL-TIME API...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                      <span>VERIFY & INSTANT AUTO-CREDIT WALLET</span>
                    </>
                  )}
                </button>
              </form>

            </div>
          </div>
        )}

        {/* TAB 2: EZ CASH DEPOSIT PANEL WITH STEP-BY-STEP INSTRUCTIONS */}
        {walletActiveTab === 'ezcash' && (
          <div className="space-y-6 animate-in fade-in">
            
            {/* STEP-BY-STEP INSTRUCTION BOX */}
            <div className="bg-gradient-to-br from-red-600/10 via-slate-900 to-slate-950 rounded-3xl p-6 border border-red-500/30 text-white shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 text-red-400 font-black text-sm font-heading">
                <HelpCircle className="w-5 h-5 text-red-400" />
                <span>eZ Cash / Genie මගින් මුදල් ඩෙපොසිට් කරන පියවර (Instructions):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-semibold">
                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 font-black text-[11px] flex items-center justify-center">1</div>
                  <p className="text-slate-200 font-bold">1. *111# හෝ Genie යන්න</p>
                  <p className="text-[11px] text-slate-400 font-medium">Dialog *111# ඩයල් කරන්න හෝ Genie App යන්න.</p>
                </div>

                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 font-black text-[11px] flex items-center justify-center">2</div>
                  <p className="text-slate-200 font-bold">2. Merchant No ලබාදෙන්න</p>
                  <p className="text-[11px] text-slate-400 font-medium">Number: <strong className="text-red-400 font-mono">0740436276</strong> යොදන්න.</p>
                </div>

                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 font-black text-[11px] flex items-center justify-center">3</div>
                  <p className="text-slate-200 font-bold">3. RN Number එක ගන්න</p>
                  <p className="text-[11px] text-slate-400 font-medium">SMS එකේ ඇති අංක 14 න් යුතු RN No එක ගන්න.</p>
                </div>

                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 font-black text-[11px] flex items-center justify-center">4</div>
                  <p className="text-slate-200 font-bold">4. Submit කරන්න</p>
                  <p className="text-[11px] text-slate-400 font-medium">RN Number එක පහතින් දාලා Deposit Submit කරන්න.</p>
                </div>
              </div>
            </div>

            {/* FORM CONTAINER */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md space-y-6">
              
              {/* Red Dashed Merchant Box */}
              <div className="border-2 border-dashed border-red-400 bg-red-50/60 rounded-3xl p-6 text-center relative">
                <span className="text-xs font-black text-red-800 block uppercase tracking-wider font-mono">
                  EZ CASH OFFICIAL MERCHANT NUMBER
                </span>
                <div className="text-3xl sm:text-4xl font-black text-red-700 font-mono tracking-wider my-2">
                  {ezCashMerchantNumber}
                </div>
                <span className="text-xs font-extrabold text-red-700 block mb-4">
                  Dialog EZ Cash / Genie Merchant
                </span>

                <button
                  type="button"
                  onClick={() => handleCopy(ezCashMerchantNumber)}
                  className="px-6 py-2.5 bg-white text-red-700 font-extrabold text-xs rounded-2xl border border-red-300 hover:bg-red-100 transition-all shadow-sm cursor-pointer inline-flex items-center gap-2"
                >
                  {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? 'COPIED TO CLIPBOARD' : 'COPY MERCHANT NUMBER'}</span>
                </button>
              </div>

              {/* WARNING BOX 1: DO NOT SEND EZ CASH USING */}
              <div className="bg-red-50/90 border border-red-200/90 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-red-700 font-heading">
                  <XCircle className="w-5 h-5 text-red-600 fill-red-100 shrink-0" />
                  <span>DO NOT send EZ Cash using the following methods:</span>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px] font-extrabold text-red-700">
                  <span className="px-3 py-1 bg-white border border-red-200 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <Ban className="w-3.5 h-3.5 text-red-500" />
                    <span>Bank Apps</span>
                  </span>
                  <span className="px-3 py-1 bg-white border border-red-200 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <Ban className="w-3.5 h-3.5 text-red-500" />
                    <span>Cargills / Food City</span>
                  </span>
                  <span className="px-3 py-1 bg-white border border-red-200 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <Ban className="w-3.5 h-3.5 text-red-500" />
                    <span>Keells Super</span>
                  </span>
                  <span className="px-3 py-1 bg-white border border-red-200 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <Ban className="w-3.5 h-3.5 text-red-500" />
                    <span>Pay & Go Kiosks</span>
                  </span>
                </div>
              </div>

              {/* WARNING BOX 2: RN NUMBER IS MANDATORY */}
              <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-950 font-semibold shadow-2xs">
                <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-extrabold text-amber-950">14-Digit RN Number is MANDATORY</strong> to verify your deposit. You can find the 14-digit RN number in your Dialog confirmation SMS or Genie App transaction history.
                </div>
              </div>

              {/* Form Input Fields */}
              <form onSubmit={handleEzCashSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-extrabold text-slate-800 block mb-1.5 text-sm">
                    Deposit Amount (LKR)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    value={ezCashAmount}
                    onChange={(e) => setEzCashAmount(e.target.value)}
                    className="w-full px-4 py-3.5 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-500 shadow-xs mb-3"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-800 block mb-1.5 text-sm">
                    14-Digit RN Transaction Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 20260910123456"
                    value={ezCashRnNumber}
                    onChange={(e) => setEzCashRnNumber(e.target.value)}
                    maxLength={14}
                    className="w-full px-4 py-3.5 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-red-500 shadow-xs"
                  />
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Find your 14-digit RN number in the confirmation SMS or Genie App transaction receipt.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-[#cc040a] hover:bg-[#990207] text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                >
                  <span>SUBMIT EZ CASH DEPOSIT FOR VERIFICATION</span>
                </button>
              </form>

            </div>
          </div>
        )}

        {/* TAB 3: REDEEM VOUCHER PANEL WITH STEP-BY-STEP INSTRUCTIONS */}
        {walletActiveTab === 'redeem' && (
          <div className="space-y-6 animate-in fade-in">
            
            {/* INSTRUCTION BOX */}
            <div className="bg-gradient-to-br from-purple-600/10 via-slate-900 to-slate-950 rounded-3xl p-6 border border-purple-500/30 text-white shadow-xl space-y-2 text-center">
              <span className="text-3xl block">🎁</span>
              <h3 className="text-base font-black text-white font-heading">
                Redeem Gift Card or Promo Code
              </h3>
              <p className="text-xs text-slate-300 font-medium max-w-md mx-auto">
                Enter your official MADS TOPUP voucher or gift code below to credit LKR or USDT to your account instantly!
              </p>
            </div>

            {/* FORM CONTAINER */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md space-y-6">
              <form onSubmit={handleRedeemSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-extrabold text-slate-800 block mb-1.5 text-sm">
                    Voucher / Gift Card Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WELCOME100"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3.5 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-base font-mono font-black text-slate-900 focus:outline-none focus:border-purple-500 shadow-xs uppercase tracking-wider text-center"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                  <span>REDEEM VOUCHER INSTANTLY</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* RECENT WALLET DEPOSIT ACTIVITY LOG */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-slate-900 font-heading flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#cc040a]" />
            <span>Recent Wallet Deposit History</span>
          </h3>

          <div className="space-y-3">
            {userPayments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-slate-200/60">
                No wallet deposit activity found.
              </div>
            ) : (
              userPayments.map((pay) => (
                <div 
                  key={pay.id}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900">{pay.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        pay.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {pay.status}
                      </span>
                    </div>
                    <div className="font-extrabold text-slate-900 text-sm mt-1">
                      {pay.method}
                    </div>
                    <div className="text-slate-500 text-xs font-mono">
                      Ref: {pay.referenceNumber}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-emerald-600 text-base font-heading">
                      +{pay.amount} {pay.currency}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{pay.createdAt}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
