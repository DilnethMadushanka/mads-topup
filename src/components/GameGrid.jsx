import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { Sparkles, Zap, ChevronRight, Search, Flame } from 'lucide-react';

export const GameGrid = () => {
  const { searchQuery, setSearchQuery, openTopup, formatPrice } = useApp();
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
    <section id="game-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {/* Catalog Title & Category Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 text-[#00B4D8] text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Select Your Favorite Game</span>
          </div>
          <h2 className="text-4xl font-black text-white font-heading tracking-tight">
            TOP UP GAMES & VOUCHERS
          </h2>
          <p className="text-sm text-slate-400 font-semibold mt-1">
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
                  : 'bg-[#0F172A] text-slate-300 hover:bg-[#1E293B] border border-slate-800'
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
            className="w-full pl-11 pr-4 py-3 bg-[#0F172A] border border-slate-800 rounded-2xl text-sm text-white font-semibold focus:outline-none focus:border-[#00B4D8] shadow-sm"
          />
        </div>
      </div>

      {/* Games Cards Grid */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-20 bg-[#0F172A] rounded-3xl border border-slate-800 shadow-sm">
          <p className="text-slate-400 text-base font-semibold">No games found matching "{searchQuery}"</p>
          <button 
            onClick={() => { setSearchQuery(''); setActiveCategory('ALL'); }}
            className="mt-4 px-5 py-2.5 text-xs font-black bg-[#00B4D8]/20 text-[#00B4D8] border border-[#00B4D8]/30 rounded-xl"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
          {filteredGames.map((game) => {
            const minPrice = Math.min(...game.packages.map(p => p.priceLkr));
            return (
              <div
                key={game.id}
                onClick={() => openTopup(game)}
                className="group relative bg-[#0F172A]/90 rounded-3xl border border-slate-800/80 hover:border-[#00B4D8]/60 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between"
              >
                {/* Banner Artwork */}
                <div className="relative h-48 overflow-hidden bg-slate-950">
                  <img
                    src={game.banner}
                    alt={game.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-transparent"></div>

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full bg-[#00B4D8] text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                      {game.badge}
                    </span>
                  </div>

                  {/* Moongold Sync Tag */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-[10px] font-extrabold text-white">
                    <Zap className="w-3 h-3 text-[#00B4D8] fill-[#00B4D8]" />
                    <span>Moongold</span>
                  </div>

                  {/* Title & Currency Info */}
                  <div className="absolute bottom-3 left-4 right-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl drop-shadow">{game.currencyIcon}</span>
                      <div>
                        <h3 className="text-xl font-black text-white font-heading tracking-tight leading-tight drop-shadow">
                          {game.name}
                        </h3>
                        <p className="text-[11px] text-slate-300 font-bold">
                          {game.publisher} • {game.currencyName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Details & Pricing */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                      Popular Packages
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {game.packages.slice(0, 3).map(p => (
                        <span 
                          key={p.id} 
                          className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 text-xs font-bold border border-slate-800"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Starting from</span>
                      <span className="text-xl font-black text-[#00B4D8] font-heading">
                        {formatPrice(minPrice)}
                      </span>
                    </div>

                    <div className="px-5 py-2.5 rounded-full bg-[#00B4D8] text-white font-black text-xs group-hover:bg-[#0096C7] transition-all flex items-center gap-1 shadow-md shadow-cyan-500/20">
                      <span>Top Up</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

