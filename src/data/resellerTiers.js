// Reseller program rules, shared by the server (which enforces them) and the
// site (which shows them). Change the numbers here and both stay in step.

// Real money an applicant must have deposited (admin-verified, bank or
// Binance) before the admin can approve them. It stays in their wallet as
// order balance; it is not a fee.
export const RESELLER_MIN_DEPOSIT_LKR = 5000;

// Discount off the catalog price, by lifetime completed sales (LKR) made
// while a reseller. Highest first.
export const RESELLER_TIERS = [
  { id: 'GOLD', name: 'Gold', rate: 0.08, minSalesLkr: 500000 },
  { id: 'SILVER', name: 'Silver', rate: 0.05, minSalesLkr: 100000 },
  { id: 'BRONZE', name: 'Bronze', rate: 0.03, minSalesLkr: 0 },
];

// The largest reseller discount; the server's price check never allows more.
export const MAX_RESELLER_RATE = Math.max(...RESELLER_TIERS.map(t => t.rate));

export const tierById = (id) => RESELLER_TIERS.find(t => t.id === id) || null;

// user: the users/ record. An admin-set resellerTier wins. Resellers approved
// before deposits and tiers existed (no resellerJoinedAt) keep at least
// Silver, the 5% they had.
export function resellerTierFor(user) {
  const forced = tierById(user?.resellerTier);
  if (forced) return forced;
  const sales = Number(user?.resellerSalesLkr) || 0;
  let tier = RESELLER_TIERS.find(t => sales >= t.minSalesLkr) || RESELLER_TIERS[RESELLER_TIERS.length - 1];
  if (!user?.resellerJoinedAt) {
    const floor = tierById('SILVER');
    if (tier.rate < floor.rate) tier = floor;
  }
  return tier;
}

// The next tier up and how much more selling it takes, or null at the top.
export function nextResellerTier(user) {
  const current = resellerTierFor(user);
  const sales = Number(user?.resellerSalesLkr) || 0;
  const higher = RESELLER_TIERS.filter(t => t.rate > current.rate).sort((a, b) => a.minSalesLkr - b.minSalesLkr)[0];
  if (!higher || tierById(user?.resellerTier)) return null;
  return { ...higher, remainingLkr: Math.max(0, higher.minSalesLkr - sales) };
}

export const resellerUnitPrice = (priceLkr, rate) => Math.round(priceLkr * (1 - rate));
