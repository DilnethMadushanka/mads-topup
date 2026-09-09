import React from 'react';
import { Star, ArrowRight, Quote } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ReviewsSection = () => {
  const { showToast } = useApp();

  const reviews = [
    {
      id: 1,
      name: 'sahan_peiris',
      location: 'San Juan, Puerto Rico',
      flag: '🇵🇷',
      avatarBg: 'bg-indigo-600',
      initials: 'SP',
      text: '"Lankave thiyena ikmantama top up vatena website eka vagema vadima payment options premanayak thiyena website eka"'
    },
    {
      id: 2,
      name: 'Sehan topup store',
      location: 'Colombo, Sri Lanka',
      flag: '🇱🇰',
      avatarBg: 'bg-red-600',
      initials: 'S',
      text: '"Maru bam me vidihata kollo kellange hitha sathutu karanavata. Vishvasaneeyathva saha aduma milata top up karanavanam MADS TOPUP thamai"'
    },
    {
      id: 3,
      name: 'YDTECH2008',
      location: 'Colombo, Sri Lanka',
      flag: '🇱🇰',
      avatarBg: 'bg-slate-900',
      initials: 'YD',
      text: '"I recently used the MADS top-up service and I am very satisfied. The process was fast, secure, and easy to understand. My top-up was delivered instantly."'
    },
    {
      id: 4,
      name: 'Akthar',
      location: 'Kandy, Sri Lanka',
      flag: '🇱🇰',
      avatarBg: 'bg-blue-600',
      initials: 'A',
      text: '"MADS top-up is so cool very convenient, also very reliable price just few seconds to get my top up done & no issues at all. Especially hats off for their fast service!"'
    }
  ];

  return (
    <section id="reviews-section" className="py-24 bg-slate-50 border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Header */}
        <div className="space-y-3 mb-16">
          <span className="text-xs font-black text-red-600 tracking-widest uppercase font-mono bg-red-50 px-3 py-1 rounded-full border border-red-100">
            — COMMUNITY —
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-heading tracking-tight">
            What Our <span className="text-red-600">Customers Say</span>
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-semibold max-w-lg mx-auto">
            Real reviews from our gaming community worldwide
          </p>
        </div>

        {/* Reviews Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {reviews.map((review) => (
            <div 
              key={review.id}
              className="bg-white p-7 rounded-3xl border border-slate-200/80 card-shadow-premium card-shadow-hover flex flex-col justify-between text-left space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl ${review.avatarBg} text-white font-extrabold text-xs flex items-center justify-center shadow`}>
                    {review.initials}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{review.name}</h4>
                    <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                      <span>{review.flag}</span>
                      <span>{review.location}</span>
                    </p>
                  </div>
                </div>
                <Quote className="w-6 h-6 text-slate-200 fill-slate-100" />
              </div>

              {/* Stars */}
              <div className="flex text-amber-400 gap-1 text-xs">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-xs text-slate-600 italic font-semibold leading-relaxed flex-1">
                {review.text}
              </p>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <button
          onClick={() => showToast('Displaying all 500+ verified gamer reviews')}
          className="px-8 py-3.5 rounded-full border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
        >
          <span>VIEW ALL REVIEWS</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </section>
  );
};
