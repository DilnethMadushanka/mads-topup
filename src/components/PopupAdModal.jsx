import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Sparkles, Flame, ArrowRight } from 'lucide-react';

export const PopupAdModal = () => {
  const { popupAdConfig, openCatalog, setIsWalletModalOpen } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!popupAdConfig || !popupAdConfig.enabled) {
      setIsOpen(false);
      return;
    }

    if (popupAdConfig.showOncePerSession) {
      const closedInSession = sessionStorage.getItem('mads_popup_ad_dismissed');
      if (closedInSession === 'true') {
        setIsOpen(false);
        return;
      }
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [popupAdConfig]);

  if (!isOpen || !popupAdConfig || !popupAdConfig.enabled) return null;

  const handleClose = () => {
    setIsOpen(false);
    if (popupAdConfig.showOncePerSession) {
      sessionStorage.setItem('mads_popup_ad_dismissed', 'true');
    }
  };

  const handleButtonClick = () => {
    handleClose();
    if (popupAdConfig.buttonLink === '#catalog' || popupAdConfig.buttonLink === '#games') {
      if (openCatalog) openCatalog();
    } else if (popupAdConfig.buttonLink === '#wallet' || popupAdConfig.buttonLink === '#deposit') {
      if (setIsWalletModalOpen) setIsWalletModalOpen(true);
    } else if (popupAdConfig.buttonLink && popupAdConfig.buttonLink.startsWith('http')) {
      window.open(popupAdConfig.buttonLink, '_blank', 'noopener,noreferrer');
    } else if (openCatalog) {
      openCatalog();
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      className="fixed inset-0 z-[9999] bg-black/25 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300 select-none"
    >
      {/* MIDASBUY STYLE FLOATING POPUP WRAPPER */}
      <div className="flex flex-col items-center max-w-sm sm:max-w-md w-full animate-in zoom-in-95 duration-300">
        
        {/* CARD CONTENT POSTER */}
        <div className="bg-slate-900 border-2 border-amber-400/40 text-white w-full rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden relative flex flex-col items-center">
          
          {/* TOP BADGE */}
          {popupAdConfig.badge && (
            <div className="absolute top-3 left-3 z-20">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-amber-300 border border-amber-400/50 font-black text-[10px] uppercase tracking-wider shadow-md">
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                {popupAdConfig.badge}
              </span>
            </div>
          )}

          {/* MAIN BANNER POSTER IMAGE */}
          {popupAdConfig.imageUrl && !imgError ? (
            <div className="relative w-full min-h-[200px] max-h-[340px] bg-slate-950 overflow-hidden flex items-center justify-center">
              <img 
                src={popupAdConfig.imageUrl} 
                alt={popupAdConfig.title || 'Promo Offer'} 
                onError={() => setImgError(true)}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
            </div>
          ) : null}

          {/* TEXT OVERLAY / DETAILS */}
          <div className="p-5 sm:p-6 text-center space-y-3 w-full bg-gradient-to-b from-slate-950/90 to-slate-950">
            {popupAdConfig.title && (
              <h3 className="text-lg sm:text-xl font-black text-white font-heading tracking-tight leading-snug">
                {popupAdConfig.title}
              </h3>
            )}

            {popupAdConfig.description && (
              <p className="text-xs font-medium text-slate-300 leading-relaxed max-w-xs mx-auto">
                {popupAdConfig.description}
              </p>
            )}

            {/* MIDASBUY STYLE GOLD/YELLOW CENTERING "GO" BUTTON */}
            <div className="pt-2 flex justify-center">
              <button
                onClick={handleButtonClick}
                className="w-full sm:w-auto px-10 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black text-sm tracking-wider uppercase shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <span>{popupAdConfig.buttonText || 'GO'}</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>
          </div>
        </div>

        {/* MIDASBUY FLOATING CIRCULAR CLOSE BUTTON BELOW THE CARD */}
        <button
          onClick={handleClose}
          aria-label="Close Announcement"
          className="mt-4 w-10 h-10 rounded-full bg-slate-950/90 hover:bg-red-600 text-white flex items-center justify-center border border-slate-700/80 shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer group"
        >
          <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
        </button>

      </div>
    </div>
  );
};
