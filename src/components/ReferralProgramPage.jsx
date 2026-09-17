import React, { useState, useMemo } from 'react';
import {
  Lock, ArrowLeft, ShoppingBag, Coins, Copy, CheckCircle2,
  Share2, MessageCircle, Send, Sparkles, Gift, Calculator,
  ShieldCheck, TrendingUp, Users, LogIn, Zap
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

  // ── Filter orders for logged-in user ──────────────────────────────
  const userOrders = (orders || []).filter(o => {
    if (!userProfile || (!userProfile.uid && !userProfile.email)) return false;
    const matchUid   = userProfile.uid   && o.userId    && o.userId === userProfile.uid;
    const matchEmail = userProfile.email && o.userEmail && o.userEmail.toLowerCase() === userProfile.email.toLowerCase();
    return matchUid || matchEmail;
  });

  const completedOrders    = userOrders.filter(o => o.status === 'COMPLETED');
  const userCompletedCount = completedOrders.length;
  const userTotalSpentLkr  = completedOrders.reduce((sum, o) => sum + (o.priceLkr || 0), 0);

  // Unlock criteria: ≥3 purchases OR ≥Rs.1000 spent
  const isUnlocked = isLoggedIn && (userCompletedCount >= 3 || userTotalSpentLkr >= 1000);

  const purchasesProgressPercent = Math.min(100, Math.round((userCompletedCount / 3) * 100));
  const spendProgressPercent     = Math.min(100, Math.round((userTotalSpentLkr / 1000) * 100));

  // ── BUG FIX: useMemo prevents Math.random() re-running on every render
  const referralCode = useMemo(() => {
    const namePart = (userProfile?.displayName || userProfile?.name || 'USER')
      .replace(/\s+/g, '').slice(0, 3).toUpperCase();
    const uidPart = userProfile?.uid
      ? userProfile.uid.slice(-4)
      : String(Math.floor(1000 + Math.random() * 9000)); // stable per mount
    return `MADS-${namePart}${uidPart}`;
  }, [userProfile?.uid, userProfile?.displayName, userProfile?.name]);

  const referralLink = `${window.location.origin}/ref/${referralCode}`;

  // Estimated cashback: 1.5% per friend
  const estimatedMonthlyCashback = Math.round(friendsCount * avgTopupLkr * 0.015);

  // ── Share Handlers ─────────────────────────────────────────────────
  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      showToast('✅ Referral link copied to clipboard!');
    }).catch(() => {
      showToast('❌ Could not copy — please copy manually.');
    });
  };

  const handleShareWhatsApp = () => {
    const msg = encodeURIComponent(
      `🎮 Hey gamer! Join MADS TOPUP — Sri Lanka's #1 instant game top-up platform!\nUse my link to get Rs.100 bonus on your first top-up: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // BUG FIX: Telegram share actually uses the correct Telegram URL
  const handleShareTelegram = () => {
    const msg = encodeURIComponent(
      `🎮 Join MADS TOPUP — instant Free Fire & PUBG top-ups! Get Rs.100 OFF your first order: ${referralLink}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${msg}`, '_blank');
  };

  // ── Shared styles ──────────────────────────────────────────────────
  const card = 'bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm';

  return (
    <div className="min-h-screen bg-white py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Navigation ── */}
        <div className="flex items-center justify-between">
          <button
            onClick={closeReferralPage}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider hover:bg-red-50 hover:text-[#cc040a] hover:border-[#cc040a]/30 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          {isLoggedIn && (
            <button
              onClick={() => setIsUserProfileOpen(true)}
              className="text-xs font-extrabold text-slate-500 hover:text-[#cc040a] transition-colors uppercase tracking-wider"
            >
              My Profile
            </button>
          )}
        </div>

        {/* ── Page Header ── */}
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100 text-[#cc040a] text-[11px] font-black uppercase tracking-widest">
            <Gift className="w-3.5 h-3.5" />
            Referral Program
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 font-heading tracking-tight">
            Invite Friends,&nbsp;<span className="text-[#cc040a]">Earn Cash</span>
          </h1>
          <p className="text-slate-500 text-sm sm:text-base font-medium max-w-lg mx-auto">
            Share your link — your friends get a bonus, you earn 1.5% cashback on every top-up they make.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════
            NOT LOGGED IN STATE — BUG FIX: was missing
        ══════════════════════════════════════════════════ */}
        {!isLoggedIn ? (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl text-center space-y-6 my-4">
            <div className="w-20 h-20 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center mx-auto">
              <LogIn className="w-9 h-9 text-[#cc040a]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 font-heading">Login Required</h2>
              <p className="text-sm text-slate-500 font-semibold leading-relaxed max-w-xs mx-auto">
                You need to be logged in to access the Referral Program and generate your unique link.
              </p>
            </div>
            <button
              onClick={() => openAuth('login')}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#cc040a] hover:bg-[#b00308] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/25 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Login to Continue
            </button>
          </div>

        ) : !isUnlocked ? (
        /* ══════════════════════════════════════════════════
            LOCKED STATE
        ══════════════════════════════════════════════════ */
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl text-center space-y-6 my-4">
            <div className="w-20 h-20 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center mx-auto">
              <Lock className="w-9 h-9 text-[#cc040a]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">Program Locked</h2>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed max-w-xs mx-auto">
                Exclusive to active customers. Unlock by meeting <strong className="text-slate-800">ONE</strong> of the criteria below:
              </p>
            </div>

            {/* Criterion 1 */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-left">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                <span className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#cc040a]" />
                  At Least 3 Purchases
                </span>
                <span className="font-mono text-slate-500">{userCompletedCount} / 3</span>
              </div>
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-[#cc040a] rounded-full transition-all duration-500"
                  style={{ width: `${purchasesProgressPercent}%` }}
                />
              </div>
            </div>

            {/* OR */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="absolute bg-white px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-200 rounded-full py-0.5">OR</span>
            </div>

            {/* Criterion 2 */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-left">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                <span className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#cc040a]" />
                  Spend Rs. 1,000+
                </span>
                <span className="font-mono text-slate-500">Rs.{userTotalSpentLkr.toFixed(0)} / 1,000</span>
              </div>
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-400 to-[#cc040a] rounded-full transition-all duration-500"
                  style={{ width: `${spendProgressPercent}%` }}
                />
              </div>
            </div>

            <div className="pt-1 space-y-3">
              <button
                onClick={openCatalog}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#cc040a] hover:bg-[#b00308] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/25 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                Make a Purchase to Unlock
              </button>
              <button
                onClick={() => setIsUserProfileOpen(true)}
                className="w-full text-xs font-extrabold text-slate-400 hover:text-slate-700 uppercase tracking-wider py-1 cursor-pointer transition-colors"
              >
                Return to Profile
              </button>
            </div>
          </div>

        ) : (
        /* ══════════════════════════════════════════════════
            UNLOCKED REFERRAL DASHBOARD
        ══════════════════════════════════════════════════ */
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* Hero Banner */}
            <div className="bg-gradient-to-br from-[#cc040a] via-red-600 to-[#990207] rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-[11px] font-black tracking-widest uppercase">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Program Unlocked & Active
                </div>
                <h2 className="text-3xl sm:text-5xl font-black font-heading tracking-tight leading-tight">
                  Earn <span className="text-amber-300">1.5% Cashback</span><br className="hidden sm:block" />
                  On Every Friend's Top-Up!
                </h2>
                <p className="text-red-100 text-sm sm:text-base font-semibold max-w-xl leading-relaxed">
                  Share your referral link. Friends get <strong className="text-white">Rs.100 OFF</strong> on orders Rs.1,500+, and you earn instant wallet cash on every top-up they make.
                </p>

                {/* Stats */}
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="bg-white/10 rounded-2xl px-4 py-2 text-center backdrop-blur-sm">
                    <div className="text-xl font-black text-amber-300">{userCompletedCount}</div>
                    <div className="text-[10px] font-bold text-red-200 uppercase tracking-wide">Your Orders</div>
                  </div>
                  <div className="bg-white/10 rounded-2xl px-4 py-2 text-center backdrop-blur-sm">
                    <div className="text-xl font-black text-amber-300">1.5%</div>
                    <div className="text-[10px] font-bold text-red-200 uppercase tracking-wide">Cashback Rate</div>
                  </div>
                  <div className="bg-white/10 rounded-2xl px-4 py-2 text-center backdrop-blur-sm">
                    <div className="text-xl font-black text-amber-300">Rs.100</div>
                    <div className="text-[10px] font-bold text-red-200 uppercase tracking-wide">Friend's Bonus</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Referral Link Card */}
            <div className={`${card} space-y-5`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-black text-[#cc040a] uppercase tracking-widest font-mono">Your Referral Link</span>
                  <h3 className="text-xl font-extrabold text-slate-900 font-heading">Share & Earn Together</h3>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-[#cc040a] font-mono font-bold text-xs rounded-full border border-red-100 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Code: {referralCode}</span>
                </div>
              </div>

              {/* Link input + copy */}
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs font-bold text-slate-700 focus:outline-none focus:border-[#cc040a]/40 focus:ring-2 focus:ring-red-100 transition-all"
                />
                <button
                  onClick={handleCopyLink}
                  className="sm:w-auto px-6 py-3 bg-[#cc040a] hover:bg-[#b00308] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95"
                >
                  <Copy className="w-4 h-4" />
                  Copy Link
                </button>
              </div>

              {/* Social share — BUG FIX: Telegram now uses correct URL */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Share on:</span>
                <button
                  onClick={handleShareWhatsApp}
                  className="px-4 py-2 bg-[#25D366] hover:bg-[#1ebe59] text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
                <button
                  onClick={handleShareTelegram}
                  className="px-4 py-2 bg-[#229ED9] hover:bg-[#1a8ec2] text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  Telegram
                </button>
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  Copy & Share
                </button>
              </div>
            </div>

            {/* Earnings Calculator */}
            <div className={`${card} space-y-5`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 text-[#cc040a] flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 font-heading">Cashback Calculator</h3>
                  <p className="text-xs text-slate-500 font-semibold">Estimate your passive wallet earnings</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-extrabold text-slate-700">
                      <span>Friends who top up:</span>
                      <span className="text-[#cc040a]">{friendsCount} gamers</span>
                    </div>
                    <input
                      type="range" min="1" max="50" value={friendsCount}
                      onChange={(e) => setFriendsCount(parseInt(e.target.value))}
                      className="w-full accent-[#cc040a] cursor-pointer h-1.5"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>1</span><span>50</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-extrabold text-slate-700">
                      <span>Avg order value:</span>
                      <span className="text-[#cc040a]">Rs.{avgTopupLkr.toLocaleString()}</span>
                    </div>
                    <input
                      type="range" min="500" max="10000" step="500" value={avgTopupLkr}
                      onChange={(e) => setAvgTopupLkr(parseInt(e.target.value))}
                      className="w-full accent-[#cc040a] cursor-pointer h-1.5"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Rs.500</span><span>Rs.10,000</span>
                    </div>
                  </div>
                </div>

                {/* Result — BUG FIX: removed "LKR" after "Rs." */}
                <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Cashback</span>
                  <span className="text-4xl sm:text-5xl font-black text-[#cc040a] font-heading leading-none">
                    Rs.{estimatedMonthlyCashback.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">Auto-credited to your MADS Wallet</span>
                  <div className="pt-2 flex items-center gap-1 text-[11px] font-black text-[#cc040a]">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{friendsCount} × Rs.{avgTopupLkr.toLocaleString()} × 1.5%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div>
              <h3 className="text-xl font-black text-slate-900 font-heading mb-4 text-center">How It Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { step: '01', icon: Share2, color: 'bg-red-50 text-[#cc040a] border-red-100', title: 'Share Your Link', desc: 'Copy your referral link and share it with gaming friends on WhatsApp, Telegram, or Discord.' },
                  { step: '02', icon: Gift, color: 'bg-red-50 text-[#cc040a] border-red-100', title: 'Friend Gets Rs.100', desc: 'Your referred friend gets Rs.100 OFF on their first order of Rs.1,500 or more.' },
                  { step: '03', icon: Coins, color: 'bg-red-50 text-[#cc040a] border-red-100', title: 'You Earn 1.5% Cash', desc: 'Every time your friend tops up, 1.5% is instantly credited to your MADS Wallet.' },
                ].map(({ step, icon: Icon, color, title, desc }) => (
                  <div key={step} className={`${card} space-y-3 relative overflow-hidden`}>
                    <div className="absolute top-4 right-5 text-6xl font-black text-slate-100 font-heading leading-none select-none">{step}</div>
                    <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm relative z-10">{title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium relative z-10">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: ShieldCheck, label: 'Instant Credit' },
                { icon: Users,       label: 'Unlimited Friends' },
                { icon: TrendingUp,  label: 'No Cap on Earnings' },
                { icon: Zap,         label: 'Auto Wallet Credit' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#cc040a] shrink-0" />
                  <span className="text-xs font-black text-slate-800">{label}</span>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
