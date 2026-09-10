import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { Sparkles, Zap, Search, ShieldCheck, Headphones, ArrowLeft } from 'lucide-react';

export const GameGrid = () => {
  const { searchQuery, setSearchQuery, openTopup, closeCatalog } = useApp();
  const [activeCategory, setActiveCategory] = useState('ALL');

  const categories = ['ALL', 'POPULAR', 'Battle Royale', 'MOBA', 'FPS'];

  const filteredGames = GAMES_DATA.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          game.publisher.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          game.currencyName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeCategory === 'ALL') return true;
    if (activeCategory === 'POPULAR') return game.popular;
    return game.category === activeCategory;
  });

  return (
    <section id="game-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Top Bar: Back to Home Button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={closeCatalog}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-800 hover:bg-slate-100 font-extrabold text-xs border border-slate-200 cursor-pointer transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#cc040a]" />
          <span>Back to Main Home</span>
        </button>
      </div>

      {/* HERO BANNER CARD (Matching Reference Screenshot 100%) */}
      <div className="relative rounded-[2.5rem] bg-gradient-to-r from-[#0D1322] via-[#162038] to-[#0D1322] text-white p-8 sm:p-14 text-center overflow-hidden shadow-2xl border border-slate-800/80 mb-10">
        
        {/* Background Artwork Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none mix-blend-overlay"
          style={{ backgroundImage: `url('/uploads/hero_media/hero_03f995f15258.jpg')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1322] via-transparent to-[#0D1322]/80 pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          
          {/* Top Badge */}
          <div>
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest font-mono shadow-sm">
              ⚡ INSTANT AUTOMATED DELIVERY
            </span>
          </div>

          {/* Main Heading & Sub-heading */}
          <div>
            <h1 className="text-4xl sm:text-6xl font-black font-heading text-white tracking-tight leading-none">
              Game Top-Up Center
            </h1>
            <p className="text-xs sm:text-base font-semibold text-slate-300 max-w-xl mx-auto mt-2.5">
              The fastest & most secure way to top up your favourite games.
            </p>
          </div>

          {/* Feature Pills Row */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-extrabold text-slate-200">
              ⚡ 5-Sec Delivery
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-extrabold text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              100% Secure
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-extrabold text-slate-200">
              <Headphones className="w-3.5 h-3.5 text-purple-400" />
              24/7 Support
            </span>
          </div>

          {/* Sub-Header Divider */}
          <div className="pt-2">
            <span className="text-[10px] sm:text-xs font-mono font-black text-slate-400 uppercase tracking-widest block mb-1">
              — CHOOSE YOUR GAME —
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-heading tracking-tight">
              Popular Games
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-semibold mt-1">
              Select from {GAMES_DATA.length} Games available below — instant, secure top-up in seconds.
            </p>
          </div>

          {/* Centered Large White Search Bar (Matching Screenshot) */}
          <div className="pt-2">
            <div className="relative w-full max-w-xl mx-auto">
              <Search className="w-5 h-5 absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search games (e.g. Free Fire)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 sm:pl-14 pr-6 py-3.5 sm:py-4 bg-white text-slate-900 placeholder:text-slate-400 rounded-full text-xs sm:text-sm font-bold shadow-2xl focus:outline-none focus:ring-4 focus:ring-red-500/30 transition-all"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Category Pills Filter Row */}
      <div className="flex items-center justify-between gap-4 mb-8 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#cc040a] text-white shadow-lg shadow-red-500/30'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-xs'
              }`}
            >
              {cat === 'POPULAR' && '🔥 '}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* GAMES CARDS GRID (Matching Reference Screenshot 100%) */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-slate-600 text-base font-semibold">No games found matching "{searchQuery}"</p>
          <button 
            onClick={() => { setSearchQuery(''); setActiveCategory('ALL'); }}
            className="mt-4 px-5 py-2.5 text-xs font-black bg-[#cc040a]/15 text-[#cc040a] border border-[#cc040a]/30 rounded-xl cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
          {filteredGames.map((game) => {
            return (
              <div
                key={game.id}
                onClick={() => openTopup(game)}
                className="group relative bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between"
              >
                {/* Poster Artwork Area */}
                <div className="relative aspect-square overflow-hidden bg-slate-100 flex items-center justify-center">
                  <img
                    src={game.banner}
                    alt={game.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Active Status Badge (Top Right - Matching Screenshot) */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                      ACTIVE
                    </span>
                  </div>

                  {/* Flag Badge (Top Left) */}
                  {game.flag && (
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="text-xs bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded-md shadow-sm border border-white">
                        {game.flag}
                      </span>
                    </div>
                  )}

                  {/* Garena Flame Logo (Bottom Right - Matching Screenshot) */}
                  {game.publisher === 'Garena' && (
                    <div className="absolute bottom-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white shadow-md p-1 flex items-center justify-center border border-slate-100">
                      <span className="text-red-600 font-bold text-xs">🔥</span>
                    </div>
                  )}
                </div>

                {/* Bottom Title Bar (Matching Screenshot) */}
                <div className="p-3 bg-white text-center border-t border-slate-100 flex items-center justify-center min-h-[46px]">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 font-heading tracking-tight leading-tight group-hover:text-[#cc040a] transition-colors truncate">
                    {game.name}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
