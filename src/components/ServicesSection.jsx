import React from 'react';
import { useApp } from '../context/AppContext';
import { Gamepad2, CreditCard, Headphones, Sparkles, ArrowRight } from 'lucide-react';

export const ServicesSection = () => {
  const { showToast } = useApp();

  const scrollToCatalog = () => {
    const el = document.getElementById('game-catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const services = [
    {
      id: 'topup',
      title: 'Game TopUp',
      description: 'Instant in-game currency delivered to your account at unbeatable LKR prices',
      buttonText: 'SHOP NOW',
      icon: Gamepad2,
      tileGradient: 'from-red-600 via-rose-700 to-slate-950',
      tileGlow: 'shadow-[0_15px_35px_rgba(255,26,60,0.35)]',
      iconColor: 'text-white',
      action: scrollToCatalog
    },
    {
      id: 'cards',
      title: 'Cards & Vouchers',
      description: 'Garena Shells, Hot Recharge Codes & premium gift cards for Sri Lankan gamers',
      buttonText: 'SHOP NOW',
      icon: CreditCard,
      tileGradient: 'from-red-700 via-rose-800 to-slate-950',
      tileGlow: 'shadow-[0_15px_35px_rgba(255,26,60,0.35)]',
      iconColor: 'text-white',
      action: () => showToast('Garena Shells & Digital Vouchers section active!')
    },
    {
      id: 'support',
      title: '24/7 VIP Support',
      description: 'Dedicated live WhatsApp support team ready to assist your top-up orders anytime',
      buttonText: 'CHAT NOW',
      icon: Headphones,
      tileGradient: 'from-red-600 via-rose-700 to-slate-950',
      tileGlow: 'shadow-[0_15px_35px_rgba(255,26,60,0.35)]',
      iconColor: 'text-white',
      action: () => window.open('https://wa.me/94771234567', '_blank')
    },
    {
      id: 'other',
      title: 'Other Services',
      description: 'Explore our growing catalog of automated free & premium digital gaming tools',
      buttonText: 'VIEW MORE',
      icon: Sparkles,
      tileGradient: 'from-red-800 via-slate-900 to-slate-950',
      tileGlow: 'shadow-[0_15px_35px_rgba(255,26,60,0.35)]',
      iconColor: 'text-white',
      action: scrollToCatalog
    }
  ];

  return (
    <section id="services-section" className="py-24 bg-slate-950 relative border-b border-red-600/20">
      {/* Red Ambient Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-red-600/10 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        {/* Section Header */}
        <div className="space-y-3 mb-16">
          <span className="text-xs font-black text-red-500 tracking-widest uppercase font-mono bg-red-950/80 px-3 py-1.5 rounded-full border border-red-500/40">
            — WHAT WE OFFER —
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-white font-heading tracking-tight uppercase">
            Our Premium <span className="text-red-500 drop-shadow-[0_0_15px_rgba(255,26,60,0.8)]">Services</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base font-semibold max-w-lg mx-auto">
            Elevate your gaming experience with our top-tier cyber digital services
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className="group bg-slate-900/90 rounded-3xl p-8 border border-red-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.8)] hover:border-red-500 transition-all duration-300 flex flex-col justify-between items-center text-center relative overflow-hidden"
              >
                {/* Top Glowing Laser Trace Overlay */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                {/* 3D Glossy App Icon Tile */}
                <div className="mb-7 relative">
                  <div className={`w-28 h-28 rounded-[32px] bg-gradient-to-br ${service.tileGradient} ${service.tileGlow} flex items-center justify-center relative overflow-hidden border-2 border-red-500/40 transform group-hover:scale-105 transition-all duration-300`}>
                    
                    {/* Glass Reflection Overlay */}
                    <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-[30px]"></div>

                    {/* Center Icon */}
                    <Icon className={`w-14 h-14 ${service.iconColor} stroke-[1.8] relative z-10 drop-shadow-[0_0_10px_#FF1A3C]`} />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3 mb-8">
                  <h3 className="text-xl font-black text-white font-heading">
                    {service.title}
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed font-semibold">
                    {service.description}
                  </p>
                </div>

                {/* Action Button - Crimson Metallic Plate */}
                <button
                  onClick={service.action}
                  className="btn-crimson-plate w-full py-3.5 px-6 rounded-xl text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 group-hover:gap-3 cursor-pointer"
                >
                  <span className="font-mono">{service.buttonText}</span>
                  <ArrowRight className="w-4 h-4 text-red-400" />
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

