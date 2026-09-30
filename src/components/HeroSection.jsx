import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Zap, Layers, Play, ArrowRight } from 'lucide-react';

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

  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const trust = [
    { value: '< 2s', label: 'Instant delivery' },
    { value: '24/7', label: 'Automated service' },
    { value: 'UID only', label: 'No password needed' },
  ];

  return (
    <section className="relative bg-[#0d1220] text-white overflow-hidden">
      {/* Background artwork — vivid, with a left-side scrim so text stays readable */}
      {heroImages.map((img, idx) => (
        <div
          key={img.src}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1400ms] ease-in-out pointer-events-none ${
            idx === currentHeroIndex ? 'opacity-90' : 'opacity-0'
          }`}
          style={{ backgroundImage: `url('${img.src}')` }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d1220]/90 via-[#0d1220]/45 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d1220]/30 via-transparent to-[#0d1220]/70 pointer-events-none" />
      <div className="absolute -top-40 -left-32 w-[560px] h-[560px] rounded-full bg-[#cc040a]/25 blur-[160px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at 30% 40%, #000 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 30% 40%, #000 0%, transparent 70%)',
        }}
      />

      {/* Bottom fade into the white page */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ zIndex: 5, height: '140px', background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.6) 70%, #ffffff 100%)' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-32 sm:pt-24 sm:pb-44 lg:pt-28 grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">

        {/* ── LEFT: copy + actions ── */}
        <div className="lg:col-span-7 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200 animate-pop-in delay-100">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-[#cc040a] opacity-70 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-[#cc040a]" />
            </span>
            Sri Lanka&apos;s #1 game top-up platform
          </div>

          {/* Single h1 for SEO */}
          <h1 className="mt-7 font-heading font-black uppercase tracking-[-0.045em] leading-[0.88] animate-pop-in delay-200">
            <span className="block text-[4.25rem] sm:text-[7rem] lg:text-[8.5rem] text-white">MADS</span>
            <span className="block text-[2.75rem] sm:text-[4.5rem] lg:text-[5.5rem] text-[#cc040a] -mt-1 sm:-mt-2">
              TOPUP
            </span>
          </h1>

          <p className="mt-7 max-w-xl mx-auto lg:mx-0 text-base sm:text-lg leading-relaxed text-slate-300 font-medium animate-pop-in delay-400">
            Premium game top-ups at <strong className="text-white font-bold">unbeatable prices</strong>. Instant delivery, trusted by thousands of Sri Lankan gamers.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row sm:items-center justify-center lg:justify-start gap-3 animate-pop-in delay-600">
            {/* Primary */}
            <button
              onClick={openCatalog}
              className="btn-cyan-pill h-14 pl-8 pr-3 text-white font-extrabold text-sm uppercase tracking-[0.08em] flex items-center justify-between sm:justify-center gap-4 cursor-pointer group"
            >
              <span className="flex items-center gap-2.5 relative z-10">
                <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                TOP UP NOW
              </span>
              <span className="relative z-10 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5">
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>

            {/* Secondary pair */}
            <div className="grid grid-cols-2 sm:flex gap-3">
              <button
                onClick={scrollToServices}
                className="h-14 px-5 sm:px-6 rounded-full bg-white/[0.07] hover:bg-white/[0.13] border border-white/15 hover:border-white/30 backdrop-blur-md text-white font-semibold text-[13px] flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <span className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                </span>
                <span className="whitespace-nowrap">Explore Services</span>
              </button>
              <button
                onClick={scrollToHowItWorks}
                className="h-14 px-5 sm:px-6 rounded-full bg-white/[0.07] hover:bg-white/[0.13] border border-white/15 hover:border-white/30 backdrop-blur-md text-white font-semibold text-[13px] flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <span className="w-7 h-7 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                  <Play className="w-3 h-3 fill-current" />
                </span>
                <span className="whitespace-nowrap">How It Works</span>
              </button>
            </div>
          </div>

          {/* Trust strip */}
          <dl className="mt-12 grid grid-cols-3 max-w-lg mx-auto lg:mx-0 divide-x divide-white/10 animate-pop-in delay-800">
            {trust.map((t) => (
              <div key={t.label} className="px-3 first:pl-0 text-center lg:text-left">
                <dt className="font-heading text-xl sm:text-2xl font-extrabold text-white tracking-tight">{t.value}</dt>
                <dd className="mt-0.5 text-[11px] sm:text-xs text-slate-400 font-medium">{t.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ── RIGHT: game showcase ── */}
        <div className="lg:col-span-5 pb-10 lg:pb-0 animate-pop-in delay-400">
          <div className="relative mx-auto w-[72%] max-w-[300px] sm:max-w-[360px] lg:w-full lg:max-w-[440px] aspect-[4/5] -translate-x-3 sm:-translate-x-5 lg:translate-x-0">
            <div className="absolute -inset-4 lg:-inset-6 rounded-[2.5rem] bg-[#cc040a]/20 blur-3xl" />
            {heroImages.map((img, idx) => {
              const offset = (idx - currentHeroIndex + heroImages.length) % heroImages.length;
              const pos = [
                'z-30 translate-x-0 translate-y-0 rotate-0 scale-100 opacity-100',
                'z-20 translate-x-5 sm:translate-x-8 lg:translate-x-10 -translate-y-2 lg:-translate-y-3 rotate-[5deg] scale-[0.92] opacity-70',
                'z-10 translate-x-10 sm:translate-x-16 lg:translate-x-20 -translate-y-4 lg:-translate-y-6 rotate-[10deg] scale-[0.84] opacity-40',
              ][offset];
              return (
                <div
                  key={img.src}
                  className={`absolute inset-0 rounded-[1.5rem] lg:rounded-[2rem] overflow-hidden border border-white/15 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${pos}`}
                >
                  <img src={img.src} alt={img.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1220]/90 via-transparent to-transparent" />
                  <div className="absolute left-4 right-4 bottom-4 lg:left-5 lg:right-5 lg:bottom-5 flex items-end justify-between">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">Now featuring</div>
                      <div className="font-heading text-xl lg:text-2xl font-extrabold tracking-tight">{img.label}</div>
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-[#cc040a] text-[11px] font-bold uppercase tracking-wider shadow-lg shadow-red-900/40">
                      Top up
                    </div>
                  </div>
                </div>
              );
            })}

            {/* slide indicator */}
            <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 lg:translate-x-0 lg:left-0 flex items-center gap-2">
              {heroImages.map((img, idx) => (
                <span
                  key={img.src}
                  className={`h-1 rounded-full transition-all duration-500 ${idx === currentHeroIndex ? 'w-8 bg-[#cc040a]' : 'w-3 bg-white/25'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
