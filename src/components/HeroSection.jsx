import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Zap, Layers, MessageCircle } from 'lucide-react';

export const HeroSection = () => {
  const { openCatalog, setIsSupportOpen } = useApp();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroImages = [
    '/uploads/hero_media/hero_03f995f15258.jpg',
    '/uploads/hero_media/hero_5915a6b90d1b.jpg',
    '/uploads/hero_media/hero_cc64b9056d35.jpg'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const scrollToServices = () => {
    const el = document.getElementById('services-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative bg-[#090D16] text-white min-h-[92vh] flex flex-col justify-between items-center overflow-hidden py-16 px-4">
      {/* Background Artwork Slider - MADS Hero Media */}
      {heroImages.map((img, idx) => (
        <div 
          key={img}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out scale-105 pointer-events-none ${
            idx === currentHeroIndex ? 'opacity-40' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url('${img}')`
          }}
        ></div>
      ))}

      {/* Ambient Dark Navy Vignette & Red Aura */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#090D16]/80 via-[#090D16]/50 to-[#090D16] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#cc040a]/15 rounded-full blur-[160px] pointer-events-none"></div>

      {/* 3D Floating Red Diamonds */}
      <div className="absolute top-28 left-12 opacity-80 animate-float-diamond pointer-events-none select-none text-5xl drop-shadow-[0_10px_20px_rgba(204,4,10,0.6)]">
        💎
      </div>
      <div className="absolute top-24 right-16 opacity-80 animate-float-diamond pointer-events-none select-none text-6xl drop-shadow-[0_10px_20px_rgba(204,4,10,0.6)]" style={{ animationDelay: '1.5s' }}>
        💎
      </div>
      <div className="absolute bottom-28 left-16 opacity-70 animate-float-diamond pointer-events-none select-none text-4xl drop-shadow-[0_10px_20px_rgba(204,4,10,0.6)]" style={{ animationDelay: '2.5s' }}>
        💎
      </div>

      <div className="w-full"></div>

      {/* Hero Central Content */}
      <div className="relative z-10 max-w-4xl text-center space-y-7 my-auto pt-4">
        
        {/* Top Pill Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900/90 border border-[#cc040a]/40 backdrop-blur-xl text-slate-200 text-xs font-black uppercase tracking-widest shadow-xl animate-pop-in delay-100">
          <span className="w-2 h-2 rounded-full bg-[#cc040a] animate-pulse shadow-[0_0_8px_#cc040a]"></span>
          <span className="font-mono text-slate-100">SRI LANKA'S #1 GAME TOP-UP PLATFORM</span>
        </div>

        {/* Hero Title: White MADS + Red TOPUP */}
        <div className="space-y-0">
          <h1 className="text-7xl sm:text-8xl lg:text-9xl font-black font-heading tracking-tighter text-white uppercase leading-none drop-shadow-lg animate-pop-in delay-300">
            MADS
          </h1>
          <h1 className="text-7xl sm:text-8xl lg:text-9xl font-black font-heading tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-[#cc040a] uppercase leading-none drop-shadow-[0_10px_35px_rgba(6,182,212,0.4)] animate-pop-in delay-400">
            TOPUP
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-slate-300 text-base sm:text-xl max-w-2xl mx-auto font-semibold leading-relaxed drop-shadow animate-pop-in delay-600">
          Premium game top-ups at <strong className="text-white font-extrabold">unbeatable prices</strong> — instant delivery, trusted by thousands of Sri Lankan gamers.
        </p>

        {/* Action Buttons (Matching Reference Screenshot EXACTLY) */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 animate-pop-in delay-800">
          <button
            onClick={scrollToServices}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 transition-all"
          >
            <Layers className="w-4 h-4 text-white" />
            <span>EXPLORE SERVICES</span>
          </button>

          <button
            onClick={openCatalog}
            className="btn-dark-pill w-full sm:w-auto px-8 py-3.5 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer border border-white/20 hover:border-white/40 shadow-md"
          >
            <Zap className="w-4 h-4 text-white fill-white" />
            <span>TOP UP NOW</span>
          </button>
        </div>

      </div>

      {/* Mouse Scroll Indicator (Matching Reference Screenshot) */}
      <div 
        onClick={scrollToServices}
        className="relative z-10 pt-8 flex flex-col items-center gap-1.5 text-slate-400 hover:text-cyan-400 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors animate-bounce"
      >
        <div className="w-6 h-10 rounded-full border-2 border-slate-400 flex items-start justify-center p-1">
          <div className="w-1.5 h-2.5 bg-cyan-400 rounded-full animate-pulse"></div>
        </div>
        <span className="text-[9px] tracking-widest font-mono text-slate-300">SCROLL</span>
      </div>

      {/* Floating Cyan/Blue Support Chat Button (Matching Reference Screenshot) */}
      <button 
        onClick={() => setIsSupportOpen(true)}
        aria-label="Open 24/7 Live Support Chat"
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer ring-4 ring-cyan-500/20 group"
      >
        <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-white group-hover:rotate-6 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-ping"></span>
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
      </button>
    </section>
  );
};





