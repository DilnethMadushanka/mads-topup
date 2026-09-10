import React from 'react';
import { useApp } from '../context/AppContext';
import { Gamepad2, Gift, BookOpen, Download, User, Settings, Flame, Wallet, ChevronDown } from 'lucide-react';

export const Navbar = () => {
  const { 
    setIsUserProfileOpen, 
    setIsAdminOpen,
    orders,
    openCatalog,
    closeCatalog,
    isGameCatalogOpen,
    openAuth,
    userProfile,
    isLoggedIn
  } = useApp();

  const pendingCount = orders.filter(o => o.status === 'PROCESSING' || o.status === 'PENDING').length;

  const getInitials = (name) => {
    if (!name) return 'DM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleNavClick = (sectionId) => {
    if (isGameCatalogOpen) {
      closeCatalog();
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={closeCatalog}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-300 overflow-hidden p-0.5">
            <img src="/mads-logo.jpg" alt="MADS TOPUP Logo" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 font-black text-xl tracking-tighter text-slate-950 font-heading">
              <span>MADS</span>
              <span className="text-[#cc040a]">TOPUP</span>
            </div>
            <span className="text-[7px] font-black text-slate-500 tracking-widest uppercase font-mono -mt-1">
              EVERYGAME LK
            </span>
          </div>
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-slate-800 uppercase tracking-wide">
          <button 
            onClick={openCatalog}
            className={`flex items-center gap-2 hover:text-[#cc040a] transition-colors cursor-pointer group py-2 ${isGameCatalogOpen ? 'text-[#cc040a]' : ''}`}
          >
            <span className="w-6 h-6 rounded-lg bg-red-100 text-[#cc040a] flex items-center justify-center">
              <Gamepad2 className="w-3.5 h-3.5" />
            </span>
            <span>Game List</span>
          </button>

          <button 
            onClick={() => handleNavClick('services-section')}
            className="flex items-center gap-2 hover:text-[#cc040a] transition-colors cursor-pointer group py-2"
          >
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Gift className="w-3.5 h-3.5" />
            </span>
            <span>Cards</span>
          </button>

          <button 
            onClick={() => handleNavClick('why-choose-us')}
            className="flex items-center gap-2 hover:text-[#cc040a] transition-colors cursor-pointer group py-2"
          >
            <span className="w-6 h-6 rounded-lg bg-red-50 text-[#cc040a] flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </span>
            <span>Blog</span>
          </button>

          <button 
            onClick={() => handleNavClick('reviews-section')}
            className="flex items-center gap-2 hover:text-[#cc040a] transition-colors cursor-pointer group py-2"
          >
            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Download className="w-3.5 h-3.5" />
            </span>
            <span>Download App</span>
          </button>
        </nav>

        {/* Right Controls (Matching Reference Screenshot) */}
        {isLoggedIn ? (
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* 1. Red Wallet LKR Pill */}
            <div 
              onClick={() => setIsUserProfileOpen(true)}
              className="bg-[#cc040a] hover:bg-[#990207] text-white text-[11px] sm:text-[13px] font-black px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 shadow-xs cursor-pointer transition-all shrink-0"
            >
              <Wallet className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-white fill-white shrink-0" />
              <span className="tracking-wide">{(userProfile.walletBalance || 0).toFixed(2)} LKR</span>
            </div>

            {/* 2. Green Crypto USDT Pill (Hidden on mobile to avoid header overflow) */}
            <div 
              onClick={() => setIsUserProfileOpen(true)}
              className="hidden md:flex bg-[#0E8A50] hover:bg-[#0C7A46] text-white text-xs sm:text-[13px] font-black px-3.5 sm:px-4 py-1.5 rounded-full items-center gap-2 shadow-xs cursor-pointer transition-all shrink-0"
            >
              <div className="w-4 h-4 rounded-full bg-white text-[#0E8A50] font-black text-[10px] flex items-center justify-center italic shrink-0 leading-none">
                B
              </div>
              <span className="tracking-wide">{(userProfile.walletUsdt || 0).toFixed(2)} U</span>
            </div>

            {/* 3. User Profile Dropdown Pill (Avatar + Name + Chevron) */}
            <div 
              onClick={() => setIsUserProfileOpen(true)}
              className="flex items-center gap-1 sm:gap-2 cursor-pointer group shrink-0 ml-0.5"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#cc040a] border-2 border-white ring-1 ring-slate-200/60 flex items-center justify-center font-black text-white text-[11px] sm:text-xs shadow-xs shrink-0 tracking-wider">
                {getInitials(userProfile.name)}
              </div>
              <span className="hidden md:inline-block text-[#6366F1] font-black text-sm sm:text-[15px] group-hover:text-[#4F46E5] transition-colors">
                {userProfile.name}
              </span>
              <ChevronDown className="hidden sm:inline-block w-4 h-4 text-[#6366F1] fill-[#6366F1] group-hover:translate-y-0.5 transition-transform" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button 
              onClick={() => openAuth('login')}
              className="text-xs font-black text-slate-700 hover:text-slate-950 uppercase tracking-wider cursor-pointer font-heading"
            >
              Login
            </button>

            <button
              onClick={() => openAuth('register')}
              className="btn-purple-pill px-4 sm:px-6 py-2 text-xs font-black uppercase tracking-wider cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>REGISTER</span>
            </button>
          </div>
        )}

      </div>
    </header>
  );
};



