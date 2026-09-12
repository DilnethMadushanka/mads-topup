import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import confetti from 'canvas-confetti';
import { 
  UserPlus, LogIn, Crown, ShieldCheck, DollarSign, TrendingUp, Send, 
  Smartphone, FileText, Users, CheckCircle2, ArrowRight, Sparkles, CheckSquare, HelpCircle, ArrowLeft
} from 'lucide-react';

export const ResellerProgramPage = () => {
  const { userProfile, openAuth, showToast, closeResellerPage } = useApp();

  const [realName, setRealName] = useState(userProfile?.name || '');
  const [storeName, setStoreName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(userProfile?.phone || '');
  const [emailAddress, setEmailAddress] = useState(userProfile?.email || '');
  
  const [isRunningStore, setIsRunningStore] = useState(false);
  const [hasSocialReach, setHasSocialReach] = useState(false);
  const [dailySale, setDailySale] = useState('2,000 - 5,000 LKR');
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  const scrollToForm = () => {
    const formEl = document.getElementById('application-form-section');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmitApplication = (e) => {
    e.preventDefault();

    if (!storeName.trim()) {
      showToast('Please enter your Store / Shop Name!', 'error');
      return;
    }

    if (!whatsappNumber.trim()) {
      showToast('Please enter your WhatsApp Contact Number!', 'error');
      return;
    }

    if (!agreedTerms) {
      showToast('Please agree to the reseller terms & conditions to proceed', 'error');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmittedSuccess(true);
      showToast('Application Submitted Successfully! Our Admin Team will review your application within 24 hours.');

      try {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b']
        });
      } catch (err) {}

      window.scrollTo({ top: 200, behavior: 'smooth' });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={closeResellerPage}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-800 hover:bg-slate-100 font-extrabold text-xs border border-slate-200 cursor-pointer transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-600" />
          <span>Back to Homepage</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-600 font-mono uppercase">24/7 Verified Reseller Network</span>
        </div>
      </div>

      {/* 1. HERO CHOICE BANNER CONTAINER (Matching Screenshot 1) */}
      <div className="bg-[#0B132B] text-white rounded-3xl p-6 sm:p-12 border border-slate-800 shadow-2xl relative overflow-hidden text-center">
        
        {/* Background Decorative Lighting */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 right-10 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Tag & Main Title */}
        <div className="relative z-10 space-y-3 max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            <span>PARTNER WITH US</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black font-heading tracking-tight drop-shadow-md">
            Reseller <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">Program</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base font-medium max-w-xl mx-auto">
            Join our network and start earning competitive commissions today
          </p>
        </div>

        {/* 2 Choice Action Cards (2 Columns - Matching Screenshot 1) */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
          
          {/* Card 1: Become a Reseller */}
          <div className="bg-[#111A35]/90 border border-cyan-900/50 hover:border-cyan-500/50 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-950/50 group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform">
                <UserPlus className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-heading">
                  Become a Reseller
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed mt-2">
                  Get wholesale prices and exclusive benefits. Earn competitive commissions on every top-up you sell.
                </p>
              </div>
            </div>

            <button
              onClick={scrollToForm}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-500/20 cursor-pointer uppercase tracking-wider"
            >
              <span>REGISTER NOW</span>
              <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
            </button>
          </div>

          {/* Card 2: Reseller Login */}
          <div className="bg-[#111A35]/90 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-all duration-300 hover:shadow-xl group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/30 group-hover:scale-110 transition-transform">
                <LogIn className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-heading">
                  Reseller Login
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed mt-2">
                  Already a reseller? Access your dashboard to manage orders, track sales and monitor your earnings.
                </p>
              </div>
            </div>

            <button
              onClick={() => openAuth('login')}
              className="w-full py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-500/20 cursor-pointer uppercase tracking-wider"
            >
              <span>LOGIN</span>
              <LogIn className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* 2. APPLICATION FORM CONTAINER (Matching Screenshot 2) */}
      <div id="application-form-section" className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-10 max-w-4xl mx-auto">
        
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold font-mono border border-emerald-200 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>START HERE</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
            Application Form
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Fill out the details below to apply for the MADS TOPUP Partner Reseller Network.
          </p>
        </div>

        {isSubmittedSuccess ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-300">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 font-heading">Application Submitted!</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 max-w-md mx-auto">
                Thank you for applying to the Reseller Program. Our admin team will review your application and send approval instructions to your WhatsApp & Email.
              </p>
            </div>

            <button
              onClick={() => setIsSubmittedSuccess(false)}
              className="px-6 py-2.5 rounded-full bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors"
            >
              Submit Another Application
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitApplication} className="space-y-6">
            
            {/* Input Grid 2 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Real Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Real Name</label>
                <input
                  type="text"
                  placeholder="Gaming Mads"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
                />
              </div>

              {/* Your Store Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Your Store Name *</label>
                <input
                  type="text"
                  placeholder="Enter your store name"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 font-medium focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>

              {/* WhatsApp Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">WhatsApp Number *</label>
                <input
                  type="text"
                  placeholder="+94759566784"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Email Address *</label>
                <input
                  type="email"
                  placeholder="gamingmads0103@gmail.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
                />
              </div>

            </div>

            {/* Current Activity Checkbox Box (Matching Screenshot 2) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                Current Activity
              </label>

              <div className="space-y-2 text-xs font-medium text-slate-700">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isRunningStore}
                    onChange={(e) => setIsRunningStore(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300"
                  />
                  <span>Are you currently running a top-up store?</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasSocialReach}
                    onChange={(e) => setHasSocialReach(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300"
                  />
                  <span>Do you have social media accounts with good reach?</span>
                </label>
              </div>
            </div>

            {/* Daily Average Sale Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Daily Average Sale (LKR)</label>
              <select
                value={dailySale}
                onChange={(e) => setDailySale(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="1,000 - 2,000 LKR">1,000 - 2,000 LKR</option>
                <option value="2,000 - 5,000 LKR">2,000 - 5,000 LKR</option>
                <option value="5,000 - 10,000 LKR">5,000 - 10,000 LKR</option>
                <option value="10,000+ LKR">10,000+ LKR</option>
              </select>
            </div>

            {/* Agreement Checkbox */}
            <div className="flex items-center gap-3 text-xs text-slate-600 font-medium pt-1">
              <input
                type="checkbox"
                id="terms-check"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="terms-check" className="cursor-pointer">
                I agree to the <span className="text-cyan-600 font-bold underline">terms and conditions</span> and understand that inactivity may lead to account downgrade.
              </label>
            </div>

            {/* Submit Button (Matching Screenshot 2) */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-[#0B132B] hover:bg-[#111A35] text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <span>{isSubmitting ? 'Submitting Application...' : 'Submit Application'}</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </button>

          </form>
        )}
      </div>

      {/* 3. RESELLER BENEFITS (Matching Screenshot 3) */}
      <div className="space-y-8 pt-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-extrabold text-cyan-600 tracking-widest uppercase font-mono">
            — WHY JOIN US —
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-heading">
            Reseller Benefits
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Everything you get when you become a verified reseller partner
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Reseller Pricing */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 font-heading">Reseller Pricing</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Access all games at exclusive reseller prices — up to <span className="text-cyan-600 font-bold">3%–8% discount</span> on every product.
            </p>
          </div>

          {/* Card 2: Daily Sales Analytics */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 font-heading">Daily Sales Analytics</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Analyse your daily sales with detailed charts and reports right from your dashboard.
            </p>
          </div>

          {/* Card 3: Telegram FF Top-Up Bot */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 font-heading">Telegram FF Top-Up Bot</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Access our automated Telegram bot for instant Free Fire & MLBB diamond top-ups at reseller rates.
            </p>
          </div>

          {/* Card 4: Your Own Web & App */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 font-heading">Your Own Web & App</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Get your exclusive website and Android app with a small monthly fee — no coding or tech knowledge needed.
            </p>
          </div>

          {/* Card 5: Sales Reports */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 font-heading">Sales Reports</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Get detailed sale reports with product breakdowns, recharge history, and performance tracking.
            </p>
          </div>

          {/* Card 6: Priority Support & More */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Crown className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 font-heading">Priority Support & More</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Enjoy priority customer support, early access to new games, and exclusive reseller-only features.
            </p>
          </div>

        </div>
      </div>

      {/* 4. ELIGIBILITY & RULES SECTION (Matching Screenshot 3) */}
      <div className="bg-slate-100/70 border border-slate-200/80 rounded-3xl p-6 sm:p-10 space-y-6">
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 font-heading">Eligibility & Rules</h3>
            <p className="text-xs text-slate-500 font-medium">Clear requirements for joining and maintaining reseller status</p>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Rule 01 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-mono font-extrabold text-xs flex items-center justify-center">
                01
              </span>
              <h4 className="font-extrabold text-sm text-slate-900">Active Presence Required</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed pl-10">
              You must have an <span className="font-bold text-slate-800">active social media fanbase OR be an active customer</span> with a strong transaction history on our site.
            </p>
          </div>

          {/* Rule 02 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-cyan-600 text-white font-mono font-extrabold text-xs flex items-center justify-center">
                02
              </span>
              <h4 className="font-extrabold text-sm text-slate-900">Manual Review Process</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed pl-10">
              We manually check your social media reach and recent website transactions before approving or rejecting applications.
            </p>
          </div>

          {/* Rule 03 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-mono font-extrabold text-xs flex items-center justify-center">
                03
              </span>
              <h4 className="font-extrabold text-sm text-slate-900">Monthly Monitoring</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed pl-10">
              This is a performance-based program. We review transactions monthly. <span className="font-bold text-slate-800">Inactivity may result in removal</span> from the reseller program.
            </p>
          </div>

          {/* Rule 04 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-mono font-extrabold text-xs flex items-center justify-center">
                04
              </span>
              <h4 className="font-extrabold text-sm text-slate-900">Top Performer Perks</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed pl-10">
              Highly active resellers unlock exclusive future options, better rates, and priority support.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};
