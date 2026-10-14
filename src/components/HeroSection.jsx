import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { GameStripBar } from './GameStripBar';
import {
  Zap, ArrowRight, ChevronLeft, ChevronRight, Wallet, Gift, Headphones,
  Search, Flame, ShieldCheck, Clock, Fingerprint, LayoutGrid
} from 'lucide-react';

// Midasbuy-style landing (works in both modes: white + red, or dark stage + red):
// wide banner + thumbnail selector, quick promos, then square game cards to top up in one tap.
export const HeroSection = () => {
  const { openCatalog, openTopup, openWalletModal, openReferralPage, setIsSupportOpen } = useApp();

  const slides = [
    { src: '/uploads/hero_media/hero_freefire.jpg', label: 'Free Fire', sub: 'Diamonds · Instant delivery', gameId: 'freefire_sg' },
    { src: '/uploads/hero_media/hero_pubg.jpg',     label: 'PUBG Mobile', sub: 'UC · Instant delivery', gameId: 'pubg' },
    { src: '/uploads/hero_media/hero_mlbb.jpg',     label: 'Mobile Legends', sub: 'Diamonds · Instant delivery', gameId: 'mobilelegends' },
  ];
  const SLIDE_MS = 5000;

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState('');
  const touchStartX = useRef(null);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => setCurrent((p) => (p + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, current]);

  const go = (dir) => setCurrent((p) => (p + dir + slides.length) % slides.length);

  const openGameById = (id) => {
    const game = GAMES_DATA.find((g) => g.id === id);
    if (game) openTopup(game);
    else openCatalog();
  };

  const games = GAMES_DATA.filter((g) => {
    if (!g) return false;
    const q = query.trim().toLowerCase();
    const matchesQ = !q || String(g.name || '').toLowerCase().includes(q) || String(g.publisher || '').toLowerCase().includes(q) || String(g.currencyName || '').toLowerCase().includes(q);
    return matchesQ;
  });

  const promos = [
    { icon: Wallet, title: 'Recharge Wallet', text: 'EZ Cash, Binance or Bank', onClick: () => openWalletModal('ezcash') },
    { icon: Gift, title: 'Refer & Earn', text: '1.5% cashback rewards', onClick: openReferralPage },
    { icon: Headphones, title: '24/7 Support', text: 'Live chat & tickets', onClick: () => setIsSupportOpen(true) },
  ];

  const trust = [
    { icon: Clock, value: '< 2s', label: 'Instant delivery' },
    { icon: ShieldCheck, value: '24/7', label: 'Automated service' },
    { icon: Fingerprint, value: 'UID only', label: 'No password needed' },
  ];

  return (
    <section className="relative overflow-hidden bg-white dark:bg-transparent! text-slate-900 dark:text-white!">
      {/* Atmosphere */}
      <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-brand-50 dark:bg-[#2b86ff]/15! dark:blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 -left-32 w-[320px] h-[320px] rounded-full bg-brand-50/60 dark:bg-[#2b86ff]/10! dark:blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-5 pb-10 sm:pb-14 space-y-4 sm:space-y-5">

        {/* ── BANNER — Midasbuy-style wide banner: artwork left, blue panel right ── */}
        <div
          className="midas-banner relative h-[190px] sm:h-[280px] lg:h-[330px] rounded-[1.25rem] sm:rounded-[1.75rem] overflow-hidden select-none group"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; setPaused(true); }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - (touchStartX.current ?? e.changedTouches[0].clientX);
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
            touchStartX.current = null;
            setPaused(false);
          }}
        >
          {slides.map((sl, i) => {
            const isCenter = i === current;
            return (
              <div
                key={sl.src}
                aria-hidden={!isCenter}
                className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${isCenter ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-[1.04] z-0 pointer-events-none'}`}
              >
                {/* artwork */}
                <img src={sl.src} alt={sl.label} className="absolute inset-y-0 left-0 w-full sm:w-[68%] h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} draggable={false} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#06123a]/90 via-[#06123a]/20 to-transparent sm:hidden" />

                {/* blue slanted panel */}
                <div className="midas-banner-panel hidden sm:flex absolute inset-y-0 right-0 w-[46%] flex-col justify-center pl-[11%] pr-10 lg:pr-16">
                  <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 border border-white/25 text-[10px] lg:text-[11px] font-black uppercase tracking-[0.18em] text-white">
                    <Flame className="w-3 h-3" /> Now featuring
                  </span>
                  <h2 className="mt-3 text-white font-heading font-black tracking-tight text-3xl lg:text-[2.6rem] leading-[1.05]">{sl.label}</h2>
                  <p className="mt-2 text-sm lg:text-lg text-white/85 font-semibold">{sl.sub}</p>
                  <button
                    onClick={() => openGameById(sl.gameId)}
                    tabIndex={isCenter ? 0 : -1}
                    className="mt-5 lg:mt-7 w-fit h-11 lg:h-12 px-7 lg:px-9 rounded-full bg-[#ffffff] text-[#1264e6] hover:bg-[#eaf3ff] font-black text-sm lg:text-base uppercase tracking-wider flex items-center gap-2 shadow-[0_12px_30px_-10px_rgba(0,20,80,0.7)] cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    <Zap className="w-4 h-4 fill-[#1264e6]" />
                    Top Up Now
                  </button>
                </div>

                {/* mobile caption */}
                <div className="sm:hidden absolute left-3 right-3 bottom-3 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#8dc2ff]">
                      <Flame className="w-3 h-3" /> Now featuring
                    </span>
                    <h2 className="text-white font-heading font-black tracking-tight text-xl leading-tight truncate">{sl.label}</h2>
                    <p className="text-[11px] text-white/80 font-semibold truncate">{sl.sub}</p>
                  </div>
                  <button
                    onClick={() => openGameById(sl.gameId)}
                    tabIndex={isCenter ? 0 : -1}
                    className="shrink-0 h-9 px-4 rounded-full bg-[#ffffff] text-[#1264e6] font-black text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-lg cursor-pointer active:scale-[0.98]"
                  >
                    <Zap className="w-3.5 h-3.5 fill-[#1264e6]" />
                    Top Up
                  </button>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => go(-1)}
            aria-label="Previous banner"
            className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-9 h-14 rounded-lg bg-[#06123a]/70 hover:bg-[#1677ff] backdrop-blur text-white items-center justify-center border border-white/10 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next banner"
            className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-9 h-14 rounded-lg bg-[#06123a]/70 hover:bg-[#1677ff] backdrop-blur text-white items-center justify-center border border-white/10 cursor-pointer transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Indicators — inside the banner, like a media player */}
          <div className="absolute z-30 top-2.5 right-2.5 sm:top-auto sm:right-auto sm:bottom-4 sm:left-[34%] sm:-translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/45 backdrop-blur">
            {slides.map((sl, i) => (
              <button
                key={sl.src}
                onClick={() => setCurrent(i)}
                aria-label={`Show ${sl.label}`}
                className="relative h-1.5 rounded-full overflow-hidden bg-white/35 cursor-pointer transition-all duration-500"
                style={{ width: i === current ? 28 : 6 }}
              >
                {i === current && (
                  <span className="absolute inset-0 bg-white origin-left" style={{ animation: paused ? 'none' : `heroProgress ${SLIDE_MS}ms linear` }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── GAMES — right under the banner, all visible without scrolling ── */}
        <div id="home-games" className="pt-4 sm:pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-8">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="midas-heading text-2xl sm:text-[2rem] text-slate-900 dark:text-white!">All Games<span className="sr-only"> – Free Fire Diamonds, PUBG UC &amp; Mobile Legends Top Up in Sri Lanka</span></h1>
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 dark:text-white/70!">
                <ShieldCheck className="w-4 h-4 text-[#1677ff] dark:text-[#8dc2ff]!" />
                Sri Lanka's trusted instant top-up store
              </span>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50!" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search games..."
                className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:border-[#1677ff] focus:ring-4 focus:ring-[#1677ff]/10 dark:bg-[#0a1a4a]/70! dark:border-white/10! dark:text-white! dark:placeholder:text-white/45! dark:focus:border-[#2b86ff]! dark:focus:ring-[#2b86ff]/20! transition-all"
              />
            </div>
          </div>

          {games.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 dark:bg-white/[0.04]! rounded-2xl border border-dashed border-slate-300 dark:border-white/15!">
              <div className="text-3xl mb-1">🎮</div>
              <div className="text-sm font-black text-slate-500 dark:text-white/60!">No games match your search</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-5 sm:gap-x-6 sm:gap-y-8 px-1 sm:px-2">
              {games.map((game) => (
                <button
                  key={game.id}
                  onClick={() => openTopup(game)}
                  title={game.name}
                  className="midas-game group text-left cursor-pointer"
                >
                  <span className="midas-game-frame">
                    <span className="midas-game-art">
                      <img
                        src={game.banner || game.logo}
                        alt={game.name}
                        loading="lazy"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/mads-logo.jpg'; }}
                      />
                    </span>
                    <span className={`midas-ribbon ${game.popular ? 'is-hot' : ''}`}>
                      {game.popular ? <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> : <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />}
                      <span>{game.popular ? 'Hot deal' : 'Instant'}</span>
                    </span>
                  </span>
                  <span className="mt-2 sm:mt-3 block text-center font-heading font-extrabold text-[11px] sm:text-[15px] leading-tight line-clamp-2 text-slate-800 dark:text-white! group-hover:text-[#1677ff] dark:group-hover:text-[#8dc2ff]! transition-colors">{game.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Discover more games icon bar (admin: Games Bar tab) ── */}
        <div className="pt-6 sm:pt-10">
          <GameStripBar />
        </div>

        {/* ── Below the first screen: promos, catalog link, trust ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 sm:pt-6">
          {promos.map(({ icon: Icon, title, text, onClick }) => (
            <button
              key={title}
              onClick={onClick}
              className="group relative text-left rounded-2xl bg-white border-2 border-slate-200 hover:border-[#1677ff]/50 shadow-sm hover:shadow-lg hover:shadow-brand-600/10 dark:bg-white/[0.04]! dark:border-white/10! dark:hover:border-[#2b86ff]/70! dark:shadow-none! p-4 flex items-center gap-4 transition-all cursor-pointer overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-[#1677ff] group-hover:bg-[#1677ff] group-hover:text-white dark:bg-[#2b86ff]/15! dark:text-[#5aa8ff]! dark:group-hover:bg-[#2b86ff]! dark:group-hover:text-white! group-hover:shadow-lg group-hover:shadow-brand-600/25 flex items-center justify-center shrink-0 transition-all">
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-black font-heading leading-tight text-slate-900 dark:text-white!">{title}</h3>
                <p className="text-xs text-slate-500 dark:text-white/55! font-medium mt-0.5">{text}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 dark:text-white/30! group-hover:text-[#1677ff] group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={openCatalog}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border-2 border-slate-200 text-slate-700 hover:border-[#1677ff] hover:text-[#1677ff] dark:bg-white/[0.06]! dark:border-white/15! dark:text-white! dark:hover:bg-[#2b86ff]! dark:hover:border-[#2b86ff]! dark:hover:text-white! font-black text-sm transition-all cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4" />
            View Full Game Catalog
          </button>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {trust.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-4 bg-slate-50 border border-slate-200 dark:bg-white/[0.04]! dark:border-white/10! rounded-2xl px-5 py-4">
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-[#1677ff] dark:bg-[#2b86ff]/15! dark:border-transparent! dark:text-[#5aa8ff]! flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <dt className="font-heading text-xl font-black tracking-tight leading-none text-slate-900 dark:text-white!">{value}</dt>
                <dd className="mt-1 text-xs text-slate-500 dark:text-white/50! font-semibold">{label}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      <style>{`@keyframes heroProgress { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
    </section>
  );
};
