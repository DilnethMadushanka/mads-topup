// Build-time SEO: after `vite build`, write one static landing page per game
// (dist/<slug>/index.html) with its own title, description, canonical URL and readable
// content, plus a sitemap listing them all. The React app still boots on every page and
// replaces the static content inside #root, so visitors see the normal site.
import fs from 'fs';
import path from 'path';
import { GAMES_DATA } from './src/data/games.js';
import { SITE_URL, HOME_SEO, GAME_SEO_PAGES } from './src/data/seoPages.js';
import { SITE_PAGES } from './src/data/sitePages.js';

const esc = (v = '') => String(v)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Link previews (WhatsApp, Facebook) get the original JPG/PNG of a banner the
// site itself shows as WebP, since not every app previews WebP.
const PUBLIC_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), 'public');
const shareImage = (p) => {
  if (!p.endsWith('.webp')) return p;
  for (const ext of ['.jpg', '.png']) {
    const alt = p.replace(/\.webp$/, ext);
    if (fs.existsSync(path.join(PUBLIC_DIR, decodeURIComponent(alt)))) return alt;
  }
  return p;
};

// Swap the value of one tag in the built index.html; fails the build if the tag is missing
// so a template change can't silently ship pages with the home page's metadata.
const swap = (html, pattern, replacement, label) => {
  if (!pattern.test(html)) throw new Error(`[seo-prerender] ${label} not found in dist/index.html`);
  return html.replace(pattern, replacement);
};

