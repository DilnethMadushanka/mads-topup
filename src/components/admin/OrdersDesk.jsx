import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Copy, Download, ShoppingCart, Clock, CheckCircle2, AlertTriangle,
  Wallet, ChevronLeft, ChevronRight, Image as ImageIcon, ExternalLink, Send,
  Smartphone, User, Hash, Receipt, X
} from 'lucide-react';

// Admin "Orders" tab: status tabs with counts, search + payment + date filters,
// a compact list (rows on desktop, cards on phones) and the order detail sheet.

export const ORDER_STATUS_META = {
  PENDING: { label: 'Pending', cls: 'is-amber' },
  PENDING_VERIFICATION: { label: 'Payment check', cls: 'is-violet' },
  PROCESSING: { label: 'Processing', cls: 'is-blue' },
  COMPLETED: { label: 'Completed', cls: 'is-green' },
  FAILED: { label: 'Failed', cls: 'is-red' },
  REFUNDED: { label: 'Refunded', cls: 'is-slate' },
  CANCELLED: { label: 'Cancelled', cls: 'is-slate' },
};

// Orders someone still has to look at: unpaid, payment slip waiting, or stuck at MooGold.
const NEEDS_ACTION = new Set(['PENDING', 'PENDING_VERIFICATION', 'PROCESSING']);
export const orderNeedsAction = (o) => NEEDS_ACTION.has(o?.status);

const TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'ACTION', label: 'Needs action', match: orderNeedsAction },
  { id: 'PENDING_VERIFICATION', label: 'Payment check' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'FAILED', label: 'Failed' },
  { id: 'CLOSED', label: 'Refunded / cancelled', match: (o) => o.status === 'REFUNDED' || o.status === 'CANCELLED' },
];

const isTelegramOrder = (o) => {
  const pm = String(o.paymentMethod || '').toLowerCase();
  return Boolean(o.viaTelegramBot || String(o.id || '').startsWith('ORD-TG-') || o.channel === 'Telegram Bot' || pm.includes('telegram'));
};

// Payment methods are free text on the order; group them for the filter.
const PAYMENT_GROUPS = [
  { id: 'WALLET', label: 'MADS Wallet', test: (pm) => pm.includes('mads wallet') },
  { id: 'RESELLER', label: 'Reseller wallet', test: (pm) => pm.includes('reseller') },
  { id: 'EZCASH', label: 'EZ Cash', test: (pm) => pm.includes('ez cash') || pm.includes('ezcash') },
  { id: 'BANK', label: 'Bank transfer', test: (pm) => pm.includes('bank') },
  { id: 'BINANCE', label: 'Binance Pay', test: (pm) => pm.includes('binance') },
  { id: 'CARD', label: 'Card', test: (pm) => pm.includes('card') || pm.includes('genie') },
];

const DATE_RANGES = [
  { id: 'ALL', label: 'All time' },
  { id: 'TODAY', label: 'Today' },
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
];

const PAGE_SIZE = 12;

