// Search-engine landing pages. Each game gets its own crawlable URL with its own title,
// description and content. Used in two places:
//   - vite.config.js prerenders dist/<slug>/index.html + sitemap.xml from this list at build time
//   - AppContext keeps the address bar in step with the open game (/slug/ ⇄ game page)
// Plain data only: this file is also imported by Node at build time.

export const SITE_URL = 'https://madstopup.com';

export const HOME_SEO = {
  title: 'Sri Lankan Diamond Store | Free Fire & PUBG UC – MADS TOPUP',
  description: 'Buy Free Fire Diamonds, PUBG UC, Mobile Legends Diamonds & Garena Shells in Sri Lanka. Pay with eZ Cash, bank or Binance USDT. Instant delivery, UID only.',
};

export const GAME_SEO_PAGES = [
  {
    gameId: 'freefire_sg',
    slug: 'free-fire-diamonds-sri-lanka',
    title: 'Free Fire Diamonds Top Up Sri Lanka | Instant & Cheap – MADS TOPUP',
    description: 'Top up Free Fire Diamonds in Sri Lanka with just your Player ID. Pay in LKR with eZ Cash, bank transfer or Binance USDT and get diamonds in seconds.',
    h1: 'Free Fire Diamonds Top Up in Sri Lanka',
    intro: 'Buy Free Fire (SG/MY server) diamonds, Weekly, Weekly Lite and Monthly Membership with your Player ID. No password needed, paid in Sri Lankan Rupees and delivered automatically.',
  },
  {
    gameId: 'pubg',
    slug: 'pubg-uc-sri-lanka',
    title: 'PUBG Mobile UC Sri Lanka | Instant UC Top Up – MADS TOPUP',
    description: 'Buy PUBG Mobile UC in Sri Lanka with your Character ID. 60 UC to 8100 UC and Royale Pass, paid with eZ Cash, bank or Binance USDT. Instant delivery.',
    h1: 'PUBG Mobile UC Top Up in Sri Lanka',
    intro: 'Recharge PUBG Mobile UC and Royale Pass using only your Character ID. Bonus UC on bigger packs, LKR prices and automated 24/7 delivery.',
  },
  {
    gameId: 'mobilelegends',
    slug: 'mobile-legends-diamonds-sri-lanka',
    title: 'Mobile Legends Diamonds Sri Lanka | MLBB Top Up – MADS TOPUP',
    description: 'Top up Mobile Legends: Bang Bang diamonds in Sri Lanka with your User ID and Zone ID. First top-up bonus packs, Weekly Pass and instant delivery.',
    h1: 'Mobile Legends Diamonds Top Up in Sri Lanka',
    intro: 'Buy MLBB diamonds, first top-up bonus packs and the Weekly and Twilight Pass with your User ID and Zone ID. Pay in LKR with eZ Cash, bank transfer or Binance USDT.',
  },
  {
    gameId: 'bloodstrike',
    slug: 'blood-strike-gold-top-up',
    title: 'Blood Strike Gold Top Up Sri Lanka | Strike Pass – MADS TOPUP',
    description: 'Buy Blood Strike Gold and Strike Pass in Sri Lanka with your User ID. Pay with eZ Cash, bank transfer or Binance USDT and get your Gold instantly.',
    h1: 'Blood Strike Gold Top Up in Sri Lanka',
    intro: 'Recharge Blood Strike Gold and the Strike Pass with only your User ID. LKR prices, secure payment and automated delivery.',
  },
  {
    gameId: 'deltaforce',
    slug: 'delta-force-coins-top-up',
    title: 'Delta Force Coins Top Up Sri Lanka – MADS TOPUP',
    description: 'Buy Delta Force Mobile Delta Coins in Sri Lanka with your player ID. Pay in LKR with eZ Cash, bank transfer or Binance USDT. Fast, safe delivery.',
    h1: 'Delta Force Coins Top Up in Sri Lanka',
    intro: 'Top up Delta Force Mobile Delta Coins with your player ID. Bonus coins on bigger packs and payment in Sri Lankan Rupees.',
  },
  {
    gameId: 'freefire_id',
    slug: 'free-fire-indonesia-diamonds',
    title: 'Free Fire Indonesia Diamonds Top Up – MADS TOPUP Sri Lanka',
    description: 'Top up Free Fire Indonesia server diamonds from Sri Lanka with your Player ID. Pay with eZ Cash, bank transfer or Binance USDT. Instant delivery.',
    h1: 'Free Fire Indonesia Diamonds Top Up',
    intro: 'For Free Fire accounts on the Indonesia server. Buy diamonds and memberships with your Player ID and pay in LKR.',
  },
  {
    gameId: 'valorant',
    slug: 'valorant-points-sri-lanka',
    title: 'Valorant Points (VP) Top Up Sri Lanka – MADS TOPUP',
    description: 'Buy Valorant Points in Sri Lanka with just your Riot ID. 475 VP to 11000 VP for Singapore / Asia-Pacific accounts, paid in LKR. Fast, safe delivery.',
    h1: 'Valorant Points Top Up in Sri Lanka',
    intro: 'Top up Valorant Points (VP) on Singapore / Asia-Pacific accounts with your Riot ID (Name#TAG). No password needed, paid in Sri Lankan Rupees.',
  },
  {
    gameId: 'garenashells',
    slug: 'garena-shells-sg',
    title: 'Garena Shells SG Sri Lanka | Instant PIN – MADS TOPUP',
    description: 'Buy Garena Shells (Singapore) PIN vouchers in Sri Lanka. Pay with your MADS wallet and get the PIN instantly to redeem on your Garena account.',
    h1: 'Garena Shells (SG) PIN in Sri Lanka',
    intro: 'Instant Garena Shells PIN vouchers for the Singapore region, paid from your MADS wallet in LKR or USDT.',
  },
  {
    gameId: 'garenashells_my',
    slug: 'garena-shells-my',
    title: 'Garena Shells MY Sri Lanka | Instant PIN – MADS TOPUP',
    description: 'Buy Garena Shells (Malaysia) PIN vouchers in Sri Lanka. Pay with your MADS wallet and get the PIN instantly to redeem on your Garena account.',
    h1: 'Garena Shells (MY) PIN in Sri Lanka',
    intro: 'Instant Garena Shells PIN vouchers for the Malaysia region, paid from your MADS wallet in LKR or USDT.',
  },
];

export const gamePathFor = (gameId) => {
  const page = GAME_SEO_PAGES.find((p) => p.gameId === gameId);
  return page ? `/${page.slug}/` : null;
};

export const seoPageForPath = (pathname = '') => {
  const slug = String(pathname).toLowerCase().replace(/^\/+|\/+$/g, '');
  return slug ? GAME_SEO_PAGES.find((p) => p.slug === slug) || null : null;
};
