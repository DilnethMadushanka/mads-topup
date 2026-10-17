import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Copy, Download, Clock, CheckCircle2, AlertTriangle, ShieldAlert, Wallet,
  ChevronLeft, ChevronRight, Image as ImageIcon, ExternalLink, Smartphone, User,
  Receipt, X, Plus, Zap, Building2, CreditCard, Gift, Landmark, MessageSquare,
  Info, XCircle, Send, Loader2, FileCheck
} from 'lucide-react';
import { paymentRefKey, phoneTail } from '../../../lib/paymentRefs.js';
import { depositCredit, depositKind } from '../../data/depositRules';

// Admin "Deposit Verifier": a review queue for wallet deposits. Each deposit
// gets automatic checks (Dialog SMS, payer number, duplicate reference,
// account, slip) so the admin can see at a glance what is safe to approve.
// Uses the shared .ord-* admin styles plus a few .dep-* ones (index.css).

export const DEPOSIT_STATUS_META = {
  PENDING: { label: 'To review', cls: 'is-amber' },
  VERIFIED: { label: 'Credited', cls: 'is-green' },
  REJECTED: { label: 'Rejected', cls: 'is-red' },
};

export const KIND_META = {
  ezcash: { label: 'EZ Cash', icon: Smartphone, cls: 'is-green' },
  binance: { label: 'Binance Pay', icon: Zap, cls: 'is-amber' },
  bank: { label: 'Bank deposit', icon: Building2, cls: 'is-blue' },
  card: { label: 'Card (Genie)', icon: CreditCard, cls: 'is-violet' },
  bonus: { label: 'Bonus', icon: Gift, cls: 'is-pink' },
  other: { label: 'Other', icon: Landmark, cls: 'is-slate' },
};

const METHOD_FILTERS = [
  { id: 'ALL', label: 'All methods' },
  { id: 'ezcash', label: 'EZ Cash' },
  { id: 'binance', label: 'Binance Pay' },
  { id: 'bank', label: 'Bank deposit' },
  { id: 'card', label: 'Card (Genie)' },
];

const DATE_RANGES = [
  { id: 'ALL', label: 'All time' },
  { id: 'TODAY', label: 'Today' },
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
];

const PAGE_SIZE = 12;
const DAY = 86400000;

