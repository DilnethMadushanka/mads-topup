# MADS TOPUP

Game top-up store (madstopup.com). React 19 + Vite 8 + Tailwind v4 front end, Express `server.js` back end, Firebase (Realtime Database + Firestore), MooGold for delivery.

## Working with the owner

- Reply in Singlish (Sinhala written in English letters), short and friendly.
- Every change goes in a pull request. Save preview screenshots in `/mnt/project-files/previews/` and link them in the reply (desktop + phone, dark + light).
- Merge only when the owner says "merge" (also "merg", "mer", "merge it"). Use squash merge.
- After each merge, reset the working branch to `origin/main` and push with `--force-with-lease`.
- Deploy is manual on the VPS. After a merge, give this command:
  `cd /root/mads-topup && git pull && npm run build && pm2 restart all`
- Secrets live in `/root/mads-topup/.env` on the VPS (see `.env.example`).

## UI style (Midasbuy-inspired)

The store copies Midasbuy's look: clean white in light mode, dark navy in dark mode, blue accent, big rounded cards, game art front and centre.

### Theme

- No theme toggle. The site follows the phone's light/dark setting (`src/hooks/useSiteTheme.js`, `prefers-color-scheme`; `?theme=dark|light` overrides for testing).
- Dark mode is the `.home-dark` class on the wrapper in `App.jsx`. Tailwind's `dark:` variant is mapped to it in `src/index.css` (`@custom-variant dark (&:where(.home-dark, .home-dark *))`).
- Browser bar colour: `#eef5ff` light, `#1a2046` dark (`theme-color` metas in `index.html`).

### Colours

- Accent blue: `#1677ff` (light), `#2b86ff` / `#5aa8ff` / `#74b8ff` (dark). Brand scale is `--color-brand-*` in `index.css`.
- Light page: white / `#f6f9ff`, borders `#e5ecf6`, text `#0f172a`, muted `#64748b`.
- Dark page: navy `#151a2b`–`#171c2f` with soft blue radial glows; cards `rgba(255,255,255,.04–.06)` with `rgba(255,255,255,.08–.1)` borders; muted text `rgba(255,255,255,.55)`.
- Extra accents for variety: gold `#f59e0b`, teal `#0ea5a4`, green live dot `#10b981`.

### Type

- Headings: `Outfit` (`font-heading`), weight 800–900, slight negative letter spacing.
- Body: `Plus Jakarta Sans`.

### Components and patterns

- Cards: radius 18–24px, 1px light border, soft coloured shadow on hover, lift `translateY(-2px/-3px)`.
- Icon tiles: 44–48px rounded squares with a gradient of the accent colour and a white icon.
- Pills / tags: small uppercase 10–11px, 800 weight, tinted background of the accent.
- Arrow buttons: round, tinted; fill with the accent colour on hover.
- Phone first: check 390px wide; no horizontal scroll; collapse rich cards into compact tiles.
- Respect `prefers-reduced-motion` for animations.
- New sections use their own prefixed CSS classes in `src/index.css` (for example `.qa-*`, `.offer-*`, `.msb-*`, `.nw*`, `.auth-*`, `.midas-pop*`) with a `.home-dark .x { … }` block for dark mode, instead of long Tailwind strings.

### Where things are

- Home hero, game tiles (with pop-out character art via `popArt` in `src/data/games.js`), quick actions and trust bar: `src/components/HeroSection.jsx`.
- "Can offer you" section: `src/components/OfferSection.jsx`.
- Navbar, wallet pill and phone side menu: `src/components/Navbar.jsx`.
- Full-page login / register: `src/components/AuthModal.jsx`.
- Promo popup (image only when title, description and button are empty; admin "Popup Banner" tab): `src/components/PopupAdModal.jsx`. The popup config is read from the Realtime Database copy the server publishes.

## Screenshots

- Build with `npx vite build`, serve with `python3 -m http.server 4176 -d dist`, and shoot with Playwright from `/opt/node-tools/node_modules/playwright` (`colorScheme: 'dark' | 'light'`, phone viewport 390x844).
- Firebase is not reachable from the sandbox, so live data (popup, wallet) needs a temporary local patch for screenshots; never commit it.
