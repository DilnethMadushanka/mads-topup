import React from 'react';
import { Star, ArrowRight, Quote } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ReviewsSection = () => {
  const { showToast } = useApp();

  const reviews = [
    {
      id: 1,
      name: 'YDTECH2008',
      location: 'Colombo, Sri Lanka',
      flag: '🇱🇰',
      avatar: '/uploads/profile_pics/1344_4bf2414e.png',
      initials: 'YD',
      text: '"I recently used the Nova top-up service and I am very satisfied. The process was fast, secure, and easy to understand. My top-up was delivered instantly without any issues."'
    },
    {
      id: 2,
      name: 'YDTECHTOPUP',
      location: 'Colombo, Sri Lanka',
      flag: '🇱🇰',
      avatar: '/uploads/profile_pics/11442_c1754a6f.png',
      initials: 'YT',
      text: '"Maru bam me vidihata kollo kellange hitha sathutu karanavata. Vishvasaneeyathva saha aduma milata top up karanavanam MADS TOPUP thamai"'
    },
    {
      id: 3,
      name: 'Akthar',
      location: 'Kandy, Sri Lanka',
      flag: '🇱🇰',
      avatar: '/uploads/profile_pics/10175_871f5dc4.png',
      initials: 'A',
      text: '"Nova top-up is so cool very convenient, also very reliable price just few seconds to get my top up done & no issues at all. Especially hats off for their fast service!"'
    },
    {
      id: 4,
      name: 'Lekzii',
      location: 'Colombo, Sri Lanka',
      flag: '🇱🇰',
      avatar: '/uploads/profile_pics/15_6d8c0304.png',
      initials: 'L',
      text: '"This app is so cool 😍 very convenient, also very reliable. Just took few seconds to get my top up done & no issues at all. LOVE THE EXPERIENCE & 100% RECOMMENDED!!"'
    }
  ];

  return (
    <section id="reviews-section" className="py-24 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Header */}
        <div className="space-y-3 mb-16">
          <span className="text-xs font-black text-[#00B4D8] tracking-widest uppercase font-mono bg-[#00B4D8]/10 px-4 py-1.5 rounded-full border border-[#00B4D8]/20">
            — COMMUNITY —
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-heading tracking-tight">
            What Our <span className="text-[#00B4D8]">Customers Say</span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-semibold max-w-lg mx-auto">
            Real reviews from our gaming community worldwide
          </p>
        </div>

        {/* Reviews Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {reviews.map((review) => (
            <div 
              key={review.id}
              className="bg-[#F8FAFF] p-7 rounded-3xl border border-slate-200 shadow-sm hover:border-[#00B4D8]/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 flex flex-col justify-between text-left space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {review.avatar ? (
                    <img 
                      src={review.avatar} 
                      alt={review.name} 
                      className="w-11 h-11 rounded-full object-cover border-2 border-[#00B4D8]/40 shadow-md"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#3B2896] text-white font-extrabold text-xs flex items-center justify-center shadow">
                      {review.initials}
                    </div>
                  )}
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{review.name}</h4>
                    <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                      <span>{review.flag}</span>
                      <span>{review.location}</span>
                    </p>
                  </div>
                </div>
                <Quote className="w-6 h-6 text-slate-300" />
              </div>

              {/* Stars */}
              <div className="flex text-[#00B4D8] gap-1 text-xs">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#00B4D8]" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-xs text-slate-700 italic font-semibold leading-relaxed flex-1">
                {review.text}
              </p>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <button
          onClick={() => showToast('Displaying all 500+ verified gamer reviews')}
          className="px-8 py-3.5 rounded-full border-2 border-[#00B4D8] text-[#00B4D8] hover:bg-[#00B4D8] hover:text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-lg shadow-cyan-500/10"
        >
          <span>VIEW ALL REVIEWS</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </section>
  );
};
