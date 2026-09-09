import React from 'react';
import { useApp } from '../context/AppContext';
import { Gamepad2, CreditCard, Headphones, Sparkles, ArrowRight } from 'lucide-react';

export const ServicesSection = () => {
  const { showToast, openCatalog } = useApp();

  const services = [
    {
      id: 'topup',
      title: 'Game TopUp',
      description: 'Instant in-game currency delivered to your account at unbeatable LKR rates',
      buttonText: 'SHOP NOW',
      icon: Gamepad2,
      image: '/uploads/index_page/game_topup.webp',
      tileGradient: 'from-[#00B4D8] to-blue-600',
      tileGlow: 'shadow-lg shadow-cyan-500/20',
      iconColor: 'text-white',
      action: openCatalog
    },
    {
      id: 'cards',
      title: 'Cards & Vouchers',
      description: 'Garena Shells, Hot Recharge Codes & premium digital gift vouchers',
      buttonText: 'SHOP NOW',
      icon: CreditCard,
      image: '/uploads/index_page/gift_cards.webp',
      tileGradient: 'from-[#3B2896] to-indigo-700',
      tileGlow: 'shadow-lg shadow-purple-500/20',
      iconColor: 'text-white',
      action: openCatalog
    },
    {
      id: 'other',
      title: 'Other Services',
      description: 'Explore our growing catalog of automated free & premium gaming tools',
      buttonText: 'VIEW MORE',
      icon: Sparkles,
      image: '/uploads/index_page/other_service.webp',
      tileGradient: 'from-slate-800 to-slate-950',
      tileGlow: 'shadow-lg shadow-slate-900/40',
      iconColor: 'text-[#00B4D8]',
      action: openCatalog
    }
  ];

  return (
    <section id="services-section" className="py-24 bg-[#F8FAFF] border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Section Header */}
        <div className="space-y-3 mb-16">
          <span className="text-xs font-black text-[#00B4D8] tracking-widest uppercase font-mono bg-[#00B4D8]/10 px-4 py-1.5 rounded-full border border-[#00B4D8]/20">
            — WHAT WE OFFER —
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-heading tracking-tight uppercase">
            Our Premium <span className="text-[#00B4D8]">Services</span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-semibold max-w-lg mx-auto">
            Elevate your gaming experience with our top-tier minimalist digital services
          </p>
        </div>

        {/* 3 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className="mads-card p-8 flex flex-col justify-between items-center text-center group cursor-pointer"
              >
                {/* 3D App Icon Tile */}
                <div className="mb-7 relative z-10">
                  <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${service.tileGradient} ${service.tileGlow} flex items-center justify-center relative overflow-hidden transform group-hover:scale-110 group-hover:rotate-2 transition-all duration-300 p-3`}>
                    {service.image ? (
                      <img src={service.image} alt={service.title} className="w-full h-full object-contain filter drop-shadow-md relative z-10" />
                    ) : (
                      <Icon className={`w-12 h-12 ${service.iconColor} stroke-[1.8] relative z-10`} />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2 mb-8 relative z-10">
                  <h3 className="text-xl font-black text-slate-900 font-heading group-hover:text-[#00B4D8] transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-slate-600 text-xs leading-relaxed font-medium">
                    {service.description}
                  </p>
                </div>

                {/* Action Button */}
                <button
                  onClick={service.action}
                  className="btn-cyan-pill w-full py-3 px-6 rounded-full font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 group-hover:gap-3 cursor-pointer shadow-md shadow-cyan-500/20 relative z-10"
                >
                  <span className="font-mono">{service.buttonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Animated Bottom Cyan Glow Line */}
                <div className="mads-card-glow-bar"></div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};



