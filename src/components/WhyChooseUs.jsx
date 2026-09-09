import React from 'react';
import { Zap, Tag, ShieldCheck } from 'lucide-react';

export const WhyChooseUs = () => {
  const features = [
    {
      num: '01',
      title: 'Instant Automated Delivery',
      description: 'Our fully automated system delivers Free Fire diamonds and Garena Shells directly to your account in under 2 seconds after payment. No waiting — just gaming.',
      icon: Zap,
      badgeBg: 'bg-blue-600'
    },
    {
      num: '02',
      title: 'Unbeatable Local Prices',
      description: 'We offer the cheapest prices for diamonds and shells in Sri Lanka. Get more for your money and enjoy exclusive discounts available only at MADS TOPUP.',
      icon: Tag,
      badgeBg: 'bg-emerald-600'
    },
    {
      num: '03',
      title: 'Secure & Trusted Service',
      description: 'Top up with confidence using UID only — no password required. We support multiple secure local payment options including Bank, eZ Cash, and Cards.',
      icon: ShieldCheck,
      badgeBg: 'bg-purple-600'
    }
  ];

  return (
    <section id="why-choose-us" className="py-24 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Section Header */}
        <div className="space-y-3 mb-16">
          <span className="text-xs font-black text-red-600 tracking-widest uppercase font-mono bg-red-50 px-3 py-1 rounded-full border border-red-100">
            — WHY CHOOSE US —
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-heading tracking-tight">
            The Best Free Fire <span className="text-red-600">Top-Up Experience in Sri Lanka</span>
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-semibold max-w-2xl mx-auto">
            Discover why thousands of gamers trust MADS TOPUP for instant, cheap, and secure top-ups. We are dedicated to providing the fastest service for Free Fire, Garena Shells, and PUBG.
          </p>
        </div>

        {/* 3 Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.num}
                className="relative bg-white p-9 rounded-3xl border border-slate-200/80 card-shadow-premium card-shadow-hover flex flex-col justify-between text-left space-y-6 overflow-hidden group"
              >
                {/* Giant Faded Translucent Number */}
                <div className="absolute top-4 right-6 text-7xl font-black text-slate-100 font-heading pointer-events-none group-hover:text-red-100/60 transition-colors select-none">
                  {item.num}
                </div>

                <div className="relative z-10 space-y-4">
                  <div className={`w-12 h-12 rounded-2xl ${item.badgeBg} text-white flex items-center justify-center shadow-lg shadow-blue-500/10`}>
                    <Icon className="w-6 h-6 stroke-[2.5]" />
                  </div>

                  <h3 className="text-xl font-black text-slate-900 font-heading">
                    {item.title}
                  </h3>

                  <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
