import React from 'react';
import { useApp } from '../context/AppContext';
import { UserPlus, LogIn, Crown } from 'lucide-react';

export const ResellerBannerSection = () => {
  const { openResellerPage, openAuth } = useApp();

  return (
    <section id="reseller-section" className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* HERO CHOICE BANNER CONTAINER (Matching Screenshot 1) */}
      <div className="bg-[#0B132B] text-white rounded-3xl p-6 sm:p-12 border border-slate-800 shadow-2xl relative overflow-hidden text-center">
        
        {/* Background Decorative Lighting */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 right-10 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Tag & Main Title */}
        <div className="relative z-10 space-y-3 max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            <span>PARTNER WITH US</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-heading tracking-tight drop-shadow-md">
            Reseller <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">Program</span>
          </h2>

          <p className="text-slate-300 text-xs sm:text-sm font-medium max-w-xl mx-auto">
            Join our network and start earning competitive commissions today
          </p>
        </div>

        {/* 2 Choice Action Cards (2 Columns - Matching Screenshot 1) */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
          
          {/* Card 1: Become a Reseller */}
          <div className="bg-[#111A35]/90 border border-cyan-900/50 hover:border-cyan-500/50 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-950/50 group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform">
                <UserPlus className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-heading">
                  Become a Reseller
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed mt-2">
                  Get wholesale prices and exclusive benefits. Earn competitive commissions on every top-up you sell.
                </p>
              </div>
            </div>

            <button
              onClick={openResellerPage}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-500/20 cursor-pointer uppercase tracking-wider"
            >
              <span>REGISTER NOW</span>
              <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
            </button>
          </div>

          {/* Card 2: Reseller Login */}
          <div className="bg-[#111A35]/90 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-all duration-300 hover:shadow-xl group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/30 group-hover:scale-110 transition-transform">
                <LogIn className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-heading">
                  Reseller Login
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed mt-2">
                  Already a reseller? Access your dashboard to manage orders, track sales and monitor your earnings.
                </p>
              </div>
            </div>

            <button
              onClick={() => openAuth('login')}
              className="w-full py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-500/20 cursor-pointer uppercase tracking-wider"
            >
              <span>LOGIN</span>
              <LogIn className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};
