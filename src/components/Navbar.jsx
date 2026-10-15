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
            <div className="w-10 h-10 shrink-0 drop-shadow-[0_6px_12px_rgba(22,119,255,0.35)] dark:drop-shadow-[0_0_14px_rgba(43,134,255,0.5)]! group-hover:scale-105 transition-transform duration-300">
              <img src="/mads-icon-192.png" alt="MADS TOPUP Logo" width="40" height="40" className="w-full h-full object-contain" />
            </div>
            {/* On small phones the wallet pill needs the room, so only the logo mark shows when signed in. */}
            <div className={`flex flex-col leading-none ${isUserLoggedIn ? 'max-[459px]:hidden' : ''}`}>
              <div className="flex items-center gap-1 font-heading font-extrabold text-[19px] tracking-tight text-slate-950 dark:text-white!">
                <span>MADS</span>
                <span><span className="text-[#1677ff] dark:text-[#3d95ff]!">TOP</span><span className="text-[#f59e0b]">UP</span></span>
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
      <aside className={`msb lg:hidden ${isMobileMenuOpen ? 'is-open' : ''}`} aria-hidden={!isMobileMenuOpen}>
        {/* Header */}
        <div className="msb-head">
          <div className="msb-top">
            <div className="msb-brand">
              <span className="msb-brand-logo"><img src="/mads-icon-192.png" alt="MADS TOPUP" /></span>
              <span className="msb-brand-name">MADS <b>TOPUP</b></span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} aria-label="Close Menu" className="msb-close">
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>

          {isUserLoggedIn ? (
            <button onClick={() => { openUserProfilePage(); setIsMobileMenuOpen(false); }} className="msb-user">
              <span className="msb-avatar">
                {userProfile.avatar
                  ? <img src={userProfile.avatar} alt="Profile" />
                  : <span>{getInitials(userProfile.name, userProfile.email)}</span>}
                <i />
              </span>
              <span className="msb-user-txt">
                <span className="msb-user-name">{getCleanName(userProfile.name, userProfile.email)}</span>
                <span className="msb-user-mail">{userProfile.email || 'MADS Gamer'}</span>
                <span className={`msb-role ${isReseller ? 'is-partner' : ''}`}>
                  {isReseller ? <Crown className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                  {isReseller ? 'Partner' : 'Gamer'}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 msb-user-go" />
            </button>
          ) : (
            <div className="msb-auth">
              <button onClick={() => { openAuth('login'); setIsMobileMenuOpen(false); }} className="msb-auth-btn">
                <LogIn className="w-4 h-4" /><span>Login</span>
              </button>
              <button onClick={() => { openAuth('register'); setIsMobileMenuOpen(false); }} className="msb-auth-btn is-primary">
                <UserPlus className="w-4 h-4" /><span>Join now</span>
              </button>
            </div>
          )}
        </div>

        <div className="msb-scroll">
          {/* Wallet */}
          {isUserLoggedIn && (
            <div className="msb-wallet">
              <div className="msb-wallet-row">
                <button onClick={() => handleWalletClick('ezcash')} className="msb-bal">
                  <span className="msb-bal-ico is-lkr"><Wallet className="w-4 h-4" /></span>
                  <span className="msb-bal-txt">
                    <span className="msb-bal-label">LKR wallet</span>
                    <span className="msb-bal-amt"><small>Rs</small>{fmtLkr(userProfile.walletBalance, true)}</span>
                  </span>
                </button>
                <button onClick={() => handleWalletClick('binance')} className="msb-bal">
                  <span className="msb-bal-ico is-usdt">₮</span>
                  <span className="msb-bal-txt">
                    <span className="msb-bal-label">USDT wallet</span>
                    <span className="msb-bal-amt"><small>$</small>{fmtUsdt(userProfile.walletUsdt)}</span>
                  </span>
                </button>
              </div>
              <button onClick={() => handleWalletClick('ezcash')} className="msb-topup">
                <Plus className="w-4 h-4" /> Top up wallet
              </button>
            </div>
          )}

          {/* Nav items */}
          <nav className="msb-nav">
            <div className="msb-label">Menu</div>
            {navItems.map((item, i) => (
              <button key={item.label} onClick={item.action} style={{ '--d': `${60 + i * 35}ms` }}
                className={`msb-item ${item.active ? 'is-active' : ''}`}>
                <span className="msb-item-ico"><item.icon className="w-[18px] h-[18px]" /></span>
                <span className="msb-item-label">{item.label}</span>
                {item.badge && <span className={`msb-badge ${item.badge === 'PARTNER' ? 'is-gold' : ''}`}>{item.badge}</span>}
                {item.count > 0 && <span className="msb-count">{item.count}</span>}
                <ChevronRight className="w-4 h-4 msb-item-go" />
              </button>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="msb-foot">
          {isUserLoggedIn ? (
            <button onClick={() => { handleLogout && handleLogout(); setIsMobileMenuOpen(false); }} className="msb-logout">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          ) : <span className="msb-copy">MADS TOPUP &copy; {new Date().getFullYear()}</span>}
          <span className="msb-online"><i />Online</span>
        </div>
      </aside>
    </>
  );
};
