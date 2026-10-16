import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { X, Flame, ArrowRight, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { getActivePopupBanners } from '../utils/popupBanners';

// Midasbuy-style event popup: the artwork floats on a dimmed backdrop with NO card behind it
// (transparent PNGs show through), CTA + close button sit underneath.
// Content comes from the admin "Popup Banner" tab (siteConfig/popupAd) via popupAdConfig.
// With more than one banner the popup becomes a slider: swipe, arrows, dots, auto-advance.

export const PopupAdModal = () => {
  const {
    popupAdConfig, openCatalog, setIsWalletModalOpen, openReferralPage,
    openResellerPage, setIsSupportOpen, openTopup, openFfAccountsPage
  } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [brokenImages, setBrokenImages] = useState({});
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [paused, setPaused] = useState(false);
  const dismissedSigRef = useRef(null);
  const dragRef = useRef(null);
  const movedRef = useRef(false);

  const cfg = popupAdConfig || {};
  const banners = getActivePopupBanners(cfg);
  const count = banners.length;
  // Identity of the current ads. Realtime listeners can emit the same config more than once
  // (RTDB + Firestore) — only a genuine content change should re-open a popup the user closed.
  const sig = JSON.stringify([cfg.enabled, banners.map((b) => [b.title, b.description, b.imageUrl, b.buttonText, b.buttonLink, b.badge])]);

  useEffect(() => {
    if (!cfg.enabled || !count) {
      setIsOpen(false);
      return undefined;
    }
    // Once closed, stay closed for this page view, even if a newer copy of the config arrives.
    if (dismissedSigRef.current) return undefined;

    if (cfg.showOncePerSession) {
      try {
        const stored = sessionStorage.getItem('mads_popup_ad_dismissed');
        if (stored === 'true' || stored === sig) return undefined;
      } catch (e) { /* storage blocked — fall through and show */ }
    }

    let cancelled = false;
    let openTimer;
    // show() can be called by the image load AND the 3s safety timer; only the first
    // call may open it, or a popup the user already closed pops up again.
    let shown = false;
    const show = () => {
      if (cancelled || shown) return;
      shown = true;
      openTimer = setTimeout(() => { if (!cancelled && !dismissedSigRef.current) setIsOpen(true); }, 350);
    };

    setBrokenImages({});
    setIndex(0);
    const firstImage = banners[0].imageUrl;
    // Later slides load in the background while the first one is on screen
    banners.slice(1).forEach((b) => { if (b.imageUrl) { const img = new Image(); img.src = b.imageUrl; } });
    if (firstImage) {
      // Wait for the artwork so the popup never pops in half-loaded
      const probe = new Image();
      probe.onload = show;
      probe.onerror = () => { if (!cancelled) setBrokenImages((m) => ({ ...m, [firstImage]: true })); show(); };
      probe.src = firstImage;
      const safety = setTimeout(show, 3000);
      return () => { cancelled = true; clearTimeout(openTimer); clearTimeout(safety); };
    }
    show();
    return () => { cancelled = true; clearTimeout(openTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const handleClose = () => {
    setIsOpen(false);
    dismissedSigRef.current = sig;
    if (cfg.showOncePerSession) {
      try { sessionStorage.setItem('mads_popup_ad_dismissed', sig); } catch (e) { /* ignore */ }
    }
  };

  const go = (dir) => { if (count > 1) setIndex((i) => (i + dir + count) % count); };

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sig, count]);

  // Auto-advance every 5s; stops while hovered, once the visitor swipes, and for reduced motion.
  useEffect(() => {
    if (!isOpen || count < 2 || paused) return undefined;
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
    if (reduce) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearTimeout(t);
  }, [isOpen, count, paused, index]);

  if (!isOpen || !cfg.enabled || !count) return null;
  const current = Math.min(index, count - 1);

  const handleButtonClick = (banner) => {
    const link = banner.buttonLink || '#catalog';
    handleClose();
    if (link === '#catalog' || link === '#games') {
      openCatalog && openCatalog();
    } else if (link === '#wallet' || link === '#deposit') {
      setIsWalletModalOpen && setIsWalletModalOpen(true);
    } else if (link === '#referral') {
      openReferralPage && openReferralPage();
    } else if (link === '#reseller') {
      openResellerPage && openResellerPage();
    } else if (link === '#support') {
      setIsSupportOpen && setIsSupportOpen(true);
    } else if (link === '#ff-accounts') {
      openFfAccountsPage && openFfAccountsPage();
    } else if (link.startsWith('#game:')) {
      const game = GAMES_DATA.find((g) => g.id === link.slice(6));
      if (game && openTopup) openTopup(game); else if (openCatalog) openCatalog();
    } else if (/^https?:\/\//i.test(link)) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else if (openCatalog) {
      openCatalog();
    }
  };

  // Swipe: follow the finger, then snap to the next/previous slide past 50px.
  const onPointerDown = (e) => {
    if (count < 2) return;
    dragRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    movedRef.current = false;
    setPaused(true);
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 6) movedRef.current = true;
    setDragX(dx);
  };
  const onPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (dragX < -50) go(1); else if (dragX > 50) go(-1);
    setDragX(0);
  };
  // A swipe that ends on the artwork must not count as a tap on it.
  const tap = (banner) => { if (!movedRef.current) handleButtonClick(banner); };

  const shadow = { textShadow: '0 2px 14px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)' };
  const active = banners[current];

  const renderSlide = (banner) => {
    const hasImage = Boolean(banner.imageUrl) && !brokenImages[banner.imageUrl];
    const showText = Boolean(banner.title || banner.description || banner.buttonText) || !hasImage;
    return (
      <div className="flex flex-col items-center justify-center w-full">
        {/* Artwork — transparent background, no panel */}
        {hasImage ? (
          <div className="relative inline-block max-w-full">
            {banner.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#2b86ff] text-white font-black text-[10px] uppercase tracking-wider shadow-lg shadow-brand-900/50">
                <Flame className="w-3 h-3" />
                {banner.badge}
              </span>
            )}
            <img
              src={banner.imageUrl}
              alt={banner.title || 'Promo Offer'}
              draggable={false}
              onError={() => setBrokenImages((m) => ({ ...m, [banner.imageUrl]: true }))}
              onClick={() => tap(banner)}
              className={`w-auto max-w-full object-contain cursor-pointer ${showText ? 'max-h-[52vh]' : 'max-h-[70vh]'}`}
              style={{ filter: 'drop-shadow(0 24px 50px rgba(43,134,255,0.45))', animation: 'mpFloat 5s ease-in-out infinite' }}
            />
          </div>
        ) : (
          <div className="relative w-full rounded-[2rem] border border-white/20 bg-white/10 backdrop-blur-xl px-6 py-10 text-center overflow-hidden shadow-2xl shadow-brand-900/30">
            <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-[#2b86ff]/30 blur-3xl pointer-events-none" />
            {banner.badge && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#2b86ff] text-white font-black text-[10px] uppercase tracking-wider shadow-lg shadow-brand-900/50 mb-4">
                <Flame className="w-3 h-3" />
                {banner.badge}
              </span>
            )}
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-[#2b86ff] flex items-center justify-center shadow-lg shadow-brand-900/50">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
        )}

        {/* Text + CTA — floating, no background. Skipped when the artwork carries its own text. */}
        {showText && (
        <div className="mt-4 w-full text-center space-y-2.5">
          {banner.title && (
            <h3 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight leading-snug" style={shadow}>
              {banner.title}
            </h3>
          )}
          {banner.description && (
            <p className="text-xs sm:text-sm font-semibold text-white/90 leading-relaxed max-w-sm mx-auto" style={shadow}>
              {banner.description}
            </p>
          )}

          {(banner.buttonText || !hasImage) && (
          <div className="pt-1 flex justify-center">
            <button
              onClick={() => handleButtonClick(banner)}
              className="relative overflow-hidden px-10 py-3.5 rounded-full bg-gradient-to-r from-[#2f8bff] via-[#2b86ff] to-[#0b5ed7] hover:brightness-110 text-white font-black text-sm tracking-wider uppercase shadow-[0_14px_36px_-10px_rgba(43,134,255,0.9)] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <span className="relative z-10">{banner.buttonText || 'GO'}</span>
              <ArrowRight className="relative z-10 w-4 h-4" />
              <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" style={{ animation: 'mpShine 2.8s ease-in-out infinite' }} />
            </button>
          </div>
          )}
        </div>
        )}
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={active.title || 'Announcement'}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm select-none"
      style={{ animation: 'mpFade 0.3s ease both' }}
    >
      <div
        className="relative flex flex-col items-center w-full max-w-[min(92vw,460px)] max-h-[94vh]"
        style={{ animation: 'mpPop 0.5s cubic-bezier(0.22,1.2,0.36,1) both' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {count === 1 ? renderSlide(active) : (
          <div className="relative w-full">
            <div
              className="w-full overflow-hidden pt-3"
              style={{ touchAction: 'pan-y' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              <div
                className="mp-track flex items-center"
                style={{
                  transform: `translateX(calc(${-current * 100}% + ${dragX}px))`,
                  transition: dragX ? 'none' : 'transform 0.45s cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                {banners.map((b, i) => (
                  <div key={b.id} className="w-full shrink-0 px-1" aria-hidden={i !== current} aria-roledescription="slide" aria-label={`${i + 1} of ${count}`}>
                    {renderSlide(b)}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => go(-1)}
              aria-label="Previous banner"
              className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -left-14 w-10 h-10 rounded-full bg-white/10 hover:bg-[#2b86ff] backdrop-blur-md text-white items-center justify-center border border-white/25 transition-all hover:scale-110 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next banner"
              className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -right-14 w-10 h-10 rounded-full bg-white/10 hover:bg-[#2b86ff] backdrop-blur-md text-white items-center justify-center border border-white/25 transition-all hover:scale-110 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="mt-4 flex items-center justify-center gap-2">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => setIndex(i)}
                  aria-label={`Show banner ${i + 1}`}
                  aria-current={i === current}
                  className={`h-2 rounded-full transition-all cursor-pointer ${i === current ? 'w-6 bg-[#2b86ff]' : 'w-2 bg-white/45 hover:bg-white/70'}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Floating circular close, below the content (Midasbuy style) */}
        <button
          onClick={handleClose}
          aria-label="Close announcement"
          className="mt-5 w-11 h-11 rounded-full bg-white/10 hover:bg-[#2b86ff] backdrop-blur-md text-white flex items-center justify-center border border-white/25 shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer group"
        >
          <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      <style>{`
        @keyframes mpFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mpPop { from { opacity: 0; transform: translateY(24px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes mpFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes mpShine { 0% { transform: translateX(-120%) skewX(-18deg); } 55%, 100% { transform: translateX(380%) skewX(-18deg); } }
        @media (prefers-reduced-motion: reduce) { [style*="mpFloat"], [style*="mpShine"] { animation: none !important; } .mp-track { transition: none !important; } }
      `}</style>
    </div>
  );
};
