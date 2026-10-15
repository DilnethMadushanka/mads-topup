import React, { useEffect, useRef, useState } from 'react';

// "What MADS TOPUP offers" — numbered list on the left, a feature card on the
// right that follows the selected item. Cycles on its own until someone picks one.
const OFFERS = [
  {
    tag: 'Trusted',
    title: "Sri Lanka's top-up store",
    text: 'MADS TOPUP sells diamonds, UC and gift cards for the biggest mobile games, priced in rupees for Sri Lankan players.',
    image: '/game_banners/freefire.jpg',
  },
  {
    tag: 'Speed',
    title: 'Instant delivery',
    text: 'Orders go straight to the game and usually land in your account within seconds, day or night.',
    image: '/game_banners/pubg.jpg',
  },
  {
    tag: 'Safety',
    title: 'Payment security',
    text: 'Card payments run through Dialog Genie, and every wallet deposit is checked by our server before it is credited.',
    image: '/game_banners/deltaforce.jpg',
  },
  {
    tag: 'Privacy',
    title: 'No password needed',
    text: 'We only ask for your player ID. Your game login and password always stay with you.',
    image: '/game_banners/mobilelegends.jpg',
  },
  {
    tag: 'Payments',
    title: 'Multiple payment channels',
    text: 'Pay with eZ Cash, bank transfer, Visa or Mastercard, Binance USDT or your MADS wallet.',
    image: '/game_banners/bloodstrike.jpg',
  },
  {
    tag: 'Support',
    title: '24/7 support',
    text: 'Questions about an order? Our support team is on live chat whenever you need help.',
    image: '/game_banners/freefire.jpg',
  },
];

const CYCLE_MS = 5000;

export const OfferSection = () => {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return undefined; }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!auto || !visible) return undefined;
    const t = setTimeout(() => setActive((i) => (i + 1) % OFFERS.length), CYCLE_MS);
    return () => clearTimeout(t);
  }, [active, auto, visible]);

  const pick = (i) => { setActive(i); setAuto(false); };
  const item = OFFERS[active];
  const num = (i) => String(i + 1).padStart(2, '0');

  return (
    <section ref={sectionRef} className="offer-section" aria-labelledby="offer-heading">
      <div className="offer-wrap">
        <h2 id="offer-heading" className="offer-heading">MADS TOPUP can offer you</h2>

        <div className="offer-grid">
          <ol className="offer-list" role="tablist" aria-label="What MADS TOPUP offers">
            {OFFERS.map((o, i) => (
              <li key={o.title}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  className={`offer-item ${i === active ? 'is-on' : ''}`}
                  onClick={() => pick(i)}
                  onMouseEnter={() => pick(i)}
                >
                  <span className="offer-num">
                    {num(i)}
                    <span className="offer-line">
                      {i === active && <span key={`${active}-${auto}`} className={`offer-line-fill ${auto && visible ? 'is-run' : ''}`} style={{ '--cycle': `${CYCLE_MS}ms` }} />}
                    </span>
                  </span>
                  <span className="offer-title">{o.title}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="offer-card" role="tabpanel" aria-live="polite">
            <div className="offer-card-media">
              {OFFERS.map((o, i) => (
                <img key={o.title} src={o.image} alt="" loading="lazy" className={i === active ? 'is-on' : ''} />
              ))}
              <div className="offer-card-brand">
                <span className="offer-card-kicker">Sri Lanka's trusted</span>
                <span className="offer-card-big">Game Top-Up Store</span>
                <span className="offer-card-logo"><img src="/mads-icon-192.png" alt="" />MADS <b>TOPUP</b></span>
              </div>
            </div>
            <div key={active} className="offer-card-body">
              <span className="offer-tag">{item.tag}</span>
              <h3 className="offer-card-title"><span>{num(active)}</span>{item.title}</h3>
              <p className="offer-card-text">{item.text}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
