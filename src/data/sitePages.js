// Each site page has its own URL, so it can be shared, bookmarked, refreshed
// and reached with the Back button. AppContext keeps the address bar in step
// with the open page; the server answers every one of these paths with the app.
// Plain data only: this file is also imported by Node at build time.
import { GAMES_DATA } from './games.js';
import { GAME_SEO_PAGES, seoPageForPath } from './seoPages.js';

export const SITE_PAGES = [
  { name: 'catalog', path: '/games', title: 'All Games | MADS TOPUP', description: 'Every game you can top up at MADS TOPUP: Free Fire, PUBG UC, Mobile Legends and more, paid in LKR.', public: true },
  { name: 'leaderboard', path: '/leaderboard', title: 'Top Spenders Leaderboard | MADS TOPUP', description: 'This month\'s top spenders at MADS TOPUP.', public: true },
  { name: 'reviews', path: '/reviews', title: 'Customer Reviews | MADS TOPUP', description: 'What gamers in Sri Lanka say about MADS TOPUP.', public: true },
  { name: 'contact', path: '/contact', title: 'Contact & Support | MADS TOPUP', description: 'Get help with a top-up, a deposit or your account.', public: true },
  { name: 'reseller', path: '/reseller', title: 'Become a Reseller | MADS TOPUP', description: 'Join the MADS TOPUP reseller program and top up at 3% to 8% off.', public: true },
  { name: 'reseller-login', path: '/reseller/login', title: 'Reseller Login | MADS TOPUP', description: 'Log in to your MADS TOPUP reseller desk.' },
  { name: 'reseller-dashboard', path: '/reseller/dashboard', title: 'Reseller Dashboard | MADS TOPUP', description: 'Your MADS TOPUP reseller desk.' },
  { name: 'referral', path: '/referral', title: 'Refer & Earn | MADS TOPUP', description: 'Share your link and earn cashback on your friends\' first top-up.', public: true },
  { name: 'ff-accounts', path: '/free-fire-accounts', title: 'Free Fire Accounts for Sale | MADS TOPUP', description: 'Buy checked Free Fire accounts in Sri Lanka: rare bundles, high levels, paid in LKR from your MADS wallet.', public: true },
  { name: 'blog', path: '/blog', title: 'News & Guides | MADS TOPUP', description: 'Game top-up news and guides from MADS TOPUP.', public: true },
  { name: 'profile', path: '/profile', title: 'My Account | MADS TOPUP', description: 'Your MADS TOPUP account, orders and saved IDs.' },
  { name: 'wallet', path: '/wallet', title: 'My Wallet | MADS TOPUP', description: 'Add money to your MADS TOPUP wallet with eZ Cash, bank or Binance.' },
];

const norm = (pathname = '') => '/' + String(pathname).toLowerCase().replace(/^\/+|\/+$/g, '');

export const pagePathFor = (name) => SITE_PAGES.find((p) => p.name === name)?.path || null;

export const pageForPath = (pathname = '') => {
  const clean = norm(pathname);
  return SITE_PAGES.find((p) => p.path === clean) || null;
};

// Games without their own search landing page live at /game/<id>.
export const gamePathFor = (gameId) => {
  if (!gameId) return null;
  const page = GAME_SEO_PAGES.find((p) => p.gameId === gameId);
  return page ? `/${page.slug}/` : `/game/${encodeURIComponent(gameId)}`;
};

export const gameForPath = (pathname = '') => {
  const seo = seoPageForPath(pathname);
  if (seo) return GAMES_DATA.find((g) => g.id === seo.gameId) || null;
  const m = String(pathname).match(/^\/game\/([^/]+)\/?$/i);
  if (!m) return null;
  let id = m[1];
  try { id = decodeURIComponent(id); } catch { /* keep as is */ }
  return GAMES_DATA.find((g) => g.id.toLowerCase() === id.toLowerCase()) || null;
};
