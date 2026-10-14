import { useSyncExternalStore } from 'react';

// Storefront colour mode (dark / light), taken from the visitor's device setting
// (prefers-color-scheme) and updated live when the device switches. A ?theme=light|dark
// URL parameter still forces one mode, which is handy for previews.
const QUERY = '(prefers-color-scheme: dark)';

const media = () => {
  try { return window.matchMedia(QUERY); } catch { return null; }
};

const read = () => {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('theme');
    if (fromUrl === 'light' || fromUrl === 'dark') return fromUrl;
  } catch { /* ignore */ }
  return media()?.matches ? 'dark' : 'light';
};

// The old manual switch saved a choice here; drop it so the device setting decides.
try { localStorage.removeItem('mads_site_theme'); } catch { /* storage may be blocked */ }

const subscribe = (l) => {
  const mq = media();
  if (!mq) return () => {};
  mq.addEventListener('change', l);
  return () => mq.removeEventListener('change', l);
};

export const useSiteTheme = () => {
  const theme = useSyncExternalStore(subscribe, read, () => 'light');
  return { theme, isDark: theme === 'dark' };
};
