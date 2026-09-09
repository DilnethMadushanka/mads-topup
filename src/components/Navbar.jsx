import React from 'react';
import { useApp } from '../context/AppContext';
import { Gamepad2, Gift, BookOpen, Download, User, Settings, Flame } from 'lucide-react';

export const Navbar = () => {
  const { 
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
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo (Matching Reference Screenshot) */}
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-300">
            <Flame className="w-5 h-5 fill-white text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 font-black text-xl tracking-tighter text-slate-950 font-heading">
              <span>MADS</span>
              <span className="text-cyan-500">TOPUP</span>
            </div>
            <span className="text-[7px] font-black text-slate-500 tracking-widest uppercase font-mono -mt-1">
              EVERYGAME LK
            </span>
          </div>
        </div>

        {/* Center Navigation Links (Matching Reference Screenshot Icons) */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-slate-800 uppercase tracking-wide">
          <button 
            onClick={() => scrollToSection('game-catalog')}
            className="flex items-center gap-2 hover:text-cyan-600 transition-colors cursor-pointer group py-2"
          >
            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Gamepad2 className="w-3.5 h-3.5" />
            </span>
            <span>Game List</span>
          </button>

          <button 
            onClick={() => scrollToSection('services-section')}
            className="flex items-center gap-2 hover:text-cyan-600 transition-colors cursor-pointer group py-2"
          >
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Gift className="w-3.5 h-3.5" />
            </span>
            <span>Cards</span>
          </button>

          <button 
            onClick={() => scrollToSection('why-choose-us')}
            className="flex items-center gap-2 hover:text-cyan-600 transition-colors cursor-pointer group py-2"
          >
            <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </span>
            <span>Blog</span>
          </button>

          <button 
            onClick={() => scrollToSection('reviews-section')}
            className="flex items-center gap-2 hover:text-cyan-600 transition-colors cursor-pointer group py-2"
          >
            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Download className="w-3.5 h-3.5" />
            </span>
            <span>Download App</span>
          </button>
        </nav>

        {/* Right Controls (Login text link & REGISTER purple pill button) */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsAdminOpen(true)}
            className="text-xs font-black text-slate-700 hover:text-slate-950 uppercase tracking-wider cursor-pointer font-heading"
          >
            Login
          </button>

          <button
            onClick={() => setIsUserProfileOpen(true)}
            className="btn-purple-pill px-6 py-2 text-xs font-black uppercase tracking-wider cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5" />
            <span>REGISTER</span>
            {pendingCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 text-[9px] font-black flex items-center justify-center ml-1">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};



