import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Wallet, Copy, Check, Clipboard, DollarSign, Gift, ArrowRight } from 'lucide-react';

export const WalletModal = () => {
  const { 
    isWalletModalOpen, 
    setIsWalletModalOpen, 
    walletActiveTab, 
    setWalletActiveTab,
    userProfile,
    showToast,
    addManualPayment,
    vouchers,
    creditUserWallet
  } = useApp();

  const [binanceOrderId, setBinanceOrderId] = useState('');
  const [binancePayId, setBinancePayId] = useState('');
  const [binanceAmount, setBinanceAmount] = useState('10');
  const [ezCashRnNumber, setEzCashRnNumber] = useState('');
  const [ezCashAmount, setEzCashAmount] = useState('1000');
  const [voucherCode, setVoucherCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  if (!isWalletModalOpen) return null;

  const binanceMerchantId = "547785111";
  const ezCashMerchantNumber = "0771234567";

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

  const handleBinanceSubmit = (e) => {
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
    showToast('Binance Pay deposit request submitted! Admin will verify and credit your wallet.');
    setBinanceOrderId('');
    setBinancePayId('');
    setIsWalletModalOpen(false);
  };

  const handleEzCashSubmit = (e) => {
    e.preventDefault();
    if (!ezCashRnNumber || ezCashRnNumber.length < 10) {
      showToast('Please enter a valid RN Transaction Number!', 'error');
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
    setIsWalletModalOpen(false);
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
      setIsWalletModalOpen(false);
    } else {
      showToast('Invalid or expired voucher code!', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#F8FAFF] text-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-slate-200/90 max-h-[92vh]">
        
        {/* Close Button */}
        <button
          onClick={() => setIsWalletModalOpen(false)}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors cursor-pointer backdrop-blur-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">

          {/* VIBRANT PURPLE/INDIGO TOTAL BALANCE CARD (Matching Screenshot 2) */}
          <div className="bg-gradient-to-r from-[#5046E5] via-[#6366F1] to-[#4F46E5] rounded-3xl p-6 sm:p-8 text-white text-center shadow-xl relative overflow-hidden">
            {/* Background Glow Shapes */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-300/20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10">
              <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest font-mono block">
                TOTAL BALANCE
              </span>
              <h2 className="text-4xl sm:text-5xl font-black font-heading mt-1 text-white tracking-tight">
                LKR {(userProfile?.walletBalance || 0).toFixed(2)}
              </h2>

              <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white mt-3 border border-white/30 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>{(userProfile?.walletUsdt || 0).toFixed(2)} USDT</span>
              </div>
            </div>
          </div>

          {/* TAB SWITCHER PILL CONTAINER (Matching Screenshot 2) */}
          <div className="bg-white rounded-full p-1.5 border border-slate-200/90 shadow-sm max-w-md mx-auto flex items-center justify-around text-xs font-black">
            <button
              onClick={() => setWalletActiveTab('ezcash')}
              className={`py-2 px-4 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                walletActiveTab === 'ezcash'
                  ? 'bg-slate-100 text-slate-900 border border-slate-200/80 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>💸</span>
              <span>EZ Cash</span>
            </button>

            <button
              onClick={() => setWalletActiveTab('binance')}
              className={`py-2 px-4 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                walletActiveTab === 'binance'
                  ? 'bg-slate-100 text-slate-900 border border-slate-200/80 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>🔶</span>
              <span>Binance</span>
            </button>

            <button
              onClick={() => setWalletActiveTab('redeem')}
              className={`py-2 px-4 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                walletActiveTab === 'redeem'
                  ? 'bg-slate-100 text-slate-900 border border-slate-200/80 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>🎁</span>
              <span>Redeem</span>
            </button>
          </div>

          {/* TAB 1: BINANCE DEPOSIT PANEL (Matching Screenshot 2 100%) */}
          {walletActiveTab === 'binance' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-5 animate-in fade-in">
              
              {/* Green Dashed Merchant Box */}
              <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-2xl p-5 text-center relative">
                <span className="text-[11px] font-bold text-emerald-800 block uppercase tracking-wider">
                  Binance Pay ID
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tracking-wider my-1">
                  {binanceMerchantId}
                </div>
                <span className="text-xs font-bold text-emerald-700 block mb-3">
                  MADS TOPUP Official
                </span>

                <button
                  type="button"
                  onClick={() => handleCopy(binanceMerchantId)}
                  className="px-4 py-1.5 bg-white text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>

              {/* Form Input Fields */}
              <form onSubmit={handleBinanceSubmit} className="space-y-4 text-xs">
                {/* Order ID */}
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1.5">
                    Order ID
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Paste Order ID here"
                      value={binanceOrderId}
                      onChange={(e) => setBinanceOrderId(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-xs pr-12"
                    />
                    <button
                      type="button"
                      onClick={handlePasteBinanceOrder}
                      className="absolute right-2 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                      title="Paste from clipboard"
                    >
                      <Clipboard className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Your Pay ID */}
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1.5">
                    Your Pay ID
                  </label>
                  <input
                    type="text"
                    placeholder="Your Binance ID"
                    value={binancePayId}
                    onChange={(e) => setBinancePayId(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-xs"
                  />
                </div>

                {/* Deposit Amount USDT */}
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1.5">
                    Deposit Amount (USDT)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={binanceAmount}
                    onChange={(e) => setBinanceAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-xs"
                  />
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-colors cursor-pointer shadow-xs mt-2 flex items-center justify-center gap-2"
                >
                  <span>SUBMIT DEPOSIT FOR ADMIN APPROVAL</span>
                </button>
              </form>

            </div>
          )}

          {/* TAB 2: EZ CASH DEPOSIT PANEL */}
          {walletActiveTab === 'ezcash' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-5 animate-in fade-in">
              
              {/* Red Dashed Merchant Box */}
              <div className="border-2 border-dashed border-red-300 bg-red-50/50 rounded-2xl p-5 text-center relative">
                <span className="text-[11px] font-bold text-red-800 block uppercase tracking-wider">
                  EZ Cash Merchant Number
                </span>
                <div className="text-2xl sm:text-3xl font-black text-red-700 font-mono tracking-wider my-1">
                  {ezCashMerchantNumber}
                </div>
                <span className="text-xs font-bold text-red-700 block mb-3">
                  Dialog EZ Cash / Genie
                </span>

                <button
                  type="button"
                  onClick={() => handleCopy(ezCashMerchantNumber)}
                  className="px-4 py-1.5 bg-white text-red-700 font-extrabold text-xs rounded-xl border border-red-200 hover:bg-red-100 transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'COPIED' : 'COPY NUMBER'}</span>
                </button>
              </div>

              {/* Form Input Fields */}
              <form onSubmit={handleEzCashSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1.5">
                    Deposit Amount (LKR)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    value={ezCashAmount}
                    onChange={(e) => setEzCashAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-red-500 shadow-xs mb-3"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1.5">
                    14-Digit RN Transaction Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 20260910123456"
                    value={ezCashRnNumber}
                    onChange={(e) => setEzCashRnNumber(e.target.value)}
                    maxLength={14}
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-900 focus:outline-none focus:border-red-500 shadow-xs"
                  />
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Find your 14-digit RN number in the confirmation SMS or Genie App history.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#cc040a] hover:bg-[#990207] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-colors cursor-pointer shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                >
                  <span>SUBMIT DEPOSIT FOR ADMIN APPROVAL</span>
                </button>
              </form>

            </div>
          )}

          {/* TAB 3: REDEEM VOUCHER PANEL */}
          {walletActiveTab === 'redeem' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md space-y-5 animate-in fade-in">
              <div className="text-center">
                <span className="text-3xl block mb-1">🎁</span>
                <h3 className="text-base font-black text-slate-900 font-heading">
                  Redeem Gift Card or Promo Code
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Enter your voucher code to add funds to your wallet instantly.
                </p>
              </div>

              <form onSubmit={handleRedeemSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1.5">
                    Voucher Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MADS-GIFT-98210"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-500 shadow-xs uppercase tracking-wider"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-colors cursor-pointer shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                  <span>REDEEM VOUCHER</span>
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
