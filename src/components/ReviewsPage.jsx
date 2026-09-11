import React, { useState } from 'react';
import { Star, Quote, ArrowLeft, PenSquare, Search, ThumbsUp, CheckCircle, Sparkles, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ReviewsPage = () => {
  const { userReviews, addReview, closeReviewsPage, userProfile, showToast } = useApp();

  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 5 | 4 | 3 | 2 | 1
  const [searchQuery, setSearchQuery] = useState('');

  // Write Review Form State
  const [formRating, setFormRating] = useState(5);
  const [formHoverRating, setFormHoverRating] = useState(0);
  const [formName, setFormName] = useState(userProfile?.name || '');
  const [formLocation, setFormLocation] = useState('Colombo, Sri Lanka');
  const [formFlag, setFormFlag] = useState('🇱🇰');
  const [formText, setFormText] = useState('');

  const handleWriteSubmit = (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
    if (!formText.trim() || formText.trim().length < 5) {
      showToast('Please write a review comment (at least 5 characters)', 'error');
      return;
    }

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    const initials = formName.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'G';

    const newRev = {
      id: 'rev-' + Date.now(),
      name: formName.trim(),
      location: formLocation.trim() || 'Sri Lanka',
      flag: formFlag || '🇱🇰',
      rating: formRating,
      avatar: userProfile?.avatar || '',
      initials,
      text: formText.trim(),
      date: formattedDate
    };

    addReview(newRev);
    setIsWriteModalOpen(false);
    setFormText('');
  };

  // Calculate Rating Distribution
  const totalReviewsCount = 288 + (userReviews ? userReviews.length - 9 : 0);
  const count5 = 263 + (userReviews ? userReviews.filter(r => r.rating === 5).length - 8 : 0);
  const count4 = 17 + (userReviews ? userReviews.filter(r => r.rating === 4).length - 1 : 0);
  const count3 = 5;
  const count2 = 2;
  const count1 = 1;

  // Filter Reviews
  const filteredReviews = (userReviews || []).filter(rev => {
    const matchesFilter = selectedFilter === 'ALL' || rev.rating === selectedFilter;
    const matchesSearch = !searchQuery.trim() || 
      rev.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      rev.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rev.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFF] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Back to Home Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={closeReviewsPage}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-100 hover:text-[#cc040a] transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>24/7 Verified Gamer Reviews</span>
          </div>
        </div>

        {/* Hero Header matching screenshot */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] text-xs font-black tracking-wider uppercase">
            <Star className="w-3.5 h-3.5 fill-[#3b82f6]" />
            <span>VERIFIED REVIEWS</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-heading">
            What Our <span className="text-[#3b82f6]">Customers Say</span>
          </h1>
          
          <p className="text-slate-600 text-sm sm:text-base font-semibold">
            Real reviews from our gaming community across Sri Lanka and worldwide.
          </p>
        </div>

        {/* Summary Card matching screenshot */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Rating Box */}
          <div className="lg:col-span-3 text-center lg:text-left flex flex-col items-center lg:items-start justify-center space-y-2 border-b lg:border-b-0 lg:border-r border-slate-200 pb-6 lg:pb-0 lg:pr-6">
            <div className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight">
              4.9
            </div>
            <div className="flex text-amber-400 gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <div className="text-xs font-extrabold text-slate-500">
              {totalReviewsCount} total reviews
            </div>
          </div>

          {/* Middle Progress Bars */}
          <div className="lg:col-span-6 space-y-2.5">
            {[
              { stars: 5, count: count5, percent: Math.round((count5 / totalReviewsCount) * 100) },
              { stars: 4, count: count4, percent: Math.round((count4 / totalReviewsCount) * 100) },
              { stars: 3, count: count3, percent: 2 },
              { stars: 2, count: count2, percent: 1 },
              { stars: 1, count: count1, percent: 1 },
            ].map((row) => (
              <div key={row.stars} className="flex items-center gap-3 text-xs font-bold text-slate-600">
                <span className="w-6 flex items-center gap-1 font-extrabold text-slate-700">
                  {row.stars} <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                </span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-[#3b82f6] rounded-full transition-all duration-500" 
                    style={{ width: `${Math.max(2, row.percent)}%` }}
                  ></div>
                </div>
                <span className="w-8 text-right font-mono text-slate-500">{row.count}</span>
              </div>
            ))}
          </div>

          {/* Right Write Review Action Box */}
          <div className="lg:col-span-3 text-center flex flex-col items-center justify-center space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-200/80">
            <h3 className="font-extrabold text-slate-900 text-base">Share Your Experience</h3>
            <p className="text-xs font-semibold text-slate-500 max-w-xs">
              Help other gamers and tell us how we did.
            </p>
            <button
              onClick={() => setIsWriteModalOpen(true)}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-[#3b82f6] hover:from-cyan-600 hover:to-blue-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PenSquare className="w-4 h-4" />
              <span>Write a Review</span>
            </button>
          </div>

        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            {['ALL', 5, 4, 3, 2, 1].map((ratingVal) => (
              <button
                key={ratingVal}
                onClick={() => setSelectedFilter(ratingVal)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFilter === ratingVal
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {ratingVal === 'ALL' ? 'All Reviews' : `${ratingVal} Stars (${
                  ratingVal === 5 ? count5 : ratingVal === 4 ? count4 : ratingVal === 3 ? count3 : ratingVal === 2 ? count2 : count1
                })`}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by gamer or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#3b82f6] focus:bg-white"
            />
          </div>
        </div>

        {/* Reviews Cards Grid matching screenshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReviews.length > 0 ? (
            filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-[#3b82f6]/40 transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
              >
                {/* Top User Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {rev.avatar ? (
                      <img
                        src={rev.avatar}
                        alt={rev.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-[#3b82f6]/30 shadow-xs group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3b82f6] to-cyan-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                        {rev.initials}
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-[#3b82f6] transition-colors">
                        {rev.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                        <span>{rev.flag || '🇱🇰'}</span>
                        <span>{rev.location}</span>
                      </p>
                    </div>
                  </div>
                  <Quote className="w-6 h-6 text-slate-200 group-hover:text-[#3b82f6]/40 transition-colors" />
                </div>

                {/* Star Rating */}
                <div className="flex text-amber-400 gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'
                      }`}
                    />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-xs text-slate-700 font-medium leading-relaxed italic flex-1">
                  "{rev.text}"
                </p>

                {/* Footer Date */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-slate-500 font-bold">Verified Buyer</span>
                  </div>
                  <span>Reviewed on {rev.date}</span>
                </div>

              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
              <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="font-extrabold text-slate-800 text-base">No reviews found</h3>
              <p className="text-xs font-medium text-slate-500">Try adjusting your star filter or search keywords.</p>
            </div>
          )}
        </div>

      </div>

      {/* Write a Review Modal */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <h3 className="font-black text-xl text-slate-900 font-heading">Write a Review</h3>
                <p className="text-xs font-semibold text-slate-500">Share your top-up experience with our community</p>
              </div>
              <button
                onClick={() => setIsWriteModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWriteSubmit} className="space-y-5">
              
              {/* Rating Selector */}
              <div className="space-y-2 text-center">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                  Your Overall Rating
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onMouseEnter={() => setFormHoverRating(star)}
                      onMouseLeave={() => setFormHoverRating(0)}
                      onClick={() => setFormRating(star)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          (formHoverRating || formRating) >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 fill-slate-100'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Your Gamer Name / Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SL_Slayer_99"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#3b82f6] focus:bg-white"
                />
              </div>

              {/* Location Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Location / City</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Colombo, Sri Lanka"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#3b82f6] focus:bg-white"
                />
              </div>

              {/* Comment Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Your Honest Review</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write details about your top-up experience, delivery speed, and customer service..."
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#3b82f6] focus:bg-white leading-relaxed resize-none"
                ></textarea>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 font-extrabold text-xs uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-[#3b82f6] text-white font-extrabold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shadow-md cursor-pointer"
                >
                  Submit Review
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
