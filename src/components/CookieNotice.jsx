import React, { useState } from 'react';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { initAnalytics, getCookieConsent, CONSENT_KEY } from '../services/analytics';

// One-time cookie banner. Login, the cart and settings always work;
// "Accept all" also turns on Google Analytics visit counts
// (src/services/analytics.js), "Essential only" keeps it off.
export const CookieNotice = () => {
  const { openPolicyModal } = useApp();
  const [visible, setVisible] = useState(() => getCookieConsent() === null);

  if (!visible) return null;

  const choose = (value) => {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (_) {}
    setVisible(false);
    if (value === 'all') initAnalytics();
  };

  return (
    <div className="ck-wrap" role="dialog" aria-live="polite" aria-label="Cookie preferences">
      <div className="ck-card">
        <button type="button" className="ck-close" onClick={() => choose('essential')} aria-label="Close, essential cookies only">
          <X />
        </button>
        <div className="ck-top">
          <span className="ck-ico"><Cookie /></span>
          <div>
            <div className="ck-title">We use cookies</div>
            <span className="ck-pill"><ShieldCheck /> No ads</span>
          </div>
        </div>
        <p className="ck-text">
          Cookies keep you logged in, remember your settings and protect your account. With Accept all we also count visits to improve the site.{' '}
          <button type="button" className="ck-link" onClick={() => openPolicyModal?.('privacy')}>Privacy Policy</button>
        </p>
        <div className="ck-actions">
          <button type="button" className="ck-btn is-ghost" onClick={() => choose('essential')}>Essential only</button>
          <button type="button" className="ck-btn is-primary" onClick={() => choose('all')}>Accept all</button>
        </div>
      </div>
    </div>
  );
};
