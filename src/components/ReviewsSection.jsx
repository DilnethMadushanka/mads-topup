import React from 'react';
import { Star, ArrowRight, Quote, BadgeCheck, Zap, Globe2, Headphones, Award, Sparkles, ShieldCheck, MessageSquareHeart } from 'lucide-react';
import { useApp } from '../context/AppContext';

const TICKER = [
  { icon: ShieldCheck, text: 'Fast & secure' },
  { icon: Globe2, text: 'Available worldwide' },
  { icon: Headphones, text: '24/7 automated support' },
  { icon: Award, text: "Sri Lanka's #1 choice" },
  { icon: Sparkles, text: 'Welcome to MADS TOPUP' },
  { icon: Zap, text: 'Instant delivery in 2 seconds' },
];

const Stars = ({ value }) => (
  <span className="rv-stars" aria-label={`${value} out of 5 stars`}>
    {[0, 1, 2, 3, 4].map((i) => <Star key={i} className={i < Math.round(value) ? 'is-on' : ''} />)}
  </span>
);

export const ReviewsSection = () => {
  const { openReviewsPage, userReviews } = useApp();

  const reviewsList = Array.isArray(userReviews) ? userReviews : [];

  // The track scrolls by half its width, so it holds the list twice; short lists are repeated first
  // so one half is always wider than the screen.
  const base = reviewsList.length > 0 && reviewsList.length < 5 ? [...reviewsList, ...reviewsList] : reviewsList;
  const marqueeReviews = [...base, ...base];

  const rated = reviewsList.filter((r) => Number(r.rating) > 0);
  const average = rated.length ? rated.reduce((sum, r) => sum + Number(r.rating), 0) / rated.length : 0;

  return (
    <section id="reviews-section" className="rv-section">

      {/* Running ticker */}
      <div className="rv-ticker" aria-hidden="true">
        <div className="rv-ticker-track">
          {[...TICKER, ...TICKER].map(({ icon: Icon, text }, idx) => (
            <span key={idx} className="rv-ticker-item"><Icon />{text}</span>
          ))}
        </div>
      </div>

      <div className="rv-wrap">
        <div className="rv-head">
          <div>
            <span className="rv-kicker"><MessageSquareHeart /> Community</span>
            <h2 className="rv-title">What our <span>customers say</span></h2>
            <p className="rv-lead">Real reviews from our gaming community worldwide</p>
          </div>

          {rated.length > 0 && (
            <div className="rv-score">
              <span className="rv-score-num">{average.toFixed(1)}</span>
              <span className="rv-score-body">
                <Stars value={average} />
                <small>Based on {rated.length} review{rated.length === 1 ? '' : 's'}</small>
              </span>
            </div>
          )}
        </div>
      </div>

      {reviewsList.length > 0 ? (
        <div className="rv-marquee">
          <div className="rv-track">
            {marqueeReviews.map((review, index) => {
              const hasAvatar = review.avatar && !review.avatar.includes('profile_pics-[#3b82f6]');
              return (
                <button type="button" key={`${review.id}-${index}`} onClick={openReviewsPage} className="rv-card">
                  <span className="rv-card-top">
                    <Stars value={Number(review.rating) || 0} />
                    <Quote className="rv-quote" aria-hidden="true" />
                  </span>
                  <span className="rv-text">{review.text}</span>
                  <span className="rv-author">
                    {hasAvatar ? (
                      <img src={review.avatar} alt="" className="rv-avatar" loading="lazy" />
                    ) : (
                      <span className="rv-avatar is-initials">{review.initials || String(review.name || 'G').charAt(0)}</span>
                    )}
                    <span className="rv-who">
                      <span className="rv-name">{review.name}</span>
                      <span className="rv-where">{review.flag || '🇱🇰'} {review.location || 'Sri Lanka'}</span>
                    </span>
                    <span className="rv-verified" title="Verified buyer"><BadgeCheck /><span>Verified</span></span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rv-wrap">
          <div className="rv-empty">
            <span className="rv-empty-ico"><Star /></span>
            <h3>No reviews submitted yet</h3>
            <p>Be the first gamer to share your top-up experience with our community!</p>
          </div>
        </div>
      )}

      <div className="rv-wrap rv-cta-row">
        <button onClick={openReviewsPage} className="rv-cta">
          View all reviews <ArrowRight />
        </button>
      </div>
    </section>
  );
};
