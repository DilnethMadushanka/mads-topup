import React from 'react';
import { useApp } from '../context/AppContext';
import { UserPlus, LogIn, Crown, Sparkles, ArrowRight, BadgeCheck } from 'lucide-react';

export const ResellerBannerSection = () => {
  const { openResellerPage, openResellerLoginPage } = useApp();

  return (
    <section id="reseller-section" className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="relative rounded-3xl overflow-hidden text-center"
        style={{
          background: '#ffffff',
          border: '1.5px solid rgba(204,4,10,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
          padding: '52px 24px',
        }}>

        {/* ── Decorative blobs ─────────────────────────────── */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(204,4,10,0.10) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute -bottom-16 right-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(204,4,10,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(204,4,10,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        {/* ── Dot pattern overlay ──────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(circle, #cc040a 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        {/* ── Header ───────────────────────────────────────── */}
        <div className="relative z-10 space-y-4 max-w-2xl mx-auto mb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase"
            style={{
              background: 'rgba(204,4,10,0.07)',
              border: '1px solid rgba(204,4,10,0.2)',
              color: '#cc040a',
            }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#cc040a] animate-ping inline-block" />
            PARTNER WITH US
          </div>

          {/* Title */}
          <h2 className="text-3xl sm:text-5xl font-black font-heading tracking-tight text-[#0f172a]">
            Reseller{' '}
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg, #cc040a 0%, #ff4d4f 50%, #cc040a 100%)' }}>
                Program
              </span>
              {/* Red underline accent */}
              <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full"
                style={{ background: 'linear-gradient(90deg, #cc040a, #ff6b6b, #cc040a)' }} />
            </span>
          </h2>

          <p className="text-slate-500 text-sm font-medium max-w-lg mx-auto leading-relaxed">
            Join our network and start earning competitive commissions today
          </p>

          {/* Trust pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {['Instant Payouts', 'Wholesale Pricing', 'Dedicated Support'].map(t => (
              <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                style={{ background: 'rgba(204,4,10,0.06)', color: '#cc040a', border: '1px solid rgba(204,4,10,0.15)' }}>
                <BadgeCheck size={11} /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* ── Cards ────────────────────────────────────────── */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto text-left">

          {/* Card 1 — Become a Reseller */}
          <div className="group relative flex flex-col justify-between rounded-2xl p-6 sm:p-8 transition-all duration-300 cursor-pointer"
            style={{
              background: '#ffffff',
              border: '1.5px solid rgba(204,4,10,0.1)',
              boxShadow: '0 4px 20px rgba(204,4,10,0.06), 0 1px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(204,4,10,0.14), 0 2px 8px rgba(0,0,0,0.06)';
              e.currentTarget.style.borderColor = 'rgba(204,4,10,0.3)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(204,4,10,0.06), 0 1px 4px rgba(0,0,0,0.05)';
              e.currentTarget.style.borderColor = 'rgba(204,4,10,0.1)';
              e.currentTarget.style.transform = 'none';
            }}>

            {/* Red top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'linear-gradient(90deg, #cc040a, #ff6b6b)' }} />

            <div className="space-y-4 mb-6">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #cc040a, #ff4d4f)', boxShadow: '0 6px 20px rgba(204,4,10,0.35)' }}>
                <UserPlus className="w-7 h-7 text-white" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-[#0f172a] font-heading">
                  Become a Reseller
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed mt-2">
                  Get wholesale prices and exclusive benefits. Earn competitive commissions on every top-up you sell.
                </p>
              </div>
            </div>

            <button
              onClick={openResellerPage}
              className="w-full py-3.5 px-6 rounded-xl text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #cc040a 0%, #ff4d4f 100%)',
                boxShadow: '0 6px 20px rgba(204,4,10,0.38)',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 10px 28px rgba(204,4,10,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(204,4,10,0.38)'; e.currentTarget.style.transform = 'none'; }}
            >
              REGISTER NOW
              <Crown className="w-4 h-4 text-amber-300 fill-amber-300 flex-shrink-0" />
            </button>
          </div>

          {/* Card 2 — Reseller Login */}
          <div className="group relative flex flex-col justify-between rounded-2xl p-6 sm:p-8 transition-all duration-300 cursor-pointer"
            style={{
              background: '#ffffff',
              border: '1.5px solid rgba(204,4,10,0.1)',
              boxShadow: '0 4px 20px rgba(204,4,10,0.06), 0 1px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(204,4,10,0.14), 0 2px 8px rgba(0,0,0,0.06)';
              e.currentTarget.style.borderColor = 'rgba(204,4,10,0.3)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(204,4,10,0.06), 0 1px 4px rgba(0,0,0,0.05)';
              e.currentTarget.style.borderColor = 'rgba(204,4,10,0.1)';
              e.currentTarget.style.transform = 'none';
            }}>

            {/* Red top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'linear-gradient(90deg, #cc040a, #ff6b6b)' }} />

            <div className="space-y-4 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #cc040a, #ff4d4f)', boxShadow: '0 6px 20px rgba(204,4,10,0.35)' }}>
                <LogIn className="w-7 h-7 text-white" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-[#0f172a] font-heading">
                  Reseller Login
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed mt-2">
                  Already a reseller? Access your dashboard to manage orders, track sales and monitor your earnings.
                </p>
              </div>
            </div>

            <button
              onClick={openResellerLoginPage}
              className="w-full py-3.5 px-6 rounded-xl text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #cc040a 0%, #ff4d4f 100%)',
                boxShadow: '0 6px 20px rgba(204,4,10,0.38)',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 10px 28px rgba(204,4,10,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(204,4,10,0.38)'; e.currentTarget.style.transform = 'none'; }}
            >
              LOGIN
              <ArrowRight className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>

        </div>

        {/* Bottom sparkle footnote */}
        <p className="relative z-10 mt-8 text-[11px] font-semibold text-slate-400 flex items-center justify-center gap-1.5">
          <Sparkles size={11} className="text-[#cc040a]" />
          Start earning today — no minimum sales requirement
          <Sparkles size={11} className="text-[#cc040a]" />
        </p>
      </div>
    </section>
  );
};
