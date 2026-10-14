import React from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { ChevronRight } from 'lucide-react';

// Midasbuy-style "Discover more games" bar: a gently scrolling row of game icons with a
// "N Games >" link to the catalog. Content comes from the admin "Games Bar" tab
// (siteConfig/gameStrip); with no items saved it shows every game in the catalog.
export const GameStripBar = () => {
  const {
    gameStripConfig, openCatalog, openTopup, setIsWalletModalOpen,
    openReferralPage, openResellerPage, setIsSupportOpen,
  } = useApp();

  const cfg = gameStripConfig || {};
  if (cfg.enabled === false) return null;

  const items = (cfg.items && cfg.items.length)
    ? cfg.items
    : GAMES_DATA.map((g) => ({ name: g.name, imageUrl: g.logo || g.banner, link: `#game:${g.id}` }));
  if (!items.length) return null;

  const openLink = (link = '#catalog') => {
    if (link.startsWith('#game:')) {
      const game = GAMES_DATA.find((g) => g.id === link.slice(6));
      if (game) openTopup(game); else openCatalog();
    } else if (link === '#wallet' || link === '#deposit') {
      setIsWalletModalOpen(true);
    } else if (link === '#referral') {
      openReferralPage();
    } else if (link === '#reseller') {
      openResellerPage();
    } else if (link === '#support') {
      setIsSupportOpen(true);
    } else if (/^https?:\/\//i.test(link)) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else if (link.startsWith('/') && !/^\/[\/\\]/.test(link)) {
      window.location.href = link;
    } else {
      openCatalog();
    }
  };

  // Enough icons to fill the row → loop them as a slow marquee; otherwise sit still.
  const scrolls = items.length >= 6;
  const row = scrolls ? [...items, ...items] : items;

  const icon = (it, i) => (
    <button
      key={`${it.imageUrl}-${i}`}
      type="button"
      onClick={() => openLink(it.link)}
      title={it.name}
      aria-label={it.name || 'Game'}
      aria-hidden={scrolls && i >= items.length ? true : undefined}
      tabIndex={scrolls && i >= items.length ? -1 : 0}
      className="midas-strip-icon group shrink-0 cursor-pointer"
    >
      <img
        src={it.imageUrl}
        alt={it.name || ''}
        loading="lazy"
        draggable={false}
        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/mads-logo.jpg'; }}
      />
    </button>
  );

  return (
    <section className="midas-strip relative overflow-hidden rounded-2xl sm:rounded-[1.25rem] border border-slate-200 dark:border-white/10! bg-white dark:bg-transparent!">
      <div className="relative flex items-stretch">
        <div className="min-w-0 flex-1 py-4 sm:py-6">
          <h3 className="midas-heading px-4 sm:px-8 text-[15px] sm:text-xl text-slate-900 dark:text-white!">
            {cfg.title || 'Discover More Games'}
          </h3>
          <div className={`midas-strip-viewport mt-3 sm:mt-5 ${scrolls ? 'is-scrolling' : ''}`}>
            <div
              className="midas-strip-track flex gap-3 sm:gap-6 px-4 sm:px-8"
              style={scrolls ? { animationDuration: `${Math.max(20, items.length * 3.5)}s` } : undefined}
            >
              {row.map(icon)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openCatalog}
          className="group shrink-0 flex items-center gap-1 sm:gap-2 pl-3 pr-3 sm:pl-8 sm:pr-8 my-4 sm:my-6 border-l border-slate-200 dark:border-white/10! cursor-pointer"
        >
          <span className="font-heading font-black text-2xl sm:text-4xl text-[#ff9a1f] leading-none">{items.length}</span>
          <span className="hidden sm:inline text-lg font-semibold text-slate-600 dark:text-white/80! group-hover:text-[#1677ff] dark:group-hover:text-white! transition-colors">Games</span>
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 dark:text-white/70! group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </section>
  );
};
