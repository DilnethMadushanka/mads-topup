import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { Sparkles, Zap, ChevronRight, Search, Flame, ArrowLeft } from 'lucide-react';

export const GameGrid = () => {
  const { searchQuery, setSearchQuery, openTopup, formatPrice, closeCatalog } = useApp();
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
    <section id="game-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back to Home Button & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <button
          onClick={closeCatalog}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-800 hover:bg-slate-100 font-extrabold text-xs border border-slate-200 cursor-pointer transition-all shadow-xs w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-[#00B4D8]" />
          <span>Back to Main Home</span>
        </button>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-4 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search games & vouchers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#00B4D8] shadow-xs"
          />
        </div>
      </div>

      {/* Catalog Title & Category Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 text-[#00B4D8] text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Select Your Favorite Game</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 font-heading tracking-tight">
            TOP UP GAMES & VOUCHERS
          </h2>
          <p className="text-sm text-slate-600 font-semibold mt-1">
            Choose a game to top up diamonds, UC, or Battle Passes with 24/7 instant crediting.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#00B4D8] text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-xs'
              }`}
            >
              {cat === 'POPULAR' && '🔥 '}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden mb-8">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 font-semibold focus:outline-none focus:border-[#00B4D8] shadow-xs"
          />
        </div>
      </div>

      {/* Games Cards Grid (Matching Nova TopUp Reference Screenshot) */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-slate-600 text-base font-semibold">No games found matching "{searchQuery}"</p>
          <button 
            onClick={() => { setSearchQuery(''); setActiveCategory('ALL'); }}
            className="mt-4 px-5 py-2.5 text-xs font-black bg-[#00B4D8]/20 text-[#00B4D8] border border-[#00B4D8]/30 rounded-xl cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {filteredGames.map((game) => {
            return (
              <div
                key={game.id}
                onClick={() => openTopup(game)}
                className="group relative bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between"
              >
                {/* Poster Artwork Area */}
                <div className="relative aspect-square overflow-hidden bg-slate-950 flex items-center justify-center">
                  <img
                    src={game.banner}
                    alt={game.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95 group-hover:opacity-100"
                  />

                  {/* Active Status Badge (Top Right) */}
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

                  {/* Garena Flame Logo (Bottom Right) */}
                  {game.publisher === 'Garena' && (
                    <div className="absolute bottom-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white shadow-md p-1 flex items-center justify-center border border-slate-100">
                      <span className="text-red-600 font-bold text-xs">🔥</span>
                    </div>
                  )}
                </div>

                {/* Bottom Title Bar */}
                <div className="p-3 bg-white text-center border-t border-slate-100 flex items-center justify-center min-h-[46px]">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 font-heading tracking-tight leading-tight group-hover:text-[#00B4D8] transition-colors truncate">
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

