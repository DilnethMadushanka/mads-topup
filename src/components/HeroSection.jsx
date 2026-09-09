import React from 'react';
import { useApp } from '../context/AppContext';
import { Zap, Layers, Mouse, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export const HeroSection = () => {
  const { openTopup } = useApp();

  const scrollToServices = () => {
    const el = document.getElementById('services-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('game-catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative bg-slate-950 text-white min-h-[90vh] flex flex-col justify-between items-center overflow-hidden py-16 px-4">
      {/* Background Artwork - Tactical Squad Gaming Wallpaper */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity scale-105 pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80')`
        }}
      ></div>

      {/* Cyan & Red Background Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] bg-cyan-600/15 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-red-600/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Floating 3D Diamonds */}
      <div className="absolute top-16 left-12 text-4xl opacity-80 animate-float-slow pointer-events-none select-none drop-shadow-[0_10px_20px_rgba(0,180,216,0.5)]">
        💎
      </div>
      <div className="absolute top-28 right-20 text-5xl opacity-75 animate-float-fast pointer-events-none select-none drop-shadow-[0_10px_20px_rgba(0,180,216,0.5)]">
        💎
      </div>
      <div className="absolute bottom-28 left-20 text-3xl opacity-60 animate-float-slow pointer-events-none select-none">
        💎
      </div>
      <div className="absolute bottom-36 right-36 text-4xl opacity-70 animate-float-fast pointer-events-none select-none">
        💎
      </div>

      <div className="w-full"></div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-4xl text-center space-y-7 my-auto">
        
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900/90 border border-cyan-500/30 backdrop-blur-xl text-slate-200 text-xs font-black uppercase tracking-widest shadow-xl">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>SRI LANKA'S #1 GAME TOP-UP PLATFORM</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-1">
          <h1 className="text-6xl sm:text-7xl lg:text-9xl font-black font-heading tracking-tighter text-white uppercase leading-none">
            MADS
          </h1>
          <h1 className="text-6xl sm:text-7xl lg:text-9xl font-black font-heading tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 uppercase leading-none drop-shadow-[0_10px_40px_rgba(0,180,216,0.4)]">
            TOPUP
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-slate-300 text-base sm:text-xl max-w-2xl mx-auto font-semibold leading-relaxed">
          Premium game top-ups at <strong className="text-white font-extrabold underline decoration-cyan-400 decoration-2">unbeatable prices</strong> — instant delivery, trusted by thousands of Sri Lankan gamers.
        </p>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={scrollToServices}
            className="w-full sm:w-auto px-9 py-4 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-slate-950" />
            <span>EXPLORE SERVICES</span>
          </button>

          <button
            onClick={scrollToCatalog}
            className="w-full sm:w-auto px-9 py-4 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white font-black text-sm uppercase tracking-wider backdrop-blur-xl transition-all shadow-lg flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>TOP UP NOW</span>
          </button>
        </div>

        {/* Guarantee Bullet Tags */}
        <div className="pt-4 flex flex-wrap justify-center items-center gap-6 text-xs text-slate-400 font-bold">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>Instant Auto Crediting</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Authorized & Safe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Best LKR Rates</span>
          </div>
        </div>

      </div>

      {/* Mouse Scroll Indicator */}
      <div className="relative z-10 pt-8 flex flex-col items-center gap-1 text-slate-400 text-[10px] font-black uppercase tracking-widest animate-bounce">
        <Mouse className="w-5 h-5 text-cyan-400" />
        <span>SCROLL</span>
      </div>
    </section>
  );
};
