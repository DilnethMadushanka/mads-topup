import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Zap, Layers, Mouse, ShieldCheck, Sparkles, CheckCircle2, Flame, Terminal, Activity, ChevronLeft, ChevronRight } from 'lucide-react';

const HERO_SLIDES = [
  {
    id: 1,
    title: 'FREE FIRE ANCIENT TREASURE',
    subtitle: 'Exclusive Free Fire Diamonds Top-Up & Special Mystery Vouchers',
    r2Url: 'https://bfda3f43ac31b00be80bcb82772eb8fa.r2.cloudflarestorage.com/mads-topup/hero-slider/hero-1.jpg',
    localUrl: '/hero-slider/hero-1.jpg'
  },
  {
    id: 2,
    title: 'TACTICAL WARFARE SQUAD',
    subtitle: 'Call of Duty & PUBG Mobile UC Direct Account Crediting',
    r2Url: 'https://bfda3f43ac31b00be80bcb82772eb8fa.r2.cloudflarestorage.com/mads-topup/hero-slider/hero-2.jpg',
    localUrl: '/hero-slider/hero-2.jpg'
  },
  {
    id: 3,
    title: 'PUBG BATTLE ROYALE DISPATCH',
    subtitle: 'Automated 24/7 Moongold UC Delivery with 100% LKR Price Guarantee',
    r2Url: 'https://bfda3f43ac31b00be80bcb82772eb8fa.r2.cloudflarestorage.com/mads-topup/hero-slider/hero-3.jpg',
    localUrl: '/hero-slider/hero-3.jpg'
  }
];

