// Google Analytics 4, only for visitors who chose "Accept all" in the cookie
// banner, and only when VITE_GA_ID (G-XXXXXXXXXX) is set at build time.
// Admin pages are never tracked. Page views are sent by hand because the
// site changes pages without reloading.

export const CONSENT_KEY = 'mads_cookie_consent';

// The visitor's saved cookie choice: 'all', 'essential', or null when they
// have not chosen yet. Older saves (a date string) count as 'all'.
export const getCookieConsent = () => {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return raw === 'essential' ? 'essential' : 'all';
  } catch (_) { return null; }
};

const GA_ID = (import.meta.env.VITE_GA_ID || '').trim();
let started = false;

const allowed = () =>
  Boolean(GA_ID) && getCookieConsent() === 'all' && !window.location.pathname.startsWith('/admin');

export function initAnalytics() {
  if (started || typeof window === 'undefined' || !allowed()) return;
  started = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
  trackPageView();
}

export function trackPageView() {
  if (!started || !allowed()) return;
  window.gtag('event', 'page_view', { page_location: window.location.href, page_title: document.title });
}

export function trackEvent(name, params = {}) {
  if (!started || !allowed()) return;
  window.gtag('event', name, params);
}
