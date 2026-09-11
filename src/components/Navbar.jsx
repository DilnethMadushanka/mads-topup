import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Gamepad2, Gift, BookOpen, Download, User, Wallet, ChevronDown, Headset, Menu, X, LogIn, UserPlus, Home, ShoppingBag, Smartphone } from 'lucide-react';

export const Navbar = () => {
  const { 
    setIsUserProfileOpen,
    openUserProfilePage, 
    orders,
    openCatalog,
    closeCatalog,
    isGameCatalogOpen,
    setSelectedGame,
    openAuth,
    userProfile,
    isLoggedIn,
    setWalletActiveTab,
    setIsNoticeModalOpen,
    setIsWalletModalOpen,
    setIsSupportOpen,
    setIsDownloadAppModalOpen,
    openContactPage
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleWalletClick = (tab = 'binance') => {
    setWalletActiveTab(tab);
    if (localStorage.getItem('mads_dont_show_notice') === 'true') {
      setIsWalletModalOpen(true);
    } else {
      setIsNoticeModalOpen(true);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'DM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleNavClick = (sectionId) => {
    setIsMobileMenuOpen(false);
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

  const isUserLoggedIn = isLoggedIn || Boolean(userProfile?.name || userProfile?.email);

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => { setSelectedGame(null); closeCatalog(); setIsMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-slate-800 uppercase tracking-wide">
          <button 
            onClick={() => { setSelectedGame(null); openCatalog(); setIsMobileMenuOpen(false); }}
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
            onClick={() => { setIsDownloadAppModalOpen(true); setIsMobileMenuOpen(false); }}
            className="flex items-center gap-2 hover:text-[#cc040a] transition-colors cursor-pointer group py-2"
          >
            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Download className="w-3.5 h-3.5" />
            </span>
            <span>Download App</span>
          </button>

          <button 
            onClick={() => { openContactPage(); setIsMobileMenuOpen(false); }}
            className="flex items-center gap-2 hover:text-[#cc040a] transition-colors cursor-pointer group py-2"
          >
            <span className="w-6 h-6 rounded-lg bg-red-100 text-[#cc040a] flex items-center justify-center">
              <Headset className="w-3.5 h-3.5" />
            </span>
            <span>24/7 Support</span>
          </button>
        </nav>

        {/* Desktop Right Controls */}
        <div className="hidden lg:flex items-center gap-3">
          {isUserLoggedIn ? (
            <div className="flex items-center gap-3">
              {/* Red Wallet LKR Pill */}
              <div 
                onClick={() => handleWalletClick('ezcash')}
                className="bg-[#cc040a] hover:bg-[#990207] text-white text-xs font-black px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-xs cursor-pointer transition-all shrink-0"
              >
                <Wallet className="w-3.5 h-3.5 text-white fill-white shrink-0" />
                <span className="tracking-wide">{(userProfile.walletBalance || 0).toFixed(2)} LKR</span>
              </div>

              {/* Green Crypto USDT Pill */}
              <div 
                onClick={() => handleWalletClick('binance')}
                className="bg-[#0E8A50] hover:bg-[#0C7A46] text-white text-xs font-black px-4 py-1.5 rounded-full flex items-center gap-2 shadow-xs cursor-pointer transition-all shrink-0"
              >
                <div className="w-4 h-4 rounded-full bg-white text-[#0E8A50] font-black text-[10px] flex items-center justify-center italic shrink-0 leading-none">
                  B
                </div>
                <span className="tracking-wide">{(userProfile.walletUsdt || 0).toFixed(2)} U</span>
              </div>

              {/* User Profile Dropdown Pill */}
              <div 
                onClick={openUserProfilePage}
                className="flex items-center gap-2 cursor-pointer group shrink-0 ml-0.5"
              >
                <div className="w-9 h-9 rounded-full bg-[#cc040a] border-2 border-white ring-1 ring-slate-200/60 flex items-center justify-center font-black text-white text-xs shadow-xs shrink-0 tracking-wider overflow-hidden">
                  {userProfile.avatar ? (
                    <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(userProfile.name)
                  )}
                </div>
                <span className="text-slate-800 font-extrabold text-sm group-hover:text-[#cc040a] transition-colors">
                  {userProfile.name || 'Gamer'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-500 group-hover:translate-y-0.5 transition-transform" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => openAuth('login')}
                className="text-xs font-black text-slate-700 hover:text-slate-950 uppercase tracking-wider cursor-pointer font-heading"
              >
                Login
              </button>

              <button
                onClick={() => openAuth('register')}
                className="btn-purple-pill px-5 py-2 text-xs font-black uppercase tracking-wider cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>REGISTER</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile View: Hamburger Menu Button Top-Right */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="p-2 rounded-2xl border-2 border-slate-700/80 bg-slate-900/90 text-white hover:bg-slate-800 transition-all cursor-pointer shadow-md flex items-center justify-center"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Overlay Menu (Contains ALL Features from Bottom Bar + Menu) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#0F172A]/95 backdrop-blur-2xl border-b border-slate-800 shadow-2xl px-6 py-6 space-y-6 animate-in slide-in-from-top-4 duration-200 text-white">
          
          {/* Vertical Menu Navigation Items */}
          <div className="space-y-3.5">
            {/* Home */}
            <button 
              onClick={() => { setSelectedGame(null); closeCatalog(); setIsMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="w-full flex items-center justify-between text-sm font-extrabold text-slate-200 hover:text-[#cc040a] py-1 transition-colors text-left"
            >
              <span className="flex items-center gap-3">
                <Home className="w-5 h-5 text-[#cc040a]" />
                <span>Home</span>
              </span>
            </button>

            {/* Game List */}
            <button 
              onClick={() => { setSelectedGame(null); openCatalog(); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center justify-between text-sm font-extrabold text-slate-200 hover:text-cyan-400 py-1 transition-colors text-left"
            >
              <span className="flex items-center gap-3">
                <Gamepad2 className="w-5 h-5 text-cyan-400" />
                <span>Game List</span>
              </span>
            </button>

            {/* Cards */}
            <button 
              onClick={() => handleNavClick('services-section')}
              className="w-full flex items-center justify-between text-sm font-extrabold text-slate-200 hover:text-emerald-400 py-1 transition-colors text-left"
            >
              <span className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-emerald-400" />
                <span>Cards</span>
              </span>
            </button>

            {/* Blog */}
            <button 
              onClick={() => handleNavClick('why-choose-us')}
              className="w-full flex items-center justify-between text-sm font-extrabold text-slate-200 hover:text-amber-400 py-1 transition-colors text-left"
            >
              <span className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span>Blog</span>
              </span>
            </button>

            {/* Get App */}
            <button 
              onClick={() => { setIsDownloadAppModalOpen(true); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center justify-between text-sm font-extrabold text-slate-200 hover:text-[#cc040a] py-1 transition-colors text-left"
            >
              <span className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-[#cc040a] animate-pulse" />
                <span>Get App</span>
              </span>
              <span className="text-[10px] font-black text-white bg-[#cc040a] px-2 py-0.5 rounded-full uppercase shadow-xs">App</span>
            </button>

            {/* 24/7 Support */}
            <button 
              onClick={() => { openContactPage(); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center justify-between text-sm font-extrabold text-slate-200 hover:text-red-400 py-1 transition-colors text-left"
            >
              <span className="flex items-center gap-3">
                <Headset className="w-5 h-5 text-red-500" />
                <span>24/7 Support</span>
              </span>
            </button>

            {/* My Orders */}
            <button 
              onClick={() => { 
                if (isUserLoggedIn) { openUserProfilePage(); } else { openAuth('login'); }
                setIsMobileMenuOpen(false); 
              }}
              className="w-full flex items-center justify-between text-sm font-extrabold text-slate-200 hover:text-indigo-400 py-1 transition-colors text-left"
            >
              <span className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-indigo-400" />
                <span>My Orders</span>
              </span>
              {(orders || []).length > 0 && (
                <span className="bg-[#cc040a] text-white text-xs font-black px-2 py-0.5 rounded-full">
                  {orders.length}
                </span>
              )}
            </button>
          </div>

          <hr className="border-slate-800" />

          {/* Centered User Balance & Profile Controls (Matching Reference Screenshot) */}
          <div className="flex flex-col items-center gap-3.5 pt-1">
            {isUserLoggedIn ? (
              <>
                {/* Red LKR Wallet Pill */}
                <button
                  onClick={() => { handleWalletClick('ezcash'); setIsMobileMenuOpen(false); }}
                  className="w-full max-w-xs bg-[#cc040a] hover:bg-[#990207] text-white font-black text-xs py-2.5 px-5 rounded-full flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Wallet className="w-4 h-4 text-white fill-white" />
                  <span>{(userProfile.walletBalance || 0).toFixed(2)} LKR</span>
                </button>

                {/* Green USDT Wallet Pill */}
                <button
                  onClick={() => { handleWalletClick('binance'); setIsMobileMenuOpen(false); }}
                  className="w-full max-w-xs bg-[#0E8A50] hover:bg-[#0C7A46] text-white font-black text-xs py-2.5 px-5 rounded-full flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <div className="w-4 h-4 rounded-full bg-white text-[#0E8A50] font-black text-[10px] flex items-center justify-center italic leading-none">
                    B
                  </div>
                  <span>{(userProfile.walletUsdt || 0).toFixed(2)} U</span>
                </button>

                {/* Profile Pill (Avatar + Username + Chevron) */}
                <button
                  onClick={() => { openUserProfilePage(); setIsMobileMenuOpen(false); }}
                  className="w-full max-w-xs bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-100 font-extrabold text-xs py-2 px-4 rounded-full flex items-center justify-center gap-2 shadow-md transition-all mt-1"
                >
                  <div className="w-7 h-7 rounded-full bg-[#cc040a] text-white font-black text-[11px] flex items-center justify-center overflow-hidden border border-white/20">
                    {userProfile.avatar ? (
                      <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(userProfile.name)
                    )}
                  </div>
                  <span className="truncate max-w-[140px] text-slate-200 font-bold">{userProfile.name || 'Gaming Mads'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </>
            ) : (
              <div className="w-full max-w-xs flex items-center gap-3">
                <button
                  onClick={() => { openAuth('login'); setIsMobileMenuOpen(false); }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-extrabold text-xs py-2.5 rounded-full flex items-center justify-center gap-1.5 transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>LOGIN</span>
                </button>

                <button
                  onClick={() => { openAuth('register'); setIsMobileMenuOpen(false); }}
                  className="flex-1 btn-purple-pill font-extrabold text-xs py-2.5 rounded-full flex items-center justify-center gap-1.5 transition-all shadow-lg"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>REGISTER</span>
                </button>
              </div>
            )}
          </div>

        </div>
      )}
    </header>
  );
};




