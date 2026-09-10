import React from 'react';
import { useApp } from '../context/AppContext';

export const TickerBanner = () => {
  const { tickerNotice } = useApp();

  const items = [
    tickerNotice || 'INSTANT FREE FIRE TOP-UPS',
    'GARENA SHELLS AVAILABLE 24/7',
    'PUBG MOBILE UC INSTANT DELIVERY',
    'EZ CASH & BINANCE PAY SUPPORTED'
  ];

  return (
    <div className="bg-white text-slate-800 py-3.5 overflow-hidden border-y border-slate-200/80 relative select-none shadow-xs">
      <div className="animate-marquee whitespace-nowrap text-xs font-black tracking-widest uppercase flex items-center gap-8 font-mono">
        {[...items, ...items, ...items, ...items].map((text, index) => (
          <span key={index} className="flex items-center gap-8">
            <span className="text-[#cc040a] animate-pulse">•</span>
            <span className="hover:text-[#cc040a] transition-colors">{text}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