const orderTime = (o) => {
  const t = new Date(o?.createdAt || o?.timestamp || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

const lkr = (v) => `Rs. ${Math.round(Number(v) || 0).toLocaleString('en-US')}`;

const fmtDateTime = (iso) => {
  const t = new Date(iso);
  if (!iso || Number.isNaN(t.getTime())) return '—';
  return t.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' });
};

const timeAgo = (iso) => {
  const t = new Date(iso).getTime();
  if (!iso || Number.isNaN(t)) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const playerLine = (o) => `${o.playerId || '—'}${o.zoneId ? ` (${o.zoneId})` : ''}`;

const copyText = async (text, showToast) => {
  try {
    await navigator.clipboard.writeText(String(text));
    showToast?.('Copied');
  } catch {
    showToast?.('Could not copy', 'error');
  }
};

export const OrderStatusPill = ({ status }) => {
  const meta = ORDER_STATUS_META[status] || { label: status || 'No status', cls: 'is-slate' };
  return <span className={`ord-pill ${meta.cls}`}><i />{meta.label}</span>;
};

const GameTile = ({ order, gamesById }) => {
  const game = gamesById[order.gameId];
  const [broken, setBroken] = useState(false);
  const initials = String(order.gameName || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (game?.logo && !broken) {
    return <img className="ord-game" src={game.logo} alt="" loading="lazy" onError={() => setBroken(true)} />;
  }
  return <span className="ord-game is-text">{initials}</span>;
};

const toCsv = (rows) => {
  const cols = ['id', 'createdAt', 'status', 'gameName', 'packageName', 'playerId', 'zoneId', 'ign', 'userEmail', 'userName', 'paymentMethod', 'priceLkr', 'moongoldRef', 'failureReason'];
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
};

export const OrdersDesk = ({ orders, gamesCatalog = [], search, onSearch, onOpenOrder, showToast }) => {
  const [tab, setTab] = useState('ACTION');
  const [payment, setPayment] = useState('ALL');
  const [range, setRange] = useState('ALL');
  const [page, setPage] = useState(0);

  const gamesById = useMemo(() => Object.fromEntries(gamesCatalog.filter(Boolean).map(g => [g.id, g])), [gamesCatalog]);

  // A search from the top bar should find the order whatever tab is open.
  useEffect(() => { if (search) setTab('ALL'); }, [search]);
  useEffect(() => { setPage(0); }, [tab, payment, range, search]);

  const today = startOfToday();
  const inRange = (o) => {
    if (range === 'ALL') return true;
    const t = orderTime(o);
    if (range === 'TODAY') return t >= today;
    return t >= today - (Number(range) - 1) * 86400000;
  };
  const matchesPayment = (o) => {
    if (payment === 'ALL') return true;
    if (payment === 'TELEGRAM') return isTelegramOrder(o);
    const group = PAYMENT_GROUPS.find(g => g.id === payment);
    return group ? group.test(String(o.paymentMethod || '').toLowerCase()) : true;
  };
  const q = String(search || '').trim().toLowerCase();
  const matchesSearch = (o) => !q || [o.id, o.playerId, o.zoneId, o.ign, o.gameName, o.packageName, o.userEmail, o.userName, o.userId, o.moongoldRef, o.paymentMethod]
    .some(v => String(v || '').toLowerCase().includes(q));

  // Tabs count what the other filters leave, so the numbers match the list.
  const base = orders.filter(o => inRange(o) && matchesPayment(o) && matchesSearch(o));
  const tabMatch = (t, o) => (t.id === 'ALL' ? true : t.match ? t.match(o) : o.status === t.id);
  const counts = Object.fromEntries(TABS.map(t => [t.id, base.filter(o => tabMatch(t, o)).length]));
  const activeTab = TABS.find(t => t.id === tab) || TABS[0];
  const rows = base.filter(o => tabMatch(activeTab, o));

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const todayDone = orders.filter(o => o.status === 'COMPLETED' && orderTime(o) >= today);
  const stats = [
    { icon: Clock, label: 'Needs action', value: orders.filter(orderNeedsAction).length, cls: 'is-amber', onClick: () => setTab('ACTION') },
    { icon: CheckCircle2, label: 'Completed today', value: todayDone.length, cls: 'is-green', onClick: () => { setTab('COMPLETED'); setRange('TODAY'); } },
    { icon: Wallet, label: 'Sales today', value: lkr(todayDone.reduce((s, o) => s + (Number(o.priceLkr) || 0), 0)), cls: 'is-blue' },
    { icon: AlertTriangle, label: 'Failed (7 days)', value: orders.filter(o => o.status === 'FAILED' && orderTime(o) >= today - 6 * 86400000).length, cls: 'is-red', onClick: () => { setTab('FAILED'); setRange('7'); } },
  ];

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mads-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ord-desk">
      <div className="ord-stats">
        {stats.map(({ icon: Icon, label, value, cls, onClick }) => (
          <button key={label} type="button" className={`ord-stat ${cls}`} onClick={onClick} disabled={!onClick}>
            <span className="ord-stat-ico"><Icon /></span>
            <span><strong>{value}</strong><small>{label}</small></span>
          </button>
        ))}
      </div>

      <div className="ord-panel">
        <div className="ord-toolbar">
          <div className="ord-search">
            <Search />
            <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Order ID, player ID, IGN, email, game…" />
            {search && <button type="button" onClick={() => onSearch('')} aria-label="Clear search"><X /></button>}
          </div>
          <select className="ord-select" value={payment} onChange={(e) => setPayment(e.target.value)} aria-label="Payment method">
            <option value="ALL">All payments</option>
            {PAYMENT_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            <option value="TELEGRAM">Telegram bot</option>
          </select>
          <select className="ord-select" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
            {DATE_RANGES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <button type="button" className="ord-ghost" onClick={exportCsv} disabled={!rows.length} title="Download the orders in this list as CSV">
            <Download /><span>CSV</span>
          </button>
        </div>

        <div className="ord-tabs" role="tablist">
          {TABS.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`ord-tab ${tab === t.id ? 'is-active' : ''} ${t.id === 'ACTION' && counts.ACTION ? 'has-alert' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}<span>{counts[t.id]}</span>
            </button>
          ))}
        </div>

        <div className="ord-head" aria-hidden="true">
          <span>Order</span><span>Customer</span><span>Player</span><span>Payment</span><span className="is-right">Amount</span><span>Status</span>
        </div>

        {pageRows.length === 0 ? (
          <div className="ord-empty">
            <ShoppingCart />
            <strong>No orders here</strong>
            <small>{q ? 'Nothing matches that search.' : 'Try another tab or date range.'}</small>
          </div>
        ) : (
          <div className="ord-list">
            {pageRows.map(o => (
              <button key={o.id || o.key} type="button" className={`ord-row ${orderNeedsAction(o) ? 'is-action' : ''}`} onClick={() => onOpenOrder(o)}>
                <span className="ord-c-order">
                  <GameTile order={o} gamesById={gamesById} />
                  <span className="ord-stack">
                    <b>{o.packageName || 'Top-up'}</b>
                    <small>{o.gameName || 'Unknown game'}</small>
                    <small className="ord-mono">{o.id || '(no ID)'} · {timeAgo(o.createdAt)}</small>
                  </span>
                </span>
                <span className="ord-c-user ord-stack">
                  <b>{o.userName && o.userName !== 'Registered Gamer' ? o.userName : (o.userEmail || o.userId || 'Guest')}</b>
                  <small>{o.userEmail || o.userId || ''}</small>
                </span>
                <span className="ord-c-player ord-stack">
                  <b className="ord-mono">{playerLine(o)}</b>
                  <small>{o.ign || ''}</small>
                </span>
                <span className="ord-c-pay ord-stack">
                  <b>{o.paymentMethod || '—'}</b>
                  {isTelegramOrder(o) && <small className="ord-chip">Telegram bot</small>}
                  {o.receiptUrl && <small className="ord-chip is-violet">Slip attached</small>}
                </span>
                <span className="ord-c-amount">{lkr(o.priceLkr)}</span>
                <span className="ord-c-status">
                  <OrderStatusPill status={o.status} />
                  {o.status === 'FAILED' && o.failureReason && <small className="ord-reason" title={o.failureReason}>{o.failureReason}</small>}
                </span>
              </button>
            ))}
          </div>
        )}

        {rows.length > PAGE_SIZE && (
          <div className="ord-pager">
            <span>{safePage * PAGE_SIZE + 1}–{Math.min(rows.length, (safePage + 1) * PAGE_SIZE)} of {rows.length}</span>
            <div>
              <button type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0} aria-label="Previous page"><ChevronLeft /></button>
              <b>{safePage + 1} / {totalPages}</b>
              <button type="button" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} aria-label="Next page"><ChevronRight /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, children, mono, onCopy }) => (
  <div className="ord-field">
    <small>{label}</small>
    <span className={mono ? 'ord-mono' : ''}>
      {children}
      {onCopy && <button type="button" className="ord-copy" onClick={onCopy} aria-label={`Copy ${label}`}><Copy /></button>}
    </span>
  </div>
);

// What each status button does, shown in the confirm box before it saves.
const STATUS_ACTIONS = [
  { status: 'COMPLETED', label: 'Mark completed', cls: 'is-green', confirm: 'Mark this order as COMPLETED?\n\nThe customer gets the "order complete" email. Only do this after the top-up is delivered.' },
  { status: 'PROCESSING', label: 'Processing', cls: 'is-blue', confirm: 'Mark this order as PROCESSING?' },
  { status: 'FAILED', label: 'Mark failed', cls: 'is-red', confirm: 'Mark this order as FAILED?' },
  { status: 'REFUNDED', label: 'Refunded', cls: 'is-slate', confirm: 'Mark this order as REFUNDED?\n\nThis only changes the label. Send the money back from Wallet Credit if it is not refunded yet.' },
  { status: 'CANCELLED', label: 'Cancel', cls: 'is-slate', confirm: 'Cancel this order?' },
];

export const OrderDetail = ({ order, owner, gamesCatalog = [], onClose, onSetStatus, onOpenUser, showToast }) => {
  const [busy, setBusy] = useState(null);
  const [receiptBroken, setReceiptBroken] = useState(false);
  const gamesById = useMemo(() => Object.fromEntries(gamesCatalog.filter(Boolean).map(g => [g.id, g])), [gamesCatalog]);
  const o = order;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setStatus = async (action) => {
    if (!window.confirm(action.confirm)) return;
    setBusy(action.status);
    const ok = await onSetStatus(o.id, action.status);
    setBusy(null);
    if (ok) {
      showToast?.(`Order ${o.id} → ${ORDER_STATUS_META[action.status]?.label || action.status}`);
      onClose();
    } else {
      showToast?.('Could not save the new status. Check your admin session and try again.', 'error');
    }
  };

  const phone = owner?.phone ? String(owner.phone).replace(/[^\d]/g, '') : '';
  const catalogDiffers = o.originalPriceLkr != null && o.originalPriceLkr !== o.priceLkr;
  const copy = (v) => () => copyText(v, showToast);

  return (
    <div className="ord-sheet-wrap" onClick={onClose}>
      <div className="ord-sheet" role="dialog" aria-modal="true" aria-label={`Order ${o.id}`} onClick={(e) => e.stopPropagation()}>
        <div className="ord-sheet-head">
          <GameTile order={o} gamesById={gamesById} />
          <div className="ord-stack">
            <b>{o.packageName || 'Top-up'}</b>
            <small>{o.gameName || 'Unknown game'}</small>
          </div>
          <button type="button" className="ord-x" onClick={onClose} aria-label="Close"><X /></button>
        </div>

        <div className="ord-sheet-body">
          <div className="ord-summary">
            <OrderStatusPill status={o.status} />
            <strong>{lkr(o.priceLkr)}</strong>
            <span className="ord-mono">{o.id}<button type="button" className="ord-copy" onClick={copy(o.id)} aria-label="Copy order ID"><Copy /></button></span>
          </div>

          {o.status === 'FAILED' && o.failureReason && (
            <div className="ord-alert"><AlertTriangle /><span><b>Why it failed</b>{o.failureReason}</span></div>
          )}

          <section className="ord-sec">
            <h4><Hash />Delivery</h4>
            <div className="ord-grid">
              <Field label="Player ID" mono onCopy={o.playerId ? copy(o.playerId) : null}>{o.playerId || '—'}</Field>
              {o.zoneId && <Field label="Zone / server" mono onCopy={copy(o.zoneId)}>{o.zoneId}</Field>}
              <Field label="In-game name">{o.ign || '—'}</Field>
              <Field label="MooGold ref" mono onCopy={o.moongoldRef ? copy(o.moongoldRef) : null}>{o.moongoldRef || '—'}</Field>
            </div>
          </section>

          <section className="ord-sec">
            <h4><Receipt />Payment</h4>
            <div className="ord-grid">
              <Field label="Method">{o.paymentMethod || '—'}{isTelegramOrder(o) ? ' · Telegram bot' : ''}</Field>
              <Field label="Paid">{lkr(o.priceLkr)}</Field>
              {catalogDiffers && <Field label="Catalog price">{lkr(o.originalPriceLkr)}</Field>}
              {o.isResellerOrder && <Field label="Type">Reseller order</Field>}
            </div>
            {o.receiptUrl && (
              <a className="ord-receipt" href={o.receiptUrl} target="_blank" rel="noopener noreferrer">
                {receiptBroken ? <span className="ord-receipt-ph"><ImageIcon /></span> : <img src={o.receiptUrl} alt="Payment slip" onError={() => setReceiptBroken(true)} />}
                <span><b>Payment slip</b><small>Open full size</small></span>
                <ExternalLink />
              </a>
            )}
          </section>

          <section className="ord-sec">
            <h4><User />Customer</h4>
            <div className="ord-grid">
              <Field label="Name">{owner?.name || (o.userName && o.userName !== 'Registered Gamer' ? o.userName : '—')}</Field>
              <Field label="Email" onCopy={o.userEmail ? copy(o.userEmail) : null}>{o.userEmail || '—'}</Field>
              {owner && <Field label="Wallet now">{lkr(owner.walletBalance)} · ${Number(owner.walletUsdt || 0).toFixed(2)}</Field>}
              {owner && <Field label="Account">{owner.status === 'BLOCKED' ? 'Blocked' : 'Active'}{owner.isReseller ? ' · Reseller' : ''}</Field>}
            </div>
            {(owner || phone) && (
              <div className="ord-links">
                {owner && <button type="button" className="ord-ghost" onClick={() => onOpenUser(owner)}><User /><span>Open account</span></button>}
                {phone && <a className="ord-ghost is-green" href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hi! About your MADS TOPUP order ${o.id}`)}`} target="_blank" rel="noopener noreferrer"><Smartphone /><span>WhatsApp</span></a>}
                {o.userEmail && <a className="ord-ghost" href={`mailto:${o.userEmail}?subject=${encodeURIComponent(`Your order ${o.id}`)}`}><Send /><span>Email</span></a>}
              </div>
            )}
          </section>

          <section className="ord-sec">
            <h4><Clock />Timeline</h4>
            <div className="ord-grid">
              <Field label="Placed">{fmtDateTime(o.createdAt)}</Field>
              {o.updatedAt && <Field label="Last change">{fmtDateTime(o.updatedAt)}{o.updatedBy === 'admin' ? ' · admin' : ''}</Field>}
            </div>
          </section>
        </div>

        <div className="ord-sheet-foot">
          <small>Change status</small>
          <div className="ord-actions">
            {STATUS_ACTIONS.filter(a => a.status !== o.status).map(a => (
              <button key={a.status} type="button" className={`ord-act ${a.cls}`} disabled={Boolean(busy)} onClick={() => setStatus(a)}>
                {busy === a.status ? 'Saving…' : a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
