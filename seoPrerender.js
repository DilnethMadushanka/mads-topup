// Build-time SEO: after `vite build`, write one static landing page per game
// (dist/<slug>/index.html) with its own title, description, canonical URL and readable
// content, plus a sitemap listing them all. The React app still boots on every page and
// replaces the static content inside #root, so visitors see the normal site.
import fs from 'fs';
import path from 'path';
import { GAMES_DATA } from './src/data/games.js';
import { SITE_URL, HOME_SEO, GAME_SEO_PAGES } from './src/data/seoPages.js';

const esc = (v = '') => String(v)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

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

const gamePageBody = (page, game) => {
  const packages = (game.packages || []).map((p) => `<li>${esc(p.name)}</li>`).join('');
  return [
    '<p><a href="/">MADS TOPUP</a> › ' + esc(game.name) + '</p>',
    `<h1>${esc(page.h1)}</h1>`,
    `<p>${esc(page.intro)}</p>`,
    packages ? `<h2>${esc(game.name)} packages</h2><ul>${packages}</ul>` : '',
    `<h2>How to top up ${esc(game.name)}</h2>`,
    `<ol>${howToSteps(game).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`,
    '<h2>More games</h2>',
    `<ul>${gameLinks(page.slug)}</ul>`,
    '<p>MADS TOPUP is an independent reseller and is not affiliated with any game publisher.</p>',
  ].join('');
};

const homeBody = () => [
  '<h1>Sri Lankan Diamond Store – MADS TOPUP</h1>',
  `<p>${esc(HOME_SEO.description)}</p>`,
  '<h2>Top up games</h2>',
  `<ul>${gameLinks(null)}</ul>`,
].join('');

// Keeps the static fallback readable for the moment before the app loads.
const STATIC_CSS = '<style>.seo-static{min-height:100vh;background:#f5f8ff;padding:96px max(16px,calc((100% - 960px) / 2)) 48px;color:#334155;font:15px/1.6 system-ui,sans-serif}.seo-static a{color:#1264e6}.seo-static h1{font-size:28px;color:#0f172a}.seo-static h2{font-size:18px;color:#0f172a;margin-top:24px}</style>';

const sitemap = (date) => {
  const urls = [{ loc: `${SITE_URL}/`, priority: '1.0' }]
    .concat(GAME_SEO_PAGES.map((p) => ({ loc: `${SITE_URL}/${p.slug}/`, priority: '0.9' })));
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
        let html = withHead(template, {
          title: page.title,
          description: page.description,
          url,
          image: game.heroBanner ? SITE_URL + game.heroBanner : null,
        });
        html = withJsonLd(html, {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'MADS TOPUP', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: game.name, item: url },
          ],
        });
        html = withRoot(html, gamePageBody(page, game));
        fs.mkdirSync(path.join(outDir, page.slug), { recursive: true });
        fs.writeFileSync(path.join(outDir, page.slug, 'index.html'), html);
      }

      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap(new Date().toISOString().slice(0, 10)));
    },
  };
}
