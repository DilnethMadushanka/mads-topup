import React from 'react';
import { useApp } from '../context/AppContext';
import { Zap, Layers, Mouse } from 'lucide-react';

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
    <section className="relative bg-[#090D16] text-white min-h-[92vh] flex flex-col justify-between items-center overflow-hidden py-16 px-4">
      {/* Background Artwork - Dark Ancient Treasure Battle Royale Wallpaper */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity scale-105 pointer-events-none"
        style={{
          backgroundImage: `url('/hero-slider/hero-1.jpg')`
        }}
      ></div>

      {/* Ambient Dark Navy Vignette & Cyan Aura */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#090D16]/80 via-[#090D16]/50 to-[#090D16] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-500/15 rounded-full blur-[160px] pointer-events-none"></div>

      {/* 3D Floating Blue Diamonds (Matching Reference Screenshot) */}
      <div className="absolute top-28 left-12 opacity-80 animate-float-diamond pointer-events-none select-none text-5xl drop-shadow-[0_10px_20px_rgba(0,180,216,0.6)]">
        💎
      </div>
      <div className="absolute top-24 right-16 opacity-80 animate-float-diamond pointer-events-none select-none text-6xl drop-shadow-[0_10px_20px_rgba(0,180,216,0.6)] style={{ animationDelay: '1.5s' }}">
        💎
      </div>
      <div className="absolute bottom-28 left-16 opacity-70 animate-float-diamond pointer-events-none select-none text-4xl drop-shadow-[0_10px_20px_rgba(0,180,216,0.6)] style={{ animationDelay: '2.5s' }}">
        💎
      </div>

      <div className="w-full"></div>

      {/* Hero Central Content */}
      <div className="relative z-10 max-w-4xl text-center space-y-7 my-auto pt-4">
        
        {/* Top Pill Badge (Matching Reference Screenshot) */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900/90 border border-cyan-500/40 backdrop-blur-xl text-slate-200 text-xs font-black uppercase tracking-widest shadow-xl">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00B4D8]"></span>
          <span className="font-mono text-slate-100">SRI LANKA'S #1 GAME TOP-UP PLATFORM</span>
        </div>

        {/* Hero Title: White MADS + Sky Blue TOPUP (Matching Reference Screenshot) */}
        <div className="space-y-0">
          <h1 className="text-7xl sm:text-8xl lg:text-9xl font-black font-heading tracking-tighter text-white uppercase leading-none drop-shadow-lg">
            MADS
          </h1>
          <h1 className="text-7xl sm:text-8xl lg:text-9xl font-black font-heading tracking-tighter text-cyan-400 uppercase leading-none drop-shadow-[0_10px_35px_rgba(0,180,216,0.5)]">
            TOPUP
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-slate-300 text-base sm:text-xl max-w-2xl mx-auto font-semibold leading-relaxed drop-shadow">
          Premium game top-ups at <strong className="text-white font-extrabold underline decoration-white decoration-2">unbeatable prices</strong> — instant delivery, trusted by thousands of Sri Lankan gamers.
        </p>

        {/* Action Buttons (Matching Reference Screenshot Buttons) */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={scrollToServices}
            className="btn-cyan-pill w-full sm:w-auto px-8 py-3.5 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-white" />
            <span>EXPLORE SERVICES</span>
          </button>

          <button
            onClick={scrollToCatalog}
            className="btn-dark-pill w-full sm:w-auto px-8 py-3.5 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-white fill-white" />
            <span>TOP UP NOW</span>
          </button>
        </div>

      </div>

      {/* Mouse Scroll Indicator (Matching Reference Screenshot) */}
      <div 
        onClick={scrollToServices}
        className="relative z-10 pt-8 flex flex-col items-center gap-1 text-slate-400 hover:text-cyan-400 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors animate-bounce"
      >
        <div className="w-5 h-9 rounded-full border-2 border-slate-400 flex items-start justify-center p-1">
          <div className="w-1 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
        </div>
        <span className="text-[9px]">SCROLL</span>
      </div>
    </section>
  );
};




