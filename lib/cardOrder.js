// Card-paid orders. The customer pays Genie for a cart; when the payment is
// confirmed the server credits the wallet and then places each package from
// that wallet itself. It used to wait for the customer's browser to come back
// and place the order, so a closed tab left the money in the wallet and no
// order placed.

// The MooGold player fields for a game (same rules as the site's order form,
// src/services/moongoldApi.js). The /api/moogold code then normalises
// eVoucher games and games with their own ID field.
export function orderDataFor(game, pkg, quantity, playerId, zoneId) {
  const data = { category: 1, 'product-id': parseInt(pkg.moongoldProductId, 10), quantity: parseInt(quantity, 10) };
  const id = String(playerId || '').trim();
  const gameId = String(game.id || '').toLowerCase();
  const idLabel = String(game.idLabel || '').toLowerCase();
  if (game.fulfilment === 'voucher') {
    data.category = 2;
  } else if (game.moongoldIdField) {
    data[game.moongoldIdField] = id;
  } else if (gameId.includes('pubg') || idLabel.includes('character')) {
    data['Character ID'] = id;
  } else if (gameId.includes('freefire')) {
    data['Player ID'] = id;
  } else {
    data['User ID'] = id;
    if (zoneId) { data['Server ID'] = zoneId; data['Server'] = zoneId; }
  }
  return data;
}

// A fixed order id per cart line, so placing it twice (webhook + browser +
// background check) can only ever make one MooGold order.
export const cardOrderId = (transactionId, index) =>
  `card-${String(transactionId).replace(/[^A-Za-z0-9]/g, '').slice(-40)}-${index + 1}`;

// The orders to place for a paid card transaction record.
export function cardOrderLines(transactionId, record, gamesData) {
  const order = record?.order;
  if (!order || !Array.isArray(order.items)) return [];
  const game = gamesData.find(g => g.id === order.gameId);
  if (!game) return [];
  return order.items.map((item, i) => {
    const pkg = (game.packages || []).find(p => p.id === item.packageId);
    const quantity = Number(item.quantity) || 1;
    return {
      partnerOrderId: cardOrderId(transactionId, i),
      packageId: item.packageId,
      name: item.name || pkg?.name || item.packageId,
      quantity,
      priceLkr: Math.round(Number(item.unitPriceLkr) * quantity * 100) / 100,
      bodyObj: pkg ? { data: orderDataFor(game, pkg, quantity, order.playerId, order.zoneId) } : null,
    };
  });
}

// Overall state from the per-line results: PLACED, PARTIAL or FAILED.
export function cardOrderStatus(results) {
  const ok = results.filter(r => r.ok).length;
  if (ok === results.length && ok > 0) return 'PLACED';
  return ok ? 'PARTIAL' : 'FAILED';
}
