import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { Zap, ShieldCheck, Clock, Flame, ChevronRight, Award, CheckCircle2 } from 'lucide-react';

export const HeroSlider = () => {
  const { openTopup } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 'freefire',
      title: 'FREE FIRE DIAMONDS',
      subtitle: '⚡ Instant Auto Delivery via Moongold API',
      discount: '10% EXTRA BONUS DIAMONDS',
      badge: 'TOP SELLING SRI LANKA',
      game: GAMES_DATA.find(g => g.id === 'freefire_sg' || g.id === 'freefire'),
      bgGradient: 'from-slate-900 via-red-950 to-slate-900',
      accentColor: '#FF1A3C'
    },
    {
      id: 'pubg',
      title: 'PUBG MOBILE UC',
      subtitle: '🔥 24/7 Automated Character ID Top-Up',
      discount: 'ROYALE PASS SPECIAL RATES',
      badge: 'BEST LKR PRICES',
      game: GAMES_DATA.find(g => g.id === 'pubg'),
      bgGradient: 'from-slate-900 via-amber-950 to-slate-900',
      accentColor: '#F59E0B'
    },
    {
      id: 'bloodstrike',
      title: 'BLOOD STRIKE & DELTA FORCE',
      subtitle: '⚡ Instant Gold & Delta Coins Refill',
      discount: 'STRIKE PASS & SPECIAL RATES',
      badge: 'POPULAR FPS GAMES',
      game: GAMES_DATA.find(g => g.id === 'bloodstrike'),
      bgGradient: 'from-slate-900 via-emerald-950 to-slate-900',
      accentColor: '#10B981'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[currentSlide];

  return (
    <div className="relative overflow-hidden bg-slate-900 text-white py-12 md:py-16 px-4">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-rose-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero Text */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
              <Flame className="w-4 h-4 fill-red-400" />
              <span>{slide.badge}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight font-heading leading-tight">
              FASTEST <span className="text-red-500 underline decoration-red-500/40 decoration-wavy">GAME TOP-UP</span> IN SRI LANKA
            </h1>

            <p className="text-slate-300 text-base sm:text-lg max-w-2xl font-normal">
              Direct Moongold API integration for 100% automated 24/7 delivery. Top-up Free Fire Diamonds, PUBG Mobile UC, and Mobile Legends instantly.
            </p>

            {/* Slide Action Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 max-w-xl">
              <div>
                <span className="text-xs font-bold text-red-400 uppercase tracking-wide block">{slide.discount}</span>
                <span className="text-lg font-extrabold text-white font-heading">{slide.title}</span>
              </div>

              <button
                onClick={() => openTopup(slide.game)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-sm hover:from-red-500 hover:to-rose-500 transition-all shadow-lg shadow-red-600/40 flex items-center justify-center gap-2 group"
              >
                <span>TOP UP NOW</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Feature Bullets */}
            <div className="pt-2 flex flex-wrap justify-center lg:justify-start items-center gap-6 text-xs text-slate-300 font-medium">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-red-400" />
                <span>Instant Auto Credit</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span>100% Safe & Authorized</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>24/7 WhatsApp Support</span>
              </div>
            </div>
          </div>

          {/* Right Game Visual Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md bg-gradient-to-b from-slate-800 to-slate-900 p-6 rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/30 rounded-full blur-2xl"></div>

              {/* Game Badge */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{slide.game?.currencyIcon}</span>
                  <span className="font-extrabold text-white font-heading text-lg">{slide.game?.name}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase">
                  Moongold API
                </span>
              </div>

              {/* Package Preview List */}
              <div className="space-y-2 mb-5">
                {slide.game?.packages.slice(0, 3).map((pkg) => (
                  <div 
                    key={pkg.id} 
                    onClick={() => openTopup(slide.game)}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-white/10 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-sm text-white">{pkg.name}</div>
                      <div className="text-[11px] text-red-400 font-semibold">{pkg.bonus}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm text-white">Rs. {pkg.priceLkr}</div>
                      <div className="text-[10px] text-slate-400">Instant</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => openTopup(slide.game)}
                className="w-full py-3 rounded-xl bg-white text-slate-900 font-extrabold text-sm hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
              >
                <span>Select {slide.game?.name} Packages</span>
                <ChevronRight className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                currentSlide === index ? 'w-8 bg-red-600' : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
