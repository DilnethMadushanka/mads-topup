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
    <div className="bg-slate-900 text-white py-3.5 overflow-hidden border-y border-slate-800 relative select-none">
      <div className="animate-marquee whitespace-nowrap text-xs font-black tracking-widest uppercase flex items-center gap-8">
        {[...items, ...items, ...items, ...items].map((text, index) => (
          <span key={index} className="flex items-center gap-8">
            <span className="text-red-500">•</span>
            <span className="hover:text-red-400 transition-colors">{text}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