const withHead = (html, { title, description, url, image }) => {
  let out = html;
  out = swap(out, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`, '<title>');
  out = swap(out, /(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`, 'meta description');
  out = swap(out, /(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`, 'canonical');
  out = swap(out, /(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`, 'og:url');
  out = swap(out, /(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`, 'og:title');
  out = swap(out, /(<meta property="og:description" content=")[^"]*(")/, `$1${esc(description)}$2`, 'og:description');
  out = swap(out, /(<meta name="twitter:url" content=")[^"]*(")/, `$1${esc(url)}$2`, 'twitter:url');
  out = swap(out, /(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`, 'twitter:title');
  out = swap(out, /(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(description)}$2`, 'twitter:description');
  if (image) {
    out = swap(out, /(<meta property="og:image" content=")[^"]*(")/, `$1${esc(image)}$2`, 'og:image');
    out = swap(out, /(<meta name="twitter:image" content=")[^"]*(")/, `$1${esc(image)}$2`, 'twitter:image');
  }
  return out;
};

const withRoot = (html, inner) => swap(
  html,
  /<div id="root"><\/div>/,
  `<div id="root"><div class="seo-static">${inner}</div></div>`,
  '#root',
);

const withJsonLd = (html, data) => html.replace(
  '</head>',
  `    <script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>\n  </head>`,
);

const withoutHomeFaq = (html) => swap(
  html,
  /\s*<script type="application\/ld\+json">\s*\{\s*"@context": "https:\/\/schema\.org",\s*"@type": "FAQPage"[\s\S]*?<\/script>/,
  '',
  'home FAQPage schema',
);

const gameLinks = (exceptSlug) => GAME_SEO_PAGES
  .filter((p) => p.slug !== exceptSlug)
  .map((p) => `<li><a href="/${p.slug}/">${esc(p.h1)}</a></li>`)
  .join('');

const howToSteps = (game) => {
  const voucher = game.fulfilment === 'voucher';
  return [
    `Open ${game.name} on MADS TOPUP and pick a package.`,
    voucher
      ? 'Pay from your MADS wallet (top it up with eZ Cash, bank transfer or Binance USDT).'
      : `Enter your ${game.idLabel || 'player ID'}. No password is needed.`,
    voucher
      ? `Your Garena Shells PIN appears instantly. Redeem it at ${game.redeemSite || 'the Garena shop'}.`
      : 'Pay with eZ Cash, bank transfer, Binance USDT or your MADS wallet.',
    ...(voucher ? [] : [`Your ${game.currencyName || 'top-up'} will be delivered to your account automatically.`]),
  ];
};

const lkr = (n) => `Rs. ${Math.round(n).toLocaleString('en-US')}`;

// Questions people search before buying; shown on the page and sent to Google as FAQPage data.
const faqFor = (game) => {
  const voucher = game.fulfilment === 'voucher';
  const what = game.currencyName || 'top-up';
  return [
    voucher
      ? { q: `How do I get my ${game.name} PIN?`, a: `Pay from your MADS wallet and the PIN appears on screen and in My Orders right away. Redeem it at ${game.redeemSite || 'the Garena shop'}.` }
      : { q: `Do you need my ${game.name} password?`, a: `No. We only need your ${game.idLabel || 'player ID'}. Never share your password with anyone.` },
    { q: `How fast will I get my ${game.name} ${what}?`, a: `Most orders are delivered automatically within seconds, 24 hours a day. If anything is delayed our support team on WhatsApp will help.` },
    { q: `How can I pay for ${game.name} in Sri Lanka?`, a: 'Pay in Sri Lankan Rupees with eZ Cash, bank transfer or Binance USDT, or use your MADS wallet balance.' },
    { q: 'Is MADS TOPUP safe and legit?', a: 'Yes. MADS TOPUP is a Sri Lankan game top-up store with automated delivery through official reseller channels and real-time order tracking.' },
  ];
};

const gamePageBody = (page, game) => {
  const packages = (game.packages || [])
    .map((p) => `<li>${esc(p.name)}${p.priceLkr ? ` – ${lkr(p.priceLkr)}` : ''}</li>`)
    .join('');
  const faq = faqFor(game).map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('');
  return [
    '<p><a href="/">MADS TOPUP</a> › ' + esc(game.name) + '</p>',
    `<h1>${esc(page.h1)}</h1>`,
    `<p>${esc(page.intro)}</p>`,
    packages ? `<h2>${esc(game.name)} packages</h2><ul>${packages}</ul>` : '',
    `<h2>How to top up ${esc(game.name)}</h2>`,
    `<ol>${howToSteps(game).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`,
    `<h2>${esc(game.name)} top up FAQ</h2>`,
    faq,
    '<h2>More games</h2>',
    `<ul>${gameLinks(page.slug)}</ul>`,
    '<p>MADS TOPUP is an independent reseller and is not affiliated with any game publisher.</p>',
  ].join('');
};

const pageLinks = (exceptPath) => SITE_PAGES
  .filter((p) => p.public && p.path !== exceptPath)
  .map((p) => `<li><a href="${p.path}">${esc(p.title.replace(/ \| MADS TOPUP$/, ''))}</a></li>`)
  .join('');

const homeBody = () => [
  '<h1>Sri Lankan Diamond Store – MADS TOPUP</h1>',
  `<p>${esc(HOME_SEO.description)}</p>`,
  '<p>MADS TOPUP is run by Gaming MADS, the Sri Lankan Free Fire creator on <a href="https://www.youtube.com/@gamingmads3865">YouTube</a> and <a href="https://www.tiktok.com/@xgamingmads">TikTok</a>.</p>',
  '<h2>Top up games</h2>',
  `<ul>${gameLinks(null)}</ul>`,
  '<h2>More from MADS TOPUP</h2>',
  `<ul>${pageLinks(null)}</ul>`,
].join('');

const sitePageBody = (page) => [
  '<p><a href="/">MADS TOPUP</a> › ' + esc(page.title.replace(/ \| MADS TOPUP$/, '')) + '</p>',
  `<h1>${esc(page.title.replace(/ \| MADS TOPUP$/, ''))}</h1>`,
  `<p>${esc(page.description)}</p>`,
  '<h2>Top up games</h2>',
  `<ul>${gameLinks(null)}</ul>`,
  '<h2>More from MADS TOPUP</h2>',
  `<ul>${pageLinks(page.path)}</ul>`,
].join('');

// Account pages (wallet, profile, reseller desk) are for logged-in users only.
const withNoindex = (html) => swap(
  html,
  /(<meta name="robots" content=")[^"]*(")/,
  '$1noindex, follow$2',
  'meta robots',
);

// Keeps the static fallback readable for the moment before the app loads.
const STATIC_CSS = '<style>.seo-static{min-height:100vh;background:#f5f8ff;padding:96px max(16px,calc((100% - 960px) / 2)) 48px;color:#334155;font:15px/1.6 system-ui,sans-serif}.seo-static a{color:#1264e6}.seo-static h1{font-size:28px;color:#0f172a}.seo-static h2{font-size:18px;color:#0f172a;margin-top:24px}.seo-static h3{font-size:15px;color:#0f172a;margin:14px 0 2px}</style>';

const sitemap = (date) => {
  const urls = [{ loc: `${SITE_URL}/`, priority: '1.0' }]
    .concat(GAME_SEO_PAGES.map((p) => ({ loc: `${SITE_URL}/${p.slug}/`, priority: '0.9' })))
    .concat(SITE_PAGES.filter((p) => p.public).map((p) => ({ loc: `${SITE_URL}${p.path}`, priority: '0.6' })));
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n')
    + '\n</urlset>\n';
};

export function seoPrerenderPlugin() {
  let outDir = 'dist';
  return {
    name: 'mads-seo-prerender',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const indexPath = path.join(outDir, 'index.html');
      const template = fs.readFileSync(indexPath, 'utf8').replace('</head>', `    ${STATIC_CSS}\n  </head>`);

      fs.writeFileSync(indexPath, withRoot(template, homeBody()));

      for (const page of GAME_SEO_PAGES) {
        const game = GAMES_DATA.find((g) => g.id === page.gameId);
        if (!game) throw new Error(`[seo-prerender] unknown gameId ${page.gameId}`);
        const url = `${SITE_URL}/${page.slug}/`;
        // The home page FAQ schema is swapped for this game's own FAQ (Google rejects two FAQPage blocks).
        let html = withHead(withoutHomeFaq(template), {
          title: page.title,
          description: page.description,
          url,
          image: game.heroBanner ? SITE_URL + shareImage(game.heroBanner) : null,
        });
        const prices = (game.packages || []).map((p) => p.priceLkr).filter((n) => n > 0);
        html = withJsonLd(html, {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'MADS TOPUP', item: `${SITE_URL}/` },
                { '@type': 'ListItem', position: 2, name: game.name, item: url },
              ],
            },
            {
              '@type': 'FAQPage',
              mainEntity: faqFor(game).map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
            ...(prices.length ? [{
              '@type': 'Product',
              name: page.h1,
              description: page.description,
              image: game.heroBanner ? SITE_URL + shareImage(game.heroBanner) : `${SITE_URL}/mads-icon.png`,
              brand: { '@type': 'Brand', name: 'MADS TOPUP' },
              offers: {
                '@type': 'AggregateOffer',
                priceCurrency: 'LKR',
                lowPrice: Math.min(...prices),
                highPrice: Math.max(...prices),
                offerCount: prices.length,
                availability: 'https://schema.org/InStock',
                url,
              },
            }] : []),
          ],
        });
        html = withRoot(html, gamePageBody(page, game));
        fs.mkdirSync(path.join(outDir, page.slug), { recursive: true });
        fs.writeFileSync(path.join(outDir, page.slug, 'index.html'), html);
      }

      // Site pages (/games, /reviews, /blog …) get their own HTML too. Without it the server
      // answered them with the home page's canonical, so Google treated them as copies of "/".
      // server.js serves dist/pages/<name>.html for the matching path.
      fs.mkdirSync(path.join(outDir, 'pages'), { recursive: true });
      for (const page of SITE_PAGES) {
        let html = withHead(withoutHomeFaq(template), {
          title: page.title,
          description: page.description,
          url: `${SITE_URL}${page.path}`,
        });
        if (!page.public) html = withNoindex(html);
        html = withRoot(html, sitePageBody(page));
        fs.writeFileSync(path.join(outDir, 'pages', `${page.name}.html`), html);
      }

      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap(new Date().toISOString().slice(0, 10)));
    },
  };
}
