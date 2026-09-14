import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Sparkles, ExternalLink, Zap, ArrowRight, ShieldCheck, Flame } from 'lucide-react';

export const PopupAdModal = () => {
  const { popupAdConfig, openCatalog, setIsWalletModalOpen } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!popupAdConfig || !popupAdConfig.enabled) {
      setIsOpen(false);
      return;
    }

    // Check session storage if showOncePerSession is enabled
    if (popupAdConfig.showOncePerSession) {
      const closedInSession = sessionStorage.getItem('mads_popup_ad_dismissed');
      if (closedInSession === 'true') {
        setIsOpen(false);
        return;
      }
    }

    // Small delay for smooth entry animation after site load
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 600);

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
      className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
    >
      
      {/* MODAL CARD */}
      <div className="bg-slate-900 border border-red-500/30 text-white w-full max-w-lg rounded-3xl shadow-2xl shadow-red-600/20 overflow-hidden relative flex flex-col transform transition-all">
        
        {/* CLOSE BUTTON (X Icon at top right) */}
        <button
          onClick={handleClose}
          aria-label="Close Announcement"
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-950/70 text-slate-300 hover:text-white hover:bg-red-600/90 flex items-center justify-center transition-all duration-200 border border-slate-700/60 shadow-lg cursor-pointer group"
        >
          <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        {/* IMAGE BANNER HEADER */}
        {popupAdConfig.imageUrl && !imgError ? (
          <div className="relative w-full h-48 sm:h-56 overflow-hidden bg-slate-950 group">
            <img 
              src={popupAdConfig.imageUrl} 
              alt={popupAdConfig.title || 'Special Announcement'} 
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700"
            />
            {/* Dark overlay gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-transparent"></div>

            {/* BADGE ON IMAGE */}
            {popupAdConfig.badge && (
              <div className="absolute top-4 left-4 z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#cc040a] to-[#990207] text-white font-extrabold text-[11px] uppercase tracking-wider shadow-lg shadow-red-600/30 border border-red-400/40 animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  {popupAdConfig.badge}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* FALLBACK BANNER IF NO IMAGE */
          <div className="relative w-full h-36 bg-gradient-to-br from-red-950 via-slate-900 to-slate-950 p-6 flex flex-col justify-end border-b border-red-500/20">
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/30 text-red-300 font-extrabold text-xs uppercase tracking-wider border border-red-500/40">
                <Sparkles className="w-3.5 h-3.5" />
                {popupAdConfig.badge || 'ANNOUNCEMENT'}
              </span>
            </div>
          </div>
        )}

        {/* CONTENT BODY */}
        <div className="p-6 sm:p-7 space-y-4 text-center">
          {popupAdConfig.title && (
            <h3 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight leading-snug">
              {popupAdConfig.title}
            </h3>
          )}

          {popupAdConfig.description && (
            <p className="text-xs sm:text-sm font-medium text-slate-300 leading-relaxed max-w-md mx-auto">
              {popupAdConfig.description}
            </p>
          )}

          {/* ACTION BUTTON & DISMISS OPTIONS */}
          <div className="pt-3 space-y-3">
            <button
              onClick={handleButtonClick}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#cc040a] via-red-600 to-[#990207] hover:from-[#990207] hover:to-[#cc040a] text-white font-black text-sm sm:text-base tracking-wide rounded-2xl shadow-xl shadow-red-600/30 hover:shadow-red-600/50 flex items-center justify-center gap-2.5 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer active:translate-y-0"
            >
              <span>{popupAdConfig.buttonText || 'Explore Deals'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleClose}
              className="text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors py-1 px-4 cursor-pointer inline-block"
            >
              Close Announcement
            </button>
          </div>
        </div>

        {/* BOTTOM ACCENT BAR */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600"></div>
      </div>
    </div>
  );
};
