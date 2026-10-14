import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { PAYMENT_METHODS, getVerifiedPackagePriceLkr } from '../data/games';
import { checkPlayerIGN, dispatchMoongoldOrder } from '../services/moongoldApi';
import { uploadToR2Storage } from '../services/storageService';
import confetti from 'canvas-confetti';
import { auth } from '../services/firebaseAuth';
import { getUserAuthToken } from '../services/serverApi';
import { gamePathFor } from '../data/seoPages';
import { 
  ArrowLeft, Check, ShieldCheck, Zap, AlertCircle, RefreshCw, 
  CreditCard, ChevronRight, BookmarkPlus, CheckCircle2, Copy, UploadCloud, Cloud,
  Clipboard, Plus, Minus, ChevronUp, ChevronDown, HelpCircle, Shield, Edit3, Crown,
  ArrowUpDown, ArrowUp, ArrowDown, Wallet
} from 'lucide-react';

// Pay for the selected packages by card (Dialog Genie) without topping up the
// wallet first. The server prices the order from the catalog; once Genie
// confirms the payment the amount lands in the wallet and the order is placed
// from it automatically (see the card-return effect below).
const CARD_METHOD = {
  id: 'card',
  name: 'Card / eZ Cash',
  subtitle: 'Visa, Mastercard or eZ Cash via Dialog Genie. No wallet top-up needed',
  icon: '💳',
  badge: 'PAY DIRECT',
  accountDetails: null
};
const CARD_CHECKOUT_KEY = 'mads_card_checkout';

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
    openAuth
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
      if (selectedGame.fulfilment === 'voucher') setSelectedPayment(PAYMENT_METHODS[0]);
    }
  }, [selectedGame]);

  // ── Back from the card checkout ──
  // Verify the payment with the server (which credits the paid amount to the
  // wallet), then restore the cart and place the order from the wallet.
  const [cardOrderReady, setCardOrderReady] = useState(false);
  const handleCompleteOrderRef = React.useRef(null);
  const paidByCardRef = React.useRef(false);
  useEffect(() => {
    if (!selectedGame) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('genie') !== 'order') return;
    const orderRef = params.get('orderRef') || '';
    window.history.replaceState(window.history.state, '', window.location.pathname);

    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(CARD_CHECKOUT_KEY) || 'null'); } catch { pending = null; }
    try { sessionStorage.removeItem(CARD_CHECKOUT_KEY); } catch { /* storage blocked */ }
    const matches = pending && pending.gameId === selectedGame.id && (!orderRef || pending.orderRef === orderRef);

    if (matches) {
      setCartQuantities(pending.items || {});
      setPlayerId(pending.playerId || '');
      setZoneId(pending.zoneId || '');
      setIgn(pending.ign || '');
      setIgnVerified(Boolean(pending.ign));
      setSelectedPayment(PAYMENT_METHODS[0]);
    }

    showToast('Verifying your card payment...');
    fetch('/api/genie/verify-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: pending?.transactionId || '', orderRef: orderRef || pending?.orderRef || '' })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.isPaid) {
          if (data.newBalanceLkr !== undefined) {
            setUserProfile(prev => (prev ? {
              ...prev,
              walletBalance: Math.max(parseFloat(prev.walletBalance || 0), parseFloat(data.newBalanceLkr || 0))
            } : prev));
          }
          if (matches) {
            showToast(`✅ Card payment of Rs. ${Number(data.amount || 0).toLocaleString()} confirmed. Placing your order...`);
            setCardOrderReady(true);
          } else {
            showToast(`✅ Card payment of Rs. ${Number(data.amount || 0).toLocaleString()} confirmed and added to your wallet. Select your package and pay with MADS Wallet.`);
          }
        } else {
          showToast(`Card payment not completed (${data.state || data.error || 'pending'}). If you were charged, the amount is added to your wallet automatically.`, 'error');
        }
      })
      .catch(() => {
        showToast('Could not confirm the card payment right now. If you were charged, the amount is added to your wallet automatically.', 'error');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGame?.id]);

  // Place the restored order once the login has loaded (the wallet dispatch
  // needs the signed-in user).
  useEffect(() => {
    if (!cardOrderReady || !isLoggedIn || !userProfile?.uid) return;
    if (!Object.keys(cartQuantities).length) return;
    setCardOrderReady(false);
    paidByCardRef.current = true;
    Promise.resolve(handleCompleteOrderRef.current?.()).finally(() => { paidByCardRef.current = false; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardOrderReady, isLoggedIn, userProfile?.uid, cartQuantities]);

  if (!selectedGame) return null;

  // eVoucher products (Garena Shells): no player ID, wallet payment only,
  // and the buyer gets PIN codes back.
  const isVoucherGame = selectedGame.fulfilment === 'voucher';

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
        playerId: playerId,
        zoneId: zoneId,
        gameName: selectedGame.name
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
      showToast(result.error || 'Failed to upload receipt', 'error');
    }
  };

  // Send the buyer to Dialog Genie to pay for the selected packages by card.
  const startCardCheckout = async () => {
    if (!isLoggedIn) { openAuth('login'); return; }
    setIsSubmitting(true);
    try {
      const token = await getUserAuthToken(userProfile);
      if (!token) { showToast('Please log in again to pay by card.', 'error'); return; }
      const orderRef = 'ORD-CARD-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
      const returnPath = gamePathFor(selectedGame.id) || '/';
      const response = await fetch('/api/genie/create-order-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          gameId: selectedGame.id,
          items: selectedItems.map(item => ({ packageId: item.id, quantity: cartQuantities[item.id] || 1 })),
          playerId: isVoucherGame ? '' : playerId.trim(),
          zoneId: isVoucherGame ? '' : zoneId.trim(),
          userName: userProfile?.name || auth?.currentUser?.displayName || 'Gamer',
          redirectUrl: `${window.location.origin}${returnPath}?genie=order`,
          orderRef
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.redirectUrl) {
        showToast(data.error || 'Could not start the card payment. Please try again or use your wallet.', 'error');
        return;
      }
      try {
        sessionStorage.setItem(CARD_CHECKOUT_KEY, JSON.stringify({
          gameId: selectedGame.id,
          items: cartQuantities,
          playerId: playerId.trim(),
          zoneId: zoneId.trim(),
          ign,
          orderRef,
          transactionId: data.transactionId || '',
          createdAt: Date.now()
        }));
      } catch { /* storage blocked: the paid amount still lands in the wallet */ }
      showToast('Redirecting to secure card payment...');
      window.location.href = data.redirectUrl;
    } catch {
      showToast('Network error connecting to the payment gateway!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dispatch Topup Order
  const handleCompleteOrder = async () => {
    if (isVoucherGame && selectedPayment.id !== 'wallet' && selectedPayment.id !== 'card') {
      showToast('Garena Shells PINs are paid from your MADS Wallet. Please select MADS Wallet.', 'error');
      return;
    }
    if (!isVoucherGame && !playerId.trim()) {
      showToast('Please enter a valid Player ID (UID)!', 'error');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }
    if (!isVoucherGame && selectedGame.requiresServer && !zoneId.trim()) {
      showToast('Please enter your Zone / Server ID!', 'error');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }
    if (selectedItems.length === 0) {
      showToast('Please select at least 1 package to top-up!', 'error');
      return;
    }

    if (selectedPayment.id === 'card') {
      await startCardCheckout();
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
      let blockedAccount = false;
      let lastPartnerOrderId = null;
      const partnerOrderIds = [];
      let lastNewBalanceLkr = undefined;
      let lastNewBalanceUsdt = undefined;
      const voucherCodes = [];

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
            lastPartnerOrderId = res.partnerOrderId || lastPartnerOrderId;
            if (res.partnerOrderId) partnerOrderIds.push(res.partnerOrderId);
            if (res.newBalanceLkr !== undefined) lastNewBalanceLkr = res.newBalanceLkr;
            if (res.newBalanceUsdt !== undefined) lastNewBalanceUsdt = res.newBalanceUsdt;
            if (Array.isArray(res.voucherCodes)) voucherCodes.push(...res.voucherCodes);
          } else {
            allSuccess = false;
            if (res.moongoldRef) partnerOrderIds.push(res.moongoldRef);
            lastErrMsg = res.message || 'Provider dispatch failed';
            blockedAccount = Boolean(res.blocked);
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
        partnerOrderId: lastPartnerOrderId,
        partnerOrderIds,
        voucherCodes,
        message: lastErrMsg
      };

      if (!moongoldResult.success) {
        setIsSubmitting(false);
        if (blockedAccount) return;

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
          paymentMethod: paidByCardRef.current ? 'Card (Dialog Genie)' : selectedPayment.name,
          priceLkr: totalLkr,
          status: 'FAILED',
          moongoldRef: moongoldResult.moongoldRef || 'GATEWAY_FAILED',
          failureReason: moongoldResult.message || 'Provider dispatch failed',
          partnerOrderIds: moongoldResult.partnerOrderIds || [],
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
      playerId: isVoucherGame ? 'PIN' : playerId,
      zoneId: isVoucherGame ? '' : zoneId,
      ign: isVoucherGame ? `${selectedGame.name} PIN` : (ign || (`Player ${playerId}`)),
      paymentMethod: paidByCardRef.current ? 'Card (Dialog Genie)' : selectedPayment.name,
      priceLkr: totalLkr,
      status: finalStatus,
      moongoldRef: moongoldResult.moongoldRef || (selectedPayment.id === 'wallet' ? ('MG-' + Math.floor(10000000 + Math.random() * 90000000)) : 'PENDING_ADMIN_VERIFICATION'),
      receiptUrl: receiptR2Url || null,
      // Lets the database rules check a COMPLETED order against the
      // server's own record of the dispatch.
      partnerOrderId: moongoldResult.partnerOrderId || null,
      partnerOrderIds: moongoldResult.partnerOrderIds || [],
      createdAt: new Date().toISOString()
    };

    // PIN codes stay out of the saved order (the order list is public); they
    // are only shown here and in the profile's PIN list.
    addOrder(newOrder);
    setCompletedOrder(isVoucherGame ? { ...newOrder, voucherCodes: moongoldResult.voucherCodes || [] } : newOrder);

    // Confetti celebration
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#1677ff', '#1677ff', '#10B981', '#F59E0B']
      });
    } catch (e) {}

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  handleCompleteOrderRef.current = handleCompleteOrder;

  return (
    <div className={`min-h-screen bg-[#F8FAFF] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto${totalItemsCount > 0 ? ' pb-24' : ''}`}>
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setSelectedGame(null)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-800 hover:bg-slate-100 font-extrabold text-xs border border-slate-200 cursor-pointer transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#1677ff]" />
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

          {/* Garena Shells PIN codes */}
          {completedOrder.voucherCodes && (
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-300 text-left space-y-3 text-xs">
              <div className="font-black text-sm text-emerald-900">🐚 Your Garena Shells PIN</div>
              {completedOrder.voucherCodes.length > 0 ? (
                <>
                  {completedOrder.voucherCodes.map((code, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 bg-white border border-emerald-200 rounded-xl px-3 py-2">
                      <span className="font-mono font-bold text-slate-900 break-all">{code}</span>
                      <button
                        onClick={() => { try { navigator.clipboard.writeText(code); showToast('PIN copied!'); } catch (e) {} }}
                        className="shrink-0 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </button>
                    </div>
                  ))}
                  <p className="text-emerald-800 font-medium">Redeem it at {selectedGame.redeemSite || 'shop.garena.sg'} ({selectedGame.name}). You can see this PIN again in My Profile → My Codes.</p>
                </>
              ) : (
                <p className="text-emerald-800 font-medium">Your PIN is being prepared by the supplier. It will appear in My Profile → My Codes in a few minutes.</p>
              )}
            </div>
          )}

          {/* Receipt Details Box */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-left space-y-3 text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Order Reference:</span>
              <span className="font-mono font-bold text-slate-900">{completedOrder.id}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Moongold API Ref:</span>
              <span className="font-mono font-bold text-[#1677ff]">{completedOrder.moongoldRef}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Game Title:</span>
              <span className="font-bold text-slate-900">{completedOrder.gameName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Package Items:</span>
              <span className="font-bold text-slate-900">{completedOrder.packageName}</span>
            </div>
            {!completedOrder.voucherCodes && (
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Player UID / IGN:</span>
                <span className="font-bold text-slate-900">{completedOrder.playerId} ({completedOrder.ign})</span>
              </div>
            )}
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Payment Method:</span>
              <span className="font-bold text-slate-900">{completedOrder.paymentMethod}</span>
            </div>
            <div className="flex justify-between pt-1 font-bold text-sm">
              <span className="text-slate-700">Total Price Paid:</span>
              <span className="text-[#1677ff] font-black">{formatLkr(completedOrder.priceLkr)}</span>
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

          {/* STEP 1 for eVouchers: what the buyer gets */}
          {isVoucherGame ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1677ff] text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                1
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 font-heading leading-none">
                  You Get a PIN Code
                </h2>
                <div className="w-12 h-1 bg-amber-500 rounded-full mt-1.5"></div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 text-xs font-bold flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-snug">No Player ID needed. After payment you get a {selectedGame.name} PIN code instantly. Redeem it at {selectedGame.redeemSite || 'shop.garena.sg'}. Paid from your MADS Wallet.</span>
            </div>
          </div>
          ) : (
          <>
          {/* STEP 1: Verify Your Player ID (Matching Screenshot 1) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#1677ff] text-white font-extrabold flex items-center justify-center text-sm shadow-md">
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
                <div className="flex-1 bg-[#F8FAFC] border-2 border-slate-200 rounded-2xl shadow-inner overflow-hidden focus-within:border-[#1677ff] transition-colors">
                  <div className="px-4 pt-2.5 pb-0">
                    <span className="text-[10px] font-extrabold text-[#1677ff] uppercase tracking-widest">User ID</span>
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
                className="px-6 py-3 bg-[#1677ff] hover:bg-[#0d68e6] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md w-1/2 sm:w-auto"
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

          </>
          )}

          {/* STEP 2: Select Diamond Packages (Matching Screenshot 2) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1677ff] text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                  2
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 font-heading leading-none">
                    Select {selectedGame.currencyName} Packages
                  </h2>
                  <div className="w-12 h-1 bg-[#1677ff] rounded-full mt-1.5"></div>
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
                      sortOrder === 'lth' ? 'bg-[#1677ff] text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <ArrowUp className="w-3 h-3" />
                    <span>Low→High</span>
                  </button>
                  <button
                    onClick={() => setSortOrder('htl')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      sortOrder === 'htl' ? 'bg-[#1677ff] text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'
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
              <div className="mb-5 p-4 bg-gradient-to-r from-brand-950/90 via-brand-950/90 to-brand-950/90 border border-brand-500/50 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-extrabold shrink-0 shadow-inner">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">Reseller Partner Pricing Activated 👑</h4>
                    <p className="text-[11px] sm:text-xs text-slate-300 font-medium">You are receiving exclusive reseller wholesale prices (5% discount applied across all packages)</p>
                  </div>
                </div>
                <span className="px-3.5 py-1.5 bg-brand-600/40 border border-brand-500/50 rounded-xl text-xs font-mono font-black text-amber-300 shrink-0 shadow-sm">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
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
                    className={`pkg-card group relative flex flex-col text-center cursor-pointer ${isSelected ? 'is-selected' : ''}`}
                  >
                    {/* Artwork band */}
                    <div className="pkg-art relative w-full aspect-[16/10] flex items-center justify-center overflow-hidden">
                      {pkg.isPopular && (
                        <span className="pkg-hot absolute top-0 left-0 z-10">🔥 Popular</span>
                      )}
                      {isSelected && (
                        <span className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-[#1677ff] text-white text-xs font-bold flex items-center justify-center shadow-md shadow-brand-600/40">
                          ✓
                        </span>
                      )}
                      {pkg.image ? (
                        <img
                          src={pkg.image}
                          alt={pkg.name}
                          loading="lazy"
                          className="relative w-[62%] h-[78%] object-contain drop-shadow-[0_10px_16px_rgba(0,10,40,0.45)] group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <span className="relative text-4xl">{selectedGame.currencyIcon}</span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col items-center px-2.5 sm:px-3 pt-3 pb-3 sm:pb-3.5">
                      {/* Amount: base in white, bonus in gold (e.g. 300 + 25 UC) */}
                      {(() => {
                        const m = String(pkg.name).match(/^([\d,]+)\s*\+\s*([\d,]+)\s*(.*)$/) || String(pkg.name).match(/^([\d,]+)\s+(.*?)\s*\+\s*([\d,]+)\s*Bonus$/i);
                        if (!m) {
                          return (
                            <div className="min-h-[2.6rem] flex items-center justify-center font-heading font-extrabold text-[13px] sm:text-[15px] text-slate-900 leading-tight">
                              {pkg.name}
                            </div>
                          );
                        }
                        const isBonusFirst = m[0].toLowerCase().endsWith('bonus');
                        const base = m[1];
                        const extra = isBonusFirst ? m[3] : m[2];
                        const unit = (isBonusFirst ? m[2] : m[3]).replace(/\(.*\)/, '').trim();
                        const pct = Math.round((Number(extra.replace(/,/g, '')) / Number(base.replace(/,/g, ''))) * 100);
                        return (
                          <div className="min-h-[2.6rem] flex flex-col items-center justify-end">
                            {pct > 0 && selectedGame?.id !== 'freefire_sg' && (
                              <span className="pkg-pct mb-1">+{pct}%</span>
                            )}
                            <div className="font-heading font-extrabold text-[15px] sm:text-lg leading-none text-slate-900 whitespace-nowrap">
                              {base}<span className="pkg-gold"> +{extra}</span>
                              {unit && <span className="ml-1 text-[10px] sm:text-xs font-bold text-slate-500 uppercase">{unit}</span>}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Extra info tag (region, PIN type…) — hidden for Free Fire since additional diamonds are not delivered */}
                      {pkg.bonus && !/^\+/.test(pkg.bonus) && selectedGame?.id !== 'freefire_sg' && (
                        <span className="mt-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {pkg.bonus}
                        </span>
                      )}

                      {/* Price (with reseller wholesale discounting) */}
                      <div className="mt-auto pt-2.5 text-center">
                        {isApprovedReseller ? (
                          <div className="flex flex-col items-center">
                            <span className="font-heading font-extrabold text-lg text-emerald-600 tracking-tight leading-none">
                              {formatLkr(effectivePrice)}
                            </span>
                            <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-bold">
                              <span className="text-slate-400 line-through">{formatLkr(pkg.priceLkr)}</span>
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">-5%</span>
                            </span>
                          </div>
                        ) : (
                          <div className="pkg-price font-heading font-extrabold text-lg sm:text-xl tracking-tight leading-none">
                            {formatLkr(pkg.priceLkr)}
                          </div>
                        )}
                      </div>

                    {/* Quantity stepper */}
                    <div className="mt-3 w-full flex items-center justify-between rounded-full bg-slate-100/80 border border-slate-200/70 p-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateQuantity(pkg.id, -1); }}
                        disabled={qty === 0}
                        className={`w-8 h-8 rounded-full font-bold text-base flex items-center justify-center transition-all ${
                          qty > 0
                            ? 'bg-white text-slate-800 shadow-sm hover:bg-slate-50 cursor-pointer active:scale-95'
                            : 'text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        -
                      </button>

                      <span className={`font-heading font-extrabold text-base tabular-nums px-1 ${qty > 0 ? 'text-[#1677ff]' : 'text-slate-400'}`}>
                        {qty}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateQuantity(pkg.id, 1); }}
                        className="w-8 h-8 rounded-full bg-[#1677ff] hover:bg-[#0d68e6] text-white font-bold text-base flex items-center justify-center transition-all cursor-pointer shadow-md shadow-brand-600/30 active:scale-95"
                      >
                        +
                      </button>
                    </div>
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
              <div className="w-8 h-8 rounded-full bg-[#1677ff] text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                3
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 font-heading leading-none">
                  Select Payment Method
                </h2>
                <div className="w-12 h-1 bg-[#1677ff] rounded-full mt-1.5"></div>
              </div>
            </div>

            {(() => {
              const methods = [...PAYMENT_METHODS, CARD_METHOD].filter(m =>
                (isLoggedIn || (m.id !== 'wallet' && m.id !== 'card')) && (!isVoucherGame || m.id === 'wallet' || m.id === 'card'));
              const walletLkr = parseFloat(userProfile?.walletBalance || 0);
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4" role="radiogroup" aria-label="Payment method">
                  {methods.map((method) => {
                    const isSelected = selectedPayment.id === method.id;
                    const isCard = method.id === 'card';
                    return (
                      <button
                        key={method.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedPayment(method)}
                        className={`pay-opt group text-left cursor-pointer ${isSelected ? 'is-selected' : ''}`}
                      >
                        <span className={`pay-opt-icon ${isCard ? 'is-card' : 'is-wallet'}`}>
                          {isCard ? <CreditCard className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 flex-wrap">
                            <span className="font-heading font-black text-[15px] text-slate-900">
                              {isCard ? 'Card / eZ Cash' : 'MADS Wallet'}
                            </span>
                            <span className={`pay-opt-tag ${isCard ? 'is-card' : ''}`}>{isCard ? 'Pay direct' : 'Instant 24/7'}</span>
                          </span>
                          <span className="block mt-1 text-xs text-slate-500 leading-snug">
                            {isCard ? 'Pay for this order now. No wallet top-up needed.' : 'Pay from your wallet balance. Delivered in seconds.'}
                          </span>
                          {isCard ? (
                            <span className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                              {['VISA', 'Mastercard', 'eZ Cash'].map((b) => (
                                <span key={b} className="pay-brand">{b}</span>
                              ))}
                            </span>
                          ) : (
                            <span className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
                              Balance
                              <span className={`font-heading font-black ${walletLkr >= totalLkr && totalLkr > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                {formatLkr(walletLkr)}
                              </span>
                            </span>
                          )}
                        </span>
                        <span className={`pay-opt-radio ${isSelected ? 'is-on' : ''}`} aria-hidden="true">
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />}
                        </span>
                      </button>
                    );
                  })}

                  {!isLoggedIn && (
                    <button
                      type="button"
                      onClick={() => openAuth('login')}
                      className="pay-opt pay-opt-login md:col-span-2 text-left cursor-pointer"
                    >
                      <span className="pay-opt-icon is-wallet"><Wallet className="w-6 h-6" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-heading font-black text-[15px] text-slate-900">Log in to pay</span>
                        <span className="block mt-1 text-xs text-slate-500">Pay with your MADS Wallet or directly by card / eZ Cash.</span>
                      </span>
                      <ChevronRight className="w-5 h-5 text-[#1677ff] shrink-0" />
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Wallet short? Offer card, or a recharge */}
            {isLoggedIn && selectedPayment.id === 'wallet' && totalLkr > 0 && parseFloat(userProfile?.walletBalance || 0) < totalLkr && (
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <span className="text-xs font-semibold text-amber-800">
                  Your wallet is short by <strong>{formatLkr(totalLkr - parseFloat(userProfile?.walletBalance || 0))}</strong> for this order.
                </span>
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => setSelectedPayment(CARD_METHOD)} className="h-8 px-3.5 rounded-full bg-[#1677ff] text-white text-xs font-black cursor-pointer hover:bg-[#0d68e6]">
                    Pay by card
                  </button>
                  <button type="button" onClick={() => openWalletModal()} className="h-8 px-3.5 rounded-full bg-white border border-amber-300 text-amber-800 text-xs font-black cursor-pointer hover:bg-amber-100">
                    Recharge wallet
                  </button>
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => openWalletModal()}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#1677ff] cursor-pointer transition-colors"
            >
              <span className="text-left">Recharge wallet (eZ Cash, Binance Pay, bank)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Payment Details Instructions & R2 Upload */}
            {selectedPayment.accountDetails && (
              <div id="receipt-upload-section" className="bg-slate-50 p-4 rounded-2xl border-2 border-[#1677ff]/20 text-xs space-y-3 mb-6 transition-all shadow-sm">
                <div className="font-extrabold text-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-[#1677ff]" />
                    <span>Payment Instructions ({selectedPayment.name}):</span>
                  </div>
                  <span className="text-[10px] bg-brand-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Receipt Required
                  </span>
                </div>

                {selectedPayment.id === 'bank' && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px] text-slate-800">
                    <div>Bank Name: <strong>{selectedPayment.accountDetails.bankName}</strong></div>
                    <div>Account Name: <strong>{selectedPayment.accountDetails.accountName}</strong></div>
                    <div>Account Number: <strong className="text-[#1677ff]">{selectedPayment.accountDetails.accountNumber}</strong></div>
                    <div>Branch: <strong>{selectedPayment.accountDetails.branch}</strong></div>
                  </div>
                )}

                {selectedPayment.id === 'ezcash' && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800">
                    <div>eZ Cash / mCash Number: <strong className="text-[#1677ff] font-extrabold text-sm">{selectedPayment.accountDetails.number}</strong></div>
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
                      <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-mono font-extrabold">*REQUIRED</span>
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
                      <span className="text-xs text-[#1677ff] font-bold flex items-center gap-1">
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
            <div className="pay-summary mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60 block">Total to pay</span>
                <div className="mt-1 text-3xl sm:text-4xl font-black text-white font-heading leading-none">
                  {formatLkr(totalLkr)}
                </div>
                <span className="mt-2 block text-xs text-white/70 font-medium">
                  {totalItemsCount} package{totalItemsCount === 1 ? '' : 's'} · {selectedPayment.id === 'card' ? 'Card / eZ Cash' : 'MADS Wallet'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCompleteOrder}
                disabled={isSubmitting}
                className="pay-cta w-full sm:w-auto px-9 h-14 font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{selectedPayment.id === 'card' ? 'Opening card payment...' : 'Dispatching via Moongold...'}</span>
                  </>
                ) : selectedPayment.id === 'card' ? (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay by Card & Top Up</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Confirm & Top Up Now</span>
                  </>
                )}
              </button>
            </div>
            <p className="mt-3 flex items-center justify-center sm:justify-end gap-1.5 text-[11px] font-medium text-slate-400">
              <Shield className="w-3.5 h-3.5" />
              {selectedPayment.id === 'card' ? 'Secure checkout by Dialog Genie. We never see your card details.' : 'Paid from your wallet and delivered automatically.'}
            </p>
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
                borderTop: '1.5px solid rgba(22,119,255,0.35)',
                boxShadow: '0 -4px 40px rgba(22,119,255,0.18), 0 -1px 0 rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                padding: '10px 16px 12px',
                animation: 'slideUpBar 0.3s cubic-bezier(.22,1,.36,1) both',
              }}
            >
              {/* Animated top glow line */}
              <div style={{
                position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(22,119,255,0.7), transparent)',
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
                    background: 'linear-gradient(135deg, #4a9cff 0%, #1677ff 60%, #ff6b35 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text', fontFamily: 'inherit',
                    filter: 'drop-shadow(0 0 8px rgba(22,119,255,0.5))'
                  }}>
                    {formatLkr(totalLkr)}
                  </span>
                </div>

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
                      : 'linear-gradient(135deg, #2384ff 0%, #1677ff 50%, #0a55c6 100%)',
                    boxShadow: isSubmitting ? 'none' : '0 4px 20px rgba(22,119,255,0.55), inset 0 1px 0 rgba(255,255,255,0.15)',
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

              {/* Slide-up keyframes injected once */}
              <style>{`
                @keyframes slideUpBar {
                  from { transform: translateY(100%); opacity: 0; }
                  to   { transform: translateY(0);    opacity: 1; }
                }
              `}</style>
            </div>
          )}

          {/* HOW IT WORKS ACCORDION SECTION */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mb-6">
            <div
              onClick={() => setIsHowItWorksOpen(!isHowItWorksOpen)}
              className={`p-5 bg-white flex items-center justify-between cursor-pointer hover:bg-brand-50/40 transition-colors ${isHowItWorksOpen ? 'border-b border-slate-100' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1677ff] text-white flex items-center justify-center shadow-md shadow-brand-600/20">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading leading-tight">
                    How It Works
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Simple 5-step process</p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                {isHowItWorksOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {isHowItWorksOpen && (
              <div className="p-5 sm:p-6">
                {[
                  ['Verify Your ID', 'Enter your Player ID to confirm your game account.'],
                  ['Select Products', 'Choose your currency and select diamond packages.'],
                  ['Checkout', 'Review your cart and select payment method.'],
                  ['Secure Payment', 'Complete your payment through our secure gateway.'],
                  ['Instant Diamond Delivery', 'Diamonds are delivered instantly to your account!'],
                ].map(([title, desc], i, arr) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="flex flex-col items-center self-stretch">
                      <div className="w-8 h-8 rounded-full bg-[#1677ff] text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md shadow-brand-600/20">
                        {i + 1}
                      </div>
                      {i < arr.length - 1 && <div className="w-0.5 flex-1 bg-brand-100 my-1"></div>}
                    </div>
                    <div className={i < arr.length - 1 ? 'pb-5' : ''}>
                      <h4 className="text-sm font-extrabold text-slate-900 font-heading leading-8">{title}</h4>
                      <p className="text-xs text-slate-500 -mt-0.5 font-medium">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 100% SECURE PAYMENTS BANNER */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 text-[#1677ff] font-bold text-xs mb-3 border border-brand-100">
              <Shield className="w-4 h-4 text-[#1677ff]" />
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

      {/* ACCOUNT VERIFIED POPUP MODAL. Rendered into <body>: the page wrapper's
          entrance animation leaves a transform on it, which would make `fixed`
          position relative to the whole page instead of the screen. */}
      {verifyModalData && createPortal(
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
            <div>
              <h3 className="text-2xl font-black text-slate-800 font-heading tracking-tight">
                Account Verified!
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-1">Please confirm this is your account</p>
            </div>

            {/* IGN highlight box */}
            <div className="relative rounded-2xl border-2 border-emerald-400/60 bg-emerald-50 px-4 pt-6 pb-4 shadow-inner">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-sm whitespace-nowrap">
                In-Game Name
              </span>
              <div className="text-2xl sm:text-[28px] leading-tight font-black text-slate-900 font-heading tracking-wide break-words">
                {verifyModalData.ign}
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-emerald-300 flex items-center justify-center gap-2 flex-wrap text-xs font-bold text-slate-500">
                <span className="font-mono text-slate-700">
                  ID: {verifyModalData.playerId}{verifyModalData.zoneId ? ` (${verifyModalData.zoneId})` : ''}
                </span>
                {verifyModalData.gameName && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{verifyModalData.gameName}</span>
                  </>
                )}
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
        </div>,
        document.body
      )}

    </div>
  );
};