// Deposit times are saved as "YYYY-MM-DD HH:MM" in UTC (an ISO string cut
// short), plus a full ISO `timestamp` on newer records.
export const depositTime = (p) => {
  const iso = p?.timestamp || p?.creditedAt;
  const raw = String(p?.createdAt || '');
  let t = NaN;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw)) t = Date.parse(`${raw.replace(' ', 'T')}:00Z`);
  else if (raw) t = Date.parse(raw);
  if (Number.isNaN(t) && iso) t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
};

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const lkr = (v) => `Rs. ${Math.round(Number(v) || 0).toLocaleString('en-US')}`;
const usdt = (v) => `$${(Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
// Short rupee amounts for the stat tiles ("Rs. 34.5k").
const lkrShort = (v) => {
  const n = Math.round(Number(v) || 0);
  if (n < 1000) return lkr(n);
  return `Rs. ${(n / 1000).toFixed(n < 100000 ? 1 : 0).replace(/\.0$/, '')}k`;
};
export const depositAmount = (p) => (p?.currency === 'USDT' ? `${usdt(p.amount)} USDT` : lkr(p?.amount));

const fmtDateTime = (t) => (t ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' }) : '—');
const timeAgo = (t) => {
  if (!t) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const copyText = async (text, showToast) => {
  try {
    await navigator.clipboard.writeText(String(text));
    showToast?.('Copied');
  } catch {
    showToast?.('Could not copy', 'error');
  }
};

const digits = (v) => String(v || '').replace(/\D/g, '');
const slipOf = (p) => p?.slipUrl || p?.receiptUrl || '';

// The customer account a deposit will be credited to (same order as the server).
export const findDepositOwner = (p, users) => {
  if (!p) return null;
  const email = String(p.userEmail || '').toLowerCase();
  return users.find(u => p.creditedTo && u.uid === p.creditedTo)
    || users.find(u => p.userId && (u.uid === p.userId || u.resellerCode === p.userId))
    || users.find(u => email && String(u.email || '').toLowerCase() === email)
    || users.find(u => p.resellerCode && u.resellerCode === p.resellerCode)
    || null;
};

const findSms = (p, smsLogs) => {
  const rn = digits(p.referenceNumber);
  if (rn.length < 10) return null;
  return smsLogs.find(l => digits(l.rnNumber) === rn) || null;
};

/**
 * Automatic checks for one deposit. Each is { level, title, text }:
 * 'ok' (passed), 'info', 'warn' (look closer) or 'bad' (don't approve
 * unless you're sure). Only pending deposits are checked in full.
 */
export const depositChecks = (p, { users, payments, smsLogs }) => {
  const out = [];
  const kind = depositKind(p.method);
  const pending = p.status === 'PENDING';
  const owner = findDepositOwner(p, users);

  if (!owner) out.push({ level: pending ? 'bad' : 'warn', title: 'No account found', text: 'No customer account matches this deposit, so approving it will fail.' });
  else if (owner.status === 'BLOCKED') out.push({ level: 'bad', title: 'Account blocked', text: 'This customer is blocked.' });

  const refKey = paymentRefKey(p.method, p.referenceNumber);
  if (refKey) {
    const same = payments.filter(o => o.id !== p.id && paymentRefKey(o.method, o.referenceNumber) === refKey);
    const credited = same.find(o => o.credited || o.status === 'VERIFIED');
    if (credited && pending) out.push({ level: 'bad', title: 'Reference already used', text: `This reference was already credited on ${credited.id}.` });
    else if (same.some(o => o.status === 'PENDING')) out.push({ level: 'warn', title: 'Submitted twice', text: `${same.length + 1} deposits use this reference.` });
  }

  if (kind === 'ezcash' && pending) {
    const sms = findSms(p, smsLogs);
    const payer = phoneTail(p.payerPhone);
    if (!sms) {
      out.push({ level: 'warn', title: 'No Dialog SMS yet', text: 'No EZ Cash SMS with this RN reached the server. Check the merchant phone.' });
    } else {
      const smsAmount = Number(sms.amountLkr) || 0;
      const phones = sms.payerPhones || [];
      const amountOk = Math.abs(smsAmount - (Number(p.amount) || 0)) < 1;
      const phoneOk = !payer || !phones.length || phones.includes(payer);
      if (sms.status === 'REDEEMED') out.push({ level: 'bad', title: 'SMS already used', text: `This RN was auto-credited${sms.redeemedBy ? ` to ${sms.redeemedBy}` : ''}.` });
      if (!amountOk) out.push({ level: 'bad', title: 'Amount differs', text: `The SMS shows ${lkr(smsAmount)}, the customer entered ${lkr(p.amount)}.` });
      if (!phoneOk) out.push({ level: 'bad', title: 'Paid from another number', text: `SMS number ends ${phones.map(x => x.slice(-4)).join(', ')}; customer said ${p.payerPhone}. Possible stolen RN.` });
      if (amountOk && phoneOk && sms.status !== 'REDEEMED') out.push({ level: 'ok', title: 'SMS matches', text: `Dialog SMS has this RN for ${lkr(smsAmount)}${payer && phones.length ? ' from the same number' : ''}.` });
    }
    if (!payer) out.push({ level: 'warn', title: 'No payer number', text: 'The customer did not give the number they paid from.' });
  }

  if (kind === 'binance' && pending) {
    out.push({ level: 'info', title: 'Not found automatically', text: 'This Order ID was not in the Binance Pay history when submitted. Check it in the Binance app.' });
  }

  if (kind === 'bank' && pending && !slipOf(p)) out.push({ level: 'warn', title: 'No slip', text: 'No payment slip is attached.' });

  const big = p.currency === 'USDT' ? Number(p.amount) >= 100 : Number(p.amount) >= 20000;
  if (big && pending) out.push({ level: 'warn', title: 'Large deposit', text: 'Double-check the amount before approving.' });

  return out;
};

const RANK = { bad: 3, warn: 2, info: 1, ok: 0 };
export const worstLevel = (checks) => checks.reduce((w, c) => (RANK[c.level] > RANK[w] ? c.level : w), 'ok');

export const DepositStatusPill = ({ pay }) => {
  const meta = DEPOSIT_STATUS_META[pay?.status] || { label: pay?.status || 'No status', cls: 'is-slate' };
  return <span className={`ord-pill ${meta.cls}`}><i />{meta.label}</span>;
};

const KindTile = ({ kind, large }) => {
  const meta = KIND_META[kind] || KIND_META.other;
  const Icon = meta.icon;
  return <span className={`dep-kind ${meta.cls} ${large ? 'is-lg' : ''}`}><Icon /></span>;
};

const CheckChip = ({ checks }) => {
  const level = worstLevel(checks);
  const first = checks.find(c => c.level === level);
  if (!first) return null;
  const extra = checks.filter(c => c.level === level).length - 1;
  return <small className={`dep-chip is-${level}`} title={checks.map(c => `${c.title}: ${c.text}`).join('\n')}>{first.title}{extra > 0 ? ` +${extra}` : ''}</small>;
};

const toCsv = (rows) => {
  const cols = ['id', 'createdAt', 'status', 'credited', 'method', 'referenceNumber', 'payerPhone', 'amount', 'currency', 'userName', 'userEmail', 'userId', 'creditedLkr', 'creditedUsdt', 'rejectReason'];
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
};

export const DepositsDesk = ({ payments, users = [], smsLogs = [], search, onSearch, onOpen, onOpenSmsLogs, onRecord }) => {
  const [tab, setTab] = useState('PENDING');
  const [method, setMethod] = useState('ALL');
  const [range, setRange] = useState('ALL');
  const [page, setPage] = useState(0);

  useEffect(() => { if (search) setTab('ALL'); }, [search]);
  useEffect(() => { setPage(0); }, [tab, method, range, search]);

  const checked = useMemo(
    () => payments.map(p => ({ p, t: depositTime(p), kind: depositKind(p.method), checks: depositChecks(p, { users, payments, smsLogs }) })),
    [payments, users, smsLogs]
  );

  const today = startOfToday();
  const inRange = (t) => range === 'ALL' || (range === 'TODAY' ? t >= today : t >= today - (Number(range) - 1) * DAY);
  const q = String(search || '').trim().toLowerCase();
  const matchesSearch = ({ p }) => !q || [p.id, p.referenceNumber, p.userEmail, p.userName, p.userId, p.payerPhone, p.method, p.amount]
    .some(v => String(v ?? '').toLowerCase().includes(q));

  const isFlagged = (r) => r.p.status === 'PENDING' && worstLevel(r.checks) === 'bad';
  const TABS = [
    { id: 'PENDING', label: 'To review', match: r => r.p.status === 'PENDING' },
    { id: 'FLAGGED', label: 'Flagged', match: isFlagged },
    { id: 'VERIFIED', label: 'Credited', match: r => r.p.status === 'VERIFIED' },
    { id: 'REJECTED', label: 'Rejected', match: r => r.p.status === 'REJECTED' },
    { id: 'ALL', label: 'All', match: () => true },
  ];

  const base = checked.filter(r => r.kind !== 'bonus' && inRange(r.t) && (method === 'ALL' || r.kind === method) && matchesSearch(r));
  const counts = Object.fromEntries(TABS.map(t => [t.id, base.filter(t.match).length]));
  const activeTab = TABS.find(t => t.id === tab) || TABS[0];
  // The review queue is first come, first served; everything else newest first.
  const rows = base.filter(activeTab.match).sort((a, b) => (tab === 'PENDING' || tab === 'FLAGGED' ? a.t - b.t : b.t - a.t));

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const pending = checked.filter(r => r.p.status === 'PENDING' && r.kind !== 'bonus');
  const pendingLkr = pending.reduce((s, r) => s + (r.p.currency === 'USDT' ? 0 : Number(r.p.amount) || 0), 0);
  const pendingUsdt = pending.reduce((s, r) => s + (r.p.currency === 'USDT' ? Number(r.p.amount) || 0 : 0), 0);
  const creditedAt = (r) => { const c = Date.parse(r.p.creditedAt || ''); return Number.isNaN(c) ? r.t : c; };
  const creditedToday = checked.filter(r => r.p.status === 'VERIFIED' && r.kind !== 'bonus' && creditedAt(r) >= today);
  const creditedTodayLkr = creditedToday.reduce((s, r) => s + (r.p.currency === 'USDT' ? 0 : Number(r.p.amount) || 0), 0);
  const oldest = pending.reduce((m, r) => (r.t && (!m || r.t < m) ? r.t : m), 0);

  const stats = [
    { icon: Clock, label: `To review · ${lkrShort(pendingLkr)}${pendingUsdt ? ` + ${usdt(pendingUsdt)}` : ''}`, value: pending.length, cls: 'is-amber', onClick: () => setTab('PENDING') },
    { icon: ShieldAlert, label: 'Flagged by checks', value: pending.filter(isFlagged).length, cls: 'is-red', onClick: () => setTab('FLAGGED') },
    { icon: CheckCircle2, label: `Credited today · ${creditedToday.length}`, value: lkrShort(creditedTodayLkr), cls: 'is-green', onClick: () => { setTab('VERIFIED'); setRange('TODAY'); } },
    { icon: Clock, label: 'Oldest waiting', value: oldest ? timeAgo(oldest).replace(' ago', '') : '—', cls: 'is-blue' },
  ];

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows.map(r => r.p))], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mads-deposits-${new Date().toISOString().slice(0, 10)}.csv`;
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
            <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="RN, Order ID, email, name, phone, amount…" />
            {search && <button type="button" onClick={() => onSearch('')} aria-label="Clear search"><X /></button>}
          </div>
          <select className="ord-select" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method">
            {METHOD_FILTERS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <select className="ord-select" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
            {DATE_RANGES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <div className="dep-tools">
            <button type="button" className="ord-ghost" onClick={onOpenSmsLogs} title="Dialog EZ Cash SMS the server received">
              <MessageSquare /><span>SMS<em className="dep-hide-sm"> log</em></span><b className="dep-count">{smsLogs.length}</b>
            </button>
            <button type="button" className="ord-ghost" onClick={exportCsv} disabled={!rows.length} title="Download this list as CSV">
              <Download /><span>CSV</span>
            </button>
            <button type="button" className="ord-ghost is-solid" onClick={onRecord}>
              <Plus /><span>Record<em className="dep-hide-sm"> payment</em></span>
            </button>
          </div>
        </div>

        <div className="ord-tabs" role="tablist">
          {TABS.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
              className={`ord-tab ${tab === t.id ? 'is-active' : ''} ${(t.id === 'PENDING' && counts.PENDING) || (t.id === 'FLAGGED' && counts.FLAGGED) ? 'has-alert' : ''} ${t.id === 'FLAGGED' ? 'is-danger' : ''}`}
              onClick={() => setTab(t.id)}>
              {t.label}<span>{counts[t.id]}</span>
            </button>
          ))}
        </div>

        <div className="ord-head dep-grid" aria-hidden="true">
          <span>Deposit</span><span>Customer</span><span>Reference &amp; checks</span><span className="is-right">Amount</span><span>Status</span>
        </div>

        {pageRows.length === 0 ? (
          <div className="ord-empty">
            {tab === 'PENDING' && !q ? <CheckCircle2 /> : <FileCheck />}
            <strong>{tab === 'PENDING' && !q ? 'All caught up' : 'No deposits here'}</strong>
            <small>{q ? 'Nothing matches that search.' : tab === 'PENDING' ? 'No deposit is waiting for review.' : 'Try another tab, method or date range.'}</small>
          </div>
        ) : (
          <div className="ord-list">
            {pageRows.map(({ p, t, kind, checks }) => {
              const level = p.status === 'PENDING' ? worstLevel(checks) : 'ok';
              const credit = depositCredit(p);
              return (
                <button key={p.id} type="button" className={`ord-row dep-grid dep-row ${p.status === 'PENDING' ? `is-action is-${level}` : ''}`} onClick={() => onOpen(p)}>
                  <span className="ord-c-order">
                    <KindTile kind={kind} />
                    <span className="ord-stack">
                      <b>{KIND_META[kind]?.label || p.method}</b>
                      <small className="ord-mono">{p.id} · {timeAgo(t)}</small>
                    </span>
                  </span>
                  <span className="ord-c-user ord-stack">
                    {p.userName && p.userName !== 'Gamer'
                      ? <><b>{p.userName}</b><small>{p.userEmail || p.userId || ''}</small></>
                      : <><b>{p.userEmail || p.userId || 'Unknown'}</b><small>{p.userId && p.userEmail ? p.userId : 'Name not given'}</small></>}
                  </span>
                  <span className="dep-c-ref ord-stack">
                    <b className="ord-mono">{p.referenceNumber || '—'}</b>
                    <span className="dep-chips">
                      {p.status === 'PENDING' && <CheckChip checks={checks} />}
                      {slipOf(p) && <small className="ord-chip is-violet">Slip</small>}
                      {p.payerPhone && kind === 'ezcash' && <small className="dep-sub">from {p.payerPhone}</small>}
                    </span>
                  </span>
                  <span className="ord-c-amount dep-c-amount">
                    {depositAmount(p)}
                    {p.status === 'PENDING' && credit.bonusLkr > 0 && <small>+{lkr(credit.bonusLkr)} bonus</small>}
                  </span>
                  <span className="ord-c-status">
                    <DepositStatusPill pay={p} />
                    {p.status === 'REJECTED' && p.rejectReason && <small className="ord-reason" title={p.rejectReason}>{p.rejectReason}</small>}
                  </span>
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

const Field = ({ label, children, mono, onCopy }) => (
  <div className="ord-field">
    <small>{label}</small>
    <span className={mono ? 'ord-mono' : ''}>
      {children}
      {onCopy && <button type="button" className="ord-copy" onClick={onCopy} aria-label={`Copy ${label}`}><Copy /></button>}
    </span>
  </div>
);

const CHECK_ICON = { ok: CheckCircle2, info: Info, warn: AlertTriangle, bad: XCircle };

const REJECT_REASONS = [
  'Payment not received',
  'Amount does not match',
  'Slip looks edited or fake',
  'Reference already used',
  'Paid from another account',
];

export const DepositDetail = ({ pay, payments = [], users = [], smsLogs = [], onClose, onApprove, onReject, onOpenUser, showToast }) => {
  const p = pay;
  const [mode, setMode] = useState(null); // null | 'approve' | 'reject'
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');
  const [slipBroken, setSlipBroken] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const kind = depositKind(p.method);
  const owner = findDepositOwner(p, users);
  const checks = depositChecks(p, { users, payments, smsLogs });
  const level = worstLevel(checks);
  const credit = depositCredit(p);
  const t = depositTime(p);
  const sms = kind === 'ezcash' ? findSms(p, smsLogs) : null;
  const slip = slipOf(p);
  const copy = (v) => () => copyText(v, showToast);
  const creditLabel = credit.usdt > 0 ? `${usdt(credit.usdt)} USDT` : lkr(credit.lkr);
  const phone = owner?.phone ? String(owner.phone).replace(/[^\d]/g, '') : '';

  const run = async (fn) => {
    setBusy(true);
    const result = await fn();
    setBusy(false);
    if (result?.ok) onClose();
  };
  const approve = () => run(() => onApprove(p.id));
  const reject = () => run(() => onReject(p.id, reason === 'OTHER' ? otherReason.trim() : reason));

  return (
    <div className="ord-sheet-wrap" onClick={busy ? undefined : onClose}>
      <div className="ord-sheet dep-sheet" role="dialog" aria-modal="true" aria-label={`Deposit ${p.id}`} onClick={(e) => e.stopPropagation()}>
        <div className="ord-sheet-head">
          <KindTile kind={kind} large />
          <div className="ord-stack">
            <b>{KIND_META[kind]?.label || p.method}</b>
            <small>{p.method && p.method !== KIND_META[kind]?.label ? `${p.method} · ` : ''}{timeAgo(t) || 'Deposit'}</small>
          </div>
          <button type="button" className="ord-x" onClick={onClose} aria-label="Close" disabled={busy}><X /></button>
        </div>

        <div className="ord-sheet-body">
          <div className="ord-summary">
            <DepositStatusPill pay={p} />
            <strong>{depositAmount(p)}</strong>
            <span className="ord-mono">{p.id}<button type="button" className="ord-copy" onClick={copy(p.id)} aria-label="Copy deposit ID"><Copy /></button></span>
          </div>

          {p.status === 'PENDING' && (
            <div className={`dep-verdict is-${level}`}>
              {level === 'bad' ? <ShieldAlert /> : level === 'warn' ? <AlertTriangle /> : <CheckCircle2 />}
              <span>
                <b>{level === 'bad' ? 'Checks found a problem' : level === 'warn' ? 'Look closer before approving' : 'Checks passed'}</b>
                Approving credits <em>{creditLabel}</em>{credit.bonusLkr > 0 ? ` (${lkr(p.amount)} + ${lkr(credit.bonusLkr)} bonus)` : ''} to {owner ? (owner.email || owner.name) : 'this customer'}.
              </span>
            </div>
          )}

          {p.status === 'VERIFIED' && (
            <div className="dep-verdict is-ok">
              <Wallet />
              <span>
                <b>{p.credited ? 'Credited to the wallet' : 'Marked verified'}</b>
                {p.credited
                  ? <>{p.creditedLkr || p.creditedUsdt ? (Number(p.creditedUsdt) > 0 ? `${usdt(p.creditedUsdt)} USDT` : lkr(p.creditedLkr)) : depositAmount(p)}{p.creditedAt ? ` on ${fmtDateTime(Date.parse(p.creditedAt))}` : ''}. To take it back, use Wallet Credit on the account.</>
                  : 'The server has no credit recorded for this record.'}
              </span>
            </div>
          )}

          {p.status === 'REJECTED' && (
            <div className="dep-verdict is-bad">
              <XCircle />
              <span><b>Rejected</b>{p.rejectReason || 'No reason saved.'} Nothing was credited.</span>
            </div>
          )}

          {checks.length > 0 && (
            <section className="ord-sec">
              <h4><ShieldAlert />Checks</h4>
              <ul className="dep-checks">
                {checks.map((c) => {
                  const Icon = CHECK_ICON[c.level];
                  return <li key={c.title} className={`is-${c.level}`}><Icon /><span><b>{c.title}</b>{c.text}</span></li>;
                })}
              </ul>
            </section>
          )}

          {slip && (
            <section className="ord-sec">
              <h4><ImageIcon />Payment slip</h4>
              {slipBroken ? (
                <div className="dep-slip is-broken"><ImageIcon /><small>The slip image could not be loaded.</small></div>
              ) : (
                <a className="dep-slip" href={slip} target="_blank" rel="noopener noreferrer">
                  <img src={slip} alt="Payment slip" onError={() => setSlipBroken(true)} />
                  <span><ExternalLink />Open full size</span>
                </a>
              )}
            </section>
          )}

          <section className="ord-sec">
            <h4><Receipt />Payment</h4>
            <div className="ord-grid">
              <Field label={kind === 'ezcash' ? 'EZ Cash RN' : kind === 'binance' ? 'Binance reference' : 'Reference'} mono onCopy={p.referenceNumber ? copy(p.referenceNumber) : null}>{p.referenceNumber || '—'}</Field>
              <Field label="Amount sent">{depositAmount(p)}</Field>
              {kind === 'ezcash' && <Field label="Paid from" mono onCopy={p.payerPhone ? copy(p.payerPhone) : null}>{p.payerPhone || '—'}</Field>}
              {sms && <Field label="Dialog SMS">{lkr(sms.amountLkr)} · {timeAgo(Date.parse(sms.receivedAt))}</Field>}
              {credit.bonusLkr > 0 && p.status !== 'REJECTED' && <Field label="Bonus">{lkr(credit.bonusLkr)}</Field>}
              {p.note && <Field label="Admin note">{p.note}</Field>}
            </div>
            {sms?.rawSms && <p className="dep-sms ord-mono">{sms.rawSms}</p>}
          </section>

          <section className="ord-sec">
            <h4><User />Customer</h4>
            <div className="ord-grid">
              <Field label="Name">{owner?.name || (p.userName && p.userName !== 'Gamer' ? p.userName : '—')}</Field>
              <Field label="Email" onCopy={p.userEmail ? copy(p.userEmail) : null}>{p.userEmail || owner?.email || '—'}</Field>
              {owner && <Field label="Wallet now">{lkr(owner.walletBalance)} · {usdt(owner.walletUsdt)}</Field>}
              {owner && <Field label="Account">{owner.status === 'BLOCKED' ? 'Blocked' : 'Active'}{owner.isReseller ? ' · Reseller' : ''}</Field>}
            </div>
            {(owner || phone || p.userEmail) && (
              <div className="ord-links">
                {owner && <button type="button" className="ord-ghost" onClick={() => onOpenUser(owner)}><User /><span>Open account</span></button>}
                {phone && <a className="ord-ghost is-green" href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hi! About your MADS TOPUP deposit ${p.id}`)}`} target="_blank" rel="noopener noreferrer"><Smartphone /><span>WhatsApp</span></a>}
                {p.userEmail && <a className="ord-ghost" href={`mailto:${p.userEmail}?subject=${encodeURIComponent(`Your deposit ${p.id}`)}`}><Send /><span>Email</span></a>}
              </div>
            )}
          </section>

          <section className="ord-sec">
            <h4><Clock />Timeline</h4>
            <div className="ord-grid">
              <Field label="Submitted">{fmtDateTime(t)}</Field>
              {p.creditedAt && <Field label="Credited">{fmtDateTime(Date.parse(p.creditedAt))}</Field>}
              {p.updatedAt && <Field label="Last change">{fmtDateTime(Date.parse(p.updatedAt))}</Field>}
              {p.source === 'admin' && <Field label="Added by">Admin</Field>}
            </div>
          </section>
        </div>

        {(p.status === 'PENDING' || (p.status === 'REJECTED' && !p.credited)) && (
          <div className="ord-sheet-foot">
            {mode === 'approve' ? (
              <div className="dep-confirm">
                <p>
                  Credit <b>{creditLabel}</b> to <b>{owner?.email || p.userEmail || 'this customer'}</b>?
                  {level === 'bad' && <span className="is-bad"> The checks found a problem above.</span>}
                </p>
                <div className="ord-actions">
                  <button type="button" className="ord-act is-slate" onClick={() => setMode(null)} disabled={busy}>Back</button>
                  <button type="button" className="ord-act is-green" onClick={approve} disabled={busy}>
                    {busy ? <><Loader2 className="dep-spin" />Crediting…</> : `Yes, credit ${creditLabel}`}
                  </button>
                </div>
              </div>
            ) : mode === 'reject' ? (
              <div className="dep-confirm">
                <small>Reason (the customer sees this in support)</small>
                <div className="dep-reasons">
                  {[...REJECT_REASONS, 'OTHER'].map(r => (
                    <button key={r} type="button" className={`dep-reason ${reason === r ? 'is-active' : ''}`} onClick={() => setReason(r)}>{r === 'OTHER' ? 'Other…' : r}</button>
                  ))}
                </div>
                {reason === 'OTHER' && <input className="dep-input" value={otherReason} onChange={(e) => setOtherReason(e.target.value)} placeholder="Write the reason" maxLength={200} autoFocus />}
                <div className="ord-actions">
                  <button type="button" className="ord-act is-slate" onClick={() => setMode(null)} disabled={busy}>Back</button>
                  <button type="button" className="ord-act is-red-solid" onClick={reject} disabled={busy || (reason === 'OTHER' && !otherReason.trim())}>
                    {busy ? <><Loader2 className="dep-spin" />Rejecting…</> : 'Reject deposit'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="ord-actions">
                {p.status === 'PENDING' && <button type="button" className="ord-act is-red" onClick={() => setMode('reject')}>Reject</button>}
                <button type="button" className="ord-act is-green" onClick={() => setMode('approve')} disabled={!owner}>
                  {p.status === 'REJECTED' ? 'Approve anyway' : `Approve · ${creditLabel}`}
                </button>
              </div>
            )}
            {!owner && !mode && <small className="dep-foot-note">Can't approve: no account matches this deposit.</small>}
          </div>
        )}
      </div>
    </div>
  );
};

const OFFLINE_METHODS = [
  { id: 'Bank Deposit', label: 'Bank', icon: Building2 },
  { id: 'EZ Cash', label: 'EZ Cash', icon: Smartphone },
  { id: 'Binance Pay', label: 'Binance', icon: Zap },
];

// Admin: add a payment that came in outside the site. It joins the queue as
// "to review" and is credited with the normal Approve button.
export const RecordDepositSheet = ({ users = [], onClose, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('Bank Deposit');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const currency = method === 'Binance Pay' ? 'USDT' : 'LKR';

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const cleanEmail = email.trim().toLowerCase();
  const match = cleanEmail.includes('@') ? users.find(u => String(u.email || '').toLowerCase() === cleanEmail) : null;
  const amt = parseFloat(amount) || 0;
  const credit = depositCredit({ amount: amt, currency });
  const ready = cleanEmail.includes('@') && reference.trim() && amt > 0 && !busy;

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    const result = await onSubmit({ email: cleanEmail, method, referenceNumber: reference.trim(), amount: amt, currency, note: note.trim() });
    setBusy(false);
    if (result?.ok) onClose();
  };

  return (
    <div className="ord-sheet-wrap" onClick={busy ? undefined : onClose}>
      <form className="ord-sheet dep-sheet" role="dialog" aria-modal="true" aria-label="Record a payment" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="ord-sheet-head">
          <span className="dep-kind is-blue is-lg"><Plus /></span>
          <div className="ord-stack">
            <b>Record a payment</b>
            <small>For money received outside the website</small>
          </div>
          <button type="button" className="ord-x" onClick={onClose} aria-label="Close" disabled={busy}><X /></button>
        </div>

        <div className="ord-sheet-body">
          <label className="dep-label">
            <span>Customer email</span>
            <input className="dep-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@gmail.com" autoComplete="off" />
            {cleanEmail.includes('@') && (
              match
                ? <small className="dep-hint is-ok"><CheckCircle2 />{match.name || 'Account found'} · wallet {lkr(match.walletBalance)}</small>
                : users.length > 0 && <small className="dep-hint is-bad"><XCircle />No account uses this email</small>
            )}
          </label>

          <div className="dep-label">
            <span>Method</span>
            <div className="dep-seg">
              {OFFLINE_METHODS.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" className={method === id ? 'is-active' : ''} onClick={() => setMethod(id)}><Icon />{label}</button>
              ))}
            </div>
          </div>

          <label className="dep-label">
            <span>{method === 'EZ Cash' ? 'EZ Cash RN' : method === 'Binance Pay' ? 'Binance Order ID' : 'Bank reference'}</span>
            <input className="dep-input ord-mono" required value={reference} onChange={(e) => setReference(e.target.value)} placeholder={method === 'EZ Cash' ? '20261017123456' : method === 'Binance Pay' ? '3456789012345' : 'BOC 123456'} />
          </label>

          <label className="dep-label">
            <span>Amount ({currency})</span>
            <input className="dep-input ord-mono" type="number" inputMode="decimal" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={currency === 'USDT' ? '25' : '5000'} />
            {amt > 0 && <small className="dep-hint">Approving will credit {credit.usdt ? `${usdt(credit.usdt)} USDT` : lkr(credit.lkr)}{credit.bonusLkr ? ` (incl. ${lkr(credit.bonusLkr)} bonus)` : ''}</small>}
          </label>

          <label className="dep-label">
            <span>Note (optional)</span>
            <input className="dep-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. sent slip on WhatsApp" maxLength={200} />
          </label>
        </div>

        <div className="ord-sheet-foot">
          <div className="ord-actions">
            <button type="button" className="ord-act is-slate" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="ord-act is-blue-solid" disabled={!ready || (users.length > 0 && !match)}>
              {busy ? <><Loader2 className="dep-spin" />Saving…</> : 'Add to review queue'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
