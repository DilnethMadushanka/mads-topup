import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Flame, Clock, Sparkles, Copy, Check, Tag } from 'lucide-react';

export const LaunchPromoBanner = () => {
  const { showToast } = useApp();
  const [copiedCode, setCopiedCode] = useState('');

  // 24-Hour Timer countdown
  const [timeLeft, setTimeLeft] = useState(() => {
    let launchTime = localStorage.getItem('mads_launch_timer_start');
    if (!launchTime) {
      launchTime = Date.now().toString();
      localStorage.setItem('mads_launch_timer_start', launchTime);
    }
    const startTime = parseInt(launchTime, 10);
    const duration = 24 * 60 * 60 * 1000; // 24 hours
    const elapsed = Date.now() - startTime;
    return Math.max(0, duration - elapsed);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      h: String(hours).padStart(2, '0'),
      m: String(minutes).padStart(2, '0'),
      s: String(seconds).padStart(2, '0')
    };
  };

  const timeObj = formatTime(timeLeft);

  const handleCopyCode = (code, desc) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Copied Promo Code: ${code} (${desc})`);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  if (timeLeft <= 0) return null;

  return (
    <div className="bg-gradient-to-r from-red-700 via-rose-600 to-amber-600 text-white py-2.5 px-4 shadow-md border-b border-red-500/40 relative z-30 select-none font-sans">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        
        {/* Left Title & Timer */}
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white font-extrabold uppercase text-[10px] tracking-wider border border-white/30 backdrop-blur-md animate-pulse">
            <Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
            <span>24H LAUNCH SALE</span>
          </span>

          <span className="font-extrabold text-slate-100 hidden sm:inline">•</span>

          {/* Live Timer */}
          <div className="flex items-center gap-1 font-mono font-extrabold text-amber-200 bg-black/20 px-2.5 py-1 rounded-lg border border-amber-400/30">
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span>Ends In:</span>
            <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded text-[11px] font-black">{timeObj.h}h</span>
            <span>:</span>
            <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded text-[11px] font-black">{timeObj.m}m</span>
            <span>:</span>
            <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded text-[11px] font-black">{timeObj.s}s</span>
          </div>
        </div>

        {/* Promo Codes & Offers */}
        <div className="flex items-center gap-2.5 flex-wrap justify-center text-[11px] font-bold">
          
          {/* WELCOME50 Pill */}
          <button
            onClick={() => handleCopyCode('WELCOME50', 'Rs. 50 OFF on Rs. 1000+')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-red-700 hover:bg-amber-50 font-black cursor-pointer shadow-xs transition-all active:scale-95 border border-red-200"
          >
            <Tag className="w-3 h-3 text-red-600" />
            <span>WELCOME50 (Rs. 50 OFF)</span>
            {copiedCode === 'WELCOME50' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
          </button>

          {/* LAUNCH100 Pill */}
          <button
            onClick={() => handleCopyCode('LAUNCH100', 'Rs. 100 OFF on Rs. 2500+')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 hover:bg-amber-300 font-black cursor-pointer shadow-xs transition-all active:scale-95 border border-amber-300"
          >
            <Sparkles className="w-3 h-3 text-slate-950" />
            <span>LAUNCH100 (Rs. 100 OFF)</span>
            {copiedCode === 'LAUNCH100' ? <Check className="w-3 h-3 text-emerald-800" /> : <Copy className="w-3 h-3 text-slate-800" />}
          </button>

          {/* Wallet Offer */}
          <span className="hidden md:inline-block text-amber-100 text-[10px] font-semibold italic bg-black/20 px-2 py-1 rounded-lg">
            🎁 Deposit Rs. 5,000+ & Get Cash Bonus!
          </span>
        </div>

      </div>
    </div>
  );
};
