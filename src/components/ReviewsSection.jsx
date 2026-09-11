import React from 'react';
import { Star, ArrowRight, Quote } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ReviewsSection = () => {
  const { openReviewsPage, userReviews } = useApp();

  const reviewsList = (userReviews && userReviews.length > 0) ? userReviews : [
    {
      id: 'rev-1',
      name: 'Nole Editz',
      location: 'Colombo, Sri Lanka',
      flag: '🇱🇰',
      rating: 5,
      avatar: '/uploads/profile_pics/1344_4bf2414e.png',
      initials: 'NE',
      text: 'MADS TOPUP IS THE LOW PRICE AND FAST TOP UP STORE WE HAPPY TO HAVE LIKE THIS STORE THE DIAMOND IS LUCKY A FEW EVENTS I GOT SUPER PRICES'
    },
    {
      id: 'rev-2',
      name: 'ifrajahmath',
      location: 'Colombo, Sri Lanka',
      flag: '🇱🇰',
      rating: 5,
      avatar: '/uploads/profile_pics-[#3b82f6]',
      initials: 'I',
      text: 'Super cool All Game top up in one place. 100% trustable and friendly website 🥰. Try your top up and enjoy your game very well 🥳.'
    },
    {
      id: 'rev-3',
      name: 'sathmina',
      location: 'Kandy, Sri Lanka',
      flag: '🇱🇰',
      rating: 5,
      avatar: '/uploads/profile_pics/10175_871f5dc4.png',
      initials: 'S',
      text: 'The only top-up store in Sri Lanka that allows you to quickly top up by transacting with the largest number of payment methods used in the country.'
    },
    {
      id: 'rev-4',
      name: 'YDTECHTOPUP',
      location: 'Colombo, Sri Lanka',
      flag: '🇱🇰',
      rating: 5,
      avatar: '/uploads/profile_pics/11442_c1754a6f.png',
      initials: 'YT',
      text: 'Maru bam me vidihata kollo kellange hitha sathutu karanavata. Vishvasaneeyathva saha aduma milata top up karanavanam MADS TOPUP thamai'
    },
    {
      id: 'rev-5',
      name: 'Lekzii',
      location: 'Colombo, Sri Lanka',
      flag: '🇱🇰',
      rating: 5,
      avatar: '/uploads/profile_pics/15_6d8c0304.png',
      initials: 'L',
      text: 'This app is so cool 😍 very convenient, also very reliable. Just took few seconds to get my top up done & no issues at all. 100% RECOMMENDED!!'
    }
  ];

  // Duplicate list to achieve 100% seamless infinite looping marquee
  const marqueeReviews = [...reviewsList, ...reviewsList];

  const tickerItems = [
    '• FAST & SECURE',
    '• AVAILABLE WORLDWIDE',
    '• 24/7 AUTOMATED SUPPORT',
    '• SRI LANKA\'S #1 CHOICE',
    '• WELCOME TO MADS TOPUP',
    '• INSTANT DELIVERY IN 2 SECONDS'
  ];
  const tickerLoop = [...tickerItems, ...tickerItems, ...tickerItems];

  return (
    <section id="reviews-section" className="py-20 bg-white border-t border-slate-200/80 overflow-hidden relative">
      
      {/* Top Running Ticker Bar (Matching Screenshot Top Ticker) */}
      <div className="w-full bg-slate-50/80 border-b border-slate-200/60 py-2.5 overflow-hidden mb-12">
        <div className="animate-infinite-ticker flex items-center gap-8 whitespace-nowrap text-[11px] font-black text-slate-500 uppercase tracking-widest font-mono">
          {tickerLoop.map((item, idx) => (
            <span key={idx} className="flex items-center gap-2 hover:text-[#cc040a] transition-colors">
              <span className="text-[#cc040a]">●</span>
              <span>{item.replace('• ', '')}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
        
        {/* Header */}
        <div className="space-y-3">
          <span className="text-xs font-black text-[#cc040a] tracking-widest uppercase font-mono bg-[#cc040a]/10 px-4 py-1.5 rounded-full border border-[#cc040a]/20">
            — COMMUNITY —
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-heading tracking-tight">
            What Our <span className="text-[#cc040a]">Customers Say</span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-semibold max-w-lg mx-auto">
            Real reviews from our gaming community worldwide
          </p>
        </div>

        {/* Live Auto-Scrolling Infinite Carousel Track (Matching User Screenshot) */}
        <div className="relative w-full overflow-hidden py-4 group">
          
          {/* Subtle Side Fades for Premium Look */}
          <div className="absolute top-0 bottom-0 left-0 w-16 sm:w-24 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none"></div>
          <div className="absolute top-0 bottom-0 right-0 w-16 sm:w-24 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none"></div>

          {/* Marquee Track Container */}
          <div className="animate-infinite-marquee flex items-stretch gap-6">
            {marqueeReviews.map((review, index) => (
              <div 
                key={`${review.id}-${index}`}
                onClick={openReviewsPage}
                className="w-[300px] sm:w-[360px] bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-2xl hover:border-[#cc040a]/40 hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between text-left space-y-4 shrink-0 cursor-pointer relative overflow-hidden group/card"
              >
                {/* Top Accent Line on Hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#cc040a] rounded-t-3xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"></div>

                {/* User Header */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    {review.avatar && !review.avatar.includes('profile_pics-[#3b82f6]') ? (
                      <img 
                        src={review.avatar} 
                        alt={review.name} 
                        className="w-11 h-11 rounded-full object-cover border-2 border-[#cc040a]/40 shadow-xs group-hover/card:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#cc040a] text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {review.initials || 'G'}
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm group-hover/card:text-[#cc040a] transition-colors">
                        {review.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                        <span>{review.flag || '🇱🇰'}</span>
                        <span>{review.location || 'Sri Lanka'}</span>
                      </p>
                    </div>
                  </div>
                  <Quote className="w-6 h-6 text-slate-200 group-hover/card:text-[#cc040a]/40 transition-colors" />
                </div>

                {/* Stars */}
                <div className="flex text-amber-400 gap-1 text-xs relative z-10">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Quote Text */}
                <p className="text-xs text-slate-700 italic font-semibold leading-relaxed flex-1 relative z-10">
                  "{review.text}"
                </p>

                {/* Bottom Glow Accent */}
                <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono font-bold">
                  <span className="text-[#cc040a]">✔ VERIFIED BUYER</span>
                  <span>MADS TOPUP</span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* View All Button (Matching Screenshot) */}
        <div className="pt-2">
          <button
            onClick={openReviewsPage}
            className="px-8 py-3.5 rounded-full border-2 border-[#cc040a] text-[#cc040a] hover:bg-[#cc040a] hover:text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-lg shadow-red-500/10 hover:scale-105"
          >
            <span>VIEW ALL REVIEWS</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};
