import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Copy, Download, Users, UserPlus, Wallet, Ban, BadgeCheck, ChevronLeft, ChevronRight,
  Smartphone, Send, X, Crown, ShoppingCart, Clock, Plus, Minus, Equal, Loader2, RefreshCw,
  History, User, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { newUsersToday, signupTime } from '../../utils/newUsersToday';

// Admin "User Accounts" and "Wallet Credit": the customer list, the customer
// sheet (account, orders, wallet change, wallet history) and the wallet
// change page. Uses the shared .ord-* desk styles plus .usr-* (index.css).

const PAGE_SIZE = 15;
const lkr = (v) => `Rs. ${(Math.round((Number(v) || 0) * 100) / 100).toLocaleString('en-US')}`;
// Short rupee amounts for the stat tiles ("Rs. 21.9k").
const lkrShort = (v) => {
  const n = Math.round(Number(v) || 0);
  if (n < 1000) return lkr(n);
  return n < 1000000 ? `Rs. ${(n / 1000).toFixed(n < 100000 ? 1 : 0).replace(/\.0$/, '')}k` : `Rs. ${(n / 1000000).toFixed(2).replace(/\.?0+$/, '')}M`;
};
const usdt = (v) => `$${(Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const lc = (v) => String(v || '').trim().toLowerCase();

const fmtDate = (t) => (t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo' }) : '—');
const fmtDateTime = (t) => (t ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' }) : '—');
const timeAgo = (t) => {
  if (!t) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(t);
};

const copyText = async (text, showToast) => {
  try {
    await navigator.clipboard.writeText(String(text));
    showToast?.('Copied');
  } catch {
    showToast?.('Could not copy', 'error');
  }
};

export const loginType = (u) => (String(u?.uid || '').startsWith('usr_') ? 'Email' : 'Google');
const isReseller = (u) => Boolean(u?.isReseller && u?.resellerStatus === 'APPROVED');
const hasBalance = (u) => (Number(u?.walletBalance) || 0) > 0 || (Number(u?.walletUsdt) || 0) > 0;
const displayName = (u) => (u?.name && u.name !== 'Gamer' && u.name !== 'Registered Gamer' ? u.name : (u?.email || u?.uid || 'Customer'));
const initials = (u) => String(displayName(u)).replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
const phoneDigits = (u) => String(u?.phone || '').replace(/[^\d]/g, '');

// Completed orders per customer, matched by uid then email.
export const orderStatsByUser = (orders) => {
  const byUid = new Map();
  const byEmail = new Map();
  for (const o of orders || []) {
    if (!o) continue;
    const t = new Date(o.createdAt || 0).getTime() || 0;
    const add = (map, k) => {
      if (!k) return;
      const s = map.get(k) || { count: 0, done: 0, spent: 0, last: 0 };
      s.count += 1;
      if (o.status === 'COMPLETED') { s.done += 1; s.spent += Number(o.priceLkr) || 0; }
      if (t > s.last) s.last = t;
      map.set(k, s);
    };
    add(byUid, o.userId);
    add(byEmail, lc(o.userEmail));
  }
  return (u) => byUid.get(u?.uid) || byEmail.get(lc(u?.email)) || { count: 0, done: 0, spent: 0, last: 0 };
};

const Avatar = ({ user, large }) => (
  <span className={`usr-avatar ${large ? 'is-lg' : ''} ${isReseller(user) ? 'is-gold' : user?.status === 'BLOCKED' ? 'is-red' : ''}`}>
    {user?.avatar ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" /> : initials(user)}
  </span>
);

const StatusPill = ({ user }) => (user?.status === 'BLOCKED'
  ? <span className="ord-pill is-red"><i />Blocked</span>
  : user?.isVerified ? <span className="ord-pill is-green"><i />Verified</span>
    : <span className="ord-pill is-slate"><i />Unverified</span>);

const TABS = [
  { id: 'ALL', label: 'All', match: () => true },
  { id: 'VERIFIED', label: 'Verified', match: u => u.isVerified && u.status !== 'BLOCKED' },
  { id: 'UNVERIFIED', label: 'Unverified', match: u => !u.isVerified },
  { id: 'RESELLER', label: 'Resellers', match: isReseller },
  { id: 'BALANCE', label: 'Has balance', match: hasBalance },
  { id: 'BLOCKED', label: 'Blocked', match: u => u.status === 'BLOCKED' },
];

const SORTS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'balance', label: 'Highest balance' },
  { id: 'spent', label: 'Most spent' },
];

const toCsv = (rows, statsFor) => {
  const cols = ['uid', 'name', 'email', 'phone', 'login', 'status', 'isVerified', 'reseller', 'walletBalance', 'walletUsdt', 'orders', 'spentLkr', 'createdAt'];
  const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(','), ...rows.map(u => {
    const st = statsFor(u);
    const r = { ...u, login: loginType(u), reseller: isReseller(u) ? 'yes' : '', orders: st.done, spentLkr: st.spent };
    return cols.map(c => esc(r[c])).join(',');
  })].join('\n');
};

export const UsersDesk = ({ users, orders = [], search, onSearch, sort, onSort, onOpen }) => {
  const [tab, setTab] = useState('ALL');
  const [dupOnly, setDupOnly] = useState(false);
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [tab, dupOnly, search, sort]);

  const statsFor = useMemo(() => orderStatsByUser(orders), [orders]);
  const emailCounts = useMemo(() => users.reduce((m, u) => { const e = lc(u.email); if (e) m[e] = (m[e] || 0) + 1; return m; }, {}), [users]);
  const sharesEmail = (u) => (emailCounts[lc(u.email)] || 0) > 1;

  const q = lc(search);
  const base = users.filter(u => !q || [u.name, u.email, u.uid, u.phone, u.resellerCode].some(v => lc(v).includes(q)) || (q.replace(/\D/g, '').length >= 4 && phoneDigits(u).includes(q.replace(/\D/g, ''))))
    .filter(u => !dupOnly || sharesEmail(u));
  const counts = Object.fromEntries(TABS.map(t => [t.id, base.filter(t.match).length]));
  const active = TABS.find(t => t.id === tab) || TABS[0];
  const time = (u) => signupTime(u) || 0;
  const bal = (u) => (Number(u.walletBalance) || 0) + (Number(u.walletUsdt) || 0) * 305;
  const rows = base.filter(active.match).sort((a, b) => (
    sort === 'oldest' ? time(a) - time(b)
      : sort === 'balance' ? bal(b) - bal(a)
        : sort === 'spent' ? statsFor(b).spent - statsFor(a).spent
          : time(b) - time(a)
  ));

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const heldLkr = users.reduce((s, u) => s + (Number(u.walletBalance) || 0), 0);
  const heldUsdt = users.reduce((s, u) => s + (Number(u.walletUsdt) || 0), 0);
  const dupCount = users.filter(sharesEmail).length;
  const stats = [
    { icon: Users, label: `Customers · ${users.filter(isReseller).length} resellers`, value: users.length.toLocaleString('en-US'), cls: 'is-blue', onClick: () => setTab('ALL') },
    { icon: UserPlus, label: 'Joined today', value: newUsersToday(users).length, cls: 'is-green', onClick: () => { setTab('ALL'); onSort('newest'); } },
    { icon: Wallet, label: `Held in wallets${heldUsdt ? ` + ${usdt(heldUsdt)}` : ''}`, value: lkrShort(heldLkr), cls: 'is-amber', onClick: () => { setTab('BALANCE'); onSort('balance'); } },
    { icon: Ban, label: 'Blocked', value: users.filter(u => u.status === 'BLOCKED').length, cls: 'is-red', onClick: () => setTab('BLOCKED') },
  ];

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows, statsFor)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mads-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ord-desk">
      <div className="ord-stats">
        {stats.map(({ icon: Icon, label, value, cls, onClick }) => (
          <button key={label} type="button" className={`ord-stat ${cls}`} onClick={onClick}>
            <span className="ord-stat-ico"><Icon /></span>
            <span><strong>{value}</strong><small>{label}</small></span>
          </button>
        ))}
      </div>

      <div className="ord-panel">
        <div className="ord-toolbar">
          <div className="ord-search">
            <Search />
            <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Name, email, phone, UID, reseller code…" />
            {search && <button type="button" onClick={() => onSearch('')} aria-label="Clear search"><X /></button>}
          </div>
          <select className="ord-select" value={sort} onChange={(e) => onSort(e.target.value)} aria-label="Sort">
            {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button type="button" className={`ord-ghost ${dupOnly ? 'is-solid' : ''}`} onClick={() => setDupOnly(v => !v)} disabled={!dupCount && !dupOnly} title="Customers with two records under the same email">
            <Users /><span>Same email</span><b className="dep-count">{dupCount}</b>
          </button>
          <button type="button" className="ord-ghost" onClick={exportCsv} disabled={!rows.length}><Download /><span>CSV</span></button>
        </div>

        <div className="ord-tabs" role="tablist">
          {TABS.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`ord-tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}<span>{counts[t.id]}</span>
            </button>
          ))}
        </div>

        <div className="ord-head usr-grid" aria-hidden="true">
          <span>Customer</span><span>Contact</span><span>Orders</span><span className="is-right">Wallet</span><span>Status</span>
        </div>

        {pageRows.length === 0 ? (
          <div className="ord-empty"><Users /><strong>No customers here</strong><small>{q ? 'Nothing matches that search.' : 'Try another tab.'}</small></div>
        ) : (
          <div className="ord-list">
            {pageRows.map(u => {
              const st = statsFor(u);
              const t = signupTime(u);
              return (
                <button key={u.uid || u.email} type="button" className="ord-row usr-grid usr-row" onClick={() => onOpen(u)}>
                  <span className="ord-c-order">
                    <Avatar user={u} />
                    <span className="ord-stack">
                      <b>{displayName(u)}{u.isVerified && <BadgeCheck className="usr-check" />}</b>
                      <small>{displayName(u) === u.email ? 'No name given' : (u.email || u.uid)}</small>
                      <span className="usr-tags">
                        <small className="usr-tag">{loginType(u)}</small>
                        {isReseller(u) && <small className="usr-tag is-gold">Reseller</small>}
                        {sharesEmail(u) && <small className="usr-tag is-amber">Same email ×{emailCounts[lc(u.email)]}</small>}
                        {t && <small className="usr-sub">joined {timeAgo(t)}</small>}
                      </span>
                    </span>
                  </span>
                  <span className="ord-c-user ord-stack">
                    <b className="ord-mono">{u.phone || '—'}</b>
                    <small>{u.phone ? 'WhatsApp' : 'No phone'}</small>
                  </span>
                  <span className="usr-c-orders ord-stack">
                    <b>{st.done} {st.done === 1 ? 'order' : 'orders'}</b>
                    <small>{st.spent ? `${lkr(st.spent)} spent` : 'No purchases'}</small>
                  </span>
                  <span className="ord-c-amount usr-c-wallet">
                    {lkr(u.walletBalance)}
                    {Number(u.walletUsdt) > 0 && <small>{usdt(u.walletUsdt)} USDT</small>}
                  </span>
                  <span className="ord-c-status"><StatusPill user={u} /></span>
                </button>
              );
            })}
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

const MODES = [
  { id: 'add', label: 'Add', icon: Plus },
  { id: 'deduct', label: 'Deduct', icon: Minus },
  { id: 'set', label: 'Set exact', icon: Equal },
];
const REASONS = ['Refund for failed order', 'Manual deposit', 'Promo bonus', 'Correction'];

// Add / deduct / set form with a reason and a confirm step. onAdjust gets
// { user, mode, lkr, usdt, reason } and returns the server's answer.
export const WalletChangeForm = ({ user, onAdjust, onDone }) => {
  const confirmRef = React.useRef(null);
  const [mode, setMode] = useState('add');
  const [lkrIn, setLkrIn] = useState('');
  const [usdtIn, setUsdtIn] = useState('');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setConfirming(false); }, [mode, lkrIn, usdtIn, user?.uid]);
  useEffect(() => {
    if (confirming) confirmRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [confirming]);

  const curL = Number(user?.walletBalance) || 0;
  const curU = Number(user?.walletUsdt) || 0;
  const l = parseFloat(lkrIn) || 0;
  const u = parseFloat(usdtIn) || 0;
  const nextL = mode === 'set' ? (lkrIn === '' ? curL : l) : mode === 'add' ? curL + l : curL - l;
  const nextU = mode === 'set' ? (usdtIn === '' ? curU : u) : mode === 'add' ? curU + u : curU - u;
  const negative = l < 0 || u < 0;
  const empty = mode === 'set' ? lkrIn === '' && usdtIn === '' : l === 0 && u === 0;
  const below = nextL < 0 || nextU < 0;
  const ready = user && !empty && !negative && !below && reason.trim().length >= 3 && !busy;

  const submit = async () => {
    setBusy(true);
    const result = await onAdjust({ user, mode, lkr: mode === 'set' ? (lkrIn === '' ? curL : l) : l, usdt: mode === 'set' ? (usdtIn === '' ? curU : u) : u, reason: reason.trim() });
    setBusy(false);
    if (result?.ok) {
      setLkrIn(''); setUsdtIn(''); setReason(''); setConfirming(false);
      onDone?.(result);
    }
  };

  const changeText = mode === 'set'
    ? `Set to ${lkr(nextL)}${nextU !== curU || u ? ` / ${usdt(nextU)}` : ''}`
    : `${mode === 'add' ? 'Add' : 'Deduct'} ${[l ? lkr(l) : '', u ? `${usdt(u)} USDT` : ''].filter(Boolean).join(' + ')}`;

  return (
    <div className="usr-wallet-form">
      <div className="dep-seg">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={mode === id ? `is-active is-${id}` : ''} onClick={() => setMode(id)}><Icon />{label}</button>
        ))}
      </div>
      <div className="usr-amounts">
        <label className="dep-label">
          <span>LKR</span>
          <input className="dep-input ord-mono" type="number" inputMode="decimal" min="0" step="0.01" value={lkrIn} onChange={(e) => setLkrIn(e.target.value)} placeholder={mode === 'set' ? String(curL) : '0'} />
        </label>
        <label className="dep-label">
          <span>USDT</span>
          <input className="dep-input ord-mono" type="number" inputMode="decimal" min="0" step="0.01" value={usdtIn} onChange={(e) => setUsdtIn(e.target.value)} placeholder={mode === 'set' ? String(curU) : '0'} />
        </label>
      </div>
      <label className="dep-label">
        <span>Reason (saved in the wallet history)</span>
        <input className="dep-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this change made?" maxLength={200} />
      </label>
      <div className="dep-reasons">
        {REASONS.map(r => <button key={r} type="button" className={`dep-reason ${reason === r ? 'is-active is-blue' : ''}`} onClick={() => setReason(r)}>{r}</button>)}
      </div>

      <div className={`usr-preview ${below || negative ? 'is-bad' : ''}`}>
        <span><small>Now</small><b>{lkr(curL)}</b><em>{usdt(curU)}</em></span>
        <span className="usr-arrow">→</span>
        <span><small>After</small><b>{lkr(Math.max(0, nextL))}</b><em>{usdt(Math.max(0, nextU))}</em></span>
      </div>
      {below && <small className="dep-hint is-bad"><AlertTriangle />The wallet doesn't have that much to deduct.</small>}

      {confirming ? (
        <div className="dep-confirm" ref={confirmRef}>
          <p><b>{changeText}</b> for <b>{user?.email || displayName(user)}</b>?</p>
          <div className="ord-actions">
            <button type="button" className="ord-act is-slate" onClick={() => setConfirming(false)} disabled={busy}>Back</button>
            <button type="button" className={`ord-act ${mode === 'deduct' ? 'is-red-solid' : 'is-green'}`} onClick={submit} disabled={busy}>
              {busy ? <><Loader2 className="dep-spin" />Saving…</> : 'Yes, save'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={`ord-act ${mode === 'deduct' ? 'is-red-solid' : 'is-blue-solid'} usr-save`} disabled={!ready} onClick={() => setConfirming(true)}>
          {empty ? 'Enter an amount' : reason.trim().length < 3 ? 'Add a reason' : changeText}
        </button>
      )}
    </div>
  );
};

