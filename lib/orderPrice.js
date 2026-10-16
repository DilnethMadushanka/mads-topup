// The price range a top-up order may be charged at. The top is the catalog
// price for the quantity. The only discount the site offers is the approved
// reseller's tier discount (src/data/resellerTiers.js), rounded per unit by
// the site or on the total by the reseller panel, so the lower of those two
// is the floor. Anything outside the range is a tampered price.
export function orderPriceRange(unitCatalogPriceLkr, quantity, resellerRate = 0) {
  const max = unitCatalogPriceLkr * quantity;
  const min = resellerRate > 0
    ? Math.min(Math.round(unitCatalogPriceLkr * (1 - resellerRate)) * quantity,
               Math.round(max * (1 - resellerRate)))
    : max;
  return { min, max };
}
