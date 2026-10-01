import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { X, Flame, ArrowRight, Sparkles } from 'lucide-react';

// Midasbuy-style event popup: the artwork floats on a dimmed backdrop with NO card behind it
// (transparent PNGs show through), CTA + close button sit underneath.
// Content comes from the admin "Popup Banner" tab (siteConfig/popupAd) via popupAdConfig.
export const PopupAdModal = () => {
  const {
    popupAdConfig, openCatalog, setIsWalletModalOpen, openReferralPage,
    openResellerPage, setIsSupportOpen, openTopup
  } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dismissedSigRef = useRef(null);

  const cfg = popupAdConfig || {};
  // Identity of the current ad. Realtime listeners can emit the same config more than once
  // (RTDB + Firestore) — only a genuine content change should re-open a popup the user closed.
  const sig = JSON.stringify([cfg.enabled, cfg.title, cfg.description, cfg.imageUrl, cfg.buttonText, cfg.buttonLink, cfg.badge]);

  useEffect(() => {
    if (!cfg.enabled) {
      setIsOpen(false);
      return undefined;
    }
    if (dismissedSigRef.current === sig) return undefined;

    if (cfg.showOncePerSession) {
      try {
        const stored = sessionStorage.getItem('mads_popup_ad_dismissed');
        if (stored === 'true' || stored === sig) return undefined;
      } catch (e) { /* storage blocked — fall through and show */ }
    }

    let cancelled = false;
    let openTimer;
    const show = () => { if (!cancelled) { openTimer = setTimeout(() => !cancelled && setIsOpen(true), 350); } };

    setImgError(false);
    if (cfg.imageUrl) {
      // Wait for the artwork so the popup never pops in half-loaded
      const probe = new Image();
      probe.onload = show;
      probe.onerror = () => { if (!cancelled) setImgError(true); show(); };
      probe.src = cfg.imageUrl;
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

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sig]);

  if (!isOpen || !cfg.enabled) return null;

  const handleButtonClick = () => {
    const link = cfg.buttonLink || '#catalog';
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
    } else if (link.startsWith('#game:')) {
      const game = GAMES_DATA.find((g) => g.id === link.slice(6));
      if (game && openTopup) openTopup(game); else if (openCatalog) openCatalog();
    } else if (/^https?:\/\//i.test(link)) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else if (openCatalog) {
      openCatalog();
    }
  };

  const hasImage = Boolean(cfg.imageUrl) && !imgError;
  const shadow = { textShadow: '0 2px 14px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)' };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={cfg.title || 'Announcement'}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm select-none"
      style={{ animation: 'mpFade 0.3s ease both' }}
    >
      <div
        className="relative flex flex-col items-center w-full max-w-[min(92vw,460px)] max-h-[94vh]"
        style={{ animation: 'mpPop 0.5s cubic-bezier(0.22,1.2,0.36,1) both' }}
      >
        {/* Artwork — transparent background, no panel */}
        {hasImage ? (
          <div className="relative inline-block max-w-full">
            {cfg.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#e11d28] text-white font-black text-[10px] uppercase tracking-wider shadow-lg shadow-red-900/50">
                <Flame className="w-3 h-3" />
                {cfg.badge}
              </span>
            )}
            <img
              src={cfg.imageUrl}
              alt={cfg.title || 'Promo Offer'}
              draggable={false}
              onError={() => setImgError(true)}
              className="w-auto max-w-full max-h-[56vh] object-contain"
              style={{ filter: 'drop-shadow(0 24px 50px rgba(225,29,40,0.45))', animation: 'mpFloat 5s ease-in-out infinite' }}
            />
          </div>
        ) : (
          <div className="relative w-full rounded-[2rem] border border-white/20 bg-white/10 backdrop-blur-xl px-6 py-10 text-center overflow-hidden shadow-2xl shadow-red-900/30">
            <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-[#e11d28]/30 blur-3xl pointer-events-none" />
            {cfg.badge && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#e11d28] text-white font-black text-[10px] uppercase tracking-wider shadow-lg shadow-red-900/50 mb-4">
                <Flame className="w-3 h-3" />
                {cfg.badge}
              </span>
            )}
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-[#e11d28] flex items-center justify-center shadow-lg shadow-red-900/50">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
        )}

        {/* Text + CTA — floating, no background */}
        <div className="mt-4 w-full text-center space-y-2.5">
          {cfg.title && (
            <h3 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight leading-snug" style={shadow}>
              {cfg.title}
            </h3>
          )}
          {cfg.description && (
            <p className="text-xs sm:text-sm font-semibold text-white/90 leading-relaxed max-w-sm mx-auto" style={shadow}>
              {cfg.description}
            </p>
          )}

          <div className="pt-1 flex justify-center">
            <button
              onClick={handleButtonClick}
              className="relative overflow-hidden px-10 py-3.5 rounded-full bg-gradient-to-r from-[#ef1c25] via-[#e11d28] to-[#b8060d] hover:brightness-110 text-white font-black text-sm tracking-wider uppercase shadow-[0_14px_36px_-10px_rgba(225,29,40,0.9)] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <span className="relative z-10">{cfg.buttonText || 'GO'}</span>
              <ArrowRight className="relative z-10 w-4 h-4" />
              <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" style={{ animation: 'mpShine 2.8s ease-in-out infinite' }} />
            </button>
          </div>
        </div>

        {/* Floating circular close, below the content (Midasbuy style) */}
        <button
          onClick={handleClose}
          aria-label="Close announcement"
          className="mt-5 w-11 h-11 rounded-full bg-white/10 hover:bg-[#e11d28] backdrop-blur-md text-white flex items-center justify-center border border-white/25 shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer group"
        >
          <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      <style>{`
        @keyframes mpFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mpPop { from { opacity: 0; transform: translateY(24px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes mpFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes mpShine { 0% { transform: translateX(-120%) skewX(-18deg); } 55%, 100% { transform: translateX(380%) skewX(-18deg); } }
        @media (prefers-reduced-motion: reduce) { [style*="mpFloat"], [style*="mpShine"] { animation: none !important; } }
      `}</style>
    </div>
  );
};