const MODE_META = { add: { icon: Plus, cls: 'is-green', word: 'Added' }, deduct: { icon: Minus, cls: 'is-red', word: 'Deducted' }, set: { icon: Equal, cls: 'is-blue', word: 'Set' } };

const LogRow = ({ e, showWho, onOpenUser }) => {
  const meta = MODE_META[e.mode] || MODE_META.add;
  const Icon = meta.icon;
  const amount = e.mode === 'set'
    ? `${lkr(e.after?.lkr)}${Number(e.after?.usdt) ? ` / ${usdt(e.after.usdt)}` : ''}`
    : [e.lkr ? lkr(e.lkr) : '', e.usdt ? `${usdt(e.usdt)} USDT` : ''].filter(Boolean).join(' + ');
  return (
    <li className="usr-log">
      <span className={`usr-log-ico ${meta.cls}`}><Icon /></span>
      <span className="ord-stack">
        <b>{meta.word} {amount}</b>
        {showWho && <button type="button" className="usr-link" onClick={() => onOpenUser?.(e)}>{e.name || e.email || e.key}</button>}
        <small>{e.reason || 'No reason given'}</small>
      </span>
      <span className="usr-log-side">
        <small className="ord-mono">{lkr(e.before?.lkr)} → {lkr(e.after?.lkr)}</small>
        <small>{fmtDateTime(Date.parse(e.at))}</small>
      </span>
    </li>
  );
};

