import React from 'react';
import { ShieldCheck, Zap, MessageCircle, Lock, Award, CheckCircle2 } from 'lucide-react';

export const PromoSection = () => {
  return (
    <section className="py-16 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-8 sm:p-14 overflow-hidden border border-slate-800 shadow-2xl">
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Info */}
            <div className="lg:col-span-8 space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00B4D8]/10 border border-[#00B4D8]/30 text-[#00B4D8] text-xs font-black uppercase tracking-wider font-mono">
                <Zap className="w-4 h-4 fill-[#00B4D8]" />
                <span>MOONGOLD AUTOMATED SYSTEM</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading tracking-tight leading-tight uppercase text-white">
                Sri Lanka's Most Trusted & Fastest <span className="text-[#00B4D8]">Game Top-Up Platform</span>
              </h2>

              <p className="text-slate-300 text-sm sm:text-base font-medium max-w-2xl">
                Get your Free Fire Diamonds, PUBG Mobile UC, and Mobile Legends Diamonds credited to your game account in under 2 seconds. Safe, 100% authorized, and password-free topups.
              </p>

              <div className="pt-2 flex flex-wrap justify-center lg:justify-start items-center gap-6 text-xs text-slate-300 font-mono font-bold">
                <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800">
                  <Lock className="w-4 h-4 text-[#00B4D8]" />
                  <span>Player ID / UID Only</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-[#00B4D8]" />
                  <span>Bank, eZ Cash & Crypto</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800">
                  <Award className="w-4 h-4 text-[#00B4D8]" />
                  <span>10,000+ Happy Gamers</span>
                </div>
              </div>
            </div>

            {/* Right WhatsApp Support Box */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="w-full max-w-sm bg-slate-950 border border-slate-800 p-7 rounded-3xl text-center space-y-4 shadow-xl text-white">
                <div className="w-14 h-14 rounded-2xl bg-[#00B4D8]/20 text-[#00B4D8] border border-[#00B4D8]/30 flex items-center justify-center mx-auto">
                  <MessageCircle className="w-8 h-8 fill-[#00B4D8] text-slate-950" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white font-heading uppercase">24/7 VIP Support</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Have questions or need order assistance? Chat with our team now.</p>
                </div>
                <a
                  href="https://wa.me/94771234567"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-cyan-pill w-full py-3.5 rounded-full font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 font-mono shadow-lg shadow-cyan-500/20"
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



