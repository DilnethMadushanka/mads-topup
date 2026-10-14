import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { filterUserOrders } from '../utils/ownership';
import {
  Gamepad2, Gift, BookOpen, Download, User, Wallet, ChevronDown,
  Headset, Menu, X, LogIn, UserPlus, Home, ShoppingBag, Smartphone,
  Crown, ChevronRight, ArrowRight, Star, Zap, LogOut, Plus } from 'lucide-react';

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
    isResellerDashboardOpen,
    openReferralPage,
    isReferralPageOpen,
    handleLogout,
    openBlogPage,
    isBlogPageOpen
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
    { label: 'Home', icon: Home, color: 'text-[#1677ff]', bg: 'bg-brand-50', action: () => { setSelectedGame(null); closeCatalog(); setIsMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
    { label: 'Game List', icon: Gamepad2, color: 'text-violet-500', bg: 'bg-violet-50', action: () => { setSelectedGame(null); openCatalog(); setIsMobileMenuOpen(false); }, active: isGameCatalogOpen },
    { label: 'Gift Cards', icon: Gift, color: 'text-emerald-500', bg: 'bg-emerald-50', action: () => handleNavClick('services-section') },
    { label: 'Blog', icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-50', action: () => { openBlogPage(); setIsMobileMenuOpen(false); }, active: isBlogPageOpen },
    { label: 'Download App', icon: Smartphone, color: 'text-sky-500', bg: 'bg-sky-50', action: () => { setIsDownloadAppModalOpen(true); setIsMobileMenuOpen(false); }, badge: 'NEW' },
    isReseller
      ? { label: 'Reseller Dashboard', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-50', action: () => { openResellerDashboard(); setIsMobileMenuOpen(false); }, badge: 'PARTNER', active: isResellerDashboardOpen }
      : { label: 'Referral', icon: Gift, color: 'text-[#1677ff]', bg: 'bg-brand-50', action: () => { openReferralPage(); setIsMobileMenuOpen(false); }, active: isReferralPageOpen },
    { label: '24/7 Support', icon: Headset, color: 'text-[#1677ff]', bg: 'bg-brand-50', action: () => { openContactPage(); setIsMobileMenuOpen(false); } },
    { label: 'My Orders', icon: ShoppingBag, color: 'text-indigo-500', bg: 'bg-indigo-50', action: () => { if (isUserLoggedIn) { openUserProfilePage(); } else { openAuth('login'); } setIsMobileMenuOpen(false); }, count: isUserLoggedIn ? filterUserOrders(orders, userProfile).length : 0 },
  ];


  const desktopLinks = [
    { label: 'Game List', icon: Gamepad2, action: () => { setSelectedGame(null); openCatalog(); }, active: isGameCatalogOpen },
    { label: 'Gift Cards', icon: Gift, action: () => handleNavClick('services-section') },
    { label: 'Blog', icon: BookOpen, action: () => { openBlogPage(); }, active: isBlogPageOpen },
    { label: 'Download App', icon: Download, action: () => setIsDownloadAppModalOpen(true) },
  ];

  const fmtLkr = (v, compact) => (Number(v) || 0).toLocaleString('en-US', compact
    ? { maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtUsdt = (v) => (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // LKR + USDT balances in one pill; each half opens its top-up tab.
  const walletChip = (compact) => (
    <div className={`nw${compact ? ' is-compact' : ''}`}>
      <button type="button" onClick={() => handleWalletClick('ezcash')} className="nw-seg" title="LKR wallet · Top up">
        <span className="nw-ico is-lkr"><Wallet /></span>
        <span className="nw-txt">
          <span className="nw-label">LKR</span>
          <span className="nw-amt"><span className="nw-cur">Rs</span>{fmtLkr(userProfile.walletBalance, compact)}</span>
        </span>
      </button>
      <span className="nw-div" />
      <button type="button" onClick={() => handleWalletClick('binance')} className="nw-seg" title="USDT wallet · Top up">
        <span className="nw-ico is-usdt">₮</span>
        <span className="nw-txt">
          <span className="nw-label">USDT</span>
          <span className="nw-amt"><span className="nw-cur">$</span>{fmtUsdt(userProfile.walletUsdt)}</span>
        </span>
      </button>
      {!compact && (
        <button type="button" onClick={() => handleWalletClick('ezcash')} className="nw-add" aria-label="Top up wallet" title="Top up wallet">
          <Plus />
        </button>
      )}
    </div>
  );

  const linkCls = (active) =>
    `relative flex items-center gap-2 h-10 px-3 text-[15px] font-semibold whitespace-nowrap cursor-pointer transition-colors duration-200 after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-[3px] after:rounded-full after:bg-[#1677ff] dark:after:bg-[#8dc2ff]! after:transition-transform after:duration-300 after:origin-center ${
      active
        ? 'text-[#1677ff] dark:text-white! after:scale-x-100'
        : 'text-slate-700 hover:text-[#1677ff] dark:text-white/85! dark:hover:text-white! after:scale-x-0 hover:after:scale-x-100'
    }`;

  return (
    <>
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/85 border-b border-slate-200/80 shadow-[0_10px_30px_-18px_rgba(22,119,255,0.35)] backdrop-blur-xl dark:bg-[#171c2f]/80! dark:border-white/10! dark:shadow-[0_14px_40px_-18px_rgba(0,10,50,0.9)]!' : 'bg-transparent border-b border-transparent'}`}>
        <div
          className="max-w-[1440px] mx-auto h-16 sm:h-[72px] flex items-center justify-between gap-3 px-3 sm:px-6 lg:px-10"
        >

          {/* ── LOGO ── */}
          <div
            onClick={() => { setSelectedGame(null); closeCatalog(); setIsMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 rounded-full bg-slate-950 ring-2 ring-white shadow-md dark:ring-[#2b86ff]! dark:shadow-[0_0_18px_rgba(43,134,255,0.55)]! flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300">
              <img src="/mads-logo.jpg" alt="MADS TOPUP Logo" className="w-full h-full object-contain" />
            </div>
            {/* On small phones the wallet pill needs the room, so only the logo mark shows when signed in. */}
            <div className={`flex flex-col leading-none ${isUserLoggedIn ? 'max-[459px]:hidden' : ''}`}>
              <div className="flex items-center gap-1 font-heading font-extrabold text-[19px] tracking-tight text-slate-950 dark:text-white!">
                <span>MADS</span>
                <span className="text-[#1677ff] dark:text-[#3d95ff]!">TOPUP</span>
              </div>
              <span className="mt-1 text-[8px] font-bold text-slate-400 dark:text-white/40! tracking-[0.22em] uppercase font-mono">EVERYGAME LK</span>
            </div>
          </div>

          {/* ── DESKTOP NAV (segmented pill group) ── */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-3">
            {desktopLinks.map(item => (
              <button key={item.label} onClick={item.action} className={linkCls(item.active)}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}

            {isReseller ? (
              <button onClick={() => openResellerDashboard()}
                className={`flex items-center gap-1.5 h-10 px-4 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-[13px] shadow-sm cursor-pointer shrink-0 transition-all hover:brightness-105 ${isResellerDashboardOpen ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}>
                <Crown className="w-4 h-4 fill-slate-950 shrink-0" />
                <span className="whitespace-nowrap">Reseller</span>
              </button>
            ) : (
              <button onClick={() => openReferralPage()} className={linkCls(isReferralPageOpen)}>
                <Gift className="w-4 h-4" />
                Referral
              </button>
            )}

            <button onClick={() => openContactPage()} className={linkCls(false)}>
              <Headset className="w-4 h-4" />
              Support
            </button>
          </nav>

          {/* ── DESKTOP RIGHT ── */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {isUserLoggedIn ? (
              <>
                {walletChip(false)}

                {/* Profile */}
                <button onClick={openUserProfilePage}
                  className="group flex items-center gap-2.5 h-11 pl-1 pr-3 rounded-full bg-white border border-slate-200 hover:border-slate-300 shadow-sm dark:bg-white/[0.05]! dark:border-white/10! dark:hover:border-[#2b86ff]/60! dark:shadow-none! cursor-pointer transition-all">
                  <span className="w-9 h-9 rounded-full bg-[#1677ff] text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white dark:ring-[#2b86ff]/50!">
                    {userProfile.avatar
                      ? <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                      : getInitials(userProfile.name, userProfile.email)}
                  </span>
                  <span className="text-slate-800 dark:text-white! font-bold text-[13px] group-hover:text-[#1677ff] dark:group-hover:text-[#74b8ff]! transition-colors max-w-[96px] xl:max-w-[128px] truncate">
                    {getCleanName(userProfile.name, userProfile.email)}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-white/40! group-hover:translate-y-0.5 transition-transform shrink-0" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => openAuth('login')}
                  className="h-11 px-5 rounded-full text-[13px] font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-white/80! dark:hover:text-white! dark:hover:bg-white/10! cursor-pointer transition-colors">
                  Login
                </button>
                <button onClick={() => openAuth('register')}
                  className="btn-purple-pill h-11 px-6 text-[13px] font-bold cursor-pointer flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span>Register</span>
                </button>
              </>
            )}
          </div>

          {/* ── MOBILE RIGHT ── */}
          <div className="lg:hidden flex items-center gap-1.5">
            {isUserLoggedIn && walletChip(true)}

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Menu"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-950 hover:bg-[#1677ff] dark:bg-[#2b86ff]! dark:hover:bg-[#1a6cf0]! text-white transition-colors cursor-pointer shadow-md active:scale-95"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

        </div>
      </header>

      {/* ══════════════════════════════════════════════════
          MOBILE SIDEBAR
      ══════════════════════════════════════════════════ */}

      {/* Backdrop */}
      <div
        onClick={() => setIsMobileMenuOpen(false)}
        className={`lg:hidden fixed inset-0 z-[998] transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(9,13,22,0.55)', backdropFilter: 'blur(6px)' }}
      />

      {/* Panel */}
      <aside
        className={`lg:hidden fixed top-2 right-2 bottom-2 z-[999] w-[320px] max-w-[calc(100vw-16px)] bg-white dark:bg-[#1a2030]! border border-transparent dark:border-white/10! rounded-[1.75rem] flex flex-col overflow-hidden shadow-[0_30px_80px_-20px_rgba(9,13,22,0.5)] transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-[110%]'}`}
      >

        {/* Header */}
        <div className="relative shrink-0 px-5 pt-5 pb-5 bg-gradient-to-br from-[#2b86ff] via-[#1a6cf0] to-[#083a9e] text-white overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 9px)' }} />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 ring-2 ring-white/30">
                <img src="/mads-logo.jpg" alt="MADS TOPUP" className="w-full h-full object-contain" />
              </div>
              <div className="leading-none">
                <div className="font-heading font-extrabold text-[17px] tracking-tight">MADS<span className="text-white/80">TOPUP</span></div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] font-mono text-brand-200">EVERYGAME · LK</div>
              </div>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} aria-label="Close Menu"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative mt-5">
            {isUserLoggedIn ? (
              <button onClick={() => { openUserProfilePage(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 bg-white/15 hover:bg-white/25 border border-white/20 rounded-2xl p-2.5 pr-3 transition-colors cursor-pointer group">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-white/40">
                    {userProfile.avatar
                      ? <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-white flex items-center justify-center font-bold text-[#1677ff] text-sm">{getInitials(userProfile.name, userProfile.email)}</div>}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#1677ff]" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-bold text-[15px] truncate">{getCleanName(userProfile.name, userProfile.email)}</div>
                  <div className="text-brand-100/90 text-xs truncate">{userProfile.email || 'MADS Gamer'}</div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  {isReseller
                    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 uppercase">Partner</span>
                    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25 uppercase">Gamer</span>}
                  <ChevronRight className="w-4 h-4 text-white/70 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { openAuth('login'); setIsMobileMenuOpen(false); }}
                  className="flex-1 h-11 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold text-[13px] rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer">
                  <LogIn className="w-4 h-4" /><span>Login</span>
                </button>
                <button onClick={() => { openAuth('register'); setIsMobileMenuOpen(false); }}
                  className="flex-1 h-11 bg-white text-[#1677ff] font-bold text-[13px] rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md">
                  <UserPlus className="w-4 h-4" /><span>Join now</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Wallet cards */}
        {isUserLoggedIn && (
          <div className="grid grid-cols-2 gap-2.5 px-4 pt-4 shrink-0">
            <button onClick={() => handleWalletClick('ezcash')}
              className="text-left rounded-2xl border border-brand-100 bg-brand-50/70 hover:bg-brand-50 dark:border-[#2b86ff]/30! dark:bg-[#2b86ff]/10! dark:hover:bg-[#2b86ff]/20! p-3 transition-colors cursor-pointer active:scale-[0.98]">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#1677ff] dark:text-[#74b8ff]!">
                <Wallet className="w-3 h-3" /> LKR
              </span>
              <span className="block mt-1.5 text-lg font-extrabold font-heading text-slate-900 dark:text-white! tabular-nums">{(userProfile.walletBalance || 0).toFixed(2)}</span>
            </button>
            <button onClick={() => handleWalletClick('binance')}
              className="text-left rounded-2xl border border-emerald-100 bg-emerald-50/70 hover:bg-emerald-50 dark:border-emerald-400/30! dark:bg-emerald-500/10! dark:hover:bg-emerald-500/20! p-3 transition-colors cursor-pointer active:scale-[0.98]">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400!">
                <span className="w-3 h-3 rounded-full bg-emerald-600 text-white text-[7px] font-extrabold italic flex items-center justify-center">B</span> USDT
              </span>
              <span className="block mt-1.5 text-lg font-extrabold font-heading text-slate-900 dark:text-white! tabular-nums">{(userProfile.walletUsdt || 0).toFixed(2)}</span>
            </button>
          </div>
        )}

        {/* Nav items */}
        {isUserLoggedIn ? (
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-white/40!">Menu</div>

            {navItems.map((item, i) => (
              <button key={i} onClick={item.action}
                className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-2xl text-left transition-colors duration-150 cursor-pointer group relative ${
                  item.active ? 'bg-brand-50 dark:bg-[#2b86ff]/15!' : 'hover:bg-slate-50 dark:hover:bg-white/5!'
                }`}>
                {item.active && <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-[#1677ff]" />}

                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  item.active ? 'bg-[#1677ff] shadow-md shadow-brand-600/25' : `${item.bg} `
                }`}>
                  <item.icon className={`w-[18px] h-[18px] ${item.active ? 'text-white' : item.color}`} />
                </span>

                <span className={`flex-1 text-[15px] font-semibold ${item.active ? 'text-[#1677ff] dark:text-[#74b8ff]!' : 'text-slate-700 group-hover:text-slate-950 dark:text-white/75! dark:group-hover:text-white!'}`}>
                  {item.label}
                </span>

                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                    item.badge === 'PARTNER' ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/20! dark:text-amber-300!' : 'bg-brand-100 text-[#1677ff] dark:bg-[#2b86ff]/20! dark:text-[#74b8ff]!'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {item.count > 0 && (
                  <span className="bg-[#1677ff] text-white text-[11px] font-bold px-2 h-5 rounded-full min-w-[20px] flex items-center justify-center shrink-0">
                    {item.count}
                  </span>
                )}

                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${item.active ? 'text-[#1677ff] dark:text-[#74b8ff]!' : 'text-slate-300 dark:text-white/25!'}`} />
              </button>
            ))}

            <div className="mx-2 my-2 h-px bg-slate-100 dark:bg-white/10!" />
            <button
              onClick={() => { handleLogout && handleLogout(); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-2xl text-left transition-colors duration-150 cursor-pointer group hover:bg-brand-50 dark:hover:bg-[#2b86ff]/15!"
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-brand-50 dark:bg-[#2b86ff]/15! group-hover:bg-[#1677ff] dark:group-hover:bg-[#2b86ff]! transition-colors">
                <LogOut className="w-[18px] h-[18px] text-[#1677ff] group-hover:text-white transition-colors" />
              </span>
              <span className="flex-1 text-[15px] font-semibold text-[#1677ff] dark:text-[#74b8ff]!">Logout</span>
            </button>
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        {/* Footer */}
        <div className="shrink-0 px-5 py-3.5 flex items-center justify-between border-t border-slate-100 bg-slate-50/70 dark:border-white/10! dark:bg-white/[0.03]!">
          <span className="text-[11px] font-mono text-slate-400 dark:text-white/40! font-medium">MADS TOPUP &copy; {new Date().getFullYear()}</span>
          <span className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400!">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            ONLINE
          </span>
        </div>
      </aside>
    </>
  );
};
