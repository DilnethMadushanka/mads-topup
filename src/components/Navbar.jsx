import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Gamepad2, Gift, BookOpen, Download, User, Wallet, ChevronDown,
  Headset, Menu, X, LogIn, UserPlus, Home, ShoppingBag, Smartphone,
  Crown, ChevronRight, ArrowRight, Star, Zap
} from 'lucide-react';

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
    openContactPage,
    openResellerPage,
    isResellerPageOpen,
    openResellerDashboard,
    isResellerDashboardOpen
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const handleWalletClick = (tab = 'binance') => {
    setWalletActiveTab(tab);
    setIsMobileMenuOpen(false);
    if (localStorage.getItem('mads_dont_show_notice') === 'true') {
      setIsWalletModalOpen(true);
    } else {
      setIsNoticeModalOpen(true);
    }
  };

  const getCleanName = (name, email) => {
    if (name && !/^\+?\d+$/.test(String(name).trim())) return name;
    if (email && email.includes('@')) {
      const uname = email.split('@')[0];
      return uname.charAt(0).toUpperCase() + uname.slice(1);
    }
    return name || 'Gamer';
  };

  const getInitials = (name, email) => {
    const displayName = getCleanName(name, email);
    if (!displayName) return 'DM';
    const parts = displayName.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
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
  const isReseller = userProfile?.isReseller || userProfile?.role === 'reseller';

  const navItems = [
    { label: 'Home', icon: Home, color: 'text-[#cc040a]', bg: 'bg-red-50', action: () => { setSelectedGame(null); closeCatalog(); setIsMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
    { label: 'Game List', icon: Gamepad2, color: 'text-violet-500', bg: 'bg-violet-50', action: () => { setSelectedGame(null); openCatalog(); setIsMobileMenuOpen(false); }, active: isGameCatalogOpen },
    { label: 'Gift Cards', icon: Gift, color: 'text-emerald-500', bg: 'bg-emerald-50', action: () => handleNavClick('services-section') },
    { label: 'Blog', icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-50', action: () => handleNavClick('why-choose-us') },
    { label: 'Download App', icon: Smartphone, color: 'text-sky-500', bg: 'bg-sky-50', action: () => { setIsDownloadAppModalOpen(true); setIsMobileMenuOpen(false); }, badge: 'NEW' },
    isReseller
      ? { label: 'Reseller Dashboard', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-50', action: () => { openResellerDashboard(); setIsMobileMenuOpen(false); }, badge: 'PARTNER', active: isResellerDashboardOpen }
      : { label: 'Reseller Program', icon: Crown, color: 'text-cyan-500', bg: 'bg-cyan-50', action: () => { openResellerPage(); setIsMobileMenuOpen(false); }, active: isResellerPageOpen },
    { label: '24/7 Support', icon: Headset, color: 'text-[#cc040a]', bg: 'bg-red-50', action: () => { openContactPage(); setIsMobileMenuOpen(false); } },
    { label: 'My Orders', icon: ShoppingBag, color: 'text-indigo-500', bg: 'bg-indigo-50', action: () => { if (isUserLoggedIn) { openUserProfilePage(); } else { openAuth('login'); } setIsMobileMenuOpen(false); }, count: (orders || []).length || 0 },
  ];

  return (
    <>
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/98 backdrop-blur-xl shadow-md shadow-slate-200/60 border-b border-slate-200/60' : 'bg-white/90 backdrop-blur-xl border-b border-slate-200/50'}`}>
        {/* Red accent line at very top */}
        <div className="h-0.5 bg-gradient-to-r from-[#cc040a] via-red-500 to-[#cc040a] opacity-80" />

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 xl:gap-6">

          {/* ── LOGO ── */}
          <div
            onClick={() => { setSelectedGame(null); closeCatalog(); setIsMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0 mr-1 xl:mr-4"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300 overflow-hidden p-0.5">
              <img src="/mads-logo.jpg" alt="MADS TOPUP Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1 font-black text-xl tracking-tighter text-slate-950 font-heading">
                <span>MADS</span>
                <span className="text-[#cc040a]">TOPUP</span>
              </div>
              <span className="text-[7px] font-black text-slate-400 tracking-widest uppercase font-mono -mt-1">EVERYGAME LK</span>
            </div>
          </div>

          {/* ── DESKTOP NAV ── */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide flex-1">
            {[
              { label: 'Game List', icon: Gamepad2, action: () => { setSelectedGame(null); openCatalog(); }, active: isGameCatalogOpen, iconCls: 'text-[#cc040a] bg-red-50' },
              { label: 'Gift Cards', icon: Gift, action: () => handleNavClick('services-section'), iconCls: 'text-emerald-600 bg-emerald-50' },
              { label: 'Blog', icon: BookOpen, action: () => handleNavClick('why-choose-us'), iconCls: 'text-amber-500 bg-amber-50' },
              { label: 'Download App', icon: Download, action: () => setIsDownloadAppModalOpen(true), iconCls: 'text-slate-600 bg-slate-100' },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer group relative ${item.active ? 'text-[#cc040a] bg-red-50 font-black' : 'hover:bg-slate-50 hover:text-[#cc040a]'}`}>
                <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${item.iconCls}`}>
                  <item.icon className="w-3 h-3" />
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
                {item.active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#cc040a]" />}
              </button>
            ))}

            {/* Reseller */}
            {isReseller ? (
              <button onClick={() => openResellerDashboard()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs hover:from-amber-400 hover:to-yellow-300 shadow-sm transition-all cursor-pointer shrink-0 mx-1 ${isResellerDashboardOpen ? 'ring-2 ring-amber-400' : ''}`}>
                <Crown className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                <span className="whitespace-nowrap">RESELLER</span>
              </button>
            ) : (
              <button onClick={() => openResellerPage()}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer group ${isResellerPageOpen ? 'text-cyan-600 bg-cyan-50 font-black' : 'hover:bg-cyan-50 hover:text-cyan-600'}`}>
                <span className="w-5 h-5 rounded-md bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                  <Crown className="w-3 h-3" />
                </span>
                <span className="whitespace-nowrap">Reseller</span>
              </button>
            )}

            <button onClick={() => openContactPage()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-red-50 hover:text-[#cc040a] transition-all cursor-pointer group">
              <span className="w-5 h-5 rounded-md bg-red-50 text-[#cc040a] flex items-center justify-center shrink-0">
                <Headset className="w-3 h-3" />
              </span>
              <span className="whitespace-nowrap">Support</span>
            </button>
          </nav>

          {/* ── DESKTOP RIGHT ── */}
          <div className="hidden lg:flex items-center gap-2.5 xl:gap-3 shrink-0">
            {isUserLoggedIn ? (
              <div className="flex items-center gap-2">
                {/* LKR Wallet */}
                <button onClick={() => handleWalletClick('ezcash')}
                  className="group flex items-center gap-1.5 bg-[#cc040a] hover:bg-[#b00308] text-white text-xs font-black px-3 py-1.5 rounded-full shadow-sm shadow-red-600/25 cursor-pointer transition-all">
                  <Wallet className="w-3.5 h-3.5 fill-white/80 shrink-0" />
                  <span className="tracking-wide whitespace-nowrap">{(userProfile.walletBalance || 0).toFixed(2)} LKR</span>
                </button>

                {/* USDT Wallet */}
                <button onClick={() => handleWalletClick('binance')}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-sm shadow-emerald-600/20 cursor-pointer transition-all">
                  <div className="w-3.5 h-3.5 rounded-full bg-white text-emerald-600 font-black text-[9px] flex items-center justify-center italic shrink-0 leading-none">B</div>
                  <span className="tracking-wide whitespace-nowrap">{(userProfile.walletUsdt || 0).toFixed(2)} USDT</span>
                </button>

                {/* Profile Pill */}
                <button onClick={openUserProfilePage}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 pl-1.5 pr-3 py-1 rounded-full cursor-pointer group transition-all shadow-xs">
                  <div className="w-7 h-7 rounded-full bg-[#cc040a] border-2 border-white ring-1 ring-slate-200 flex items-center justify-center font-black text-white text-[11px] shadow-xs shrink-0 overflow-hidden">
                    {userProfile.avatar
                      ? <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                      : getInitials(userProfile.name, userProfile.email)}
                  </div>
                  <span className="text-slate-800 font-extrabold text-xs group-hover:text-[#cc040a] transition-colors max-w-[100px] xl:max-w-[130px] truncate">
                    {getCleanName(userProfile.name, userProfile.email)}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:translate-y-0.5 transition-transform shrink-0" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button onClick={() => openAuth('login')}
                  className="text-xs font-black text-slate-600 hover:text-slate-900 uppercase tracking-wider cursor-pointer px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all">
                  Login
                </button>
                <button onClick={() => openAuth('register')}
                  className="btn-purple-pill px-5 py-2 text-xs font-black uppercase tracking-wider cursor-pointer shadow-md flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            )}
          </div>

          {/* ── MOBILE RIGHT (avatar + hamburger) ── */}
          <div className="lg:hidden flex items-center gap-2">
            {isUserLoggedIn && (
              <button onClick={openUserProfilePage}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-1 rounded-full cursor-pointer transition-all">
                <div className="w-6 h-6 rounded-full bg-[#cc040a] text-white font-black text-[10px] flex items-center justify-center overflow-hidden shrink-0">
                  {userProfile.avatar
                    ? <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                    : getInitials(userProfile.name, userProfile.email)}
                </div>
                <span className="text-slate-800 font-extrabold text-[11px] max-w-[70px] truncate">
                  {getCleanName(userProfile.name, userProfile.email)}
                </span>
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Menu"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 hover:bg-[#cc040a] text-white transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

        </div>
      </header>

      {/* ══════════════════════════════════════════════════
          GAMING MOBILE SLIDE-IN DRAWER (right side)
      ══════════════════════════════════════════════════ */}

      {/* Backdrop — dark gaming overlay */}
      <div
        onClick={() => setIsMobileMenuOpen(false)}
        className={`lg:hidden fixed inset-0 z-[998] transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(5,5,15,0.85)', backdropFilter: 'blur(6px)' }}
      />

      {/* Gaming Drawer panel */}
      <div
        className={`lg:hidden fixed top-0 right-0 bottom-0 z-[999] w-[300px] max-w-[88vw] flex flex-col transition-transform duration-300 ease-out overflow-hidden ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          background: 'linear-gradient(160deg, #0B0F1A 0%, #0F0D1E 50%, #0B0F1A 100%)',
          borderLeft: '1px solid rgba(204,4,10,0.35)',
          boxShadow: '-8px 0 40px rgba(204,4,10,0.15), -2px 0 8px rgba(0,0,0,0.8)'
        }}
      >
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.8) 2px, rgba(255,255,255,0.8) 3px)', backgroundSize: '100% 3px' }} />

        {/* Top neon line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 z-10" style={{ background: 'linear-gradient(90deg, transparent, #cc040a 40%, #ff4d4d 60%, transparent)', boxShadow: '0 0 12px #cc040a, 0 0 24px rgba(204,4,10,0.5)' }} />
        {/* Left neon border glow */}
        <div className="absolute top-0 left-0 bottom-0 w-px z-10" style={{ background: 'linear-gradient(180deg, transparent, #cc040a 30%, #cc040a 70%, transparent)', boxShadow: '0 0 8px #cc040a' }} />

        {/* ── HEADER ── */}
        <div className="relative z-10 px-5 pt-11 pb-5 overflow-hidden flex-shrink-0">
          {/* BG hex grid */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(204,4,10,0.4) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(100,0,200,0.2) 0%, transparent 50%)' }} />

          {/* Close */}
          <button onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-3.5 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/8 z-20">
            <X className="w-4 h-4" />
          </button>

          {/* Brand */}
          <div className="flex items-center gap-2.5 relative z-10 mb-5">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(204,4,10,0.5)', boxShadow: '0 0 10px rgba(204,4,10,0.3)' }}>
              <img src="/mads-logo.jpg" alt="MADS TOPUP" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-black text-base font-heading tracking-tight">
                <span className="text-white">MADS</span>
                <span style={{ color: '#cc040a', textShadow: '0 0 10px rgba(204,4,10,0.6)' }}>TOPUP</span>
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest font-mono" style={{ color: 'rgba(204,4,10,0.7)' }}>EVERYGAME · LK</div>
            </div>
            {/* Animated pulse dot */}
            <div className="ml-auto flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
          </div>

          {/* User profile card */}
          {isUserLoggedIn ? (
            <button onClick={() => { openUserProfilePage(); setIsMobileMenuOpen(false); }}
              className="relative z-10 w-full flex items-center gap-3 rounded-2xl px-3 py-3 transition-all cursor-pointer group"
              style={{ background: 'rgba(204,4,10,0.08)', border: '1px solid rgba(204,4,10,0.2)' }}
            >
              {/* Avatar with glow ring */}
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-xl overflow-hidden" style={{ border: '2px solid rgba(204,4,10,0.6)', boxShadow: '0 0 12px rgba(204,4,10,0.4)' }}>
                  {userProfile.avatar
                    ? <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-[#cc040a] flex items-center justify-center font-black text-white text-sm">{getInitials(userProfile.name, userProfile.email)}</div>}
                </div>
                {/* Online indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2" style={{ borderColor: '#0B0F1A' }} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-white font-black text-sm truncate">{getCleanName(userProfile.name, userProfile.email)}</div>
                <div className="text-[11px] font-mono truncate" style={{ color: 'rgba(204,4,10,0.8)' }}>{userProfile.email || 'MADS Gamer'}</div>
              </div>
              {/* Rank badge */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                {isReseller
                  ? <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>PARTNER</span>
                  : <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase" style={{ background: 'rgba(204,4,10,0.15)', color: '#ff6b6b', border: '1px solid rgba(204,4,10,0.3)' }}>GAMER</span>}
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-[#cc040a] group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          ) : (
            <div className="relative z-10 flex gap-2">
              <button onClick={() => { openAuth('login'); setIsMobileMenuOpen(false); }}
                className="flex-1 font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1' }}>
                <LogIn className="w-3.5 h-3.5" /><span>LOGIN</span>
              </button>
              <button onClick={() => { openAuth('register'); setIsMobileMenuOpen(false); }}
                className="flex-1 text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #cc040a, #990207)', boxShadow: '0 4px 14px rgba(204,4,10,0.4)' }}>
                <UserPlus className="w-3.5 h-3.5" /><span>JOIN NOW</span>
              </button>
            </div>
          )}
        </div>

        {/* Divider with glow */}
        <div className="relative flex-shrink-0" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(204,4,10,0.5) 50%, transparent)', boxShadow: '0 0 6px rgba(204,4,10,0.3)' }} />

        {/* Wallet balance strips */}
        {isUserLoggedIn && (
          <div className="flex gap-2 px-4 py-3 flex-shrink-0">
            <button onClick={() => handleWalletClick('ezcash')}
              className="flex-1 flex items-center justify-center gap-1.5 text-white text-xs font-black py-2.5 rounded-xl transition-all cursor-pointer relative overflow-hidden group"
              style={{ background: 'linear-gradient(135deg, #cc040a, #8B0000)', boxShadow: '0 0 14px rgba(204,4,10,0.35)', border: '1px solid rgba(204,4,10,0.4)' }}
            >
              <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity" style={{ background: 'rgba(255,255,255,0.05)' }} />
              <Wallet className="w-3.5 h-3.5 fill-white/80 shrink-0" />
              <div className="text-left">
                <div className="text-[9px] text-red-300 font-bold uppercase tracking-widest leading-none">LKR</div>
                <div className="text-sm font-black leading-tight">{(userProfile.walletBalance || 0).toFixed(2)}</div>
              </div>
            </button>
            <button onClick={() => handleWalletClick('binance')}
              className="flex-1 flex items-center justify-center gap-1.5 text-white text-xs font-black py-2.5 rounded-xl transition-all cursor-pointer relative overflow-hidden group"
              style={{ background: 'linear-gradient(135deg, #065f46, #022c22)', boxShadow: '0 0 14px rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity" style={{ background: 'rgba(255,255,255,0.05)' }} />
              <div className="w-5 h-5 rounded-full bg-emerald-400 text-emerald-900 font-black text-[10px] flex items-center justify-center italic shrink-0" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.5)' }}>B</div>
              <div className="text-left">
                <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest leading-none">USDT</div>
                <div className="text-sm font-black leading-tight">{(userProfile.walletUsdt || 0).toFixed(2)}</div>
              </div>
            </button>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />

        {/* ── GAMING NAV ITEMS ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-2 flex items-center gap-2" style={{ color: 'rgba(204,4,10,0.6)' }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(204,4,10,0.4), transparent)' }} />
            <span>MENU</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(204,4,10,0.4))' }} />
          </div>

          {navItems.map((item, i) => (
            <button key={i} onClick={item.action}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer group relative overflow-hidden"
              style={item.active
                ? { background: 'rgba(204,4,10,0.12)', border: '1px solid rgba(204,4,10,0.35)', boxShadow: 'inset 0 0 12px rgba(204,4,10,0.08), 0 0 8px rgba(204,4,10,0.1)' }
                : { background: 'transparent', border: '1px solid transparent' }}
              onMouseEnter={e => { if (!item.active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(204,4,10,0.2)'; } }}
              onMouseLeave={e => { if (!item.active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
            >
              {/* Left neon accent bar when active */}
              {item.active && <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full" style={{ background: '#cc040a', boxShadow: '0 0 8px #cc040a, 0 0 16px rgba(204,4,10,0.5)' }} />}

              {/* Icon box */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105"
                style={item.active
                  ? { background: 'rgba(204,4,10,0.2)', border: '1px solid rgba(204,4,10,0.4)', boxShadow: '0 0 10px rgba(204,4,10,0.2)' }
                  : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <item.icon className="w-4 h-4" style={{ color: item.active ? '#ff6b6b' : 'rgba(148,163,184,0.9)' }} />
              </div>

              {/* Label */}
              <span className="flex-1 text-sm font-bold transition-colors"
                style={{ color: item.active ? '#ff6b6b' : 'rgba(203,213,225,0.85)' }}>
                {item.label}
              </span>

              {/* Badge */}
              {item.badge && (
                <span
                  className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0"
                  style={item.badge === 'PARTNER'
                    ? { background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }
                    : { background: 'rgba(204,4,10,0.15)', color: '#ff6b6b', border: '1px solid rgba(204,4,10,0.3)' }}
                >
                  {item.badge}
                </span>
              )}

              {/* Order count */}
              {item.count > 0 && (
                <span className="text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #cc040a, #990207)', boxShadow: '0 0 6px rgba(204,4,10,0.5)' }}>
                  {item.count}
                </span>
              )}

              {/* Arrow */}
              <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-all group-hover:translate-x-0.5" style={{ color: item.active ? 'rgba(204,4,10,0.7)' : 'rgba(100,116,139,0.5)' }} />
            </button>
          ))}
        </nav>

        {/* Bottom neon line */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(204,4,10,0.4) 50%, transparent)', flexShrink: 0 }} />

        {/* Gaming footer */}
        <div className="px-4 py-3 flex-shrink-0 flex items-center justify-between">
          <div className="text-[9px] font-mono font-semibold" style={{ color: 'rgba(100,116,139,0.7)' }}>MADS TOPUP &copy; {new Date().getFullYear()}</div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 4px #34d399' }} />
            <span className="text-[9px] font-mono" style={{ color: 'rgba(52,211,153,0.8)' }}>ONLINE</span>
          </div>
        </div>
      </div>
    </>
  );
};
