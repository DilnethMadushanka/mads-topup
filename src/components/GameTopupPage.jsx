import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PAYMENT_METHODS } from '../data/games';
import { checkPlayerIGN, dispatchMoongoldOrder } from '../services/moongoldApi';
import { uploadToR2Storage } from '../services/storageService';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, Check, ShieldCheck, Zap, AlertCircle, RefreshCw, 
  CreditCard, ChevronRight, BookmarkPlus, CheckCircle2, Copy, UploadCloud, Cloud,
  Clipboard, Plus, Minus, ChevronUp, ChevronDown, HelpCircle, Shield, Edit3
} from 'lucide-react';

export const GameTopupPage = () => {
  const { 
    selectedGame, 
    setSelectedGame,
    addOrder, 
    showToast,
    formatPrice,
    savePlayerId,
    userProfile,
    currency,
    setCurrency
  } = useApp();

  const [playerId, setPlayerId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [ign, setIgn] = useState('');
  const [isVerifyingIgn, setIsVerifyingIgn] = useState(false);
  const [ignVerified, setIgnVerified] = useState(false);

  // Cart quantities map { [packageId]: quantity }
  const [cartQuantities, setCartQuantities] = useState({});
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_METHODS[0]);
  
  // Accordion state for How It Works
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(true);

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
      // Default to 1 for the first/popular package
      const defaultPkg = selectedGame.packages.find(p => p.isPopular) || selectedGame.packages[0];
      setCartQuantities({ [defaultPkg.id]: 1 });
      setPlayerId('');
      setZoneId('');
      setIgn('');
      setIgnVerified(false);
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

  // Compute Total Price & Items
  const selectedItems = selectedGame.packages.filter(pkg => (cartQuantities[pkg.id] || 0) > 0);
  const totalLkr = selectedItems.reduce((sum, pkg) => sum + (pkg.priceLkr * (cartQuantities[pkg.id] || 0)), 0);
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

    setIsSubmitting(true);
    
    // Main package title summary
    const packageSummary = selectedItems
      .map(item => `${cartQuantities[item.id]}x ${item.name}`)
      .join(', ');

    const orderPayload = {
      game: selectedGame,
      playerId,
      zoneId,
      package: selectedItems[0],
      payment: selectedPayment,
      ign: ign || 'Verified Gamer'
    };

    const moongoldResult = await dispatchMoongoldOrder(orderPayload);
    setIsSubmitting(false);

    const newOrder = {
      id: 'ORD-' + Math.floor(10000 + Math.random() * 90000),
      gameId: selectedGame.id,
      gameName: selectedGame.name,
      packageName: packageSummary,
      amount: selectedItems.reduce((s, i) => s + (i.amount * cartQuantities[i.id]), 0),
      playerId,
      zoneId,
      ign: ign || 'Verified Gamer',
      paymentMethod: selectedPayment.name,
      priceLkr: totalLkr,
      status: moongoldResult.status || 'COMPLETED',
      moongoldRef: moongoldResult.moongoldRef || ('MG-' + Math.floor(10000000 + Math.random() * 90000000)),
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
        colors: ['#2563EB', '#cc040a', '#10B981', '#F59E0B']
      });
    } catch (e) {}

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setSelectedGame(null)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-800 hover:bg-slate-100 font-extrabold text-xs border border-slate-200 cursor-pointer transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-blue-600" />
          <span>Back to All Games</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-600">24/7 Automated Moongold Delivery</span>
        </div>
      </div>

      {/* SUCCESS SCREEN VIEW */}
      {completedOrder ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 max-w-2xl mx-auto text-center space-y-6 my-10 animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-300 flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div>
            <h2 className="text-3xl font-black text-slate-900 font-heading">TOP-UP SUCCESSFUL!</h2>
            <p className="text-sm text-slate-600 font-medium mt-1">
              Your order has been verified & instantly credited via Moongold Engine.
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
              <span className="font-mono font-bold text-blue-600">{completedOrder.moongoldRef}</span>
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
              <span className="text-blue-600 font-black">{formatPrice(completedOrder.priceLkr)}</span>
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
          {/* HERO BANNER (Matching Screenshot 1) */}
          <div className="relative rounded-3xl overflow-hidden shadow-xl mb-8 min-h-[240px] sm:min-h-[280px] bg-slate-950 flex flex-col justify-between p-6 sm:p-10 border border-slate-800">
            {/* Background Cover Image with Gradient Overlay */}
            <div className="absolute inset-0 z-0">
              <img 
                src={selectedGame.banner} 
                alt={selectedGame.name} 
                className="w-full h-full object-cover opacity-40 blur-[1px] scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30"></div>
            </div>

            {/* Top Brand Tag */}
            <div className="relative z-10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-white/80 font-black text-xs uppercase tracking-wider font-mono bg-white/10 backdrop-blur-md px-3 py-1 rounded-md border border-white/15">
                  {selectedGame.publisher}
                </span>
                {selectedGame.flag && (
                  <span className="text-sm bg-white/10 backdrop-blur-md px-2 py-0.5 rounded border border-white/20">
                    {selectedGame.flag}
                  </span>
                )}
              </div>

              {/* Instant Delivery Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white text-xs font-bold shadow-md">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Instant Delivery</span>
              </div>
            </div>

            {/* Banner Center Title */}
            <div className="relative z-10 text-center my-6">
              <h1 className="text-3xl sm:text-5xl font-black text-white font-heading tracking-tight drop-shadow-md">
                {selectedGame.name} Top-Up
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm font-semibold mt-2 drop-shadow-sm">
                Official Distributor | Trusted by thousands of Sri Lankan Gamers
              </p>
            </div>

            <div className="relative z-10"></div>
          </div>

          {/* STEP 1: Verify Your Player ID (Matching Screenshot 1) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white font-extrabold flex items-center justify-center text-sm shadow-md">
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

              {selectedGame.requiresServer && (
                <div className="w-full sm:w-48">
                  <input
                    type="text"
                    placeholder="Server / Zone ID"
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 font-semibold focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto">
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
                  className="px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md w-1/2 sm:w-auto"
                >
                  {isVerifyingIgn ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{isVerifyingIgn ? 'Checking...' : 'Verify'}</span>
                </button>
              </div>
            </div>

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
                  <span className="shrink-0 font-bold">Verified IGN:</span>
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      value={ign} 
                      onChange={(e) => setIgn(e.target.value)} 
                      className="bg-white border border-emerald-400 rounded-lg px-3 py-1 text-xs font-black text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm min-w-[180px] sm:min-w-[220px]"
                      placeholder="Enter In-Game Name"
                      title="Click to edit your In-Game Name"
                    />
                    <Edit3 className="w-3.5 h-3.5 text-emerald-500 absolute right-2.5 pointer-events-none" />
                  </div>
                  <span className="text-[11px] text-emerald-600 font-normal hidden sm:inline">(Click name to edit)</span>
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
                <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                  2
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 font-heading leading-none">
                    Select {selectedGame.currencyName} Packages
                  </h2>
                  <div className="w-12 h-1 bg-amber-500 rounded-full mt-1.5"></div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <span className="text-xs text-slate-400 font-medium">Tap + to add items</span>

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

            {/* Packages Grid (Larger Beautiful Cards matching screenshot) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {selectedGame.packages.map((pkg) => {
                const qty = cartQuantities[pkg.id] || 0;
                const isSelected = qty > 0;

                return (
                  <div
                    key={pkg.id}
                    className={`bg-white rounded-2xl sm:rounded-3xl border transition-all duration-300 p-5 flex flex-col justify-between items-center text-center relative shadow-xs hover:shadow-md cursor-pointer group hover:-translate-y-1 ${
                      isSelected 
                        ? 'border-[#2563EB] ring-4 ring-blue-500/15 bg-blue-50/20' 
                        : 'border-slate-200/90 hover:border-slate-300'
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
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full mb-1">
                        {pkg.bonus}
                      </span>
                    )}

                    {/* Price */}
                    <div className="font-black text-base sm:text-lg text-[#2563EB] font-heading my-1 tracking-tight">
                      {formatPrice(pkg.priceLkr)}
                    </div>

                    {/* Counter Buttons (- 0 +) */}
                    <div className="w-full pt-3 border-t border-slate-100 flex items-center justify-between px-0.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(pkg.id, -1)}
                        disabled={qty === 0}
                        className={`w-9 h-9 rounded-xl font-black text-base flex items-center justify-center transition-all cursor-pointer ${
                          qty > 0 
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200' 
                            : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                        }`}
                      >
                        -
                      </button>

                      <span className={`font-black text-base sm:text-lg font-heading px-1 ${qty > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {qty}
                      </span>

                      <button
                        type="button"
                        onClick={() => updateQuantity(pkg.id, 1)}
                        className="w-9 h-9 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-base flex items-center justify-center transition-all cursor-pointer shadow-md shadow-blue-500/25"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Payment Method & Submit Order */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                3
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 font-heading leading-none">
                  Select Payment Method
                </h2>
                <div className="w-12 h-1 bg-amber-500 rounded-full mt-1.5"></div>
              </div>
            </div>

            {/* Payment Method Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = selectedPayment.id === method.id;
                return (
                  <div
                    key={method.id}
                    onClick={() => setSelectedPayment(method)}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                        : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl sm:text-2xl">{method.icon}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-white text-slate-900' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {method.badge}
                      </span>
                    </div>

                    <div>
                      <div className="font-extrabold text-xs font-heading">{method.name}</div>
                      <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        {method.subtitle}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Details Instructions & R2 Upload */}
            {selectedPayment.accountDetails && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-3 mb-6">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Payment Instructions ({selectedPayment.name}):</span>
                </div>

                {selectedPayment.id === 'bank' && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px] text-slate-800">
                    <div>Bank Name: <strong>{selectedPayment.accountDetails.bankName}</strong></div>
                    <div>Account Name: <strong>{selectedPayment.accountDetails.accountName}</strong></div>
                    <div>Account Number: <strong className="text-blue-600">{selectedPayment.accountDetails.accountNumber}</strong></div>
                    <div>Branch: <strong>{selectedPayment.accountDetails.branch}</strong></div>
                  </div>
                )}

                {selectedPayment.id === 'ezcash' && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800">
                    <div>eZ Cash / mCash Number: <strong className="text-blue-600 font-extrabold text-sm">{selectedPayment.accountDetails.number}</strong></div>
                  </div>
                )}

                <p className="text-slate-500 italic text-[11px]">
                  {selectedPayment.accountDetails.instructions}
                </p>

                {/* Cloudflare R2 Upload Slip */}
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-extrabold text-slate-800 text-xs block">
                      Upload Slip Screenshot (Optional)
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
                      <span className="text-xs text-blue-600 font-bold flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Final Checkout Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Amount</span>
                <div className="text-2xl sm:text-3xl font-black text-blue-600 font-heading">
                  {formatPrice(totalLkr)}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {totalItemsCount} package(s) selected
                </span>
              </div>

              <button
                type="button"
                onClick={handleCompleteOrder}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-10 py-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/25"
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

          {/* STICKY MOBILE CART SUMMARY BAR */}
          {totalItemsCount > 0 && (
            <div className="sm:hidden fixed bottom-14 left-0 right-0 z-30 bg-slate-900/95 text-white backdrop-blur-md px-4 py-3 border-t border-slate-800 shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total ({totalItemsCount} item)</span>
                <span className="text-lg font-black text-cyan-400 font-heading">{formatPrice(totalLkr)}</span>
              </div>
              <button
                onClick={handleCompleteOrder}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-600 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Top Up Now</span>
              </button>
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

          {/* 100% SECURE PAYMENTS BANNER (Matching Screenshot 4) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs mb-3 border border-emerald-200">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>100% Secure Payments</span>
            </div>

            <p className="text-xs text-slate-500 font-semibold mb-5">
              We accept a wide range of secure payment methods:
            </p>

            {/* Payment Method Badges Row */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 font-black text-xs text-blue-800 font-mono tracking-wider">
                VISA
              </div>
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 font-black text-xs text-red-600 font-mono tracking-wider">
                MasterCard
              </div>
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 font-black text-xs text-cyan-600 font-mono tracking-wider">
                AMEX
              </div>
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 font-black text-xs text-amber-600 font-mono tracking-wider">
                BINANCE PAY
              </div>
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 font-black text-xs text-red-500 font-mono tracking-wider">
                LankaPay
              </div>
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 font-black text-xs text-emerald-600 font-mono tracking-wider">
                eZ Cash
              </div>
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 font-black text-xs text-amber-500 font-mono tracking-wider">
                mCash
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
