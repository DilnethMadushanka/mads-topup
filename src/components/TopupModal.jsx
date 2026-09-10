import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PAYMENT_METHODS } from '../data/games';
import { checkPlayerIGN, dispatchMoongoldOrder } from '../services/moongoldApi';
import { uploadToR2Storage } from '../services/storageService';
import confetti from 'canvas-confetti';
import { 
  X, Check, ShieldCheck, Zap, AlertCircle, RefreshCw, 
  CreditCard, ChevronRight, BookmarkPlus, CheckCircle2, Copy, UploadCloud, Cloud, Edit3
} from 'lucide-react';

export const TopupModal = () => {
  const { 
    selectedGame, 
    isTopupModalOpen, 
    setIsTopupModalOpen, 
    addOrder, 
    showToast,
    formatPrice,
    savePlayerId,
    userProfile
  } = useApp();

  const [step, setStep] = useState(1); // 1: ID, 2: Package, 3: Payment, 4: Success
  const [playerId, setPlayerId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_METHODS[0]);
  const [ign, setIgn] = useState('');
  const [isVerifyingIgn, setIsVerifyingIgn] = useState(false);
  const [ignVerified, setIgnVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptR2Url, setReceiptR2Url] = useState('');
  const [savedSelection, setSavedSelection] = useState('');

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setIsUploadingReceipt(true);
    const result = await uploadToR2Storage(file, 'receipts');
    setIsUploadingReceipt(false);
    if (result.success) {
      setReceiptR2Url(result.url);
      showToast('Payment receipt uploaded to Cloudflare R2 Bucket!');
    } else {
      showToast('Failed to upload receipt', 'error');
    }
  };

  useEffect(() => {
    if (selectedGame && selectedGame.packages.length > 0) {
      setSelectedPackage(selectedGame.packages.find(p => p.isPopular) || selectedGame.packages[0]);
      setPlayerId('');
      setZoneId('');
      setIgn('');
      setIgnVerified(false);
      setStep(1);
    }
  }, [selectedGame]);

  if (!isTopupModalOpen || !selectedGame) return null;

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

  const handleSelectSavedId = (saved) => {
    setPlayerId(saved.playerId);
    setSavedSelection(saved.id);
    if (saved.nickName) {
      setIgn(saved.nickName);
      setIgnVerified(true);
    }
  };

  const handleProceedToPayment = () => {
    if (!playerId.trim()) {
      showToast('Please enter a valid Player ID!', 'error');
      return;
    }
    if (selectedGame.requiresServer && !zoneId.trim()) {
      showToast('Please enter your Zone / Server ID!', 'error');
      return;
    }
    if (!selectedPackage) {
      showToast('Please select a diamond package!', 'error');
      return;
    }
    setStep(3);
  };

  const handleCompleteOrder = async () => {
    setIsSubmitting(true);
    
    // Dispatch via Moongold API simulator
    const orderPayload = {
      game: selectedGame,
      playerId,
      zoneId,
      package: selectedPackage,
      payment: selectedPayment,
      ign: ign || 'Verified Gamer'
    };

    const moongoldResult = await dispatchMoongoldOrder(orderPayload);
    setIsSubmitting(false);

    const newOrder = {
      id: 'ORD-' + Math.floor(10000 + Math.random() * 90000),
      gameId: selectedGame.id,
      gameName: selectedGame.name,
      packageName: selectedPackage.name,
      amount: selectedPackage.amount,
      playerId,
      zoneId,
      ign: ign || 'Verified Gamer',
      paymentMethod: selectedPayment.name,
      priceLkr: selectedPackage.priceLkr,
      status: moongoldResult.status || 'COMPLETED',
      moongoldRef: moongoldResult.moongoldRef || ('MG-' + Math.floor(10000000 + Math.random() * 90000000)),
      createdAt: new Date().toISOString()
    };

    addOrder(newOrder);
    setCompletedOrder(newOrder);
    setStep(4);

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF1A3C', '#FFFFFF', '#D90429']
      });
    } catch (e) {}
  };

  return (
    <div className="modal-overlay">
      <div className="bg-white text-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#cc040a] to-red-600 flex items-center justify-center font-bold text-xl shadow-md text-white">
              {selectedGame.currencyIcon}
            </div>
            <div>
              <h2 className="text-xl font-black font-heading tracking-tight flex items-center gap-2">
                <span>{selectedGame.name} Top-Up</span>
                <span className="text-[10px] bg-[#3B2896] text-white px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                  Moongold 24/7
                </span>
              </h2>
              <p className="text-xs text-slate-400">Fast & Automated Delivery to Account</p>
            </div>
          </div>

          <button 
            onClick={() => setIsTopupModalOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-[#cc040a]' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 1 ? 'bg-[#cc040a] text-white' : 'bg-slate-300 text-slate-600'}`}>1</span>
            <span>Account ID</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-[#cc040a]' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 2 ? 'bg-[#cc040a] text-white' : 'bg-slate-300 text-slate-600'}`}>2</span>
            <span>Package</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-[#cc040a]' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 3 ? 'bg-[#cc040a] text-white' : 'bg-slate-300 text-slate-600'}`}>3</span>
            <span>Payment</span>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white text-slate-900">
          
          {step < 4 && (
            <>
              {/* SECTION 1: Player ID & Server Verification */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#cc040a]"></span>
                    Step 1: Enter Game Account ID
                  </label>
                  {(userProfile?.savedIds || []).filter(s => s.gameId === selectedGame.id).length > 0 && (
                    <span className="text-[11px] text-slate-400 font-semibold">Saved IDs Available</span>
                  )}
                </div>

                {/* Quick Select Saved IDs */}
                {(userProfile?.savedIds || []).filter(s => s.gameId === selectedGame.id).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(userProfile?.savedIds || []).filter(s => s.gameId === selectedGame.id).map(saved => (
                      <button
                        key={saved.id}
                        onClick={() => handleSelectSavedId(saved)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                          savedSelection === saved.id 
                            ? 'bg-[#cc040a] text-white border-[#cc040a]' 
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        ⚡ {saved.nickName} ({saved.playerId})
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                  <div className={selectedGame.requiresServer ? 'sm:col-span-7' : 'sm:col-span-8'}>
                    <input
                      type="text"
                      placeholder={selectedGame.idPlaceholder}
                      value={playerId}
                      onChange={(e) => {
                        setPlayerId(e.target.value);
                        setIgnVerified(false);
                      }}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-semibold focus:outline-none focus:border-[#cc040a] shadow-xs"
                    />
                  </div>

                  {selectedGame.requiresServer && (
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        placeholder={selectedGame.serverPlaceholder}
                        value={zoneId}
                        onChange={(e) => setZoneId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-semibold focus:outline-none focus:border-[#cc040a] shadow-xs"
                      />
                    </div>
                  )}

                  <div className={selectedGame.requiresServer ? 'sm:col-span-12' : 'sm:col-span-4'}>
                    <button
                      onClick={handleVerifyIgn}
                      disabled={isVerifyingIgn}
                      className="w-full h-full min-h-[42px] px-3 py-2 bg-[#cc040a] text-white rounded-xl text-xs font-bold hover:bg-[#990207] transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      {isVerifyingIgn ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                      )}
                      <span>{isVerifyingIgn ? 'Checking Moongold...' : 'Check IGN'}</span>
                    </button>
                  </div>
                </div>

                {/* IGN Result Box */}
                {ignVerified && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-emerald-800 font-semibold animate-in fade-in">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="shrink-0 font-bold">In-Game Name:</span>
                      <div className="relative flex items-center">
                        <input 
                          type="text" 
                          value={ign} 
                          onChange={(e) => setIgn(e.target.value)} 
                          className="bg-white border border-emerald-400 rounded-md px-2 py-0.5 text-xs font-black text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs min-w-[140px]"
                          placeholder="Enter IGN"
                          title="Click to edit your In-Game Name"
                        />
                        <Edit3 className="w-3 h-3 text-emerald-500 absolute right-1.5 pointer-events-none" />
                      </div>
                    </div>
                    <button 
                      onClick={() => savePlayerId(selectedGame.id, selectedGame.name, playerId, ign)}
                      className="text-[11px] bg-emerald-600 text-white px-2.5 py-1 rounded font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <BookmarkPlus className="w-3 h-3" />
                      <span>Save ID</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION 2: Package Selection */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#cc040a]"></span>
                    Step 2: Select Diamond / UC Package
                  </span>
                  <span className="text-[11px] text-[#cc040a] font-bold">100% Guaranteed Delivery</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedGame.packages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => {
                          setSelectedPackage(pkg);
                          if (step === 1) setStep(2);
                        }}
                        className={`relative p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#cc040a]/10 border-[#cc040a] shadow-lg shadow-red-500/10'
                            : 'bg-white border-slate-200 text-slate-900 hover:border-slate-400'
                        }`}
                      >
                        {pkg.isPopular && (
                          <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-[#3B2896] text-white text-[9px] font-black uppercase tracking-wider shadow z-10">
                            POPULAR
                          </span>
                        )}

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            {pkg.image ? (
                              <img src={pkg.image} alt={pkg.name} className="w-8 h-8 object-contain rounded-lg bg-slate-100 p-0.5 border border-slate-200" />
                            ) : (
                              <span className="text-sm">{selectedGame.currencyIcon}</span>
                            )}
                            <span className="font-extrabold text-xs sm:text-sm text-slate-900 font-heading leading-tight">
                              {pkg.name}
                            </span>
                          </div>
                          {pkg.bonus && (
                            <span className="text-[10px] text-[#cc040a] font-bold bg-[#cc040a]/15 px-1.5 py-0.5 rounded inline-block">
                              {pkg.bonus}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-sm font-black text-[#cc040a] font-heading">
                            {formatPrice(pkg.priceLkr)}
                          </span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'bg-[#cc040a] border-[#cc040a] text-white' : 'border-slate-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: Payment Method Selection */}
              {step >= 3 && (
                <div className="space-y-4 pt-2 border-t border-slate-200 animate-in fade-in">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#cc040a]"></span>
                    Step 3: Select Payment Method
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map((method) => {
                      const isSelected = selectedPayment.id === method.id;
                      return (
                        <div
                          key={method.id}
                          onClick={() => setSelectedPayment(method)}
                          className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#cc040a] text-white border-[#cc040a] shadow-lg shadow-red-500/20'
                              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{method.icon}</span>
                            <div>
                              <div className="font-bold text-xs flex items-center gap-2">
                                <span>{method.name}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  isSelected ? 'bg-white text-slate-900' : 'bg-[#cc040a]/20 text-[#cc040a]'
                                }`}>
                                  {method.badge}
                                </span>
                              </div>
                              <div className={`text-[10px] ${isSelected ? 'text-slate-100' : 'text-slate-500'}`}>
                                {method.subtitle}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Payment Transfer Info Box */}
                  {selectedPayment.accountDetails && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <CreditCard className="w-4 h-4 text-[#cc040a]" />
                        <span>Payment Instructions ({selectedPayment.name}):</span>
                      </div>
                      
                      {selectedPayment.id === 'bank' && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px] text-slate-800">
                          <div>Bank: <strong>{selectedPayment.accountDetails.bankName}</strong></div>
                          <div>Account Name: <strong>{selectedPayment.accountDetails.accountName}</strong></div>
                          <div>Account No: <strong>{selectedPayment.accountDetails.accountNumber}</strong></div>
                          <div>Branch: <strong>{selectedPayment.accountDetails.branch}</strong></div>
                        </div>
                      )}

                      {selectedPayment.id === 'ezcash' && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800">
                          <div>eZ Cash Number: <strong className="text-[#cc040a] font-extrabold">{selectedPayment.accountDetails.number}</strong></div>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-500 italic">
                        {selectedPayment.accountDetails.instructions}
                      </p>

                      {/* Cloudflare R2 Receipt Upload Widget */}
                      <div className="pt-2 border-t border-slate-200">
                        <label className="block text-[11px] font-extrabold text-slate-800 mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[#cc040a]">
                            <UploadCloud className="w-3.5 h-3.5" />
                            Upload Payment Slip / Screenshot
                          </span>
                          <span className="text-[9px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 border border-red-300">
                            <Cloud className="w-3 h-3 text-red-600" />
                            Cloudflare R2 Storage
                          </span>
                        </label>

                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleReceiptUpload}
                            disabled={isUploadingReceipt}
                            className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#cc040a] file:text-white hover:file:bg-[#990207] cursor-pointer"
                          />
                          {isUploadingReceipt && (
                            <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Uploading to R2...</span>
                            </span>
                          )}
                        </div>

                        {receiptR2Url && (
                          <div className="mt-2 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 p-2 rounded-xl flex items-center justify-between font-mono">
                            <span className="truncate max-w-[320px]">R2 Object: {receiptR2Url}</span>
                            <span className="font-bold text-emerald-600">✔ Uploaded</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* STEP 4: Success Screen */}
          {step === 4 && completedOrder && (
            <div className="text-center py-6 space-y-5 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-300 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900 font-heading">TOP-UP SUCCESSFUL!</h3>
                <p className="text-sm text-slate-600 font-medium">
                  Your top-up order has been automatically dispatched via Moongold API.
                </p>
              </div>

              {/* Order Receipt Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left max-w-md mx-auto space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Order ID:</span>
                  <span className="font-mono font-bold text-slate-900">{completedOrder.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Moongold Reference:</span>
                  <span className="font-mono font-bold text-[#cc040a]">{completedOrder.moongoldRef}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Game / Package:</span>
                  <span className="font-bold text-slate-900">{completedOrder.gameName} - {completedOrder.packageName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Player ID / IGN:</span>
                  <span className="font-bold text-slate-900">{completedOrder.playerId} ({completedOrder.ign})</span>
                </div>
                <div className="flex justify-between pt-1 font-bold text-sm">
                  <span className="text-slate-700">Total Paid:</span>
                  <span className="text-[#cc040a]">{formatPrice(completedOrder.priceLkr)}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => setIsTopupModalOpen(false)}
                  className="px-6 py-2.5 bg-[#cc040a] text-white font-bold text-xs rounded-full hover:bg-[#990207] transition-colors cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        {step < 4 && (
          <div className="bg-[#0F172A] p-4 px-6 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Selected Price</span>
              <span className="text-xl font-black text-[#cc040a] font-heading">
                {selectedPackage ? formatPrice(selectedPackage.priceLkr) : 'Rs. 0'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {step === 3 && (
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-700 rounded-full cursor-pointer"
                >
                  Back
                </button>
              )}

              {step < 3 ? (
                <button
                  onClick={handleProceedToPayment}
                  className="btn-cyan-pill px-6 py-3 font-extrabold text-sm rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-red-500/20"
                >
                  <span>Proceed to Payment</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleCompleteOrder}
                  disabled={isSubmitting}
                  className="btn-cyan-pill px-6 py-3 font-black text-sm rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-red-500/30"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Sending to Moongold...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      <span>Confirm & Top Up Now</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

