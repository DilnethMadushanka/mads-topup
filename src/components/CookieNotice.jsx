import React, { useState } from 'react';

const CONSENT_KEY = 'mads_cookie_consent';

// One-time notice about what the site stores in the browser. The site has no
// tracking or advertising cookies, only what login and settings need.
export const CookieNotice = () => {
  const [visible, setVisible] = useState(() => {
    try { return !localStorage.getItem(CONSENT_KEY); } catch (_) { return false; }
  });

  if (!visible) return null;

  const accept = () => {
    try { localStorage.setItem(CONSENT_KEY, new Date().toISOString()); } catch (_) {}
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-[10000] bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 text-xs text-slate-700 animate-in fade-in">
      <div className="font-black text-sm text-slate-900 mb-1">🍪 Cookies & storage</div>
      <p className="leading-relaxed">
        We use cookies and your browser's storage to keep you logged in, remember your settings and keep your account secure.
        We don't use advertising or tracking cookies.
      </p>
      <button
        onClick={accept}
        className="mt-3 w-full py-2.5 bg-[#1677ff] hover:bg-[#0d68e6] text-white font-extrabold rounded-xl cursor-pointer"
      >
        OK, got it
      </button>
    </div>
  );
};
