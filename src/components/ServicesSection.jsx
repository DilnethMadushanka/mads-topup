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
      image: '/uploads/index_page/game_topup_t.webp',
      action: openCatalog
    },
    {
      id: 'cards',
      title: 'Cards',
      description: 'Garena Shells, Bot Recharge Codes & premium gift cards for gamers',
      buttonText: 'SHOP NOW',
      image: '/uploads/index_page/gift_cards_t.webp',
      action: openCatalog
    },
    {
      id: 'other',
      title: 'Other Services',
      description: 'Explore our growing catalog of free & premium digital services',
      buttonText: 'VIEW MORE',
      image: '/uploads/index_page/other_service_t.webp',
      action: openCatalog,
      comingSoon: true
    }
  ];

  return (
    <section id="services-section" className="relative overflow-hidden pt-14 pb-24 sm:pb-32 bg-white border-b border-slate-200/70">
      {/* soft background accents */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[640px] h-[280px] rounded-full bg-[#cc040a]/[0.05] blur-3xl pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

        {/* Header */}
        <div className="section-header space-y-3 text-center">
          <span className="section-badge">— WHAT WE OFFER —</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-heading tracking-tight leading-[1.1]">
            Our Premium <span className="text-[#cc040a]">Services</span>
          </h2>
          <p className="text-slate-500 text-base font-medium max-w-md mx-auto leading-relaxed">
            Elevate your gaming experience with our top-tier digital services
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-7 max-w-6xl mx-auto text-left">
          {services.map((service, idx) => (
            <div
              key={service.id}
              onClick={service.comingSoon ? undefined : service.action}
              className={`group relative flex flex-col rounded-[2rem] bg-white border border-slate-200/80 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-24px_rgba(15,23,42,0.18)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden reveal reveal-${service.id === 'topup' ? '1' : service.id === 'cards' ? '2' : '3'} ${
                service.comingSoon
                  ? 'cursor-default'
                  : 'cursor-pointer hover:-translate-y-2.5 hover:border-[#cc040a]/30 hover:shadow-[0_40px_70px_-28px_rgba(204,4,10,0.4)]'
              }`}
            >
              {/* Glossy sweep */}
              <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/60 to-transparent -skew-x-12 group-hover:left-[130%] transition-[left] duration-[1000ms] ease-out pointer-events-none z-30"></div>

              {/* Stage — artwork */}
              <div className="relative rounded-[1.5rem] overflow-hidden bg-gradient-to-br from-red-50 via-white to-rose-50 aspect-[16/11] sm:aspect-[4/3] flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(204,4,10,0.16),transparent_62%)] opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div
                  className="absolute inset-0 opacity-[0.05]"
                  style={{
                    backgroundImage: 'linear-gradient(#cc040a 1px, transparent 1px), linear-gradient(90deg, #cc040a 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                    maskImage: 'radial-gradient(ellipse at 50% 50%, #000 0%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, #000 0%, transparent 70%)',
                  }}
                ></div>

                {/* number */}
                <span className="absolute top-4 left-5 font-heading text-sm font-extrabold tracking-wider text-[#cc040a]/70">
                  0{idx + 1}
                </span>

                {/* Coming Soon Badge */}
                {service.comingSoon && (
                  <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5 bg-[#cc040a] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md shadow-red-600/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block"></span>
                    Coming Soon
                  </div>
                )}

                <img
                  src={service.image}
                  alt={service.title}
                  className={`relative w-[58%] sm:w-[62%] object-contain drop-shadow-[0_18px_22px_rgba(204,4,10,0.28)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-hover:-translate-y-2 ${service.comingSoon ? 'grayscale-[30%] opacity-90' : ''}`}
                />
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 px-4 pt-5 pb-3 sm:px-5">
                <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight group-hover:text-[#cc040a] transition-colors duration-300">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 font-medium flex-1">
                  {service.description}
                </p>

                <button
                  type="button"
                  disabled={service.comingSoon}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!service.comingSoon) service.action();
                  }}
                  className={`mt-6 w-full h-12 rounded-full pl-6 pr-1.5 flex items-center justify-between text-[13px] font-bold uppercase tracking-[0.08em] transition-all duration-300 outline-none ${
                    service.comingSoon
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none'
                      : 'bg-[#cc040a] text-white shadow-[0_12px_26px_-10px_rgba(204,4,10,0.6)] group-hover:bg-[#a80308] cursor-pointer active:scale-[0.98]'
                  }`}
                >
                  <span>{service.comingSoon ? 'Coming Soon' : service.buttonText}</span>
                  {!service.comingSoon && (
                    <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
