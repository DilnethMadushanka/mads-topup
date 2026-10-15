// Free Fire account sale: a percentage off every listed account between two
// dates. Shared by the server (which charges the sale price) and the site
// (which shows it). Change the dates or the rate here; outside the window
// accounts sell at their listed price.
export const FF_ACCOUNT_PROMO = {
  rate: 0.10,
  startsAt: '2026-10-15T00:00:00+05:30',
  endsAt: '2026-10-23T00:00:00+05:30', // the sale runs to the end of 22 October, Sri Lanka time
};

export const ffAccountPromoActive = (now = Date.now()) =>
  now >= Date.parse(FF_ACCOUNT_PROMO.startsAt) && now < Date.parse(FF_ACCOUNT_PROMO.endsAt);

// What a buyer pays for a listing priced priceLkr right now.
export const ffAccountSalePrice = (priceLkr, now = Date.now()) => {
  const price = Math.round(Number(priceLkr) || 0);
  return ffAccountPromoActive(now) ? Math.round(price * (1 - FF_ACCOUNT_PROMO.rate)) : price;
};
