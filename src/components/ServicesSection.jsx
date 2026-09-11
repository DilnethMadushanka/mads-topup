import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight } from 'lucide-react';

export const ServicesSection = () => {
  const { showToast, openCatalog } = useApp();

  const services = [
    {
      id: 'topup',
      title: 'Game TopUp',
      description: 'Instant in-game currency delivered to your account at unbeatable prices',
      buttonText: 'SHOP NOW',
      image: '/uploads/index_page/game_topup.webp',
      action: openCatalog
    },
    {
      id: 'cards',
      title: 'Cards',
      description: 'Garena Shells, Bot Recharge Codes & premium gift cards for gamers',
      buttonText: 'SHOP NOW',
      image: '/uploads/index_page/gift_cards.webp',
      action: openCatalog
    },
    {
      id: 'other',
      title: 'Other Services',
      description: 'Explore our growing catalog of free & premium digital services',
      buttonText: 'VIEW MORE',
      image: '/uploads/index_page/other_service.webp',
      action: openCatalog
    }
  ];

  return (
    <section id="services-section" className="py-20 bg-[#F8FAFF] border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Subtitle Header */}
        <div className="mb-12">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
            services
          </span>
        </div>

        {/* 3 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {services.map((service) => (
            <div
              key={service.id}
              onClick={service.action}
              className="bg-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between items-center text-center border border-slate-100/80 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group cursor-pointer min-h-[380px] relative overflow-hidden"
            >
              {/* 3D App Icon Container */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-6 flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none"></div>
                <img 
                  src={service.image} 
                  alt={service.title} 
                  className="w-full h-full object-contain filter drop-shadow-xl group-hover:scale-105 transition-transform duration-300 relative z-10" 
                />
              </div>

              {/* Title & Description */}
              <div className="space-y-2 mb-6 relative z-10 flex-1 flex flex-col justify-center">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading tracking-tight">
                  {service.title}
                </h3>
                <p className="text-slate-500 text-xs sm:text-[13px] leading-relaxed font-medium max-w-[220px] mx-auto">
                  {service.description}
                </p>
              </div>

              {/* Vibrant Blue-Cyan Pill Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  service.action();
                }}
                className="bg-gradient-to-r from-[#1D60E8] via-[#0091FF] to-[#00C4EE] hover:from-[#154ec5] hover:to-[#00b4da] text-white px-7 py-2.5 sm:py-3 rounded-full font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 group-hover:scale-105 transition-all cursor-pointer relative z-10"
              >
                <span>{service.buttonText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};



