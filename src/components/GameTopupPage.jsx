import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PAYMENT_METHODS, getVerifiedPackagePriceLkr } from '../data/games';
import { checkPlayerIGN, dispatchMoongoldOrder } from '../services/moongoldApi';
import { uploadToR2Storage } from '../services/storageService';
import confetti from 'canvas-confetti';
import { auth } from '../services/firebaseAuth';
import { 
  ArrowLeft, Check, ShieldCheck, Zap, AlertCircle, RefreshCw, 
  CreditCard, ChevronRight, BookmarkPlus, CheckCircle2, Copy, UploadCloud, Cloud,
  Clipboard, Plus, Minus, ChevronUp, ChevronDown, HelpCircle, Shield, Edit3, Crown,
  ArrowUpDown, ArrowUp, ArrowDown, Headphones
} from 'lucide-react';

export const GameTopupPage = () => {
  const { 
    selectedGame, 
    setSelectedGame,
    addOrder, 
    showToast,
    formatPrice,
    formatLkr,
    savePlayerId,
    userProfile,
    setUserProfile,
    currency,
    setCurrency,
    creditUserWallet,
    setIsWalletModalOpen,
    openWalletModal,
    isLoggedIn,
    openAuth,
    setIsSupportOpen
  } = useApp();

  const [playerId, setPlayerId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [ign, setIgn] = useState('');
  const [isVerifyingIgn, setIsVerifyingIgn] = useState(false);
  const [ignVerified, setIgnVerified] = useState(false);
  const [verifyModalData, setVerifyModalData] = useState(null);

  // Cart quantities map { [packageId]: quantity }
  const [cartQuantities, setCartQuantities] = useState({});
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_METHODS[0]);
  
  // Accordion state for How It Works
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(true);

  // Package sort order: 'default' | 'lth' (low-to-high) | 'htl' (high-to-low)
  const [sortOrder, setSortOrder] = useState('default');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Receipt Upload
  const [receiptFile, setReceiptFile] = useState(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptR2Url, setReceiptR2Url] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (selectedGame && selectedGame.packages.length > 0) {
      setCartQuantities({});
      setPlayerId('');
      setZoneId('');
      setIgn('');
      setIgnVerified(false);
      setVerifyModalData(null);
      setCompletedOrder(null);
    }
  }, [selectedGame]);

  if (!selectedGame) return null;

  // Handle Paste Player ID
  const handlePastePlayerId = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPlayerId(text.trim());
        showToast('Player ID pasted from clipboard!');
      }
    } catch (err) {
      showToast('Please type your Player ID manually', 'error');
    }
  };

  // Verify Player IGN
  const handleVerifyIgn = async () => {
    if (!playerId) {
      showToast('Please enter your Player ID first!', 'error');
      return;
    }
    setIsVerifyingIgn(true);
    const result = await checkPlayerIGN(selectedGame.id, playerId, zoneId);
    setIsVerifyingIgn(false);

    if (result.success) {
      setIgn(result.ign);
      setIgnVerified(true);
      setVerifyModalData({
        ign: result.ign,
        playerId: playerId
      });
      showToast(`Verified IGN: ${result.ign}`);
    } else {
      showToast('Could not verify Player ID. Please double check.', 'error');
    }
  };

  // Quantity Change Handlers
  const updateQuantity = (pkgId, delta) => {
    setCartQuantities(prev => {
      const current = prev[pkgId] || 0;
      const updated = Math.max(0, current + delta);
      if (updated === 0) {
        const copy = { ...prev };
        delete copy[pkgId];
        return copy;
      }
      return { ...prev, [pkgId]: updated };
    });
  };

  // Check if current user is an approved reseller partner
  const isApprovedReseller = Boolean(userProfile?.isReseller || userProfile?.role === 'reseller');

  // Compute Total Price & Items
  const selectedItems = selectedGame.packages.filter(pkg => (cartQuantities[pkg.id] || 0) > 0);
  const totalLkr = selectedItems.reduce((sum, pkg) => {
    const effectivePrice = isApprovedReseller ? Math.round(pkg.priceLkr * 0.95) : pkg.priceLkr;
    return sum + (effectivePrice * (cartQuantities[pkg.id] || 0));
  }, 0);
  const totalItemsCount = selectedItems.reduce((sum, pkg) => sum + (cartQuantities[pkg.id] || 0), 0);

  // Upload Receipt to Cloudflare R2
  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setIsUploadingReceipt(true);
    const result = await uploadToR2Storage(file, 'receipts');
    setIsUploadingReceipt(false);
    if (result.success) {
      setReceiptR2Url(result.url);
      showToast('Payment receipt uploaded to Cloudflare R2 Storage!');
    } else {
      showToast('Failed to upload receipt', 'error');
    }
  };

  // Dispatch Topup Order
  const handleCompleteOrder = async () => {
    if (!playerId.trim()) {
      showToast('Please enter a valid Player ID (UID)!', 'error');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }
    if (selectedGame.requiresServer && !zoneId.trim()) {
      showToast('Please enter your Zone / Server ID!', 'error');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }
    if (selectedItems.length === 0) {
      showToast('Please select at least 1 package to top-up!', 'error');
      return;
    }

    let deductedLkr = 0;
    let deductedUsdt = 0;

    // 1. Strict Wallet Balance Check if paying with MADS Wallet
    if (selectedPayment.id === 'wallet') {
      const availLkr = parseFloat(userProfile?.walletBalance || 0);
      const availUsdt = parseFloat(userProfile?.walletUsdt || 0);

      if (currency === 'USD') {
        const requiredUsdt = totalLkr / 305;
        if (availUsdt >= requiredUsdt) {
          deductedUsdt = requiredUsdt;
        } else if (availLkr >= totalLkr) {
          deductedLkr = totalLkr;
        } else {
          showToast(`Topup Failed: Insufficient wallet balance. Required: $${requiredUsdt.toFixed(2)} USDT (or Rs. ${totalLkr.toFixed(2)} LKR). Available: $${availUsdt.toFixed(2)} USDT / Rs. ${availLkr.toFixed(2)} LKR. Please top up your wallet!`, 'error');
          openWalletModal();
          return;
        }
      } else {
        if (availLkr >= totalLkr) {
          deductedLkr = totalLkr;
        } else if ((availUsdt * 305) >= totalLkr) {
          deductedUsdt = totalLkr / 305;
        } else {
          showToast(`Topup Failed: Insufficient wallet balance. Required: Rs. ${totalLkr.toFixed(2)} LKR. Available: Rs. ${availLkr.toFixed(2)} LKR / $${availUsdt.toFixed(2)} USDT. Please recharge your wallet!`, 'error');
          openWalletModal();
          return;
        }
      }
    }

    // 2. Strict Receipt Check for Manual/External Payment Methods (Bank, eZ Cash, Binance, Card)
    if (selectedPayment.id !== 'wallet') {
      if (!receiptR2Url && !receiptFile) {
        showToast(`Please upload your payment receipt / transfer screenshot for ${selectedPayment.name} before completing your top-up order!`, 'error');
        const uploadBox = document.getElementById('receipt-upload-section');
        if (uploadBox) {
          uploadBox.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 600, behavior: 'smooth' });
        }
        return;
      }
    }

    setIsSubmitting(true);
    
    // Main package title summary
    const packageSummary = selectedItems
      .map(item => `${cartQuantities[item.id]}x ${item.name}`)
      .join(', ');

    let moongoldResult = { success: true, status: 'PENDING_VERIFICATION', moongoldRef: null };

    // 3. Dispatch via Moongold API ONLY IF paid via MADS Wallet
    if (selectedPayment.id === 'wallet') {
      let allSuccess = true;
      let lastRef = null;
      let lastErrMsg = '';
      let lastNewBalanceLkr = undefined;
      let lastNewBalanceUsdt = undefined;

      // Loop through all selected packages in cart to process each item/quantity
      for (const item of selectedItems) {
        const qty = cartQuantities[item.id] || 1;
        const effectiveUnitPrice = isApprovedReseller ? Math.round(item.priceLkr * 0.95) : item.priceLkr;
        const itemTotalPrice = effectiveUnitPrice * qty;

        const orderPayload = {
          game: selectedGame,
          gameId: selectedGame.id,
          playerId,
          zoneId,
          package: item,
          quantity: qty,
          payment: selectedPayment,
          priceLkr: itemTotalPrice,
          ign: ign || (`Player ${playerId}`),
          userId: userProfile?.uid || (auth && auth.currentUser?.uid) || '',
          userEmail: userProfile?.email || (auth && auth.currentUser?.email) || '',
          userProfile
        };

        try {
          const res = await dispatchMoongoldOrder(orderPayload);
          if (res.success) {
            lastRef = res.moongoldRef;
            if (res.newBalanceLkr !== undefined) lastNewBalanceLkr = res.newBalanceLkr;
            if (res.newBalanceUsdt !== undefined) lastNewBalanceUsdt = res.newBalanceUsdt;
          } else {
            allSuccess = false;
            lastErrMsg = res.message || 'Provider dispatch failed';
            break;
          }
        } catch (err) {
          allSuccess = false;
          lastErrMsg = err.message || 'Gateway connection error';
          break;
        }
      }

      moongoldResult = {
        success: allSuccess,
        status: allSuccess ? 'COMPLETED' : 'FAILED',
        moongoldRef: lastRef,
        message: lastErrMsg
      };

      if (!moongoldResult.success) {
        setIsSubmitting(false);

        // Record failed order in Firestore & State for transparency
        const failedOrder = {
          id: 'ORD-' + Math.floor(10000 + Math.random() * 90000),
          userId: userProfile?.uid || (auth && auth.currentUser?.uid) || '',
          userEmail: userProfile?.email || (auth && auth.currentUser?.email) || '',
          userName: userProfile?.name || (auth && auth.currentUser?.displayName) || 'Registered Gamer',
          gameId: selectedGame.id,
          gameName: selectedGame.name,
          packageName: packageSummary,
          amount: selectedItems.reduce((s, i) => s + (i.amount * cartQuantities[i.id]), 0),
          playerId,
          zoneId,
          ign: ign || (`Player ${playerId}`),
          paymentMethod: selectedPayment.name,
          priceLkr: totalLkr,
          status: 'FAILED',
          moongoldRef: moongoldResult.moongoldRef || 'GATEWAY_FAILED',
          failureReason: moongoldResult.message || 'Provider dispatch failed',
          createdAt: new Date().toISOString()
        };

        addOrder(failedOrder);
        showToast(`❌ Topup Failed: ${moongoldResult.message || 'Provider error'}.`, 'error');
        return;
      }

      // Sync local profile with the exact server-deducted balance (prevents double deduction)
      if (lastNewBalanceLkr !== undefined) {
        setUserProfile(prev => ({
          ...prev,
          walletBalance: lastNewBalanceLkr,
          walletUsdt: lastNewBalanceUsdt !== undefined ? lastNewBalanceUsdt : prev.walletUsdt
        }));
      }
    }

    setIsSubmitting(false);

    const finalStatus = selectedPayment.id === 'wallet' 
      ? (moongoldResult.status || 'COMPLETED') 
      : 'PENDING_VERIFICATION';

    const newOrder = {
      id: 'ORD-' + Math.floor(10000 + Math.random() * 90000),
      userId: userProfile?.uid || (auth && auth.currentUser?.uid) || '',
      userEmail: userProfile?.email || (auth && auth.currentUser?.email) || '',
      userName: userProfile?.name || (auth && auth.currentUser?.displayName) || 'Registered Gamer',
      gameId: selectedGame.id,
      gameName: selectedGame.name,
      packageName: packageSummary,
      amount: selectedItems.reduce((s, i) => s + (i.amount * cartQuantities[i.id]), 0),
      playerId,
      zoneId,
      ign: ign || (`Player ${playerId}`),
      paymentMethod: selectedPayment.name,
      priceLkr: totalLkr,
      status: finalStatus,
      moongoldRef: moongoldResult.moongoldRef || (selectedPayment.id === 'wallet' ? ('MG-' + Math.floor(10000000 + Math.random() * 90000000)) : 'PENDING_ADMIN_VERIFICATION'),
      receiptUrl: receiptR2Url || null,
      createdAt: new Date().toISOString()
    };

    addOrder(newOrder);
    setCompletedOrder(newOrder);

    // Confetti celebration
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#cc040a', '#cc040a', '#10B981', '#F59E0B']
      });
    } catch (e) {}

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`min-h-screen bg-[#F8FAFF] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto${totalItemsCount > 0 ? ' pb-24' : ''}`}>
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setSelectedGame(null)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-800 hover:bg-slate-100 font-extrabold text-xs border border-slate-200 cursor-pointer transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#cc040a]" />
          <span>Back to All Games</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-600">24/7 Automated Moongold Delivery</span>
        </div>
      </div>

      {/* SUCCESS / PENDING SCREEN VIEW */}
      {completedOrder ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 max-w-2xl mx-auto text-center space-y-6 my-10 animate-in zoom-in-95">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-md border ${
            completedOrder.status === 'COMPLETED' 
              ? 'bg-emerald-100 text-emerald-600 border-emerald-300' 
              : 'bg-amber-100 text-amber-600 border-amber-300'
          }`}>
            {completedOrder.status === 'COMPLETED' ? (
              <CheckCircle2 className="w-12 h-12" />
            ) : (
              <RefreshCw className="w-10 h-10 animate-spin" />
            )}
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
              {completedOrder.status === 'COMPLETED' 
                ? 'TOP-UP SUCCESSFUL!' 
                : 'ORDER SUBMITTED (PENDING VERIFICATION)'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1.5">
              {completedOrder.status === 'COMPLETED' 
                ? 'Your order has been verified & credited via MADS Automated Engine.' 
                : 'Your payment slip has been submitted! Our admin team will verify your receipt & credit items shortly.'}
            </p>
          </div>

          {/* Receipt Details Box */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-left space-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Order Reference:</span>
              <span className="font-mono font-bold text-slate-900">{completedOrder.id}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Moongold API Ref:</span>
              <span className="font-mono font-bold text-[#cc040a]">{completedOrder.moongoldRef}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Game Title:</span>
              <span className="font-bold text-slate-900">{completedOrder.gameName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Package Items:</span>
              <span className="font-bold text-slate-900">{completedOrder.packageName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Player UID / IGN:</span>
              <span className="font-bold text-slate-900">{completedOrder.playerId} ({completedOrder.ign})</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Payment Method:</span>
              <span className="font-bold text-slate-900">{completedOrder.paymentMethod}</span>
            </div>
            <div className="flex justify-between pt-1 font-bold text-sm">
              <span className="text-slate-700">Total Price Paid:</span>
              <span className="text-[#cc040a] font-black">{formatLkr(completedOrder.priceLkr)}</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setSelectedGame(null)}
              className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-extrabold text-xs rounded-full hover:bg-blue-700 transition-all shadow-md cursor-pointer"
            >
              Back to Catalog
            </button>
            <button
              onClick={() => setCompletedOrder(null)}
              className="w-full sm:w-auto px-8 py-3 bg-slate-100 text-slate-800 font-extrabold text-xs rounded-full hover:bg-slate-200 transition-all border border-slate-200 cursor-pointer"
            >
              Buy More Packages
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* HERO BANNER (Matching Image 2) */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl mb-8 min-h-[340px] sm:min-h-[400px] md:min-h-[460px] bg-slate-950 flex flex-col justify-center items-center p-6 sm:p-10 border border-slate-800/80">
            {/* Background Cover Image with Gradient Overlay */}
            <div className="absolute inset-0 z-0">
              <img 
                src={selectedGame.heroBanner || selectedGame.banner} 
                alt={selectedGame.name} 
                className="w-full h-full object-cover object-center opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30"></div>
            </div>

            {/* Optional Publisher Tag at top-left corner */}
            {selectedGame.publisher && (
              <div className="absolute top-4 left-5 sm:top-6 sm:left-7 z-10 flex items-center gap-2">
                <span className="text-white/80 font-black text-[11px] uppercase tracking-wider font-mono bg-black/40 backdrop-blur-md px-3 py-1 rounded-md border border-white/15 shadow-sm">
                  {selectedGame.publisher}
                </span>
                {selectedGame.flag && (
                  <span className="text-xs bg-black/40 backdrop-blur-md px-2 py-0.5 rounded border border-white/15 shadow-sm">
                    {selectedGame.flag}
                  </span>
                )}
              </div>
            )}

            {/* Hero Centered Content (Matching Reference Image 2) */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-2xl mx-auto my-auto">
              {/* Instant Delivery Pill Badge */}
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/25 text-white text-xs sm:text-sm font-semibold shadow-lg mb-3">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Instant Delivery</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-heading tracking-tight drop-shadow-lg">
                {selectedGame.name} Top-Up
              </h1>

              {/* Subtitle */}
              <p className="text-slate-200 text-xs sm:text-sm font-medium mt-2 drop-shadow-md">
                Official Distributor | Trusted by thousands
              </p>
            </div>
          </div>

          {/* STEP 1: Verify Your Player ID (Matching Screenshot 1) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#cc040a] text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                1
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 font-heading leading-none">
                  Verify Your Player ID
                </h2>
                <div className="w-12 h-1 bg-amber-500 rounded-full mt-1.5"></div>
              </div>
            </div>

            {/* Input Box Area */}
            {selectedGame.requiresServer ? (
              /* Mobile Legends: Two separate labeled boxes for User ID + Zone ID */
              <div className="flex flex-col sm:flex-row gap-3">
                {/* User ID Box */}
                <div className="flex-1 bg-[#F8FAFC] border-2 border-slate-200 rounded-2xl shadow-inner overflow-hidden focus-within:border-[#cc040a] transition-colors">
                  <div className="px-4 pt-2.5 pb-0">
                    <span className="text-[10px] font-extrabold text-[#cc040a] uppercase tracking-widest">User ID</span>
                  </div>
                  <input
                    type="text"
                    placeholder={selectedGame.idPlaceholder || "e.g. 84218845"}
                    value={playerId}
                    onChange={(e) => {
                      setPlayerId(e.target.value);
                      setIgnVerified(false);
                    }}
                    className="w-full px-4 pb-3 pt-1 bg-transparent text-sm text-slate-900 font-semibold focus:outline-none placeholder:text-slate-400"
                  />
                </div>

                {/* Zone ID Box */}
                <div className="flex-1 sm:max-w-[200px] bg-[#F8FAFC] border-2 border-slate-200 rounded-2xl shadow-inner overflow-hidden focus-within:border-amber-500 transition-colors">
                  <div className="px-4 pt-2.5 pb-0">
                    <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest">Zone ID</span>
                  </div>
                  <input
                    type="text"
                    placeholder={selectedGame.serverPlaceholder || "e.g. 2168"}
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="w-full px-4 pb-3 pt-1 bg-transparent text-sm text-slate-900 font-semibold focus:outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
            ) : (
              /* Other games: single input box */
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-2.5 flex flex-col sm:flex-row items-center gap-2 shadow-inner">
                <div className="relative w-full flex-1">
                  <input
                    type="text"
                    placeholder={selectedGame.idPlaceholder || "Enter your Player ID (UID)"}
                    value={playerId}
                    onChange={(e) => {
                      setPlayerId(e.target.value);
                      setIgnVerified(false);
                    }}
                    className="w-full px-4 py-3 bg-transparent text-sm text-slate-900 font-semibold focus:outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}

            {/* Paste + Verify buttons — shared for all games */}
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={handlePastePlayerId}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-1/2 sm:w-auto"
              >
                <Clipboard className="w-4 h-4 text-slate-500" />
                <span>Paste</span>
              </button>

              <button
                type="button"
                onClick={handleVerifyIgn}
                disabled={isVerifyingIgn}
                className="px-6 py-3 bg-[#cc040a] hover:bg-[#b00308] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md w-1/2 sm:w-auto"
              >
                {isVerifyingIgn ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{isVerifyingIgn ? 'Checking...' : 'Verify'}</span>
              </button>
            </div>

            {/* Helper Guide Hint Banner ONLY for Mobile Legends */}
            {selectedGame?.id === 'mobilelegends' && (
              <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 text-xs font-bold flex items-start sm:items-center gap-2.5 shadow-xs">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                <span className="leading-snug">💡 MLBB User ID (e.g. 84218845) සහ Zone ID (e.g. 2168 - Profile එකේ වරහන් ඇතුළත ඇති අංකය) ඇතුළත් කරන්න.</span>
              </div>
            )}


            {/* Saved IDs & Verified IGN Badge */}
            {(userProfile?.savedIds || []).filter(s => s.gameId === selectedGame.id).length > 0 && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400">Quick Saved IDs:</span>
                {(userProfile?.savedIds || []).filter(s => s.gameId === selectedGame.id).map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setPlayerId(s.playerId); setIgn(s.nickName); setIgnVerified(true); }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1 rounded-lg border border-slate-200 cursor-pointer"
                  >
                    ⚡ {s.nickName} ({s.playerId})
                  </button>
                ))}
              </div>
            )}

            {ignVerified && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-emerald-800 font-semibold animate-in fade-in">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                  <span className="shrink-0 font-bold">Verified ID / IGN:</span>
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      value={ign} 
                      onChange={(e) => setIgn(e.target.value)} 
                      className="bg-white border border-emerald-400 rounded-lg px-3 py-1 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm min-w-[180px] sm:min-w-[220px]"
                      placeholder="Type your In-Game Name"
                      title="Type your real in-game username"
                    />
                    <Edit3 className="w-3.5 h-3.5 text-emerald-500 absolute right-2.5 pointer-events-none" />
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium hidden sm:inline">(Click to edit name)</span>
                </div>
                <button 
                  onClick={() => savePlayerId(selectedGame.id, selectedGame.name, playerId, ign)}
                  className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Save to Profile</span>
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: Select Diamond Packages (Matching Screenshot 2) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#cc040a] text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                  2
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 font-heading leading-none">
                    Select {selectedGame.currencyName} Packages
                  </h2>
                  <div className="w-12 h-1 bg-[#cc040a] rounded-full mt-1.5"></div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                <span className="text-xs text-slate-400 font-medium">Tap + to add items</span>

                {/* Sort Filter */}
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setSortOrder('default')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      sortOrder === 'default' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span className="hidden sm:inline">Default</span>
                  </button>
                  <button
                    onClick={() => setSortOrder('lth')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      sortOrder === 'lth' ? 'bg-[#cc040a] text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <ArrowUp className="w-3 h-3" />
                    <span>Low→High</span>
                  </button>
                  <button
                    onClick={() => setSortOrder('htl')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      sortOrder === 'htl' ? 'bg-[#cc040a] text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <ArrowDown className="w-3 h-3" />
                    <span>High→Low</span>
                  </button>
                </div>

                {/* LKR / USDT Currency Toggle */}
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setCurrency('LKR')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      currency === 'LKR' 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    LKR (Rs)
                  </button>
                  <button
                    onClick={() => setCurrency('USD')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      currency === 'USD' 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    USDT
                  </button>
                </div>
              </div>
            </div>

            {/* Reseller Wholesale Banner if User is Approved Reseller */}
            {isApprovedReseller && (
              <div className="mb-5 p-4 bg-gradient-to-r from-red-950/90 via-rose-950/90 to-red-950/90 border border-red-500/50 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-extrabold shrink-0 shadow-inner">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">Reseller Partner Pricing Activated 👑</h4>
                    <p className="text-[11px] sm:text-xs text-slate-300 font-medium">You are receiving exclusive reseller wholesale prices (5% discount applied across all packages)</p>
                  </div>
                </div>
                <span className="px-3.5 py-1.5 bg-red-600/40 border border-red-500/50 rounded-xl text-xs font-mono font-black text-amber-300 shrink-0 shadow-sm">
                  5% DISCOUNT ACTIVE
                </span>
              </div>
            )}

            {/* Packages Grid */}
            {(() => {
              const packages = [...(selectedGame.packages || [])];
              if (sortOrder === 'lth') packages.sort((a, b) => a.priceLkr - b.priceLkr);
              if (sortOrder === 'htl') packages.sort((a, b) => b.priceLkr - a.priceLkr);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                  {packages.map((pkg) => {
                const qty = cartQuantities[pkg.id] || 0;
                const isSelected = qty > 0;
                const effectivePrice = isApprovedReseller ? Math.round(pkg.priceLkr * 0.95) : pkg.priceLkr;

                return (
                  <div
                    key={pkg.id}
                    onClick={() => {
                      if (qty === 0) updateQuantity(pkg.id, 1);
                    }}
                    className={`bg-white rounded-2xl sm:rounded-3xl border transition-all duration-300 p-5 flex flex-col justify-between items-center text-center relative shadow-xs hover:shadow-md cursor-pointer group hover:-translate-y-1 ${
                      isSelected 
                        ? 'border-[#cc040a] ring-4 ring-[#cc040a]/15 bg-red-50/30' 
                        : 'border-slate-200/90 hover:border-[#cc040a]/40'
                    }`}
                  >
                    {pkg.isPopular && (
                      <span className="absolute -top-3 px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider shadow-md z-10">
                        🔥 POPULAR
                      </span>
                    )}

                    {/* Larger Image Thumbnail Container */}
                    <div className="w-full h-24 sm:h-28 rounded-2xl bg-[#F8FAFC] p-3 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300 border border-slate-100 shadow-inner">
                      {pkg.image ? (
                        <img src={pkg.image} alt={pkg.name} className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-sm" />
                      ) : (
                        <span className="text-4xl">{selectedGame.currencyIcon}</span>
                      )}
                    </div>

                    {/* Package Title */}
                    <div className="font-black text-xs sm:text-sm text-slate-900 font-heading leading-tight min-h-[36px] flex items-center justify-center text-center mb-1">
                      {pkg.name}
                    </div>

                    {/* Bonus Tag */}
                    {pkg.bonus && (
                      <span className="text-[10px] font-bold text-[#cc040a] bg-red-50 border border-red-100 px-2 py-0.5 rounded-full mb-1">
                        {pkg.bonus}
                      </span>
                    )}

                    {/* Price Display (With Reseller Wholesale Discounting) */}
                    <div className="my-1 text-center">
                      {isApprovedReseller ? (
                        <div className="flex flex-col items-center">
                          <span className="font-black text-base sm:text-lg text-emerald-600 font-heading tracking-tight leading-none">
                            {formatLkr(effectivePrice)}
                          </span>
                          <span className="text-[10px] text-slate-400 line-through font-bold mt-0.5">
                            {formatLkr(pkg.priceLkr)}
                          </span>
                        </div>
                      ) : (
                        <div className="font-black text-base sm:text-lg text-[#cc040a] font-heading tracking-tight">
                          {formatLkr(pkg.priceLkr)}
                        </div>
                      )}
                    </div>

                    {/* Counter Buttons (- 0 +) */}
                    <div className="w-full pt-3 border-t border-slate-100 flex items-center justify-between px-0.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateQuantity(pkg.id, -1); }}
                        disabled={qty === 0}
                        className={`w-9 h-9 rounded-xl font-black text-base flex items-center justify-center transition-all cursor-pointer ${
                          qty > 0 
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200' 
                            : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                        }`}
                      >
                        -
                      </button>

                      <span className={`font-black text-base sm:text-lg font-heading px-1 ${qty > 0 ? 'text-[#cc040a]' : 'text-slate-400'}`}>
                        {qty}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateQuantity(pkg.id, 1); }}
                        className="w-9 h-9 rounded-xl bg-[#cc040a] hover:bg-[#b00308] text-white font-black text-base flex items-center justify-center transition-all cursor-pointer shadow-md shadow-red-600/25"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
                </div>
              );
            })()}
          </div>

          {/* STEP 3: Payment Method & Submit Order */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-[#cc040a] text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                3
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 font-heading leading-none">
                  Select Payment Method
                </h2>
                <div className="w-12 h-1 bg-[#cc040a] rounded-full mt-1.5"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {PAYMENT_METHODS.filter(m => isLoggedIn || m.id !== 'wallet').map((method) => {
                const isSelected = selectedPayment.id === method.id;
                return (
                  <div
                    key={method.id}
                    onClick={() => setSelectedPayment(method)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#cc040a] text-white border-[#cc040a] shadow-md shadow-red-600/20'
                        : 'bg-white text-slate-900 border-slate-200 hover:border-[#cc040a]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{method.icon}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white text-[#cc040a]' : 'bg-red-50 text-[#cc040a] border border-red-100'
                      }`}>
                        {method.badge}
                      </span>
                    </div>

                    <div>
                      <div className="font-extrabold text-sm font-heading">{method.name}</div>
                      <div className={`text-xs mt-0.5 ${isSelected ? 'text-red-100' : 'text-slate-500'}`}>
                        {method.subtitle}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Login prompt card for wallet — only when logged out */}
              {!isLoggedIn && (
                <div
                  onClick={() => openAuth('login')}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-[#cc040a]/60 hover:bg-red-50 cursor-pointer transition-all flex flex-col justify-center items-center text-center gap-1.5"
                >
                  <span className="text-2xl">💳</span>
                  <div className="font-extrabold text-sm text-slate-700">MADS Wallet</div>
                  <div className="text-[10px] text-slate-400 font-semibold">Log in to pay with wallet balance</div>
                  <span className="mt-1 text-[10px] bg-[#cc040a] text-white px-2.5 py-0.5 rounded-full font-bold">Login Required</span>
                </div>
              )}

              {/* Recharge Wallet Helper Card */}
              <div
                onClick={() => openWalletModal()}
                className="p-4 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-slate-900 cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">📥</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white uppercase tracking-wider">
                    Recharge Wallet
                  </span>
                </div>
                <div>
                  <div className="font-extrabold text-sm text-emerald-900 font-heading group-hover:text-emerald-700 flex items-center gap-1">
                    <span>Recharge Wallet Balance</span>
                    <span className="text-xs">→</span>
                  </div>
                  <div className="text-xs text-emerald-700 mt-0.5">
                    Deposit via EZ Cash, Binance Pay, or Bank Transfer
                  </div>
                </div>
              </div>
            </div>


            {/* Payment Details Instructions & R2 Upload */}
            {selectedPayment.accountDetails && (
              <div id="receipt-upload-section" className="bg-slate-50 p-4 rounded-2xl border-2 border-[#cc040a]/20 text-xs space-y-3 mb-6 transition-all shadow-sm">
                <div className="font-extrabold text-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-[#cc040a]" />
                    <span>Payment Instructions ({selectedPayment.name}):</span>
                  </div>
                  <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Receipt Required
                  </span>
                </div>

                {selectedPayment.id === 'bank' && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px] text-slate-800">
                    <div>Bank Name: <strong>{selectedPayment.accountDetails.bankName}</strong></div>
                    <div>Account Name: <strong>{selectedPayment.accountDetails.accountName}</strong></div>
                    <div>Account Number: <strong className="text-[#cc040a]">{selectedPayment.accountDetails.accountNumber}</strong></div>
                    <div>Branch: <strong>{selectedPayment.accountDetails.branch}</strong></div>
                  </div>
                )}

                {selectedPayment.id === 'ezcash' && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800">
                    <div>eZ Cash / mCash Number: <strong className="text-[#cc040a] font-extrabold text-sm">{selectedPayment.accountDetails.number}</strong></div>
                  </div>
                )}

                <p className="text-slate-500 italic text-[11px]">
                  {selectedPayment.accountDetails.instructions}
                </p>

                {/* Cloudflare R2 Upload Slip */}
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                      <span>Upload Slip / Receipt Screenshot</span>
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-mono font-extrabold">*REQUIRED</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Directly stored to Cloudflare R2 Storage</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleReceiptUpload}
                      disabled={isUploadingReceipt}
                      className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                    />
                    {isUploadingReceipt && (
                      <span className="text-xs text-[#cc040a] font-bold flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </span>
                    )}
                  </div>
                </div>

                {receiptR2Url && (
                  <div className="mt-2 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-300 p-2.5 rounded-xl flex items-center justify-between font-mono">
                    <span className="truncate max-w-[320px]">R2 Slip: {receiptR2Url}</span>
                    <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Uploaded</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Final Checkout Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Amount</span>
                <div className="text-2xl sm:text-3xl font-black text-[#cc040a] font-heading">
                  {formatLkr(totalLkr)}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {totalItemsCount} package(s) selected
                </span>
              </div>

              <button
                type="button"
                onClick={handleCompleteOrder}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-10 py-4 bg-[#cc040a] hover:bg-[#b00308] text-white font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/25"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching via Moongold...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Confirm & Top Up Now</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* STICKY BOTTOM CART BAR — visible on all screen sizes when cart has items */}
          {totalItemsCount > 0 && (
            <div
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 50,
                background: 'linear-gradient(135deg, rgba(10,10,18,0.97) 0%, rgba(20,10,15,0.98) 100%)',
                borderTop: '1.5px solid rgba(204,4,10,0.35)',
                boxShadow: '0 -4px 40px rgba(204,4,10,0.18), 0 -1px 0 rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                padding: '10px 16px 12px',
                animation: 'slideUpBar 0.3s cubic-bezier(.22,1,.36,1) both',
              }}
            >
              {/* Animated top glow line */}
              <div style={{
                position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(204,4,10,0.7), transparent)',
                borderRadius: '1px'
              }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>

                {/* LEFT — total info */}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1 }}>
                    Total ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'})
                  </span>
                  <span style={{
                    fontSize: '22px', fontWeight: 900, lineHeight: 1.1, marginTop: '2px',
                    background: 'linear-gradient(135deg, #ff4444 0%, #cc040a 60%, #ff6b35 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text', fontFamily: 'inherit',
                    filter: 'drop-shadow(0 0 8px rgba(204,4,10,0.5))'
                  }}>
                    {formatLkr(totalLkr)}
                  </span>
                </div>

                {/* RIGHT — support button + top up button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>

                  {/* Support Icon Button */}
                  <button
                    type="button"
                    onClick={() => setIsSupportOpen(true)}
                    title="Live Support"
                    style={{
                      width: '42px', height: '42px', borderRadius: '12px', border: 'none',
                      background: 'rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(255,255,255,0.75)', cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: '1.5px solid rgba(255,255,255,0.1)',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(204,4,10,0.2)'; e.currentTarget.style.color = '#ff4444'; e.currentTarget.style.outline = '1.5px solid rgba(204,4,10,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.outline = '1.5px solid rgba(255,255,255,0.1)'; }}
                  >
                    <Headphones style={{ width: '18px', height: '18px' }} />
                  </button>

                  {/* Top Up CTA */}
                  <button
                    type="button"
                    onClick={handleCompleteOrder}
                    disabled={isSubmitting}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '7px',
                      padding: '0 20px', height: '42px', borderRadius: '13px',
                      border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      background: isSubmitting
                        ? 'rgba(150,0,0,0.5)'
                        : 'linear-gradient(135deg, #e8060c 0%, #cc040a 50%, #a00208 100%)',
                      boxShadow: isSubmitting ? 'none' : '0 4px 20px rgba(204,4,10,0.55), inset 0 1px 0 rgba(255,255,255,0.15)',
                      color: '#fff', fontWeight: 900, fontSize: '13px',
                      letterSpacing: '0.02em', whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                      opacity: isSubmitting ? 0.7 : 1,
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} />
                        <span>Processing…</span>
                      </>
                    ) : (
                      <>
                        <Zap style={{ width: '15px', height: '15px', fill: '#fff' }} />
                        <span>Top Up</span>
                      </>
                    )}
                  </button>

                </div>
              </div>

              {/* Slide-up keyframes injected once */}
              <style>{`
                @keyframes slideUpBar {
                  from { transform: translateY(100%); opacity: 0; }
                  to   { transform: translateY(0);    opacity: 1; }
                }
              `}</style>
            </div>
          )}

          {/* HOW IT WORKS ACCORDION SECTION (Matching Screenshot 3) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mb-6">
            <div 
              onClick={() => setIsHowItWorksOpen(!isHowItWorksOpen)}
              className="p-5 bg-white flex items-center justify-between cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading leading-tight">
                    How It Works
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Simple 5-step process</p>
                </div>
              </div>

              <div className="text-slate-400 hover:text-slate-700">
                {isHowItWorksOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>

            {/* Accordion 5 Steps Content */}
            {isHowItWorksOpen && (
              <div className="p-5 bg-slate-50/50 space-y-3">
                
                {/* Step 1 */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 flex items-start gap-4 shadow-xs">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide font-heading">Verify Your ID</h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Enter your Player ID to confirm your game account.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 flex items-start gap-4 shadow-xs">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide font-heading">Select Products</h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Choose your currency and select diamond packages.</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 flex items-start gap-4 shadow-xs">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide font-heading">Checkout</h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Review your cart and select payment method.</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 flex items-start gap-4 shadow-xs">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide font-heading">Secure Payment</h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Complete your payment through our secure gateway.</p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 flex items-start gap-4 shadow-xs">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    5
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide font-heading">Instant Diamond Delivery</h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Diamonds are delivered instantly to your account!</p>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* 100% SECURE PAYMENTS BANNER */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 text-[#cc040a] font-bold text-xs mb-3 border border-red-100">
              <Shield className="w-4 h-4 text-[#cc040a]" />
              <span>100% Secure Payments</span>
            </div>

            <p className="text-xs text-slate-500 font-semibold mb-5">
              We accept a wide range of secure payment methods:
            </p>

            {/* Individual Payment Logo Cards */}
            <div className="flex flex-wrap items-center justify-center gap-3 py-2">

              {/* VISA */}
              <div className="flex items-center justify-center w-20 h-14 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 900, fontSize: '22px', color: '#1a1f71', letterSpacing: '-1px' }}>VISA</span>
              </div>

              {/* Mastercard */}
              <div className="flex items-center justify-center w-20 h-14 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                <div style={{ position: 'relative', width: 42, height: 28 }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, width: 28, height: 28, borderRadius: '50%', background: '#EB001B', opacity: 0.95 }} />
                  <div style={{ position: 'absolute', right: 0, top: 0, width: 28, height: 28, borderRadius: '50%', background: '#F79E1B', opacity: 0.95 }} />
                  <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0, width: 14, height: 28, background: '#FF5F00', opacity: 0.9 }} />
                </div>
              </div>

              {/* AMEX */}
              <div className="flex items-center justify-center w-20 h-14 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all" style={{ background: '#2E77BC' }}>
                <span style={{ fontWeight: 900, fontSize: '13px', color: '#fff', letterSpacing: '1px', fontFamily: 'Arial, sans-serif' }}>AMEX</span>
              </div>

              {/* Binance Pay */}
              <div className="flex items-center justify-center w-20 h-14 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all gap-1">
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                  <path d="M16 2L20.5 6.5L13 14L8.5 9.5L16 2Z" fill="#F3BA2F"/>
                  <path d="M22.5 8.5L27 13L19.5 20.5L15 16L22.5 8.5Z" fill="#F3BA2F"/>
                  <path d="M9.5 8.5L14 13L6.5 20.5L2 16L9.5 8.5Z" fill="#F3BA2F"/>
                  <path d="M16 18L20.5 22.5L16 27L11.5 22.5L16 18Z" fill="#F3BA2F"/>
                  <path d="M16 10L20.5 14.5L16 19L11.5 14.5L16 10Z" fill="#F3BA2F"/>
                </svg>
                <span style={{ fontSize: '9px', fontWeight: 900, color: '#F3BA2F', lineHeight: 1 }}>BINANCE<br/>PAY</span>
              </div>

              {/* LankaPay */}
              <div className="flex items-center justify-center w-20 h-14 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex-col gap-0.5">
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#8B1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: '12px', fontWeight: 900 }}>L</span>
                </div>
                <span style={{ fontSize: '8px', fontWeight: 800, color: '#8B1A1A', letterSpacing: '0.5px' }}>LANKAPAY</span>
              </div>

              {/* eZ Cash */}
              <div className="flex items-center justify-center w-20 h-14 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex-col gap-0.5">
                <div style={{ background: '#6DBB3A', borderRadius: '10px', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: 900, fontStyle: 'italic' }}>eZ</span>
                  <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>Cash</span>
                </div>
                <span style={{ fontSize: '7px', color: '#64748b', fontWeight: 600 }}>by Dialog</span>
              </div>

              {/* mCash */}
              <div className="flex items-center justify-center w-20 h-14 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all gap-1">
                <div style={{ width: 28, height: 28, borderRadius: '8px', background: '#FF6B1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: '16px', fontWeight: 900, fontStyle: 'italic' }}>m</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#333' }}>Cash</span>
              </div>

            </div>
          </div>
        </>
      )}

      {/* ACCOUNT VERIFIED POPUP MODAL (Matching User Screenshot 100%) */}
      {verifyModalData && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setVerifyModalData(null)}
        >
          <div 
            className="bg-white rounded-3xl p-8 sm:p-10 max-w-sm w-full text-center space-y-4 shadow-2xl relative border border-slate-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Checkmark Circle */}
            <div className="w-20 h-20 rounded-full border-2 border-emerald-400/80 bg-emerald-50/70 flex items-center justify-center mx-auto text-emerald-500 shadow-xs">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>

            {/* Title */}
            <h3 className="text-2xl font-black text-slate-800 font-heading tracking-tight">
              Account Verified!
            </h3>

            {/* IGN & Player ID */}
            <div className="space-y-1 py-1">
              <div className="text-lg font-black text-slate-900 font-heading tracking-wide">
                {verifyModalData.ign}
              </div>
              <div className="text-xs font-bold text-slate-500 font-mono">
                ID: {verifyModalData.playerId}
              </div>
            </div>

            {/* OK Button */}
            <button
              type="button"
              onClick={() => setVerifyModalData(null)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer mt-2"
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
