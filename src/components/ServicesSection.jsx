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
      image: '/uploads/index_page/game_topup.png',
      action: openCatalog
    },
    {
      id: 'cards',
      title: 'Cards',
      description: 'Garena Shells, Bot Recharge Codes & premium gift cards for gamers',
      buttonText: 'SHOP NOW',
      image: '/uploads/index_page/gift_cards.png',
      action: openCatalog
    },
    {
      id: 'other',
      title: 'Other Services',
      description: 'Explore our growing catalog of free & premium digital services',
      buttonText: 'VIEW MORE',
      image: '/uploads/index_page/other_service.png',
      action: openCatalog,
      comingSoon: true
    }
  ];

  return (
    <section id="services-section" className="pt-12 pb-24 sm:pb-28 bg-white border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Header matching screenshot */}
        <div className="section-header space-y-3 text-center">
          <span className="section-badge">— WHAT WE OFFER —</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-heading tracking-tight leading-[1.1]">
            Our Premium <span className="text-[#cc040a]">Services</span>
          </h2>
          <p className="text-slate-500 text-base font-medium max-w-md mx-auto leading-relaxed">
            Elevate your gaming experience with our top-tier digital services
          </p>
        </div>

        {/* 3 Cards Grid matching screenshot layout & hover effects */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {services.map((service) => (
            <div
              key={service.id}
              onClick={service.comingSoon ? undefined : service.action}
              className={`bg-white rounded-[1.75rem] p-7 sm:p-9 flex flex-col justify-between items-center text-center border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.12)] hover:shadow-[0_32px_64px_-24px_rgba(204,4,10,0.35)] hover:border-[#cc040a]/30 hover:-translate-y-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group cursor-pointer min-h-[400px] relative overflow-hidden reveal reveal-${service.id === 'topup' ? '1' : service.id === 'cards' ? '2' : '3'} ${service.comingSoon ? 'opacity-80 cursor-default' : ''}`}
            >
              {/* Soft red glow rising from the bottom on hover */}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#cc040a]/[0.08] via-[#cc040a]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              {/* Glossy light sweep */}
              <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/70 to-transparent -skew-x-12 group-hover:left-[130%] transition-[left] duration-[900ms] ease-out pointer-events-none z-20"></div>

              {/* Top Border Indicator Bar (Matching Screenshot Hover Effect) */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#cc040a] rounded-t-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Coming Soon Badge */}
              {service.comingSoon && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-[#cc040a] text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md shadow-red-600/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block"></span>
                  Coming Soon
                </div>
              )}

              {/* 3D App Icon Container (Direct 3D Icon - Large Size) */}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 my-3 flex items-center justify-center">
                <img 
                  src={service.image} 
                  alt={service.title} 
                  className={`w-full h-full object-contain filter drop-shadow-xl group-hover:-translate-y-3 group-hover:scale-110 group-hover:drop-shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] rounded-3xl ${service.comingSoon ? 'grayscale-[20%]' : ''}`}
                />
              </div>

              {/* Title & Description */}
              <div className="space-y-2 mb-6 relative z-10 flex-1 flex flex-col justify-center">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading tracking-tight group-hover:text-[#cc040a] transition-colors duration-300">
                  {service.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium max-w-[240px] mx-auto">
                  {service.description}
                </p>
              </div>

              {/* Red Theme Action Button (Matching Screenshot) */}
              <button
                type="button"
                disabled={service.comingSoon}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!service.comingSoon) service.action();
                }}
                className={`btn-cyan-pill px-8 py-3 text-xs uppercase tracking-[0.08em] flex items-center justify-center gap-1.5 group-hover:shadow-lg group-hover:shadow-red-600/40 active:scale-95 transition-all duration-200 relative z-10 border-0 outline-none ${
                  service.comingSoon ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                }`}
              >
                <span>{service.comingSoon ? 'Coming Soon' : service.buttonText}</span>
                {!service.comingSoon && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
