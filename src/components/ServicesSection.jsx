import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight } from 'lucide-react';

export const ServicesSection = () => {
  const { showToast, openCatalog, setIsSupportOpen } = useApp();

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
        
        {/* Header matching screenshot */}
        <div className="space-y-3 mb-14">
          <span className="text-xs font-black text-[#cc040a] tracking-widest uppercase font-mono bg-[#cc040a]/10 px-4 py-1.5 rounded-full border border-[#cc040a]/20">
            — WHAT WE OFFER —
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 font-heading tracking-tight">
            Our Premium <span className="text-[#cc040a]">Services</span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-semibold max-w-lg mx-auto">
            Elevate your gaming experience with our top-tier digital services
          </p>
        </div>

        {/* 3 Cards Grid matching screenshot layout & hover effects */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {services.map((service) => (
            <div
              key={service.id}
              onClick={service.action}
              className="bg-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between items-center text-center border border-slate-200/80 shadow-md hover:shadow-2xl hover:shadow-red-500/15 hover:border-[#cc040a]/40 hover:-translate-y-2.5 transition-all duration-300 group cursor-pointer min-h-[390px] relative overflow-hidden"
            >
              {/* Top Border Indicator Bar (Matching Screenshot Hover Effect) */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#cc040a] rounded-t-3xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>

              {/* 3D App Icon Container */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 my-4 flex items-center justify-center">
                <div className="absolute inset-0 bg-[#cc040a]/10 rounded-full blur-2xl group-hover:bg-[#cc040a]/25 transition-all duration-300 pointer-events-none"></div>
                <img 
                  src={service.image} 
                  alt={service.title} 
                  className="w-full h-full object-contain filter drop-shadow-xl group-hover:scale-110 transition-transform duration-300 relative z-10" 
                />
              </div>

              {/* Title & Description */}
              <div className="space-y-2.5 mb-6 relative z-10 flex-1 flex flex-col justify-center">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 font-heading tracking-tight group-hover:text-[#cc040a] transition-colors duration-300">
                  {service.title}
                </h3>
                <p className="text-slate-500 text-xs sm:text-[13px] leading-relaxed font-semibold max-w-[210px] mx-auto">
                  {service.description}
                </p>
              </div>

              {/* Red Theme Action Button (Matching Screenshot) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  service.action();
                }}
                className="bg-[#cc040a] hover:bg-[#b00308] text-white px-6 py-2.5 sm:py-3 rounded-full font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 group-hover:shadow-lg group-hover:shadow-red-600/40 group-hover:scale-105 transition-all cursor-pointer relative z-10 border-0 outline-none"
              >
                <span>{service.buttonText}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