export const HeroSection = () => {
  const { openTopup } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const scrollToServices = () => {
    const el = document.getElementById('services-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('game-catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const activeSlideData = HERO_SLIDES[currentSlide];

  return (
    <section className="relative bg-slate-950 text-white min-h-[92vh] flex flex-col justify-between items-center overflow-hidden py-16 px-4 border-b border-red-600/20 bg-cyber-grid">
      
      {/* Dynamic Background Image Slider (Loaded via R2 Bucket with local fallback) */}
      {HERO_SLIDES.map((slide, idx) => (
        <div
          key={slide.id}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out pointer-events-none scale-105 ${
            idx === currentSlide ? 'opacity-40 mix-blend-luminosity' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url('${slide.r2Url}'), url('${slide.localUrl}')`
          }}
        ></div>
      ))}

      {/* Holographic Datastreams & Crimson Laser Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/60 to-slate-950 pointer-events-none"></div>

      {/* Deep Charcoal Aura with Crimson Plasma Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] bg-red-600/20 rounded-full blur-[180px] pointer-events-none animate-pulse"></div>
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-rose-700/20 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Laser Tracing Lines Across UI */}
      <div className="absolute top-12 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent"></div>
      <div className="absolute bottom-20 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent"></div>

      {/* Holographic Crimson Data Displays (Top Left & Top Right Corners) */}
      <div className="hidden lg:flex absolute top-10 left-10 text-[10px] font-mono text-red-500/80 bg-slate-950/80 p-3 rounded-lg border border-red-500/30 backdrop-blur-md space-y-1 z-10 shadow-[0_0_15px_rgba(255,26,60,0.2)]">
        <div className="flex items-center gap-1.5 text-white font-bold">
          <Terminal className="w-3 h-3 text-red-500" />
          <span>SYSTEM_STATUS: ONLINE</span>
        </div>
        <div>R2_BUCKET: mads-topup/hero-slider</div>
        <div>PROT: SECURE_SSL_SHA256</div>
      </div>

      <div className="hidden lg:flex absolute top-10 right-10 text-[10px] font-mono text-red-500/80 bg-slate-950/80 p-3 rounded-lg border border-red-500/30 backdrop-blur-md space-y-1 z-10 shadow-[0_0_15px_rgba(255,26,60,0.2)]">
        <div className="flex items-center gap-1.5 text-white font-bold">
          <Activity className="w-3 h-3 text-red-500" />
          <span>ACTIVE_SLIDE: {currentSlide + 1} / {HERO_SLIDES.length}</span>
        </div>
        <div className="truncate max-w-[200px]">{activeSlideData.title}</div>
        <div>DISCOUNT: 100% VERIFIED</div>
      </div>

      {/* Slider Left / Right Navigation Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-950/80 border border-red-500/40 hover:border-red-500 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 shadow-[0_0_15px_rgba(255,26,60,0.4)]"
      >
        <ChevronLeft className="w-5 h-5 text-red-500" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-950/80 border border-red-500/40 hover:border-red-500 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 shadow-[0_0_15px_rgba(255,26,60,0.4)]"
      >
        <ChevronRight className="w-5 h-5 text-red-500" />
      </button>

      {/* Floating Crimson Diamonds with White Pulse */}
      <div className="absolute top-20 left-16 text-4xl animate-crimson-diamond pointer-events-none select-none">
        💎
      </div>
      <div className="absolute top-32 right-24 text-5xl animate-crimson-diamond pointer-events-none select-none style={{ animationDelay: '1.5s' }}">
        💎
      </div>
      <div className="absolute bottom-32 left-24 text-3xl animate-crimson-diamond pointer-events-none select-none style={{ animationDelay: '2.5s' }}">
        💎
      </div>
      <div className="absolute bottom-40 right-40 text-4xl animate-crimson-diamond pointer-events-none select-none style={{ animationDelay: '0.8s' }}">
        💎
      </div>

      <div className="w-full"></div>

      {/* Main Hero Content */}
      <div className="relative z-10 max-w-5xl text-center space-y-8 my-auto pt-6">
        
        {/* Pill Badge with Glowing Neon Crimson Outline */}
        <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-slate-950/90 border border-red-500/60 backdrop-blur-2xl text-slate-100 text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(255,26,60,0.4)]">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
          <span className="font-mono text-red-400">SRI LANKA'S #1 ULTRA GAMING TOP-UP PLATFORM</span>
        </div>

        {/* Multi-Layered Polished Crimson Metallic Hero Title */}
        <div className="space-y-1">
          <h1 className="text-7xl sm:text-8xl lg:text-9xl font-black font-heading tracking-tighter uppercase leading-none crimson-metallic-text">
            MADS TOPUP
          </h1>
          <p className="text-xs font-mono text-red-400 font-bold uppercase tracking-widest pt-2">
            // {activeSlideData.subtitle}
          </p>
        </div>

        {/* Subtitle */}
        <p className="text-slate-300 text-base sm:text-xl max-w-3xl mx-auto font-semibold leading-relaxed drop-shadow">
          Premium instant game top-ups derived for elite gamers — <strong className="text-white font-extrabold underline decoration-red-500 decoration-2">unbeatable LKR prices</strong>, 24/7 Moongold automated dispatch.
        </p>

        {/* Reimagined Deep Crimson Brushed-Metal Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-5">
          <button
            onClick={scrollToServices}
            className="btn-crimson-plate w-full sm:w-auto px-10 py-4 rounded-xl text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(255,26,60,0.5)] flex items-center justify-center gap-3 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-red-400" />
            <span className="font-mono">EXPLORE SERVICES</span>
          </button>

          <button
            onClick={scrollToCatalog}
            className="btn-crimson-plate w-full sm:w-auto px-10 py-4 rounded-xl text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(255,26,60,0.5)] flex items-center justify-center gap-3 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
            <span className="font-mono">TOP UP NOW</span>
          </button>
        </div>

        {/* Slide Indicators */}
        <div className="flex justify-center items-center gap-2 pt-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === currentSlide
                  ? 'w-8 bg-red-500 shadow-[0_0_10px_#FF1A3C]'
                  : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
            ></button>
          ))}
        </div>

        {/* Guarantee Bullet Tags with Glowing Icons */}
        <div className="pt-4 flex flex-wrap justify-center items-center gap-8 text-xs text-slate-300 font-bold uppercase tracking-wider font-mono">
          <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-red-500/20">
            <CheckCircle2 className="w-4 h-4 text-red-500" />
            <span>Instant Moongold Crediting</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-red-500/20">
            <ShieldCheck className="w-4 h-4 text-red-400" />
            <span>100% Authorized & Safe</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-red-500/20">
            <Sparkles className="w-4 h-4 text-red-500" />
            <span>Best LKR Exchange Rates</span>
          </div>
        </div>

      </div>

      {/* Futuristic Glowing Crimson Scroll Component */}
      <div 
        onClick={scrollToServices}
        className="relative z-10 pt-10 flex flex-col items-center gap-1.5 text-red-500 text-[10px] font-mono font-black uppercase tracking-widest cursor-pointer animate-bounce group"
      >
        <div className="w-8 h-12 rounded-full border-2 border-red-500 flex items-center justify-center shadow-[0_0_15px_rgba(255,26,60,0.6)] group-hover:scale-110 transition-transform">
          <div className="w-1.5 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#FF1A3C]"></div>
        </div>
        <span className="drop-shadow-[0_0_8px_#FF1A3C]">SCROLL DOWN</span>
      </div>
    </section>
  );
};


