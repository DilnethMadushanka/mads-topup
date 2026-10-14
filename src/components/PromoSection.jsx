import React from 'react';
import { Zap, MessageCircle, Lock, Award, Wallet, ArrowRight, Clock, ShieldCheck } from 'lucide-react';

const FEATURES = [
  { icon: Lock, title: 'Player ID / UID only', desc: 'No passwords, ever', tone: 'is-blue' },
  { icon: Wallet, title: 'Bank, eZ Cash & Crypto', desc: 'Pay the way you like', tone: 'is-teal' },
  { icon: Award, title: '10,000+ happy gamers', desc: 'Trusted across Sri Lanka', tone: 'is-gold' },
];

export const PromoSection = () => (
  <section className="tb-section">
    <div className="tb-wrap">
      <div className="tb-banner">
        <span className="tb-grid-bg" aria-hidden="true" />
        <Zap className="tb-mark" aria-hidden="true" />

        <div className="tb-main">
          <span className="tb-kicker"><i />MooGold automated system</span>
          <h2 className="tb-title">
            Sri Lanka's most trusted &amp; fastest <span>game top-up</span> platform
          </h2>
          <p className="tb-lead">
            Free Fire Diamonds, PUBG Mobile UC and Mobile Legends Diamonds credited to your game account in under 2 seconds. Safe, 100% authorized and password-free.
          </p>

          <ul className="tb-features">
            {FEATURES.map(({ icon: Icon, title, desc, tone }) => (
              <li key={title} className={`tb-feature ${tone}`}>
                <span className="tb-feature-ico"><Icon /></span>
                <span>
                  <strong>{title}</strong>
                  <small>{desc}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="tb-support">
          <div className="tb-support-top">
            <span className="tb-support-ico"><MessageCircle /></span>
            <span className="tb-online"><i />Online now</span>
          </div>
          <h3 className="tb-support-title">24/7 VIP support</h3>
          <p className="tb-support-desc">Questions or need help with an order? Chat with our team now.</p>

          <a href="https://wa.me/94740436276" target="_blank" rel="noreferrer" className="tb-wa">
            <MessageCircle />
            Chat on WhatsApp
            <ArrowRight className="tb-wa-arrow" />
          </a>

          <div className="tb-support-meta">
            <span><Clock />Replies in ~2 min</span>
            <span><ShieldCheck />Official team</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);
