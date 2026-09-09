import React from 'react';
import { useApp } from '../context/AppContext';
import { Gamepad2, Gift, Info, MessageSquareText, User, Settings, Shield, Flame, ChevronRight } from 'lucide-react';

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
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200/80 shadow-xs transition-all">
      {/* Top Announcement Bar */}
      <div className="bg-gray-900 text-white text-[11px] font-semibold py-1.5 px-4 flex justify-between items-center">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E50914]"></span>
            </span>
            <span className="text-[#E50914] font-extrabold uppercase tracking-wide font-mono">MOONGOLD 24/7 AUTOMATED</span>
            <span className="hidden sm:inline text-gray-400">| Instant Delivery to Free Fire, PUBG & MLBB</span>
          </div>

          <div className="flex items-center gap-4 text-gray-300">
            <span className="hidden md:inline text-gray-400 text-[10px] uppercase font-mono">🇱🇰 Sri Lanka Official Gateway</span>
            <button 
              onClick={() => setIsAdminOpen(true)}
              className="text-gray-300 hover:text-white flex items-center gap-1 font-bold text-[10px] bg-gray-800 border border-gray-700 px-2.5 py-0.5 rounded-full hover:border-[#E50914] transition-colors"
            >
              <Settings className="w-3 h-3 text-[#E50914]" />
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
          <div className="w-10 h-10 rounded-xl bg-[#E50914] flex items-center justify-center text-white shadow-md shadow-red-600/20 group-hover:scale-105 transition-transform duration-300">
            <Flame className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1 font-black text-2xl tracking-tight text-gray-900 font-heading uppercase">
              <span>MADS</span>
              <span className="text-[#E50914]">TOPUP</span>
            </div>
            <span className="text-[9px] font-extrabold text-[#E50914] bg-red-50 px-2 py-0.2 rounded border border-red-100 uppercase tracking-widest block w-max -mt-0.5 font-mono">
              PREMIUM STORE LK
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8 text-xs font-black uppercase tracking-wider text-gray-700">
          <button 
            onClick={() => scrollToSection('game-catalog')}
            className="flex items-center gap-2 hover:text-[#E50914] transition-colors cursor-pointer group py-2"
          >
            <Gamepad2 className="w-4 h-4 text-[#E50914] group-hover:scale-110 transition-transform" />
            <span>Game Store</span>
          </button>

          <button 
            onClick={() => scrollToSection('services-section')}
            className="flex items-center gap-2 hover:text-[#E50914] transition-colors cursor-pointer group py-2"
          >
            <Gift className="w-4 h-4 text-gray-600 group-hover:text-[#E50914] group-hover:scale-110 transition-transform" />
            <span>Services</span>
          </button>

          <button 
            onClick={() => scrollToSection('why-choose-us')}
            className="flex items-center gap-2 hover:text-[#E50914] transition-colors cursor-pointer group py-2"
          >
            <Info className="w-4 h-4 text-gray-600 group-hover:text-[#E50914] group-hover:scale-110 transition-transform" />
            <span>Why Us</span>
          </button>

          <button 
            onClick={() => scrollToSection('reviews-section')}
            className="flex items-center gap-2 hover:text-[#E50914] transition-colors cursor-pointer group py-2"
          >
            <MessageSquareText className="w-4 h-4 text-gray-600 group-hover:text-[#E50914] group-hover:scale-110 transition-transform" />
            <span>Reviews</span>
          </button>
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          {/* Currency Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-full border border-gray-200 text-xs font-extrabold">
            <button
              onClick={() => setCurrency('LKR')}
              className={`px-3 py-1 rounded-full transition-all duration-200 ${
                currency === 'LKR' ? 'bg-[#E50914] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              LKR
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1 rounded-full transition-all duration-200 ${
                currency === 'USD' ? 'bg-[#E50914] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              USD
            </button>
          </div>

          {/* User Profile Button */}
          <button
            onClick={() => setIsUserProfileOpen(true)}
            className="flex items-center gap-2 text-gray-800 hover:text-[#E50914] font-extrabold text-xs px-3.5 py-2 rounded-xl bg-gray-100/80 hover:bg-red-50 border border-gray-200 transition-all relative"
          >
            <User className="w-4 h-4 text-[#E50914]" />
            <span className="hidden sm:inline">Profile</span>
            {pendingCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#E50914] text-white text-[10px] font-black flex items-center justify-center -mr-1">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Admin CTA */}
          <button
            onClick={() => setIsAdminOpen(true)}
            className="btn-crimson-solid px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <span>ADMIN</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};


