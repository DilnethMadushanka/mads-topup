import React from 'react';
import { useApp } from '../context/AppContext';
import { Gamepad2, Gift, Info, MessageSquareText, User, Settings, Flame, ChevronRight } from 'lucide-react';

export const Navbar = () => {
  const { 
    currency, 
    setCurrency, 
    setIsUserProfileOpen, 
    setIsAdminOpen,
    orders
  } = useApp();

  const pendingCount = orders.filter(o => o.status === 'PROCESSING' || o.status === 'PENDING').length;

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm transition-all">
      {/* Top Announcement Bar */}
      <div className="bg-slate-950 text-white text-[11px] font-semibold py-1.5 px-4 flex justify-between items-center">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-red-400 font-extrabold uppercase tracking-wide">Moongold API 24/7</span>
            <span className="hidden sm:inline text-slate-400">| Instant Delivery to Free Fire, PUBG & MLBB Accounts</span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <span className="hidden md:inline text-slate-400">🇱🇰 Sri Lanka Official Gaming Gateway</span>
            <button 
              onClick={() => setIsAdminOpen(true)}
              className="text-slate-300 hover:text-white flex items-center gap-1 font-bold text-[10px] bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full hover:border-red-500/50 transition-colors"
            >
              <Settings className="w-3 h-3 text-red-400" />
              <span>Admin Portal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-600/30 group-hover:scale-105 transition-transform duration-300">
            <Flame className="w-6 h-6 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1 font-black text-2xl tracking-tight text-slate-900 font-heading">
              <span>MADS</span>
              <span className="text-red-600">TOPUP</span>
            </div>
            <span className="text-[9px] font-extrabold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200 uppercase tracking-wider block w-max -mt-0.5">
              INSTANT STORE LK
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-extrabold text-slate-700">
          <button 
            onClick={() => scrollToSection('game-catalog')}
            className="flex items-center gap-2 hover:text-red-600 transition-colors cursor-pointer group py-2"
          >
            <Gamepad2 className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
            <span>Game Store</span>
          </button>

          <button 
            onClick={() => scrollToSection('services-section')}
            className="flex items-center gap-2 hover:text-red-600 transition-colors cursor-pointer group py-2"
          >
            <Gift className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            <span>Services</span>
          </button>

          <button 
            onClick={() => scrollToSection('why-choose-us')}
            className="flex items-center gap-2 hover:text-red-600 transition-colors cursor-pointer group py-2"
          >
            <Info className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
            <span>Why Us</span>
          </button>

          <button 
            onClick={() => scrollToSection('reviews-section')}
            className="flex items-center gap-2 hover:text-red-600 transition-colors cursor-pointer group py-2"
          >
            <MessageSquareText className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
            <span>Reviews</span>
          </button>
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          {/* Currency Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200/80 text-xs font-extrabold">
            <button
              onClick={() => setCurrency('LKR')}
              className={`px-3 py-1 rounded-full transition-all duration-200 ${
                currency === 'LKR' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              LKR (Rs)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1 rounded-full transition-all duration-200 ${
                currency === 'USD' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              USD ($)
            </button>
          </div>

          {/* User Profile Button */}
          <button
            onClick={() => setIsUserProfileOpen(true)}
            className="flex items-center gap-2 text-slate-800 hover:text-red-600 font-extrabold text-xs px-3.5 py-2 rounded-xl bg-slate-100/80 hover:bg-red-50 border border-slate-200/80 transition-all relative"
          >
            <User className="w-4 h-4 text-red-500" />
            <span className="hidden sm:inline">My Profile</span>
            {pendingCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center -mr-1">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Admin CTA */}
          <button
            onClick={() => setIsAdminOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-md shadow-slate-900/15 flex items-center gap-1.5 cursor-pointer"
          >
            <span>ADMIN</span>
            <ChevronRight className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
