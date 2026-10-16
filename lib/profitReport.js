// Daily profit for the admin "Daily Profit" tab: what each completed top-up
// sold for against what MooGold charged for it.
//
// Cost comes from MooGold's own order history (the USD total MooGold took
// for that order) when the order's MooGold order id is found there.
// Otherwise it falls back to the catalog's moongoldCost for the package
// (an estimate, stored in LKR at 340 per USD). Orders with neither are
// counted as sales with no known cost and left out of profit.

const CATALOG_COST_RATE = 340;
const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000; // Sri Lanka, UTC+5:30

// YYYY-MM-DD in Sri Lanka time.
export const slDate = (value) => {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? new Date(t + SL_OFFSET_MS).toISOString().slice(0, 10) : '';
};

const findPackage = (games, gameId, name) => {
  const clean = String(name || '').trim().toLowerCase();
  if (!clean) return null;
  const pool = gameId ? games.filter(g => g.id === gameId) : games;
  for (const g of pool) {
    const pkg = (g.packages || []).find(p => String(p.name || '').trim().toLowerCase() === clean);
    if (pkg) return pkg;
  }
  return null;
};

// "2x Weekly Pass, 1x 86 Diamonds" (browser orders) or "Weekly Pass x2"
// (server copies) -> [{ name, qty }].
export const parsePackageSummary = (summary) => String(summary || '')
  .split(', ')
  .map(part => {
    let m = part.match(/^(\d+)x (.+)$/);
    if (m) return { name: m[2], qty: Number(m[1]) };
    m = part.match(/^(.+) x(\d+)$/);
    if (m) return { name: m[1], qty: Number(m[2]) };
    return { name: part, qty: 1 };
  })
  .filter(p => p.name);

// Catalog cost in USD for an order's packages, or null if any is unknown.
const catalogCostUsd = (games, gameId, summary) => {
  const parts = parsePackageSummary(summary);
  if (!parts.length) return null;
  let usd = 0;
  for (const { name, qty } of parts) {
    const pkg = findPackage(games, gameId, name);
    const cost = Number(pkg?.moongoldCost);
    if (!(cost > 0)) return null;
    usd += (cost / CATALOG_COST_RATE) * qty;
  }
  return usd;
};

const isMoogoldId = (v) => /^\d{4,}$/.test(String(v || '').trim());