export const WalletHistory = ({ entries, loading, onRefresh, showWho, onOpenUser, empty = 'No admin wallet changes yet.' }) => (
  <div className="usr-history">
    <div className="usr-history-head">
      <h4><History />Wallet history</h4>
      {onRefresh && <button type="button" className="ord-copy" onClick={onRefresh} aria-label="Refresh"><RefreshCw className={loading ? 'dep-spin' : ''} /></button>}
    </div>
    {entries === null ? <small className="usr-muted">{loading ? 'Loading…' : 'Could not load the history.'}</small>
      : entries.length === 0 ? <small className="usr-muted">{empty}</small>
        : <ul className="usr-logs">{entries.map(e => <LogRow key={e.id} e={e} showWho={showWho} onOpenUser={onOpenUser} />)}</ul>}
  </div>
);

const useWalletLog = (fetchLog, key, deps = []) => {
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    if (!fetchLog) return;
    setLoading(true);
    const list = await fetchLog(key || '', key ? 50 : 30);
    setEntries(list);
    setLoading(false);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [key, ...deps]);
  return { entries, loading, reload: load };
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

export const UserDetail = ({ user, orders = [], onClose, onVerify, onToggleBlock, onAdjust, fetchLog, onSetTier, onOpenOrders, showToast }) => {
  const u = user;
  const [busy, setBusy] = useState(null);
  const [tab, setTab] = useState('wallet');
  const statsFor = useMemo(() => orderStatsByUser(orders), [orders]);
  const st = statsFor(u);
  const log = useWalletLog(fetchLog, u.uid);
  const copy = (v) => () => copyText(v, showToast);
  const phone = phoneDigits(u);
  const t = signupTime(u);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const run = async (name, fn) => { setBusy(name); await fn(); setBusy(null); };
  const toggleBlock = () => {
    const blocking = u.status !== 'BLOCKED';
    if (!window.confirm(blocking
      ? `Block ${displayName(u)}?\n\nThey can't log in, order or redeem vouchers until unblocked. Their wallet stays as it is.`
      : `Unblock ${displayName(u)}?`)) return;
    run('block', () => onToggleBlock(u.uid));
  };

  return (
    <div className="ord-sheet-wrap" onClick={onClose}>
      <div className="ord-sheet usr-sheet" role="dialog" aria-modal="true" aria-label={displayName(u)} onClick={(e) => e.stopPropagation()}>
        <div className="ord-sheet-head">
          <Avatar user={u} large />
          <div className="ord-stack">
            <b>{displayName(u)}{u.isVerified && <BadgeCheck className="usr-check" />}</b>
            <small>{u.email || u.uid}</small>
          </div>
          <button type="button" className="ord-x" onClick={onClose} aria-label="Close"><X /></button>
        </div>

        <div className="ord-sheet-body">
          <div className="usr-balance">
            <span><small>LKR wallet</small><strong>{lkr(u.walletBalance)}</strong></span>
            <span><small>USDT wallet</small><strong>{usdt(u.walletUsdt)}</strong></span>
            <span><small>Orders</small><strong>{st.done}</strong><em>{st.spent ? `${lkr(st.spent)} spent` : 'None yet'}</em></span>
          </div>

          <div className="usr-segtabs" role="tablist">
            {[['wallet', 'Wallet', Wallet], ['account', 'Account', User], ['history', 'History', History]].map(([id, label, Icon]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}><Icon />{label}</button>
            ))}
          </div>

          {tab === 'wallet' && (
            <section className="ord-sec">
              <h4><Wallet />Change wallet</h4>
              <WalletChangeForm user={u} onAdjust={onAdjust} onDone={() => { log.reload(); }} />
            </section>
          )}

          {tab === 'account' && (
            <>
              <section className="ord-sec">
                <h4><User />Account</h4>
                <div className="ord-grid">
                  <Field label="UID" mono onCopy={copy(u.uid)}>{u.uid}</Field>
                  <Field label="Email" onCopy={u.email ? copy(u.email) : null}>{u.email || '—'}</Field>
                  <Field label="Phone" mono onCopy={u.phone ? copy(u.phone) : null}>{u.phone || '—'}</Field>
                  <Field label="Login">{loginType(u)}</Field>
                  <Field label="Joined">{t ? (Date.now() - t < 30 * 86400000 ? `${fmtDate(t)} · ${timeAgo(t)}` : fmtDate(t)) : '—'}</Field>
                  <Field label="Status">{u.status === 'BLOCKED' ? 'Blocked' : 'Active'}{u.isVerified ? ' · Verified' : ' · Not verified'}</Field>
                  {u.resellerCode && <Field label="Reseller code" mono onCopy={copy(u.resellerCode)}>{u.resellerCode}</Field>}
                  {st.last > 0 && <Field label="Last order">{timeAgo(st.last)}</Field>}
                </div>
                <div className="ord-links">
                  {phone && <a className="ord-ghost is-green" href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"><Smartphone /><span>WhatsApp</span></a>}
                  {u.email && <a className="ord-ghost" href={`mailto:${u.email}`}><Send /><span>Email</span></a>}
                  {st.count > 0 && <button type="button" className="ord-ghost" onClick={() => onOpenOrders(u)}><ShoppingCart /><span>See orders ({st.count})</span></button>}
                </div>
              </section>
              {isReseller(u) && (
                <section className="ord-sec">
                  <h4><Crown />Reseller tier</h4>
                  <p className="usr-muted">Sales so far: {lkr(u.resellerSalesLkr)}</p>
                  <select className="ord-select usr-full" value={u.resellerTier || 'AUTO'} onChange={(e) => onSetTier(u, e.target.value)}>
                    <option value="AUTO">Automatic by sales (Bronze 3% / Silver 5% / Gold 8%)</option>
                    <option value="BRONZE">Bronze 3% (fixed)</option>
                    <option value="SILVER">Silver 5% (fixed)</option>
                    <option value="GOLD">Gold 8% (fixed)</option>
                  </select>
                </section>
              )}
            </>
          )}

          {tab === 'history' && (
            <section className="ord-sec">
              <WalletHistory entries={log.entries} loading={log.loading} onRefresh={log.reload} empty="No admin wallet changes for this customer yet." />
            </section>
          )}
        </div>

        <div className="ord-sheet-foot">
          <div className="ord-actions">
            {!u.isVerified && (
              <button type="button" className="ord-act is-green" disabled={Boolean(busy)} onClick={() => run('verify', () => onVerify(u.uid))}>
                {busy === 'verify' ? 'Saving…' : <><CheckCircle2 />Verify account</>}
              </button>
            )}
            <button type="button" className={`ord-act ${u.status === 'BLOCKED' ? 'is-blue' : 'is-red'}`} disabled={Boolean(busy)} onClick={toggleBlock}>
              {busy === 'block' ? 'Saving…' : u.status === 'BLOCKED' ? 'Unblock' : <><Ban />Block</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// The "Wallet Credit" tab: pick a customer, change their wallet, and see the
// latest changes made from the admin panel.
export const WalletCreditPage = ({ users, onAdjust, fetchLog, onOpenUser }) => {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const log = useWalletLog(fetchLog, '', [refresh]);
  const selected = users.find(u => u.uid === selectedId) || null;
  const q = lc(query);
  const matches = q.length < 2 ? [] : users
    .filter(u => [u.name, u.email, u.uid, u.phone, u.resellerCode].some(v => lc(v).includes(q)))
    .slice(0, 6);

  return (
    <div className="usr-credit">
      <div className="ord-panel usr-credit-main">
        <div className="usr-credit-pad">
          <h4 className="usr-h"><Wallet />Change a customer's wallet</h4>
          {selected ? (
            <div className="usr-picked">
              <Avatar user={selected} />
              <span className="ord-stack">
                <b>{displayName(selected)}</b>
                <small>{selected.email || selected.uid}</small>
              </span>
              <button type="button" className="ord-ghost" onClick={() => onOpenUser(selected)}><User /><span>Open</span></button>
              <button type="button" className="ord-x" onClick={() => setSelectedId(null)} aria-label="Pick another customer"><X /></button>
            </div>
          ) : (
            <div className="usr-picker">
              <div className="ord-search">
                <Search />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a customer by name, email, phone or UID" autoFocus />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear"><X /></button>}
              </div>
              {matches.length > 0 && (
                <ul className="usr-matches">
                  {matches.map(u => (
                    <li key={u.uid}>
                      <button type="button" onClick={() => { setSelectedId(u.uid); setQuery(''); }}>
                        <Avatar user={u} />
                        <span className="ord-stack"><b>{displayName(u)}</b><small>{u.email || u.uid}</small></span>
                        <span className="ord-mono usr-match-bal">{lkr(u.walletBalance)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {q.length >= 2 && matches.length === 0 && <small className="usr-muted">No customer matches that.</small>}
            </div>
          )}
          {selected
            ? <WalletChangeForm user={selected} onAdjust={onAdjust} onDone={() => setRefresh(r => r + 1)} />
            : <p className="usr-muted usr-hint"><Clock />Every change is saved with its reason, so you can always see who got what and why.</p>}
        </div>
      </div>
      <div className="ord-panel usr-credit-side">
        <div className="usr-credit-pad">
          <WalletHistory entries={log.entries} loading={log.loading} onRefresh={log.reload} showWho onOpenUser={(e) => { const u = users.find(x => x.uid === e.key); if (u) onOpenUser(u); }} />
        </div>
      </div>
    </div>
  );
};
