import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, Gamepad2, Gift, Sparkles } from 'lucide-react';

// "Our Premium Services": three compact cards with an icon tile in the accent
// colour. On phones they collapse into short rows.
export const ServicesSection = () => {
  const { openCatalog } = useApp();

  const services = [
    {
      id: 'topup',
      icon: Gamepad2,
      tone: 'blue',
      tag: 'Instant',
      title: 'Game Top-Up',
      description: 'Diamonds, UC and coins sent straight to your game account at the best LKR prices.',
      buttonText: 'Shop now',
      action: openCatalog
    },
    {
      id: 'cards',
      icon: Gift,
      tone: 'gold',
      tag: 'PIN codes',
      title: 'Gift Cards',
      description: 'Garena Shells, bot recharge codes and other gift cards for gamers.',
      buttonText: 'Shop now',
      action: openCatalog
    },
    {
      id: 'other',
      icon: Sparkles,
      tone: 'teal',
      tag: 'Coming soon',
      title: 'Other Services',
      description: 'More free and premium digital services are on the way.',
      comingSoon: true
    }
  ];

  return (
    <section id="services-section" className="svc-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="section-header space-y-3 text-center">
          <span className="section-badge">— WHAT WE OFFER —</span>
          <h2 className="midas-heading text-3xl sm:text-5xl font-extrabold text-slate-900 font-heading tracking-tight leading-[1.1]">
            Our Premium <span className="text-[#1677ff]">Services</span>
          </h2>
          <p className="text-slate-500 text-base font-medium max-w-md mx-auto leading-relaxed">
            Everything you need to top up and play, in one place
          </p>
        </div>

        <div className="svc-grid">
          {services.map(({ id, icon: Icon, tone, tag, title, description, buttonText, action, comingSoon }) => (
            <button
              key={id}
              type="button"
              disabled={comingSoon}
              onClick={comingSoon ? undefined : action}
              className={`svc-card is-${tone} ${comingSoon ? 'is-soon' : ''}`}
            >
              <Icon className="svc-watermark" aria-hidden="true" />
              <span className="svc-ico"><Icon /></span>
              <span className="svc-body">
                <span className="svc-tag">{tag}</span>
                <span className="svc-title">{title}</span>
                <span className="svc-text">{description}</span>
              </span>
              {!comingSoon && (
                <span className="svc-cta">
                  <span className="svc-cta-label">{buttonText}</span>
                  <span className="svc-go"><ArrowRight /></span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
