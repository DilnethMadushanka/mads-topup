import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Zap, Layers, MessageCircle } from 'lucide-react';

export const HeroSection = () => {
  const { openCatalog, setIsSupportOpen } = useApp();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroImages = [
    { src: '/uploads/hero_media/hero_freefire.jpg', label: 'Free Fire' },
    { src: '/uploads/hero_media/hero_pubg.jpg',     label: 'PUBG Mobile' },
    { src: '/uploads/hero_media/hero_mlbb.jpg',     label: 'Mobile Legends' },
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
    <section className="relative bg-[#0d1220] text-white min-h-[92vh] flex flex-col justify-between items-center overflow-hidden py-16 px-4">
      {/* Background Artwork Slider - MADS Hero Media */}
      {heroImages.map((img, idx) => (
        <div 
          key={img.src}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out scale-105 pointer-events-none ${
            idx === currentHeroIndex ? 'opacity-60' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url('${img.src}')`
          }}
        ></div>
      ))}

      {/* Ambient Dark Navy Vignette & Red Aura */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d1220]/55 via-[#0d1220]/20 to-[#0d1220]/88 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(700px,100vw)] h-[min(700px,100vw)] bg-[#cc040a]/20 rounded-full blur-[140px] pointer-events-none"></div>

      {/* ── Bottom white fade (inside section, clipped by overflow-hidden) ── */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          zIndex: 5,
          height: '180px',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0.55) 65%, rgba(255,255,255,0.92) 85%, #ffffff 100%)',
        }}
      />

      {/* ── FLOATING GEM DIAMONDS ── */}

      {/* Diamond 1 — top left, large */}
      <div className="absolute top-24 left-10 sm:left-16 pointer-events-none select-none diamond-gem-1 hidden sm:block" style={{ opacity: 0.85 }}>
        <svg width="72" height="80" viewBox="0 0 72 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="36,2 70,26 70,54 36,78 2,54 2,26" fill="url(#d1a)" stroke="rgba(147,197,253,0.6)" strokeWidth="1"/>
          <polygon points="36,2 70,26 36,30" fill="url(#d1b)" opacity="0.9"/>
          <polygon points="36,2 2,26 36,30" fill="url(#d1c)" opacity="0.7"/>
          <polygon points="36,30 70,26 70,54 36,78" fill="url(#d1d)" opacity="0.85"/>
          <polygon points="36,30 2,26 2,54 36,78" fill="url(#d1e)" opacity="0.75"/>
          {/* Inner shine */}
          <polygon points="36,8 58,28 36,26" fill="white" opacity="0.35"/>
          <polygon points="36,8 14,28 36,26" fill="white" opacity="0.15"/>
          <defs>
            <linearGradient id="d1a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#93C5FD"/><stop offset="100%" stopColor="#1D4ED8"/></linearGradient>
            <linearGradient id="d1b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#BFDBFE"/><stop offset="100%" stopColor="#3B82F6"/></linearGradient>
            <linearGradient id="d1c" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60A5FA"/><stop offset="100%" stopColor="#1E3A8A"/></linearGradient>
            <linearGradient id="d1d" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#2563EB"/><stop offset="100%" stopColor="#1E40AF"/></linearGradient>
            <linearGradient id="d1e" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6"/><stop offset="100%" stopColor="#1E3A8A"/></linearGradient>
          </defs>
        </svg>
      </div>

      {/* Diamond 2 — top right, xlarge */}
      <div className="absolute top-16 right-12 sm:right-20 pointer-events-none select-none diamond-gem-2 hidden sm:block" style={{ opacity: 0.9 }}>
        <svg width="90" height="100" viewBox="0 0 90 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="45,3 87,30 87,70 45,97 3,70 3,30" fill="url(#d2a)" stroke="rgba(186,230,253,0.5)" strokeWidth="1"/>
          <polygon points="45,3 87,30 45,36" fill="url(#d2b)" opacity="0.95"/>
          <polygon points="45,3 3,30 45,36" fill="url(#d2c)" opacity="0.65"/>
          <polygon points="45,36 87,30 87,70 45,97" fill="url(#d2d)" opacity="0.8"/>
          <polygon points="45,36 3,30 3,70 45,97" fill="url(#d2e)" opacity="0.7"/>
          <polygon points="45,10 72,33 45,31" fill="white" opacity="0.4"/>
          <polygon points="45,10 18,33 45,31" fill="white" opacity="0.12"/>
          <defs>
            <linearGradient id="d2a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#BAE6FD"/><stop offset="100%" stopColor="#0369A1"/></linearGradient>
            <linearGradient id="d2b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#E0F2FE"/><stop offset="100%" stopColor="#38BDF8"/></linearGradient>
            <linearGradient id="d2c" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7DD3FC"/><stop offset="100%" stopColor="#075985"/></linearGradient>
            <linearGradient id="d2d" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0EA5E9"/><stop offset="100%" stopColor="#0C4A6E"/></linearGradient>
            <linearGradient id="d2e" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38BDF8"/><stop offset="100%" stopColor="#082F49"/></linearGradient>
          </defs>
        </svg>
      </div>

      {/* Diamond 3 — bottom left, medium */}
      <div className="absolute bottom-32 left-8 sm:left-20 pointer-events-none select-none diamond-gem-3 hidden sm:block" style={{ opacity: 0.75 }}>
        <svg width="54" height="60" viewBox="0 0 54 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="27,2 52,18 52,42 27,58 2,42 2,18" fill="url(#d3a)" stroke="rgba(147,197,253,0.5)" strokeWidth="1"/>
          <polygon points="27,2 52,18 27,22" fill="url(#d3b)" opacity="0.9"/>
          <polygon points="27,2 2,18 27,22" fill="url(#d3c)" opacity="0.65"/>
          <polygon points="27,22 52,18 52,42 27,58" fill="url(#d3d)" opacity="0.82"/>
          <polygon points="27,22 2,18 2,42 27,58" fill="url(#d3e)" opacity="0.72"/>
          <polygon points="27,6 44,20 27,20" fill="white" opacity="0.38"/>
          <defs>
            <linearGradient id="d3a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#A5B4FC"/><stop offset="100%" stopColor="#4338CA"/></linearGradient>
            <linearGradient id="d3b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#C7D2FE"/><stop offset="100%" stopColor="#818CF8"/></linearGradient>
            <linearGradient id="d3c" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818CF8"/><stop offset="100%" stopColor="#312E81"/></linearGradient>
            <linearGradient id="d3d" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6366F1"/><stop offset="100%" stopColor="#312E81"/></linearGradient>
            <linearGradient id="d3e" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818CF8"/><stop offset="100%" stopColor="#1E1B4B"/></linearGradient>
          </defs>
        </svg>
      </div>

      {/* Diamond 4 — mid right, small */}
      <div className="absolute top-1/2 right-6 sm:right-10 -translate-y-1/2 pointer-events-none select-none diamond-gem-4 hidden sm:block" style={{ opacity: 0.7 }}>
        <svg width="40" height="46" viewBox="0 0 40 46" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="20,2 38,14 38,32 20,44 2,32 2,14" fill="url(#d4a)" stroke="rgba(186,230,253,0.4)" strokeWidth="1"/>
          <polygon points="20,2 38,14 20,17" fill="url(#d4b)" opacity="0.9"/>
          <polygon points="20,2 2,14 20,17" fill="url(#d4c)" opacity="0.6"/>
          <polygon points="20,17 38,14 38,32 20,44" fill="url(#d4d)" opacity="0.8"/>
          <polygon points="20,17 2,14 2,32 20,44" fill="url(#d4e)" opacity="0.7"/>
          <polygon points="20,5 32,15 20,15" fill="white" opacity="0.4"/>
          <defs>
            <linearGradient id="d4a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#67E8F9"/><stop offset="100%" stopColor="#0891B2"/></linearGradient>
            <linearGradient id="d4b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#A5F3FC"/><stop offset="100%" stopColor="#22D3EE"/></linearGradient>
            <linearGradient id="d4c" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22D3EE"/><stop offset="100%" stopColor="#0E7490"/></linearGradient>
            <linearGradient id="d4d" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0891B2"/><stop offset="100%" stopColor="#083344"/></linearGradient>
            <linearGradient id="d4e" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06B6D4"/><stop offset="100%" stopColor="#083344"/></linearGradient>
          </defs>
        </svg>
      </div>

      {/* Diamond 5 — top center-right, tiny */}
      <div className="absolute top-10 left-1/2 ml-20 pointer-events-none select-none diamond-gem-5 hidden sm:block" style={{ opacity: 0.65 }}>
        <svg width="30" height="34" viewBox="0 0 30 34" fill="none">
          <polygon points="15,2 28,10 28,24 15,32 2,24 2,10" fill="url(#d5a)" stroke="rgba(147,197,253,0.4)" strokeWidth="0.8"/>
          <polygon points="15,2 28,10 15,13" fill="white" opacity="0.5"/>
          <polygon points="15,2 2,10 15,13" fill="white" opacity="0.2"/>
          <defs>
            <linearGradient id="d5a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#93C5FD"/><stop offset="100%" stopColor="#1E40AF"/></linearGradient>
          </defs>
        </svg>
      </div>

      {/* Diamond 6 — bottom right, medium */}
      <div className="absolute bottom-24 right-12 sm:right-24 pointer-events-none select-none diamond-gem-6 hidden sm:block" style={{ opacity: 0.65 }}>
        <svg width="48" height="55" viewBox="0 0 48 55" fill="none">
          <polygon points="24,2 46,16 46,39 24,53 2,39 2,16" fill="url(#d6a)" stroke="rgba(186,230,253,0.45)" strokeWidth="1"/>
          <polygon points="24,2 46,16 24,20" fill="url(#d6b)" opacity="0.9"/>
          <polygon points="24,2 2,16 24,20" fill="url(#d6c)" opacity="0.6"/>
          <polygon points="24,20 46,16 46,39 24,53" fill="url(#d6d)" opacity="0.8"/>
          <polygon points="24,20 2,16 2,39 24,53" fill="url(#d6e)" opacity="0.7"/>
          <polygon points="24,5 38,17 24,18" fill="white" opacity="0.38"/>
          <defs>
            <linearGradient id="d6a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#BAE6FD"/><stop offset="100%" stopColor="#0369A1"/></linearGradient>
            <linearGradient id="d6b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#E0F2FE"/><stop offset="100%" stopColor="#38BDF8"/></linearGradient>
            <linearGradient id="d6c" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7DD3FC"/><stop offset="100%" stopColor="#075985"/></linearGradient>
            <linearGradient id="d6d" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0EA5E9"/><stop offset="100%" stopColor="#0C4A6E"/></linearGradient>
            <linearGradient id="d6e" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38BDF8"/><stop offset="100%" stopColor="#082F49"/></linearGradient>
          </defs>
        </svg>
      </div>

      <div className="w-full"></div>

      {/* Hero Central Content */}
      <div className="relative z-10 max-w-4xl text-center space-y-7 my-auto pt-4">
        
        {/* Top Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-[#cc040a]/40 backdrop-blur-xl text-slate-200 text-[10px] font-black uppercase tracking-widest shadow-xl animate-pop-in delay-100">
          <span className="w-2 h-2 rounded-full bg-[#cc040a] animate-pulse shadow-[0_0_8px_#cc040a]"></span>
          <span className="font-mono text-slate-100">SRI LANKA'S #1 GAME TOP-UP PLATFORM</span>
        </div>

        {/* Hero Title: White MADS + Red TOPUP — single h1 for SEO */}
        <div className="space-y-0">
          <h1 className="font-black font-heading tracking-tighter uppercase leading-none">

            {/* MADS — bigger, white with strong text-shadow highlight */}
            <span className="block text-6xl sm:text-9xl lg:text-[10rem] text-white hero-mads-text">
              MADS
            </span>

            {/* TOPUP — smaller than MADS, red with strong text-shadow highlight */}
            <span className="block text-4xl sm:text-6xl lg:text-8xl text-[#cc040a] hero-topup-text" style={{ marginTop: '-0.05em' }}>
              TOPUP
            </span>
          </h1>
        </div>

        <style>{`
          /* ── MADS: entrance then white glow breathe ─────── */
          .hero-mads-text {
            -webkit-text-stroke: 2px rgba(255,255,255,0.15);
            animation: hero-mads-enter 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.3s both,
                       hero-mads-glow  4s ease-in-out 1s infinite;
          }

          @keyframes hero-mads-enter {
            from { opacity: 0; transform: translateY(18px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0)    scale(1); }
          }

          @keyframes hero-mads-glow {
            0%, 100% {
              text-shadow:
                2px 2px 0px rgba(0,0,0,1),
                0 4px 8px rgba(0,0,0,1),
                0 8px 24px rgba(0,0,0,0.95),
                0 16px 48px rgba(0,0,0,0.85),
                0 0 60px rgba(255,255,255,0.22);
            }
            50% {
              text-shadow:
                2px 2px 0px rgba(0,0,0,1),
                0 4px 8px rgba(0,0,0,1),
                0 8px 24px rgba(0,0,0,0.95),
                0 16px 48px rgba(0,0,0,0.85),
                0 0 90px rgba(255,255,255,0.45),
                0 0 140px rgba(255,255,255,0.18);
            }
          }

          /* ── TOPUP: entrance then red glow pulse ────────── */
          .hero-topup-text {
            -webkit-text-stroke: 1px rgba(120,0,0,0.4);
            animation: hero-topup-enter 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.45s both,
                       hero-topup-pulse 3s ease-in-out 1.2s infinite;
          }

          @keyframes hero-topup-enter {
            from { opacity: 0; transform: translateY(18px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0)    scale(1); }
          }

          @keyframes hero-topup-pulse {
            0%, 100% {
              text-shadow:
                2px 2px 0px rgba(0,0,0,1),
                0 4px 10px rgba(0,0,0,1),
                0 10px 28px rgba(0,0,0,0.95),
                0 20px 50px rgba(0,0,0,0.85),
                0 0 40px rgba(204,4,10,0.7),
                0 0 80px rgba(204,4,10,0.4);
            }
            50% {
              text-shadow:
                2px 2px 0px rgba(0,0,0,1),
                0 4px 10px rgba(0,0,0,1),
                0 10px 28px rgba(0,0,0,0.95),
                0 20px 50px rgba(0,0,0,0.85),
                0 0 65px rgba(204,4,10,1),
                0 0 120px rgba(204,4,10,0.7),
                0 0 200px rgba(204,4,10,0.3);
            }
          }
        `}</style>

        {/* Subtitle */}
        <p className="text-slate-300 text-sm sm:text-xl max-w-2xl mx-auto font-semibold leading-relaxed drop-shadow animate-pop-in delay-600">
          Premium game top-ups at <strong className="text-white font-extrabold">unbeatable prices</strong> — instant delivery, trusted by thousands of Sri Lankan gamers.
        </p>

        {/* Action Buttons (Signature Red Theme) */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 animate-pop-in delay-800">
          <button
            onClick={scrollToServices}
            className="btn-cyan-pill w-full sm:w-auto px-8 py-3.5 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-0.5 transition-all"
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

      {/* Mouse Scroll Indicator */}
      <div 
        onClick={scrollToServices}
        className="relative z-10 pt-8 flex flex-col items-center gap-1.5 text-slate-400 hover:text-[#cc040a] text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors animate-bounce"
      >
        <div className="w-6 h-10 rounded-full border-2 border-slate-400 flex items-start justify-center p-1">
          <div className="w-1.5 h-2.5 bg-[#cc040a] rounded-full animate-pulse"></div>
        </div>
        <span className="text-[9px] tracking-widest font-mono text-slate-300">SCROLL</span>
      </div>

    </section>
  );
};





