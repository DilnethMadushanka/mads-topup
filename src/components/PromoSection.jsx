import React from 'react';
import { ShieldCheck, Zap, MessageCircle, Lock, Award, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';

export const PromoSection = () => {
  const pills = [
    { icon: <Lock className="w-3.5 h-3.5 flex-shrink-0" />, label: 'Player ID / UID Only' },
    { icon: <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />, label: 'Bank, eZ Cash & Crypto' },
    { icon: <Award className="w-3.5 h-3.5 flex-shrink-0" />, label: '10,000+ Happy Gamers' },
  ];

  return (
    <section className="py-14 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: '#ffffff',
            border: '1.5px solid rgba(204,4,10,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
            padding: '52px 36px',
          }}>

          {/* ── Decorative blobs ─────────────────────────── */}
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(204,4,10,0.04) 0%, transparent 70%)', filter: 'blur(50px)' }} />
          <div className="absolute -bottom-16 right-10 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(204,4,10,0.03) 0%, transparent 70%)', filter: 'blur(50px)' }} />

          {/* ── Subtle dot grid ──────────────────────────── */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
            style={{ backgroundImage: 'radial-gradient(circle, #cc040a 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

          {/* ── Top shine strip ──────────────────────────── */}
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(204,4,10,0.3) 40%, rgba(204,4,10,0.3) 60%, transparent 100%)' }} />

          {/* ── Content grid ─────────────────────────────── */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

            {/* Left — text block */}
            <div className="lg:col-span-8 space-y-5 text-center lg:text-left">

              {/* System badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider font-mono"
                style={{
                  background: 'rgba(204,4,10,0.07)',
                  border: '1px solid rgba(204,4,10,0.2)',
                  color: '#cc040a',
                }}>
                <Zap className="w-3.5 h-3.5 fill-[#cc040a]" />
                MOONGOLD AUTOMATED SYSTEM
              </div>

              {/* Headline */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading tracking-tight leading-tight uppercase text-[#0f172a]">
                Sri Lanka's Most Trusted &amp; Fastest{' '}
                <span className="relative inline-block">
                  <span className="text-transparent bg-clip-text"
                    style={{ backgroundImage: 'linear-gradient(135deg, #cc040a 0%, #ff4d4f 50%, #cc040a 100%)' }}>
                    Game Top-Up
                  </span>
                </span>{' '}
                Platform
              </h2>

              {/* Red accent line under headline */}
              <div className="w-20 h-1 rounded-full mx-auto lg:mx-0"
                style={{ background: 'linear-gradient(90deg, #cc040a, #ff6b6b)' }} />

              {/* Description */}
              <p className="text-slate-500 text-sm sm:text-base font-semibold max-w-2xl leading-relaxed">
                Get your Free Fire Diamonds, PUBG Mobile UC, and Mobile Legends Diamonds credited to your game account in under 2 seconds. Safe, 100% authorized, and password-free topups.
              </p>

              {/* Feature pills */}
              <div className="pt-2 flex flex-wrap justify-center lg:justify-start items-center gap-3 text-xs font-bold">
                {pills.map(({ icon, label }) => (
                  <div key={label}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid rgba(204,4,10,0.12)',
                      color: '#374151',
                      boxShadow: '0 2px 8px rgba(204,4,10,0.06)',
                    }}>
                    <span style={{ color: '#cc040a' }}>{icon}</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — VIP support card */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="w-full max-w-sm rounded-3xl p-7 text-center space-y-5 transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid rgba(204,4,10,0.12)',
                  boxShadow: '0 8px 32px rgba(204,4,10,0.1), 0 2px 8px rgba(0,0,0,0.05)',
                }}>

                {/* Icon box */}
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #cc040a 0%, #ff4d4f 100%)',
                    boxShadow: '0 8px 24px rgba(204,4,10,0.38)',
                  }}>
                  <MessageCircle className="w-8 h-8 text-white fill-white" />
                </div>

                {/* Text */}
                <div>
                  <div className="inline-flex items-center gap-1.5 mb-2 px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider"
                    style={{ background: 'rgba(204,4,10,0.07)', color: '#cc040a', border: '1px solid rgba(204,4,10,0.15)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#cc040a] animate-ping inline-block" />
                    ONLINE NOW
                  </div>
                  <h3 className="text-lg font-black text-[#0f172a] font-heading uppercase tracking-tight">
                    24/7 VIP Support
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">
                    Have questions or need order assistance? Chat with our team now.
                  </p>
                </div>

                {/* WhatsApp CTA */}
                <a
                  href="https://wa.me/94740436276"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 font-mono transition-all duration-200 hover:scale-[1.03] active:scale-[0.99]"
                  style={{
                    background: 'linear-gradient(135deg, #cc040a 0%, #ff4d4f 100%)',
                    color: '#fff',
                    boxShadow: '0 6px 20px rgba(204,4,10,0.4)',
                    display: 'flex',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 10px 28px rgba(204,4,10,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(204,4,10,0.4)'; }}
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  CHAT ON WHATSAPP
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>

                {/* Response time tag */}
                <p className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1">
                  <Sparkles size={10} className="text-[#cc040a]" />
                  Avg. response under 2 minutes
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
