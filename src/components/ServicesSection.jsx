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
      description: 'Instant in-game currency delivered to your account at unbeatable prices',
      buttonText: 'SHOP NOW',
      icon: Gamepad2,
      tileGradient: 'from-cyan-400 via-blue-600 to-indigo-900',
      tileGlow: 'shadow-[0_15px_35px_rgba(37,99,235,0.3)]',
      iconColor: 'text-cyan-200',
      action: scrollToCatalog
    },
    {
      id: 'cards',
      title: 'Cards',
      description: 'Garena Shells, Hot Recharge Codes & premium gift cards for gamers',
      buttonText: 'SHOP NOW',
      icon: CreditCard,
      tileGradient: 'from-amber-300 via-yellow-500 to-amber-700',
      tileGlow: 'shadow-[0_15px_35px_rgba(245,158,11,0.3)]',
      iconColor: 'text-amber-100',
      action: () => showToast('Garena Shells & Digital Vouchers section active!')
    },
    {
      id: 'support',
      title: '24/7 Support',
      description: 'Dedicated live WhatsApp support team ready to assist your top-up orders anytime',
      buttonText: 'CHAT NOW',
      icon: Headphones,
      tileGradient: 'from-purple-400 via-pink-600 to-indigo-900',
      tileGlow: 'shadow-[0_15px_35px_rgba(219,39,119,0.3)]',
      iconColor: 'text-pink-100',
      action: () => window.open('https://wa.me/94771234567', '_blank')
    },
    {
      id: 'other',
      title: 'Other Services',
      description: 'Explore our growing catalog of free & premium digital services',
      buttonText: 'VIEW MORE',
      icon: Sparkles,
      tileGradient: 'from-emerald-400 via-teal-600 to-slate-900',
      tileGlow: 'shadow-[0_15px_35px_rgba(13,148,136,0.3)]',
      iconColor: 'text-emerald-100',
      action: scrollToCatalog
    }
  ];

  return (
    <section id="services-section" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Section Header */}
        <div className="space-y-3 mb-16">
          <span className="text-xs font-black text-cyan-600 tracking-widest uppercase font-mono bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100">
            — WHAT WE OFFER —
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-heading tracking-tight">
            Our Premium <span className="text-cyan-500">Services</span>
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-semibold max-w-lg mx-auto">
            Elevate your gaming experience with our top-tier digital services
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className="group bg-white rounded-3xl p-8 border border-slate-200/80 card-shadow-premium card-shadow-hover flex flex-col justify-between items-center text-center relative overflow-hidden"
              >
                {/* Top Subtle Cyan Glow */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                {/* 3D Glossy App Icon Tile */}
                <div className="mb-7 relative">
                  <div className={`w-28 h-28 rounded-[32px] bg-gradient-to-br ${service.tileGradient} ${service.tileGlow} flex items-center justify-center relative overflow-hidden border-2 border-white/40 transform group-hover:scale-105 transition-all duration-300`}>
                    
                    {/* Glass Reflection Shine Overlay */}
                    <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none rounded-t-[30px]"></div>
                    <div className="absolute top-2 left-3 w-8 h-8 rounded-full bg-white/20 blur-sm pointer-events-none"></div>

                    {/* Center Icon */}
                    <Icon className={`w-14 h-14 ${service.iconColor} stroke-[1.8] relative z-10 drop-shadow-[0_5px_15px_rgba(0,0,0,0.4)]`} />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3 mb-8">
                  <h3 className="text-xl font-black text-slate-900 font-heading">
                    {service.title}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                    {service.description}
                  </p>
                </div>

                {/* Action Button (Pill Button Matching Reference UI) */}
                <button
                  onClick={service.action}
                  className="w-full py-3.5 px-6 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/25 flex items-center justify-center gap-2 group-hover:gap-3 cursor-pointer"
                >
                  <span>{service.buttonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
