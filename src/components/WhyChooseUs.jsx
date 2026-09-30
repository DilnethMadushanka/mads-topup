import React from 'react';
import { Zap, Tag, ShieldCheck } from 'lucide-react';

export const WhyChooseUs = () => {
  const features = [
    {
      num: '01',
      title: 'Instant Automated Delivery',
      description: 'Our fully automated system delivers Free Fire diamonds and Garena Shells directly to your account in under 2 seconds after payment. No waiting — just gaming.',
      icon: Zap,
      badgeBg: 'bg-[#cc040a]'
    },
    {
      num: '02',
      title: 'Unbeatable Local Prices',
      description: 'We offer the cheapest prices for diamonds and shells in Sri Lanka. Get more for your money and enjoy exclusive discounts available only at MADS TOPUP.',
      icon: Tag,
      badgeBg: 'bg-[#3B2896]'
    },
    {
      num: '03',
      title: 'Secure & Trusted Service',
      description: 'Top up with confidence using UID only — no password required. We support multiple secure local payment options including Bank, eZ Cash, and Cards.',
      icon: ShieldCheck,
      badgeBg: 'bg-[#990207]'
    }
  ];

  return (
    <section id="why-choose-us" className="py-24 sm:py-28 bg-[#F8FAFF] border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Section Header */}
        <div className="section-header space-y-3">
          <span className="section-badge">— WHY CHOOSE US —</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-heading tracking-tight leading-[1.1]">
            The Best Free Fire <span className="text-[#cc040a]">Top-Up Experience in Sri Lanka</span>
          </h2>
          <p className="text-slate-500 text-base font-medium max-w-2xl mx-auto leading-relaxed">
            Discover why thousands of gamers trust MADS TOPUP for instant, cheap, and secure top-ups. We are dedicated to providing the fastest service for Free Fire, Garena Shells, and PUBG.
          </p>
        </div>

        {/* 3 Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.num}
                className="mads-card p-8 sm:p-10 flex flex-col justify-between text-left space-y-6 group"
              >
                {/* Giant Translucent Background Number */}
                <div className="absolute top-4 right-6 text-7xl font-extrabold text-slate-100 font-heading pointer-events-none group-hover:text-[#cc040a]/15 transition-colors duration-300 select-none">
                  {item.num}
                </div>

                <div className="relative z-10 space-y-5">
                  <div className={`w-14 h-14 rounded-2xl ${item.badgeBg} text-white flex items-center justify-center shadow-lg shadow-red-500/30 transition-transform duration-300 group-hover:-translate-y-0.5`}>
                    <Icon className="w-7 h-7 stroke-[2.5]" />
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 font-heading tracking-tight group-hover:text-[#cc040a] transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-sm text-slate-500 leading-relaxed font-medium">
                    {item.description}
                  </p>
                </div>

                {/* Animated Bottom Cyan Glow Line (Matching Reference Screenshot) */}
                <div className="mads-card-glow-bar"></div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

