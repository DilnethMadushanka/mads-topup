import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
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
    <section className="relative overflow-hidden bg-white text-slate-900 dark:text-white! border-b border-slate-200 dark:border-white/5! rounded-b-[2rem] sm:rounded-b-[3rem]">
      {/* Atmosphere */}
      <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-red-50 dark:bg-[#e11d28]/15! dark:blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 -left-32 w-[320px] h-[320px] rounded-full bg-red-50/60 dark:bg-[#e11d28]/10! dark:blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-5 pb-10 sm:pb-14 space-y-4 sm:space-y-5">

        {/* ── BANNER — centred slide with neighbours peeking at the sides ── */}
        <div
          className="relative h-[175px] sm:h-[235px] lg:h-[275px] group select-none"
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
            const offset = (i - current + slides.length) % slides.length; // 0 centre, 1 right, last = left
            const isCenter = offset === 0;
            const isRight = offset === 1;
            const pos = isCenter
              ? 'translate-x-0 scale-100 opacity-100 z-20'
              : isRight
                ? 'translate-x-[88%] sm:translate-x-[92%] scale-[0.88] opacity-45 z-10'
                : '-translate-x-[88%] sm:-translate-x-[92%] scale-[0.88] opacity-45 z-10';
            return (
              <div
                key={sl.src}
                onClick={() => { if (!isCenter) setCurrent(i); }}
                className={`absolute top-0 h-full left-[6%] w-[88%] sm:left-[8%] sm:w-[84%] rounded-[1.25rem] sm:rounded-[1.75rem] overflow-hidden bg-black ring-1 ring-slate-200 dark:ring-white/10! transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${pos} ${isCenter ? 'shadow-[0_25px_60px_-25px_rgba(225,29,40,0.55)]' : 'cursor-pointer'}`}
              >
                <img src={sl.src} alt={sl.label} className="w-full h-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} draggable={false} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                {isCenter && (
                  <div className="absolute left-3 right-3 bottom-3 sm:left-6 sm:right-6 sm:bottom-6 flex items-end justify-between gap-3">
                    <div className="min-w-0 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 px-4 py-3 sm:px-5 sm:py-3.5">
                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#ff5a63]">
                        <Flame className="w-3 h-3" /> Now featuring
                      </span>
                      <h1 className="text-white font-heading font-black tracking-tight text-lg sm:text-3xl leading-tight truncate">{sl.label}</h1>
                      <p className="text-[11px] sm:text-sm text-white/75 font-semibold truncate">{sl.sub}</p>
                    </div>
                    <button
                      onClick={() => openGameById(sl.gameId)}
                      className="shrink-0 h-10 sm:h-12 px-4 sm:px-7 rounded-full bg-[#e11d28] hover:bg-[#c8101b] text-white font-black text-[11px] sm:text-sm uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 shadow-xl shadow-red-900/50 cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      <Zap className="w-3.5 h-3.5 fill-white" />
                      <span className="hidden min-[400px]:inline">Top Up Now</span>
                      <span className="min-[400px]:hidden">Top Up</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={() => go(-1)}
            aria-label="Previous banner"
            className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-[#e11d28] backdrop-blur text-white items-center justify-center border border-white/15 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next banner"
            className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-[#e11d28] backdrop-blur text-white items-center justify-center border border-white/15 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Indicators */}
        <div className="flex items-center justify-center gap-2 -mt-1">
          {slides.map((sl, i) => (
            <button
              key={sl.src}
              onClick={() => setCurrent(i)}
              aria-label={`Show ${sl.label}`}
              className="relative h-1.5 rounded-full overflow-hidden bg-slate-300 dark:bg-white/20! cursor-pointer transition-all duration-500"
              style={{ width: i === current ? 40 : 10 }}
            >
              {i === current && (
                <span className="absolute inset-0 bg-[#e11d28] origin-left" style={{ animation: paused ? 'none' : `heroProgress ${SLIDE_MS}ms linear` }} />
              )}
            </button>
          ))}
        </div>

        {/* ── GAMES — right under the banner, all visible without scrolling ── */}
        <div id="home-games">
          <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
            <h2 className="inline-flex items-center gap-2 text-sm sm:text-lg font-black font-heading tracking-tight shrink-0 text-slate-900 dark:text-white!">
              <span className="w-1.5 h-5 rounded-full bg-[#e11d28]" />
              Select a Game
            </h2>

            <div className="relative w-full max-w-[15rem] sm:max-w-xs">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40!" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search games..."
                className="w-full pl-10 pr-4 py-2 bg-white border-2 border-slate-200 rounded-full text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:border-[#cc040a] focus:ring-4 focus:ring-[#cc040a]/10 dark:bg-white/[0.06]! dark:border-white/10! dark:text-white! dark:placeholder:text-white/35! dark:focus:border-[#e11d28]! dark:focus:ring-[#e11d28]/20! transition-all"
              />
            </div>
          </div>

          {games.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 dark:bg-white/[0.04]! rounded-2xl border border-dashed border-slate-300 dark:border-white/15!">
              <div className="text-3xl mb-1">🎮</div>
              <div className="text-sm font-black text-slate-500 dark:text-white/60!">No games match your search</div>
            </div>
          ) : (
            <div className="grid grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-4">
              {games.map((game) => (
                <button
                  key={game.id}
                  onClick={() => openTopup(game)}
                  title={game.name}
                  className="group relative text-left rounded-xl sm:rounded-2xl bg-white border-2 border-slate-200 hover:border-[#cc040a]/50 shadow-sm hover:shadow-xl hover:shadow-red-600/15 dark:bg-[#14141b]! dark:border-white/10! dark:hover:border-[#e11d28]! dark:shadow-none! dark:hover:shadow-[0_18px_40px_-15px_rgba(225,29,40,0.6)]! overflow-hidden hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-[#1b1b24]!">
                    <img
                      src={game.banner || game.logo}
                      alt={game.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/mads-logo.jpg'; }}
                    />
                    {game.popular && (
                      <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-[#e11d28] text-white text-[8px] sm:text-[10px] font-black uppercase tracking-wide shadow-lg shadow-red-900/40">
                        <Flame className="w-2.5 h-2.5" /> Hot
                      </span>
                    )}
                  </div>

                  <div className="px-1.5 sm:px-3 py-2 sm:py-3 text-center sm:text-left">
                    <h3 className="font-heading font-black text-[10px] sm:text-sm leading-tight line-clamp-2 sm:truncate min-h-[24px] sm:min-h-0 text-slate-900 dark:text-white!">{game.name}</h3>
                    <div className="hidden sm:flex mt-2 items-center justify-between gap-1">
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400! flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Instant
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-black px-2 py-1 rounded-full bg-red-50 text-[#cc040a] group-hover:bg-[#cc040a] group-hover:text-white dark:bg-[#e11d28]/15! dark:text-[#ff5a63]! dark:group-hover:bg-[#e11d28]! dark:group-hover:text-white! transition-colors">
                        Top Up <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Below the first screen: promos, catalog link, trust ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 sm:pt-6">
          {promos.map(({ icon: Icon, title, text, onClick }) => (
            <button
              key={title}
              onClick={onClick}
              className="group relative text-left rounded-2xl bg-white border-2 border-slate-200 hover:border-[#cc040a]/50 shadow-sm hover:shadow-lg hover:shadow-red-600/10 dark:bg-white/[0.04]! dark:border-white/10! dark:hover:border-[#e11d28]/70! dark:shadow-none! p-4 flex items-center gap-4 transition-all cursor-pointer overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-red-50 text-[#cc040a] group-hover:bg-[#cc040a] group-hover:text-white dark:bg-[#e11d28]/15! dark:text-[#ff5a63]! dark:group-hover:bg-[#e11d28]! dark:group-hover:text-white! group-hover:shadow-lg group-hover:shadow-red-600/25 flex items-center justify-center shrink-0 transition-all">
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-black font-heading leading-tight text-slate-900 dark:text-white!">{title}</h3>
                <p className="text-xs text-slate-500 dark:text-white/55! font-medium mt-0.5">{text}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 dark:text-white/30! group-hover:text-[#cc040a] group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={openCatalog}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border-2 border-slate-200 text-slate-700 hover:border-[#cc040a] hover:text-[#cc040a] dark:bg-white/[0.06]! dark:border-white/15! dark:text-white! dark:hover:bg-[#e11d28]! dark:hover:border-[#e11d28]! dark:hover:text-white! font-black text-sm transition-all cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4" />
            View Full Game Catalog
          </button>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {trust.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-4 bg-slate-50 border border-slate-200 dark:bg-white/[0.04]! dark:border-white/10! rounded-2xl px-5 py-4">
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-[#cc040a] dark:bg-[#e11d28]/15! dark:border-transparent! dark:text-[#ff5a63]! flex items-center justify-center shrink-0">
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
