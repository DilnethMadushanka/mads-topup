import React from 'react';
import { useApp } from '../context/AppContext';
import { Gamepad2, Gift, Info, MessageSquareText, User, Settings, Shield, Flame, ChevronRight, Cpu } from 'lucide-react';

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
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-2xl border-b border-red-600/30 shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all">
      {/* Top Laser Trace Line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-red-500 to-transparent relative overflow-hidden">
        <div className="laser-beam-horizontal"></div>
      </div>

      {/* Top Cyber Status Bar */}
      <div className="bg-slate-950/90 text-white text-[11px] font-semibold py-1.5 px-4 border-b border-slate-900 flex justify-between items-center">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600 shadow-[0_0_8px_#FF1A3C]"></span>
            </span>
            <span className="text-red-500 font-black uppercase tracking-wider font-mono flex items-center gap-1">
              <Cpu className="w-3 h-3 text-red-500" />
              MOONGOLD API v2.4 AUTOMATED DISPATCH
            </span>
            <span className="hidden sm:inline text-slate-400 font-mono text-[10px]">| REAL-TIME GAME TOPUP PROTOCOL</span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <span className="hidden md:inline text-slate-400 font-mono text-[10px]">🇱🇰 SRI LANKA OFFICIAL GAMING GATEWAY</span>
            <button 
              onClick={() => setIsAdminOpen(true)}
              className="text-slate-300 hover:text-white flex items-center gap-1.5 font-extrabold text-[10px] bg-slate-900 border border-red-500/30 px-3 py-0.5 rounded-md hover:border-red-500 transition-colors shadow-[0_0_10px_rgba(255,26,60,0.2)]"
            >
              <Settings className="w-3 h-3 text-red-500 animate-spin-slow" />
              <span>ADMIN PORTAL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Complex Cyber Logo with Shield & Scarlet Flame */}
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {/* Cybernetic Shield Icon */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* Pulsing Outer Neon Shield Aura */}
            <div className="absolute inset-0 rounded-xl bg-red-600/30 blur-md group-hover:bg-red-500/50 transition-all"></div>
            
            {/* Hexagon Metallic Shield Frame */}
            <div className="relative w-11 h-11 bg-gradient-to-b from-slate-900 via-slate-950 to-red-950 border-2 border-red-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,26,60,0.5)] group-hover:scale-105 transition-transform duration-300">
              <Shield className="w-7 h-7 text-red-600 stroke-[2] absolute inset-0 m-auto opacity-40" />
              <Flame className="w-6 h-6 fill-red-500 text-red-400 relative z-10 drop-shadow-[0_0_10px_#FF1A3C] animate-pulse" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 font-black text-2xl tracking-tighter text-white font-heading uppercase">
              <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">MADS</span>
              <span className="text-red-500 drop-shadow-[0_0_15px_rgba(255,26,60,0.8)]">TOPUP</span>
            </div>
            <div className="flex items-center gap-1 -mt-1">
              <span className="text-[8px] font-black text-red-400 bg-red-950/80 px-1.5 py-0.2 rounded border border-red-500/50 uppercase tracking-widest block font-mono">
                ULTRA GAMING ECOSYSTEM
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8 text-xs font-black uppercase tracking-wider text-slate-300">
          <button 
            onClick={() => scrollToSection('game-catalog')}
            className="flex items-center gap-2 hover:text-red-400 transition-colors cursor-pointer group py-2"
          >
            <Gamepad2 className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform drop-shadow-[0_0_6px_#FF1A3C]" />
            <span>Game Store</span>
          </button>

          <button 
            onClick={() => scrollToSection('services-section')}
            className="flex items-center gap-2 hover:text-red-400 transition-colors cursor-pointer group py-2"
          >
            <Gift className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform drop-shadow-[0_0_6px_#FF1A3C]" />
            <span>Services</span>
          </button>

          <button 
            onClick={() => scrollToSection('why-choose-us')}
            className="flex items-center gap-2 hover:text-red-400 transition-colors cursor-pointer group py-2"
          >
            <Info className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
            <span>Why Us</span>
          </button>

          <button 
            onClick={() => scrollToSection('reviews-section')}
            className="flex items-center gap-2 hover:text-red-400 transition-colors cursor-pointer group py-2"
          >
            <MessageSquareText className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
            <span>Reviews</span>
          </button>
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          {/* Currency Toggle */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-lg border border-red-500/30 text-xs font-black">
            <button
              onClick={() => setCurrency('LKR')}
              className={`px-3 py-1 rounded-md transition-all duration-200 ${
                currency === 'LKR' 
                  ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(255,26,60,0.7)]' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              LKR
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1 rounded-md transition-all duration-200 ${
                currency === 'USD' 
                  ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(255,26,60,0.7)]' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              USD
            </button>
          </div>

          {/* User Profile Button */}
          <button
            onClick={() => setIsUserProfileOpen(true)}
            className="flex items-center gap-2 text-slate-200 hover:text-white font-extrabold text-xs px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-red-500/50 transition-all relative shadow-md"
          >
            <User className="w-4 h-4 text-red-500" />
            <span className="hidden sm:inline font-mono">PROFILE</span>
            {pendingCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center -mr-1 shadow-[0_0_8px_#FF1A3C]">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Admin CTA - Brushed Crimson Metallic Plate */}
          <button
            onClick={() => setIsAdminOpen(true)}
            className="btn-crimson-plate px-5 py-2.5 rounded-lg text-white font-black text-xs tracking-wider uppercase transition-all shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <span className="font-mono drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]">ADMIN</span>
            <ChevronRight className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
    </header>
  );
};

