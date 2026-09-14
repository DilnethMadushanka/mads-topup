# 🛡️ MADS TOPUP — Comprehensive Master Memory & Architecture Rules

## 1. Environment Credentials & VPS Deployment
- **GitHub Repository**: `https://github.com/DilnethMadushanka/mads-topup.git` (Branch: `main`)
- **Mandatory Git Push Rule**: Every single change, fix, feature, or update made to the workspace MUST automatically be verified with `npm run build`, committed to git, and pushed via `git push origin main` so GitHub is always 100% up to date for deployment.
- **Strict Real Database Data Integration**: Every function created or modified MUST operate using real live database records from Firebase Firestore and Realtime Database (RTDB). Never use dummy, mock, or fallback hardcoded data for production operations.
- **Strict API Key Protection**: Under NO circumstances should any API keys, credentials, secret tokens, or environment keys (Moongold API, Firebase config, Zoho Mail SMTP, Cloudflare R2 credentials, EmailJS keys) ever be changed, altered, or overwritten.
- **Live VPS Production Path**: `/root/mads-topup`
- **VPS Live Deployment Command**: `cd /root/mads-topup && git pull origin main && npm run build && pm2 restart all`
- **Email Engine**: Primary Option is **Zoho Mail SMTP (`info@trivexit.com`)** for instant 6-digit OTP delivery directly to user inbox.
- **Cloud Storage**: Cloudflare R2 Bucket (`mads-topup`). Asset uploads generate embedded DataURL / R2 URLs for 100% cross-device rendering.

## 2. Authentication & Account Security Rules
- **Strict Admin Reseller Approval Guard**: Reseller applications MUST remain `PENDING` until Admin approves. Unapproved applications must NEVER be allowed to log in as resellers or receive wholesale pricing (`isReseller: true`, `resellerStatus: 'APPROVED'`).
- **Reseller Security Key**: Unique `MADS-SEC-XXXX` and `RS-XXXXXX` generated per user profile.
- **Password Check & Sync**: `verifyUserLoginAsync` verifies real passwords across Firestore and Realtime DB.
- **Password Reset Handlers**: `handleSendPasswordReset` MUST be wrapped in a `try ... catch ... finally` block so `setIsSendingReset(false)` is guaranteed to execute even if network fetches fail or timeout.
- **Recipient Name Sanitization**: OTP email templates must format recipient display names (e.g. `Daneeshathathsarani`) so raw email strings (e.g. `daneeshathathsarani@gmail.com`) never appear after "Hello ".
- **Clean Logout Handler**: `handleLogout` safely catches errors and resets all active modal states (`isUserProfileOpen`, `isResellerDashboardOpen`, `isResellerLoginPageOpen`, `isResellerPageOpen`, `isWalletModalOpen`, `selectedGame`, `isGameCatalogOpen`).

## 3. Game Top-Up Page & Package Rules
- **No Auto-Selected Package**: On game page load, `cartQuantities` MUST initialize as empty `{}` so no package is pre-selected by default.
- **Package Selection**: Tapping a package card sets `qty = 1`.
- **IGN Lookup**: Realtime player IGN verification (`checkPlayerIGN`) before submitting orders.
- **Dual Currency Toggle**: LKR (Rs) & USDT ($) currency toggle (Exchange Rate: 1 USD = 305 LKR).
- **Reseller Wholesale Discount**: Approved reseller partners receive an automatic 5% wholesale discount across all packages.

## 4. Payment Gateway Rules
- **eZ Cash Payment Rules**: 14-digit RN reference number verification (starts with date, e.g. `20260910XXXXXX`). Dialog Genie app transaction lookup integration.
- **Binance Pay USDT Rules**: Order ID and Binance Pay ID verification.
- **Receipt Slips**: Slips uploaded directly to Cloudflare R2 bucket.

## 5. Website Popup Banner Ad Rules (Midasbuy Style)
- **Midasbuy Poster Card Style**: Gold/Yellow accent "GO" / "CLAIM NOW" action button centered at the bottom of the card.
- **Floating Bottom Close Button**: Circular `X` close button positioned directly below the card.
- **No Background Blur**: Clear, non-blurred backdrop (`bg-black/25`).
- **Admin Management Panel**: Configurable from Admin Dashboard (`adminTab === 'popupAd'`). Includes Cloudflare R2 image file upload, DataURL embedding, quick preset buttons, URL fallback, and Realtime Live Preview box.

## 6. Admin Dashboard (v3.5 PRO) Rules
- Protected by authentication credentials and security code.
- Includes 14 management tabs: Overview, Resellers, Orders, Deposits, EZ Cash, Users, Credit, Games, Vouchers, Moongold API, R2 Storage, Popup Ad, Ticker Notice, Support Desk.
- Custom game package price editing saved live to Firestore (`saveCustomGamePricesToFirestore`).
