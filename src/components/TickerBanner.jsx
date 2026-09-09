import React from 'react';

export const TickerBanner = () => {
  const items = [
    'INSTANT FREE FIRE TOP-UPS',
    'GARENA SHELLS AVAILABLE',
    'PUBG MOBILE UC',
    'BLOOD STRIKE & DELTA FORCE',
    'FAST & SECURE',
    'AVAILABLE WORLDWIDE',
    '24/7 SUPPORT',
    "SRI LANKA'S #1 CHOICE"
  ];

  return (
    <div className="bg-white text-slate-800 py-3.5 overflow-hidden border-y border-slate-200/80 relative select-none shadow-xs">
      <div className="animate-marquee whitespace-nowrap text-xs font-black tracking-widest uppercase flex items-center gap-8 font-mono">
        {[...items, ...items, ...items, ...items].map((text, index) => (
          <span key={index} className="flex items-center gap-8">
            <span className="text-[#00B4D8] animate-pulse">•</span>
            <span className="hover:text-[#00B4D8] transition-colors">{text}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
