import React, { useState } from 'react';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

const CONSENT_KEY = 'mads_cookie_consent';

// Reads the visitor's saved choice: 'all', 'essential', or null when they
// have not chosen yet. Older saves (a date string) count as 'all'.
export const getCookieConsent = () => {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return raw === 'essential' ? 'essential' : 'all';
  } catch (_) { return null; }
};

// One-time cookie banner. The site only stores what login, the cart and
// settings need; "Essential only" is recorded so optional cookies added later
// (for example analytics) can respect it.
export const CookieNotice = () => {
  const { openPolicyModal } = useApp();
  const [visible, setVisible] = useState(() => getCookieConsent() === null);

  if (!visible) return null;

  const choose = (value) => {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (_) {}
    setVisible(false);
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
            <span className="ck-pill"><ShieldCheck /> No ads or tracking</span>
          </div>
        </div>
        <p className="ck-text">
          Cookies keep you logged in, remember your settings and protect your account.{' '}
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
