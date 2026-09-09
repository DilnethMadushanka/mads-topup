import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Zap, Layers, ShieldCheck, Sparkles, CheckCircle2, ChevronLeft, ChevronRight, Gem } from 'lucide-react';

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
    <section className="relative bg-[#F8F9FA] text-gray-900 min-h-[88vh] flex flex-col justify-between items-center overflow-hidden py-16 px-4 border-b border-gray-200 bg-clean-grid">
      
      {/* Dynamic Background Image Slider (Subtle Luminous High-Key Overlay) */}
      {HERO_SLIDES.map((slide, idx) => (
        <div
          key={slide.id}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out pointer-events-none scale-105 ${
            idx === currentSlide ? 'opacity-15 mix-blend-multiply' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url('${slide.r2Url}'), url('${slide.localUrl}')`
          }}
        ></div>
      ))}

      {/* Soft White Luminous Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#F8F9FA]/60 via-[#F8F9FA]/90 to-[#F8F9FA] pointer-events-none"></div>

      {/* Floating Small Faceted Ruby Gem Micro-Elements */}
      <div className="absolute top-16 left-16 text-2xl animate-ruby-gem pointer-events-none select-none text-[#E50914] drop-shadow-sm">
        🔻
      </div>
      <div className="absolute top-28 right-24 text-3xl animate-ruby-gem pointer-events-none select-none text-[#E50914] drop-shadow-sm style={{ animationDelay: '1.2s' }}">
        ♦️
      </div>
      <div className="absolute bottom-28 left-20 text-2xl animate-ruby-gem pointer-events-none select-none text-[#E50914] drop-shadow-sm style={{ animationDelay: '2.4s' }}">
        🔻
      </div>
      <div className="absolute bottom-36 right-36 text-3xl animate-ruby-gem pointer-events-none select-none text-[#E50914] drop-shadow-sm style={{ animationDelay: '0.8s' }}">
        ♦️
      </div>

      {/* Slider Left / Right Navigation Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 border border-gray-300 hover:border-[#E50914] text-gray-800 flex items-center justify-center shadow-sm transition-all hover:scale-105"
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 border border-gray-300 hover:border-[#E50914] text-gray-800 flex items-center justify-center shadow-sm transition-all hover:scale-105"
      >
        <ChevronRight className="w-5 h-5 text-gray-700" />
      </button>

      <div className="w-full"></div>

      {/* Main Hero Content */}
      <div className="relative z-10 max-w-4xl text-center space-y-7 my-auto pt-4">
        
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-200 shadow-xs text-xs font-black uppercase tracking-widest text-gray-800">
          <span className="w-2 h-2 rounded-full bg-[#E50914] animate-pulse"></span>
          <span className="font-mono text-gray-700">SRI LANKA'S #1 ESPORTS TOP-UP GATEWAY</span>
        </div>

        {/* Clean Hero Header: Bold Graphite & Crimson Red (No Neon Blur) */}
        <div className="space-y-2">
          <h1 className="text-6xl sm:text-7xl lg:text-9xl font-black font-heading tracking-tight uppercase leading-none clean-hero-title">
            MADS <span className="clean-hero-red">TOPUP</span>
          </h1>
          <p className="text-xs font-mono text-gray-500 font-bold uppercase tracking-widest pt-1">
            // {activeSlideData.subtitle}
          </p>
        </div>

        {/* Subtitle */}
        <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
          Pristine, instant gaming store derived for Sri Lankan players — <strong className="text-gray-900 font-extrabold underline decoration-[#E50914] decoration-2">unbeatable LKR rates</strong> & 24/7 automated delivery.
        </p>

        {/* Clean Call-to-Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={scrollToCatalog}
            className="btn-crimson-solid w-full sm:w-auto px-9 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>TOP UP NOW</span>
          </button>

          <button
            onClick={scrollToServices}
            className="btn-clean-outline w-full sm:w-auto px-9 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-gray-700" />
            <span>EXPLORE SERVICES</span>
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
                  ? 'w-7 bg-[#E50914]'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
            ></button>
          ))}
        </div>

        {/* Guarantee Bullet Tags */}
        <div className="pt-4 flex flex-wrap justify-center items-center gap-6 text-xs text-gray-600 font-bold uppercase tracking-wider font-mono">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-[#E50914]" />
            <span>Instant Auto Crediting</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-[#E50914]" />
            <span>100% Authorized & Safe</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs">
            <Sparkles className="w-4 h-4 text-[#E50914]" />
            <span>Best LKR Exchange Rates</span>
          </div>
        </div>

      </div>

      {/* Minimalist Scroll Component */}
      <div 
        onClick={scrollToServices}
        className="relative z-10 pt-8 flex flex-col items-center gap-1 text-gray-400 hover:text-[#E50914] text-[10px] font-mono font-bold uppercase tracking-widest cursor-pointer transition-colors"
      >
        <span className="text-[9px]">SCROLL DOWN</span>
      </div>
    </section>
  );
};



