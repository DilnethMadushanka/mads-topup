import React from 'react';
import { ShieldCheck, Zap, MessageCircle, Lock, Award, CheckCircle2 } from 'lucide-react';

export const PromoSection = () => {
  return (
    <section className="py-16 bg-slate-950 border-b border-red-600/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-slate-950 text-white rounded-3xl p-8 sm:p-14 overflow-hidden border border-red-500/40 shadow-[0_15px_40px_rgba(0,0,0,0.9)]">
          {/* Intense Crimson Ambient Plasma Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-700/20 rounded-full blur-3xl pointer-events-none"></div>

          {/* Laser Trace Line */}
          <div className="laser-beam-horizontal top-0"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Info */}
            <div className="lg:col-span-8 space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/80 border border-red-500/50 text-red-400 text-xs font-black uppercase tracking-wider font-mono shadow-[0_0_10px_rgba(255,26,60,0.3)]">
                <Zap className="w-4 h-4 fill-red-500 text-red-500 animate-pulse" />
                <span>MOONGOLD API AUTOMATED SYSTEM v2.4</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading tracking-tight leading-tight uppercase">
                Sri Lanka's Most Trusted & Fastest <span className="text-red-500 drop-shadow-[0_0_15px_rgba(255,26,60,0.8)]">Game Top-Up Platform</span>
              </h2>

              <p className="text-slate-300 text-sm sm:text-base font-semibold max-w-2xl">
                Get your Free Fire Diamonds, PUBG Mobile UC, and Mobile Legends Diamonds credited to your game account in under 2 seconds. Safe, 100% authorized, and password-free topups.
              </p>

              <div className="pt-2 flex flex-wrap justify-center lg:justify-start items-center gap-6 text-xs text-slate-300 font-mono font-bold">
                <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-red-500/20">
                  <Lock className="w-4 h-4 text-red-400" />
                  <span>Player ID / UID Only</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-red-500/20">
                  <CheckCircle2 className="w-4 h-4 text-red-500" />
                  <span>Bank, eZ Cash & Crypto</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-red-500/20">
                  <Award className="w-4 h-4 text-red-400" />
                  <span>10,000+ Happy Gamers</span>
                </div>
              </div>
            </div>

            {/* Right WhatsApp Support Box */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="w-full max-w-sm bg-slate-900/90 border border-red-500/40 backdrop-blur-xl p-7 rounded-3xl text-center space-y-4 shadow-[0_0_25px_rgba(0,0,0,0.8)]">
                <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/40 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(255,26,60,0.4)]">
                  <MessageCircle className="w-8 h-8 fill-red-500 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white font-heading uppercase">24/7 VIP Support</h3>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Have questions or need order assistance? Chat with our team now.</p>
                </div>
                <a
                  href="https://wa.me/94771234567"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-crimson-plate w-full py-3.5 rounded-xl text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 font-mono"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>CHAT ON WHATSAPP</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

