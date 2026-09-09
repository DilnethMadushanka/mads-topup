import React from 'react';
import { ShieldCheck, Zap, MessageCircle, Lock, Award, CheckCircle2 } from 'lucide-react';

export const PromoSection = () => {
  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-slate-950 text-white rounded-3xl p-8 sm:p-14 overflow-hidden border border-slate-800 shadow-2xl">
          {/* Subtle Red & Cyan Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Info */}
            <div className="lg:col-span-8 space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-wider">
                <Zap className="w-4 h-4 fill-cyan-400" />
                <span>MOONGOLD API AUTOMATED SYSTEM</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading tracking-tight leading-tight">
                Sri Lanka's Most Trusted & Fastest <span className="text-cyan-400">Game Top-Up Platform</span>
              </h2>

              <p className="text-slate-300 text-sm sm:text-base font-semibold max-w-2xl">
                Get your Free Fire Diamonds, PUBG Mobile UC, and Mobile Legends Diamonds credited to your game account in under 2 seconds. Safe, 100% authorized, and password-free topups.
              </p>

              <div className="pt-2 flex flex-wrap justify-center lg:justify-start items-center gap-6 text-xs text-slate-300 font-bold">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>UID Only Top Up</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Bank, eZ Cash & LankaQR</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>5,000+ Happy Gamers</span>
                </div>
              </div>
            </div>

            {/* Right WhatsApp Support Box */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="w-full max-w-sm bg-slate-900/90 border border-slate-800 backdrop-blur-xl p-7 rounded-3xl text-center space-y-4 shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <MessageCircle className="w-8 h-8 fill-emerald-400 text-slate-900" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white font-heading">24/7 WhatsApp Support</h3>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Have questions or need order assistance? Chat with our team now.</p>
                </div>
                <a
                  href="https://wa.me/94771234567"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
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
