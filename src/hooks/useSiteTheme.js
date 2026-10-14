import { useSyncExternalStore } from 'react';

// Storefront colour mode (dark / light). Tiny external store so the navbar switch
// and App.jsx stay in sync without touching AppContext. Persisted in localStorage.
// Light is the default; only visitors who switched to dark keep dark.
const KEY = 'mads_site_theme';
const listeners = new Set();

const read = () => {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('theme'); // ?theme=light|dark
    if (fromUrl === 'light' || fromUrl === 'dark') return fromUrl;
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch { return 'light'; }
};
let current = read();

export const setSiteTheme = (theme) => {
  current = theme === 'dark' ? 'dark' : 'light';
  try { localStorage.setItem(KEY, current); } catch { /* storage may be blocked */ }
  listeners.forEach((l) => l());
};

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

export const useSiteTheme = () => {
  const theme = useSyncExternalStore(subscribe, () => current, () => 'light');
  return {
    theme,
    isDark: theme === 'dark',
    setTheme: setSiteTheme,
    toggleTheme: () => setSiteTheme(current === 'dark' ? 'light' : 'dark'),
  };
};
