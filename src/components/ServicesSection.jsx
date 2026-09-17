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
    <section id="services-section" className="pt-8 pb-24 bg-white border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Header matching screenshot */}
        <div className="section-header space-y-3 text-center">
          <span className="section-badge">— WHAT WE OFFER —</span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 font-heading tracking-tight leading-tight">
            Our Premium <span className="text-[#cc040a]">Services</span>
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-medium max-w-lg mx-auto leading-relaxed">
            Elevate your gaming experience with our top-tier digital services
          </p>
        </div>

        {/* Electric Glow Keyframes */}
        <style>{`
          @keyframes redElectricPulse {
            0%   { box-shadow: 0 0 0 0 rgba(204,4,10,0), 0 0 0 0 rgba(204,4,10,0), 0 8px 32px rgba(204,4,10,0.08); }
            30%  { box-shadow: 0 0 12px 3px rgba(204,4,10,0.55), 0 0 30px 8px rgba(204,4,10,0.25), 0 8px 48px rgba(204,4,10,0.18); }
            60%  { box-shadow: 0 0 20px 6px rgba(204,4,10,0.75), 0 0 50px 16px rgba(204,4,10,0.35), 0 0 80px 24px rgba(204,4,10,0.15); }
            80%  { box-shadow: 0 0 14px 4px rgba(204,4,10,0.6),  0 0 36px 10px rgba(204,4,10,0.28), 0 8px 48px rgba(204,4,10,0.16); }
            100% { box-shadow: 0 0 20px 6px rgba(204,4,10,0.75), 0 0 50px 16px rgba(204,4,10,0.35), 0 0 80px 24px rgba(204,4,10,0.15); }
          }
          .service-card-electric:hover {
            animation: redElectricPulse 1.2s ease-in-out infinite;
            border-color: rgba(204,4,10,0.6) !important;
          }
          .service-card-electric:hover .card-icon-glow {
            filter: drop-shadow(0 0 18px rgba(204,4,10,0.5)) drop-shadow(0 0 40px rgba(204,4,10,0.25));
          }
        `}</style>

        {/* 3 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {services.map((service) => (
            <div
              key={service.id}
              onClick={service.comingSoon ? undefined : service.action}
              className={`service-card-electric bg-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between items-center text-center border border-slate-200/80 shadow-md hover:-translate-y-2.5 transition-all duration-300 group min-h-[390px] relative overflow-hidden reveal reveal-${service.id === 'topup' ? '1' : service.id === 'cards' ? '2' : '3'} ${service.comingSoon ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
            >
              {/* Top electric accent bar */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#cc040a] to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-t-3xl" />

              {/* Coming Soon Badge */}
              {service.comingSoon && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-[#cc040a] text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md shadow-red-600/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                  Coming Soon
                </div>
              )}

              {/* Icon with glow on hover */}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 my-3 flex items-center justify-center">
                <img
                  src={service.image}
                  alt={service.title}
                  className={`card-icon-glow w-full h-full object-contain filter drop-shadow-xl group-hover:scale-[1.08] transition-all duration-300 rounded-3xl ${service.comingSoon ? 'grayscale-[20%]' : ''}`}
                />
              </div>

              {/* Title & Description */}
              <div className="space-y-2 mb-6 relative z-10 flex-1 flex flex-col justify-center">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 font-heading tracking-tight group-hover:text-[#cc040a] transition-colors duration-300">
                  {service.title}
                </h3>
                <p className="text-slate-500 text-xs sm:text-[13px] leading-relaxed font-medium max-w-[210px] mx-auto">
                  {service.description}
                </p>
              </div>

              {/* Button */}
              <button
                type="button"
                disabled={service.comingSoon}
                onClick={(e) => { e.stopPropagation(); if (!service.comingSoon) service.action(); }}
                className={`btn-cyan-pill px-7 py-2.5 sm:py-3 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 group-hover:shadow-lg group-hover:shadow-red-600/40 group-hover:scale-105 active:scale-95 transition-all duration-200 relative z-10 border-0 outline-none ${service.comingSoon ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
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
