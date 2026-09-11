import React, { useState } from 'react';
import { 
  Lock, ArrowLeft, ShoppingBag, Coins, Users, Copy, CheckCircle2, 
  Share2, MessageCircle, Send, Sparkles, Gift, TrendingUp, Calculator, ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ReferralProgramPage = () => {
  const { 
    closeReferralPage, 
    orders, 
    userProfile, 
    openCatalog, 
    setIsUserProfileOpen, 
    showToast,
    openAuth,
    isLoggedIn
  } = useApp();

  const [friendsCount, setFriendsCount] = useState(5);
  const [avgTopupLkr, setAvgTopupLkr] = useState(2500);

  // Filter orders strictly belonging to the logged-in user
  const userOrders = (orders || []).filter(o => {
    if (!userProfile || (!userProfile.uid && !userProfile.email)) return false;
    const matchUid = userProfile.uid && o.userId && o.userId === userProfile.uid;
    const matchEmail = userProfile.email && o.userEmail && o.userEmail.toLowerCase() === userProfile.email.toLowerCase();
    return matchUid || matchEmail;
  });

  const completedOrders = userOrders.filter(o => o.status === 'COMPLETED');
  const userCompletedCount = completedOrders.length;
  const userTotalSpentLkr = completedOrders.reduce((sum, o) => sum + (o.priceLkr || 0), 0);

  // Criteria for unlocking: At least 3 purchases OR spend 1000 LKR+
  const isUnlocked = userCompletedCount >= 3 || userTotalSpentLkr >= 1000;

  const purchasesProgressPercent = Math.min(100, Math.round((userCompletedCount / 3) * 100));
  const spendProgressPercent = Math.min(100, Math.round((userTotalSpentLkr / 1000) * 100));

  const referralCode = `MADS-REF-${(userProfile?.name || 'GAMER').slice(0, 3).toUpperCase()}${userProfile?.uid ? userProfile.uid.slice(-4) : '9821'}`;
  const referralLink = `https://madstopup.com/ref/${referralCode}`;

  // Smart Profit Calculation: 1.5% cashback for referrer
  const estimatedMonthlyCashback = Math.round(friendsCount * avgTopupLkr * 0.015);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    showToast('Referral link copied to clipboard!');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Hey gamer! Join MADS TOPUP for instant Free Fire & PUBG top-ups! Use my link to get Rs. 100 bonus voucher on your first topup: ${referralLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={closeReferralPage}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-100 hover:text-[#cc040a] transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <button
            onClick={() => setIsUserProfileOpen(true)}
            className="text-xs font-extrabold text-slate-600 hover:text-[#cc040a] transition-colors"
          >
            My Profile
          </button>
        </div>

        {/* LOCKED PROGRAM SCREEN (Matching User Screenshot) */}
        {!isUnlocked ? (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xl text-center space-y-6 my-8">
            
            {/* Red Lock Icon Circle */}
            <div className="w-20 h-20 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center text-[#cc040a] mx-auto shadow-inner">
              <Lock className="w-9 h-9 text-[#cc040a]" />
            </div>

            {/* Title & Description matching screenshot */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
                Program Locked
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed max-w-xs mx-auto">
                This program is exclusive to active customers. Unlock it by meeting <strong className="text-slate-800">ONE</strong> of the following criteria:
              </p>
            </div>

            {/* Criteria Box 1: Purchases */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-2 text-left">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                <span className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#cc040a]" />
                  <span>At Least 3 Purchases</span>
                </span>
                <span className="font-mono text-slate-600">{userCompletedCount} / 3</span>
              </div>
              <div className="h-3 bg-slate-200/80 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-[#cc040a] rounded-full transition-all duration-500" 
                  style={{ width: `${purchasesProgressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* OR Divider Badge matching screenshot */}
            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-200 w-full"></div>
              <span className="absolute bg-white px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-200 rounded-full py-0.5 font-mono">
                OR
              </span>
            </div>

            {/* Criteria Box 2: Spend 1000 LKR+ */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-2 text-left">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                <span className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>Spend 1000 LKR+</span>
                </span>
                <span className="font-mono text-slate-600">{userTotalSpentLkr.toFixed(0)} / 1000 LKR</span>
              </div>
              <div className="h-3 bg-slate-200/80 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-[#cc040a] rounded-full transition-all duration-500" 
                  style={{ width: `${spendProgressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Action Buttons matching screenshot */}
            <div className="pt-2 space-y-3">
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    openAuth('login');
                  } else {
                    openCatalog();
                  }
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#cc040a] hover:bg-[#b00308] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🚀 MAKE A PURCHASE TO UNLOCK</span>
              </button>

              <button
                onClick={() => setIsUserProfileOpen(true)}
                className="w-full text-xs font-extrabold text-slate-500 hover:text-slate-800 uppercase tracking-wider py-1 cursor-pointer transition-colors"
              >
                RETURN TO PROFILE
              </button>
            </div>

          </div>
        ) : (
          /* UNLOCKED REFERRAL DASHBOARD */
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#cc040a] via-[#dc2626] to-[#990207] rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black tracking-wider uppercase">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>PROGRAM UNLOCKED & ACTIVE</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black font-heading tracking-tight">
                Earn <span className="text-amber-300">1.5% Cashback</span> On Every Friend's Top-Up!
              </h1>
              <p className="text-red-100 text-sm sm:text-base font-semibold max-w-xl">
                Share your referral link with gaming friends. They get Rs. 100 bonus voucher on their first order, and you earn instant LKR wallet cash!
              </p>
            </div>

            {/* Share Referral Link Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-black text-[#cc040a] uppercase tracking-widest font-mono">YOUR REFERRAL LINK</span>
                  <h3 className="text-xl font-extrabold text-slate-900 font-heading">Share &amp; Earn Together</h3>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 font-mono font-bold text-xs rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>1.5% Unlimited Reward Rate</span>
                </div>
              </div>

              {/* Link Input & Copy */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs font-bold text-slate-800 focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto px-6 py-3 bg-[#cc040a] hover:bg-[#b00308] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </button>
              </div>

              {/* Quick Social Share */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="text-xs font-bold text-slate-500">Quick Share:</span>
                <button
                  onClick={handleShareWhatsApp}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Telegram</span>
                </button>
              </div>
            </div>

            {/* Smart Earnings Calculator */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 font-heading">Smart Cashback Calculator</h3>
                  <p className="text-xs text-slate-500 font-semibold">Estimate your passive wallet earnings when friends top up</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-extrabold text-slate-700 mb-1">
                      <span>Referred Friends Top-up:</span>
                      <span className="text-[#cc040a]">{friendsCount} Gamers</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={friendsCount}
                      onChange={(e) => setFriendsCount(parseInt(e.target.value))}
                      className="w-full accent-[#cc040a] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-extrabold text-slate-700 mb-1">
                      <span>Average Order Value:</span>
                      <span className="text-[#cc040a]">{avgTopupLkr} LKR</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="10000"
                      step="500"
                      value={avgTopupLkr}
                      onChange={(e) => setAvgTopupLkr(parseInt(e.target.value))}
                      className="w-full accent-[#cc040a] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Calculation Result */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center space-y-1 shadow-xs">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ESTIMATED MONTHLY CASHBACK</span>
                  <span className="text-3xl sm:text-4xl font-black text-emerald-600 font-heading">
                    +Rs. {estimatedMonthlyCashback.toLocaleString()} LKR
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 pt-1">Automatically credited to your MADS Wallet!</span>
                </div>
              </div>
            </div>

            {/* How It Works Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-[#cc040a] font-black text-sm flex items-center justify-center">1</div>
                <h4 className="font-extrabold text-slate-900 text-sm">1. Share Your Unique Link</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">Copy your referral link and share it on WhatsApp groups, Facebook, or Discord.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 font-black text-sm flex items-center justify-center">2</div>
                <h4 className="font-extrabold text-slate-900 text-sm">2. Friends Get Rs. 100 Bonus</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">Your referred friends get a WELCOME100 voucher code for their first top-up.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center">3</div>
                <h4 className="font-extrabold text-slate-900 text-sm">3. Earn 1.5% Instant Cash</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">Every time your friends top up, 1.5% cashback is credited to your MADS LKR Wallet!</p>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
