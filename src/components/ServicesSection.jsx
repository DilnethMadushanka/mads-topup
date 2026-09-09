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
      description: 'Instant in-game currency delivered to your account at unbeatable LKR rates',
      buttonText: 'SHOP NOW',
      icon: Gamepad2,
      image: '/product_images/prod_100_Diamonds_1768964745_diamondpng.png',
      tileGradient: 'from-[#00B4D8] to-blue-600',
      tileGlow: 'shadow-lg shadow-cyan-500/20',
      iconColor: 'text-white',
      action: scrollToCatalog
    },
    {
      id: 'cards',
      title: 'Cards & Vouchers',
      description: 'Garena Shells, Hot Recharge Codes & premium digital gift vouchers',
      buttonText: 'SHOP NOW',
      icon: CreditCard,
      image: '/gift_cards/shell.png',
      tileGradient: 'from-[#3B2896] to-indigo-700',
      tileGlow: 'shadow-lg shadow-purple-500/20',
      iconColor: 'text-white',
      action: () => showToast('Garena Shells & Digital Vouchers section active!')
    },
    {
      id: 'support',
      title: '24/7 VIP Support',
      description: 'Dedicated live WhatsApp support team ready to assist your top-up orders',
      buttonText: 'CHAT NOW',
      icon: Headphones,
      image: '/gift_cards/admin.png',
      tileGradient: 'from-[#00B4D8] to-teal-500',
      tileGlow: 'shadow-lg shadow-cyan-500/20',
      iconColor: 'text-white',
      action: () => window.open('https://wa.me/94771234567', '_blank')
    },
    {
      id: 'other',
      title: 'Automated Shell Bot',
      description: 'Explore our automated Garena Shell Bot & instant credit gaming tools',
      buttonText: 'VIEW MORE',
      icon: Sparkles,
      image: '/gift_cards/shellbot.png',
      tileGradient: 'from-slate-800 to-slate-950',
      tileGlow: 'shadow-lg shadow-slate-900/40',
      iconColor: 'text-[#00B4D8]',
      action: scrollToCatalog
    }
  ];

  return (
    <section id="services-section" className="py-24 bg-[#0A0F1E] border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Section Header */}
        <div className="space-y-3 mb-16">
          <span className="text-xs font-black text-[#00B4D8] tracking-widest uppercase font-mono bg-[#00B4D8]/10 px-4 py-1.5 rounded-full border border-[#00B4D8]/20">
            — WHAT WE OFFER —
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-white font-heading tracking-tight uppercase">
            Our Premium <span className="text-[#00B4D8]">Services</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base font-semibold max-w-lg mx-auto">
            Elevate your gaming experience with our top-tier minimalist digital services
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className="group bg-[#0F172A]/90 rounded-3xl p-8 border border-slate-800/80 hover:border-[#00B4D8]/60 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 flex flex-col justify-between items-center text-center relative overflow-hidden"
              >
                {/* Top Subtle Cyan Glow Line */}
                <div className="absolute top-0 inset-x-0 h-1 bg-[#00B4D8] opacity-0 group-hover:opacity-100 transition-opacity"></div>

                {/* 3D App Icon Tile */}
                <div className="mb-7 relative">
                  <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${service.tileGradient} ${service.tileGlow} flex items-center justify-center relative overflow-hidden transform group-hover:scale-105 transition-all duration-300 p-3`}>
                    {service.image ? (
                      <img src={service.image} alt={service.title} className="w-full h-full object-contain filter drop-shadow-md relative z-10" />
                    ) : (
                      <Icon className={`w-12 h-12 ${service.iconColor} stroke-[1.8] relative z-10`} />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2 mb-8">
                  <h3 className="text-xl font-black text-white font-heading">
                    {service.title}
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed font-medium">
                    {service.description}
                  </p>
                </div>

                {/* Action Button */}
                <button
                  onClick={service.action}
                  className="btn-cyan-pill w-full py-3 px-6 rounded-full font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 group-hover:gap-3 cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  <span className="font-mono">{service.buttonText}</span>
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



