import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { Sparkles, Zap, Search, ShieldCheck, Headphones, ArrowLeft, ArrowRight } from 'lucide-react';
import { TopSpendersSection } from './TopSpendersSection';

export const GameGrid = () => {
  const { searchQuery, setSearchQuery, openTopup, closeCatalog } = useApp();
  const [activeCategory, setActiveCategory] = useState('ALL');

  const categories = ['ALL', 'POPULAR', 'Battle Royale', 'MOBA', 'FPS'];

  const filteredGames = GAMES_DATA.filter(game => {
    if (!game) return false;
    const q = (searchQuery || '').toLowerCase();
    const gName = String(game.name || '').toLowerCase();
    const gPub = String(game.publisher || '').toLowerCase();
    const gCur = String(game.currencyName || '').toLowerCase();

    const matchesSearch = !q || gName.includes(q) || gPub.includes(q) || gCur.includes(q);
    
    if (!matchesSearch) return false;

    if (activeCategory === 'ALL') return true;
    if (activeCategory === 'POPULAR') return game.popular;
    return game.category === activeCategory;
  });

  // Main games are shown large on top; everything else stays in the regular grid.
  const FEATURED_IDS = ['freefire_sg', 'pubg', 'mobilelegends'];
  const featuredGames = FEATURED_IDS.map(id => filteredGames.find(g => g.id === id)).filter(Boolean);
  const otherGames = filteredGames.filter(g => !FEATURED_IDS.includes(g.id));

  return (
    <section id="game-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-12">
      {/* Top Bar: Back to Home Button */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={closeCatalog}
          className="group inline-flex items-center gap-2 h-10 pl-3 pr-5 rounded-full bg-white text-slate-800 hover:text-[#1677ff] font-bold text-[13px] border border-slate-200 hover:border-[#1677ff]/30 cursor-pointer transition-all shadow-sm"
        >
          <span className="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center group-hover:-translate-x-0.5 transition-transform">
            <ArrowLeft className="w-3.5 h-3.5 text-[#1677ff]" />
          </span>
          <span>Back to Main Home</span>
        </button>
      </div>

      {/* HERO BANNER */}
      <div className="relative rounded-[2rem] sm:rounded-[2.5rem] bg-[#0D1322] text-white px-5 py-8 sm:px-14 sm:py-16 text-center overflow-hidden shadow-[0_30px_70px_-30px_rgba(13,19,34,0.8)] border border-white/5 mb-6 sm:mb-12">

        {/* Background artwork + ambience */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
          style={{ backgroundImage: `url('/uploads/hero_media/hero_03f995f15258.webp')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0D1322]/70 via-[#0D1322]/60 to-[#0D1322] pointer-events-none"></div>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[320px] rounded-full bg-[#1677ff]/25 blur-[110px] pointer-events-none"></div>
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse at 50% 30%, #000 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, #000 0%, transparent 70%)',
          }}
        ></div>

        <div className="relative z-10 max-w-3xl mx-auto">

          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.07] backdrop-blur-md border border-white/15 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-70 animate-ping"></span>
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </span>
            Instant automated delivery
          </span>

          <h1 className="mt-4 sm:mt-6 text-3xl sm:text-6xl font-extrabold font-heading text-white tracking-tight leading-[1.05]">
            Sri Lankan <span className="text-[#1677ff]">Diamond</span> Store
          </h1>
          <p className="mt-3 sm:mt-4 text-[13px] sm:text-base font-medium text-slate-300 max-w-xl mx-auto leading-relaxed">
            Buy Free Fire, Mobile Legends & PUBG diamonds in Sri Lanka - fast, secure, instant delivery.
          </p>

          <div className="mt-7 hidden sm:flex items-center justify-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.07] border border-white/10 text-xs font-semibold text-slate-200">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              5-Sec Delivery
            </span>
            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.07] border border-white/10 text-xs font-semibold text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              100% Secure
            </span>
            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.07] border border-white/10 text-xs font-semibold text-slate-200">
              <Headphones className="w-3.5 h-3.5 text-purple-400" />
              24/7 Support
            </span>
          </div>

          {/* Search */}
          <div className="mt-5 sm:mt-9">
            <div className="relative w-full max-w-xl mx-auto group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#1677ff]/40 to-violet-500/30 blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
              <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
              <input
                type="text"
                placeholder="Search games (e.g. Free Fire)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="relative w-full pl-14 pr-6 h-12 sm:h-14 bg-white text-slate-900 placeholder:text-slate-400 rounded-full text-sm font-semibold shadow-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/25 transition-all"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Section heading + category filter */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 sm:gap-5 mb-5 sm:mb-8">
        <div>
          <span className="section-badge">— CHOOSE YOUR GAME —</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-heading tracking-tight leading-tight">
            Popular Games
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 font-medium hidden sm:block">
            Select from {GAMES_DATA.length} Games available below — instant, secure top-up in seconds.
          </p>
        </div>

        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-slate-100 border border-slate-200/70">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`h-9 px-4 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-[#1677ff] text-white shadow-md shadow-brand-500/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                {cat === 'POPULAR' && '🔥 '}
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GAMES GRID */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <p className="mt-5 text-slate-700 text-base font-semibold">No games found matching "{searchQuery}"</p>
          <button
            onClick={() => { setSearchQuery(''); setActiveCategory('ALL'); }}
            className="mt-5 px-6 h-11 text-[13px] font-bold bg-[#1677ff]/10 hover:bg-[#1677ff] text-[#1677ff] hover:text-white border border-[#1677ff]/25 rounded-full cursor-pointer transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* FEATURED — the three main games, shown large */}
          {featuredGames.length > 0 && (
            <div className="mb-7 sm:mb-10">
              <div className="flex items-center gap-3 mb-3 sm:mb-5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1677ff]">
                  <Sparkles className="w-3.5 h-3.5" /> Featured
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-[#1677ff]/25 to-transparent"></span>
              </div>

              <div className="flex sm:grid sm:grid-cols-3 gap-3 sm:gap-6 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none scroll-pl-4 -mx-4 px-4 sm:mx-0 sm:px-0 pb-3 sm:pb-0 scrollbar-none">
                {featuredGames.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => openTopup(game)}
                    className="group relative shrink-0 w-[58%] min-[460px]:w-[42%] sm:w-auto snap-start rounded-[1.5rem] sm:rounded-[1.75rem] overflow-hidden cursor-pointer bg-slate-900 border border-slate-200/70 shadow-[0_2px_4px_rgba(15,23,42,0.05),0_24px_48px_-24px_rgba(15,23,42,0.35)] hover:shadow-[0_40px_70px_-28px_rgba(22,119,255,0.5)] hover:-translate-y-2.5 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden">
                      {/* blurred copy fills the transparent rounded corners of the icon art */}
                      <img src={game.banner} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-150 blur-2xl saturate-150" />
                      <img
                        src={game.banner}
                        alt={game.name}
                        className="relative w-full h-full object-cover group-hover:scale-110 transition-transform duration-[900ms] ease-out"
                      />

                      {/* scrims */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none"></div>
                      <div className="absolute inset-0 bg-gradient-to-br from-[#1677ff]/0 via-transparent to-[#1677ff]/0 group-hover:to-[#1677ff]/25 transition-all duration-500 pointer-events-none"></div>

                      {/* glossy sweep */}
                      <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:left-[130%] transition-[left] duration-[1000ms] ease-out pointer-events-none z-10"></div>

                      {/* badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 sm:top-4 sm:left-4 sm:right-4 z-20 flex items-start justify-between">
                        <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/25 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.14em]">
                          {game.popular ? '🔥 Popular' : 'Featured'}
                        </span>
                        <span className="inline-flex items-center gap-1 bg-emerald-500/95 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-md uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                          ACTIVE
                        </span>
                      </div>

                      {/* details */}
                      <div className="absolute inset-x-0 bottom-0 z-20 p-3.5 sm:p-6">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                          {game.flag && <span className="text-sm normal-case">{game.flag}</span>}
                          <span className="truncate">{game.publisher}</span>
                        </div>
                        <h3 className="mt-1 sm:mt-1.5 font-heading text-[15px] sm:text-2xl font-extrabold text-white tracking-tight leading-tight line-clamp-2">
                          {game.name}
                        </h3>
                        <div className="mt-2.5 sm:mt-4 flex items-center justify-between gap-3">
                          <span className="hidden sm:inline text-xs font-medium text-white/60">{game.currencyName}</span>
                          <span className="inline-flex items-center gap-1.5 h-8 sm:h-10 pl-3 sm:pl-4 pr-2 sm:pr-3 rounded-full bg-[#1677ff] group-hover:bg-white text-white group-hover:text-[#1677ff] text-xs sm:text-[13px] font-bold shadow-lg shadow-brand-900/40 transition-colors duration-300">
                            Top up now
                            <span className="w-5 h-5 rounded-full bg-white/20 group-hover:bg-[#1677ff]/10 flex items-center justify-center group-hover:translate-x-0.5 transition-all">
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All other games */}
          {otherGames.length > 0 && (
            <>
              {featuredGames.length > 0 && (
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">More games</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-slate-300 to-transparent"></span>
                </div>
              )}
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-5 sm:gap-x-6 sm:gap-y-8 px-1 sm:px-2">
                {otherGames.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => openTopup(game)}
                    title={game.name}
                    className="midas-game group text-left cursor-pointer"
                  >
                    <span className="midas-game-frame">
                      <span className="midas-game-art">
                        <img src={game.banner} alt={game.name} loading="lazy" />
                      </span>
                      {game.flag && (
                        <span className="absolute top-2 right-3 z-[3] text-[11px] leading-none bg-white/90 px-1.5 py-1 rounded-md shadow-sm">{game.flag}</span>
                      )}
                      <span className={`midas-ribbon ${game.popular ? 'is-hot' : ''}`}>
                        <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                        <span className="truncate">{game.currencyName || 'Instant'}</span>
                      </span>
                    </span>
                    <span className="mt-2 sm:mt-3 block text-center font-heading font-extrabold text-[11px] sm:text-[15px] leading-tight line-clamp-2 text-slate-800 group-hover:text-[#1677ff] transition-colors">{game.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Top Spenders Leaderboard */}
      <TopSpendersSection />

    </section>
  );
};
