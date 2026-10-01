import { useSyncExternalStore } from 'react';

// Storefront colour mode (dark / light). Tiny external store so the navbar switch
// and App.jsx stay in sync without touching AppContext. Persisted in localStorage.
const KEY = 'mads_site_theme';
const listeners = new Set();

const read = () => {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('theme'); // ?theme=light|dark
    if (fromUrl === 'light' || fromUrl === 'dark') return fromUrl;
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch { return 'dark'; }
};
let current = read();

export const setSiteTheme = (theme) => {
  current = theme === 'light' ? 'light' : 'dark';
  try { localStorage.setItem(KEY, current); } catch { /* storage may be blocked */ }
  listeners.forEach((l) => l());
};

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

export const useSiteTheme = () => {
  const theme = useSyncExternalStore(subscribe, () => current, () => 'dark');
  return {
    theme,
    isDark: theme === 'dark',
    setTheme: setSiteTheme,
    toggleTheme: () => setSiteTheme(current === 'dark' ? 'light' : 'dark'),
  };
};
