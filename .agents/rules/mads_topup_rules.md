# MADS TOPUP — Project Instructions & Architecture Rules

## 1. System Overview & Credentials
- **Repository**: `DilnethMadushanka/mads-topup` (Branch: `main`)
- **Backend / Deployment**: VPS deployment at `/root/mads-topup`
- **VPS Deployment Command**: `cd /root/mads-topup && git pull origin main && npm run build && pm2 restart all`
- **Email Delivery**: Zoho Mail SMTP (`info@trivexit.com`) is Primary Option for OTP delivery.

## 2. Core Business Rules
- **Reseller Approval Guard**: Reseller applications remain `PENDING` until Admin approves. Unapproved applications must NEVER be allowed to log in as resellers or receive wholesale discounts (`isReseller: true`, `resellerStatus: 'APPROVED'`).
- **Reseller Security Key**: Unique `MADS-SEC-XXXX` and `RS-XXXXXX` generated per user profile.
- **Game Top-Up Default**: No package is pre-selected by default when opening a game page (`cartQuantities = {}`).
- **Password Reset**: OTP send handler (`handleSendPasswordReset`) MUST be wrapped in a `try ... catch ... finally` block so `setIsSendingReset(false)` is guaranteed to execute.

## 3. Storage & Popup Banner Ad Rules
- **Cloudflare R2 Storage**: Bucket `mads-topup`. File uploads convert to DataURL / public asset URLs for instant cross-device rendering.
- **Popup Ad Modal (Midasbuy Style)**: Midasbuy card style with gold "GO" button, floating bottom circle close `X` button, no dark blur backdrop, configurable via Admin Dashboard (`adminTab === 'popupAd'`).

## 4. Safety & Backward Compatibility
- Never break existing payment methods (eZ Cash 14-digit RN, Binance Pay USDT).
- Never break Moongold automated API dispatching or game package price synchronization.