// orders: the RTDB `orders` node. history: Map of MooGold order id ->
// { usd, status } (or null when MooGold could not be read).
export function buildProfitReport({ orders, games, history, rate, fromDate, toDate }) {
  const flat = [];
  for (const entry of Object.values(orders || {})) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.id || entry.gameId) flat.push(entry);
    else for (const o of Object.values(entry)) if (o && (o.id || o.gameId)) flat.push(o);
  }

  // The server keeps its own SRV- copy of every MooGold order next to the
  // browser's. Count the server copy only when the browser never saved one
  // (as the order lists and leaderboard do), but use it to find the MooGold
  // order id of each item in a browser order.
  const serverByPartner = new Map();
  for (const o of flat) if (o.source === 'server' && o.partnerOrderId) serverByPartner.set(o.partnerOrderId, o);
  const clientIds = new Set(flat.filter(o => o.source !== 'server')
    .flatMap(o => [o.partnerOrderId, ...(Array.isArray(o.partnerOrderIds) ? o.partnerOrderIds : [])]).filter(Boolean));

  const days = new Map();
  for (const order of flat) {
    if (order.source === 'server' && clientIds.has(order.partnerOrderId)) continue;
    if (order.status !== 'COMPLETED') continue;
    const date = slDate(order.createdAt);
    if (!date || date < fromDate || date > toDate) continue;
    const saleLkr = Number(order.priceLkr) || 0;

    // The order's items: the server copies its partner ids point to, or the
    // order itself.
    const partnerIds = [...new Set([order.partnerOrderId, ...(Array.isArray(order.partnerOrderIds) ? order.partnerOrderIds : [])].filter(Boolean))];
    const items = order.source === 'server' ? [order] : partnerIds.map(id => serverByPartner.get(id)).filter(Boolean);
    if (!items.length) items.push(order);

    let costUsd = 0;
    let source = 'moogold';
    let mgRefunded = false;
    for (const item of items) {
      // An old browser order with several items keeps only the last item's
      // MooGold id, so its MooGold total would miss the others.
      const multi = item === order && order.source !== 'server' && parsePackageSummary(order.packageName).length > 1;
      const ref = String(item.moongoldRef || '').trim();
      const hit = history && !multi && isMoogoldId(ref) ? history.get(ref) : null;
      if (hit) {
        if (hit.status === 'refunded') mgRefunded = true;
        else costUsd += hit.usd;
        continue;
      }
      const est = catalogCostUsd(games, item.gameId || order.gameId, item.packageName);
      if (est === null) { source = 'none'; break; }
      costUsd += est;
      source = 'estimate';
    }

    const costLkr = source === 'none' ? null : Math.round(costUsd * rate);
    const row = {
      id: order.id,
      time: order.createdAt,
      gameName: order.gameName || '',
      packageName: order.packageName || '',
      userEmail: order.userEmail || '',
      paymentMethod: order.paymentMethod || '',
      saleLkr,
      costUsd: source === 'none' ? null : Math.round(costUsd * 100) / 100,
      costLkr,
      profitLkr: costLkr === null ? null : saleLkr - costLkr,
      source,
      mgRefunded,
    };

    if (!days.has(date)) days.set(date, { date, orders: [], count: 0, saleLkr: 0, costLkr: 0, profitLkr: 0, noCost: 0, noCostSaleLkr: 0 });
    const day = days.get(date);
    day.orders.push(row);
    day.count += 1;
    day.saleLkr += saleLkr;
    if (costLkr === null) {
      day.noCost += 1;
      day.noCostSaleLkr += saleLkr;
    } else {
      day.costLkr += costLkr;
      day.profitLkr += saleLkr - costLkr;
    }
  }

  const list = [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
  for (const d of list) d.orders.sort((a, b) => String(b.time).localeCompare(String(a.time)));
  const totals = list.reduce((t, d) => ({
    count: t.count + d.count,
    saleLkr: t.saleLkr + d.saleLkr,
    costLkr: t.costLkr + d.costLkr,
    profitLkr: t.profitLkr + d.profitLkr,
    noCost: t.noCost + d.noCost,
    noCostSaleLkr: t.noCostSaleLkr + d.noCostSaleLkr,
  }), { count: 0, saleLkr: 0, costLkr: 0, profitLkr: 0, noCost: 0, noCostSaleLkr: 0 });
  return { days: list, totals };
}

// MooGold's order history between two dates (YYYY-MM-DD, MooGold's own
// Malaysia time) as a Map of order id -> { usd, status }, or null when
// MooGold can't be read.
export async function fetchMoogoldHistory(moogoldRequest, startDate, endDate, maxPages = 40) {
  const map = new Map();
  for (let page = 1; page <= maxPages; page++) {
    const payload = { path: 'order/transaction_history', start_date: startDate, end_date: endDate, page, limit: 100 };
    let result;
    try {
      result = await moogoldRequest('order/transaction_history', payload, 12000);
    } catch (e) {
      if (page === 1) throw e;
      break;
    }
    const json = result?.json;
    const list = Array.isArray(json?.orders) ? json.orders : (Array.isArray(json?.data?.orders) ? json.data.orders : null);
    if (!result?.ok || !list) {
      if (page === 1) throw new Error(`MooGold history HTTP ${result?.status}: ${String(result?.text || '').slice(0, 160)}`);
      break;
    }
    for (const o of list) {
      if (o?.order_id === undefined) continue;
      map.set(String(o.order_id), { usd: Number(o.total) || 0, status: String(o.status || '').toLowerCase() });
    }
    if (list.length < 100) break;
  }
  return map;
}
