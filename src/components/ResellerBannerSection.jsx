import React from 'react';
import { useApp } from '../context/AppContext';
import { UserPlus, LogIn, Crown, ArrowRight, BadgeCheck, Handshake, Check, Sparkles } from 'lucide-react';

const PERKS = ['Instant payouts', 'Wholesale pricing', 'Dedicated support'];

export const ResellerBannerSection = () => {
  const { openResellerPage, openResellerLoginPage } = useApp();

  const cards = [
    {
      key: 'join',
      icon: UserPlus,
      tag: 'New partners',
      title: 'Become a reseller',
      desc: 'Get wholesale prices and exclusive benefits. Earn competitive commissions on every top-up you sell.',
      points: ['Wholesale game prices', 'Commission on every sale', 'No minimum sales'],
      cta: 'Register now',
      ctaIcon: Crown,
      onClick: openResellerPage,
      featured: true,
    },
    {
      key: 'login',
      icon: LogIn,
      tag: 'Existing partners',
      title: 'Reseller login',
      desc: 'Already a reseller? Open your dashboard to manage orders, track sales and watch your earnings.',
      points: ['Manage your orders', 'Track sales live', 'Monitor your earnings'],
      cta: 'Login',
      ctaIcon: ArrowRight,
      onClick: openResellerLoginPage,
    },
  ];

  return (
    <section id="reseller-section" className="rs-section">
      <div className="rs-wrap">
        <div className="rs-head">
          <div>
            <span className="rs-kicker"><Handshake /> Partner with us</span>
            <h2 className="rs-title">Reseller <span>program</span></h2>
            <p className="rs-lead">Join our network and start earning competitive commissions today.</p>
          </div>
          <ul className="rs-perks">
            {PERKS.map((p) => <li key={p}><BadgeCheck />{p}</li>)}
          </ul>
        </div>

        <div className="rs-grid">
          {cards.map(({ key, icon: Icon, tag, title, desc, points, cta, ctaIcon: CtaIcon, onClick, featured }) => (
            <div key={key} className={`rs-card${featured ? ' is-featured' : ''}`}>
              <div className="rs-card-top">
                <span className="rs-ico"><Icon /></span>
                <span className="rs-tag">{featured && <Sparkles />}{tag}</span>
              </div>
              <h3 className="rs-card-title">{title}</h3>
              <p className="rs-card-desc">{desc}</p>
              <ul className="rs-points">
                {points.map((pt) => <li key={pt}><span><Check /></span>{pt}</li>)}
              </ul>
              <button type="button" onClick={onClick} className="rs-btn">
                {cta}
                <CtaIcon className="rs-btn-ico" />
              </button>
            </div>
          ))}
        </div>

        <p className="rs-note"><Sparkles />Start earning today with no minimum sales requirement</p>
      </div>
    </section>
  );
};
