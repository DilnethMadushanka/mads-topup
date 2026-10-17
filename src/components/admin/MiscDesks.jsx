import React, { useEffect, useState } from 'react';
import {
  Search, X, Megaphone, Save, Loader2, RotateCcw, MessageSquare, CheckCircle2, Clock, Wallet,
  Smartphone, Star, Trash2, ChevronLeft, ChevronRight, RefreshCw, Copy, AlertTriangle, FileCheck
} from 'lucide-react';

// Smaller admin tabs: Ticker Notice, EZ Cash SMS log and Reviews.
// Uses the .ord-* / .dep-* / .usr-* styles plus .tkr-* / .rev-* (index.css).

const lkr = (v) => `Rs. ${Math.round(Number(v) || 0).toLocaleString('en-US')}`;
const timeAgo = (t) => {
  if (!t) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const fmtTime = (t) => (t ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' }) : '—');
const Stats = ({ items }) => (
  <div className="ord-stats">
    {items.map(({ icon: Icon, label, value, cls, onClick }) => (
      <button key={label} type="button" className={`ord-stat ${cls}`} onClick={onClick} disabled={!onClick}>
        <span className="ord-stat-ico"><Icon /></span>
        <span><strong>{value}</strong><small>{label}</small></span>
      </button>
    ))}
  </div>
);
const Pager = ({ page, setPage, total, size }) => {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total <= size) return null;
  const p = Math.min(page, pages - 1);
  return (
    <div className="ord-pager">
      <span>{p * size + 1}–{Math.min(total, (p + 1) * size)} of {total}</span>
      <div>
        <button type="button" onClick={() => setPage(Math.max(0, p - 1))} disabled={p === 0} aria-label="Previous page"><ChevronLeft /></button>
        <b>{p + 1} / {pages}</b>
        <button type="button" onClick={() => setPage(Math.min(pages - 1, p + 1))} disabled={p >= pages - 1} aria-label="Next page"><ChevronRight /></button>
      </div>
    </div>
  );
};

/* ---------------- Ticker notice ---------------- */

const TICKER_MAX = 500;
const TICKER_IDEAS = [
  '⚡ Instant top-ups 24/7 — pay with EZ Cash, bank, card or Binance.',
  '🎁 Deposit Rs. 5,000 or more and get a free bonus in your wallet.',
  '👑 Sell top-ups with us — join the MADS reseller network today.',
];

// Follows the live text until the admin starts typing (it used to keep the
// text from when the panel opened, so saving could put an old notice back).
export const TickerEditor = ({ liveText, onSave }) => {
  const [text, setText] = useState(liveText || '');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!dirty) setText(liveText || ''); }, [liveText, dirty]);

  const clean = text.trim();
  const changed = clean !== String(liveText || '').trim();
  const save = async () => {
    setBusy(true);
    const ok = await onSave(clean);
    setBusy(false);
    if (ok) setDirty(false);
  };

  return (
    <div className="tkr-wrap">
      <div className="ord-panel tkr-card">
        <h4 className="usr-h"><Megaphone />Ticker text</h4>
        <div className="tkr-preview" aria-label="Preview">
          <span className="tkr-live"><i />Live preview</span>
          <div className="tkr-track"><span>{clean || 'INSTANT FREE FIRE TOP-UPS (default when empty)'}</span></div>
        </div>
        <label className="dep-label">
          <span>Text shown across the top of the website</span>
          <textarea className="dep-input tkr-text" rows={4} maxLength={TICKER_MAX} value={text} onChange={(e) => { setText(e.target.value); setDirty(true); }} placeholder="e.g. ⚡ Instant top-ups 24/7…" />
          <small className={`dep-hint ${text.length > TICKER_MAX - 40 ? 'is-bad' : ''}`}>{text.length} / {TICKER_MAX}</small>
        </label>
        <div className="dep-reasons">
          {TICKER_IDEAS.map(t => <button key={t} type="button" className="dep-reason" onClick={() => { setText(t); setDirty(true); }}>{t.slice(0, 34)}…</button>)}
        </div>
        <div className="ord-actions">
          <button type="button" className="ord-act is-slate" onClick={() => { setText(liveText || ''); setDirty(false); }} disabled={!changed || busy}><RotateCcw />Undo changes</button>
          <button type="button" className="ord-act is-blue-solid" onClick={save} disabled={!changed || busy}>
            {busy ? <><Loader2 className="dep-spin" />Publishing…</> : <><Save />Publish</>}
          </button>
        </div>
      </div>
      <div className="ord-panel tkr-side">
        <h4 className="usr-h"><CheckCircle2 />On the site now</h4>
        <p className="tkr-now">{String(liveText || '').trim() || <em>Nothing saved — the site shows its default message.</em>}</p>
        <small className="usr-muted">Publishing updates every open page within a few seconds.</small>
      </div>
    </div>
  );
};

/* ---------------- EZ Cash SMS log ---------------- */

export const SmsLogDesk = ({ logs, loading, onRefresh, onFindDeposit, showToast }) => {
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [tab, search]);
  const q = search.trim().toLowerCase();
  const list = (logs || []).filter(Boolean);
  const base = list.filter(l => !q || [l.rnNumber, l.rawSms, l.redeemedBy, ...(l.payerPhones || [])].some(v => String(v || '').toLowerCase().includes(q)));
  const counts = { ALL: base.length, UNCLAIMED: base.filter(l => l.status !== 'REDEEMED').length, REDEEMED: base.filter(l => l.status === 'REDEEMED').length };
  const rows = base.filter(l => tab === 'ALL' || (tab === 'REDEEMED' ? l.status === 'REDEEMED' : l.status !== 'REDEEMED'))
    .sort((a, b) => (Date.parse(b.receivedAt) || 0) - (Date.parse(a.receivedAt) || 0));
  const pageRows = rows.slice(page * 15, page * 15 + 15);
  const unclaimed = list.filter(l => l.status !== 'REDEEMED');
  const last = list.reduce((m, l) => Math.max(m, Date.parse(l.receivedAt) || 0), 0);
  const copy = async (v) => { try { await navigator.clipboard.writeText(v); showToast?.(`Copied ${v}`); } catch { /* ignore */ } };

  return (
    <div className="ord-desk">
      <Stats items={[
        { icon: MessageSquare, label: last ? `Received · last ${timeAgo(last)}` : 'Received since restart', value: list.length, cls: 'is-blue', onClick: () => setTab('ALL') },
        { icon: Clock, label: `Not claimed · ${lkr(unclaimed.reduce((s, l) => s + (Number(l.amountLkr) || 0), 0))}`, value: unclaimed.length, cls: 'is-amber', onClick: () => setTab('UNCLAIMED') },
        { icon: CheckCircle2, label: 'Auto-credited', value: counts.REDEEMED, cls: 'is-green', onClick: () => setTab('REDEEMED') },
        { icon: Wallet, label: 'Total received', value: lkr(list.reduce((s, l) => s + (Number(l.amountLkr) || 0), 0)), cls: 'is-violet' },
      ]} />
      <div className="dep-verdict is-info sms-note">
        <AlertTriangle />
        <span><b>Kept in server memory only</b>A server restart (deploy) clears this list. Deposits already credited stay in the Deposit Verifier.</span>
      </div>
      <div className="ord-panel">
        <div className="ord-toolbar">
          <div className="ord-search">
            <Search />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="RN, phone number, SMS text, email…" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X /></button>}
          </div>
          <button type="button" className="ord-ghost" onClick={onRefresh} disabled={loading}><RefreshCw className={loading ? 'dep-spin' : ''} /><span>Refresh</span></button>
        </div>
        <div className="ord-tabs" role="tablist">
          {[['ALL', 'All'], ['UNCLAIMED', 'Not claimed'], ['REDEEMED', 'Auto-credited']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={`ord-tab ${tab === id ? 'is-active' : ''}`} onClick={() => setTab(id)}>{label}<span>{counts[id]}</span></button>
          ))}
        </div>
        {pageRows.length === 0 ? (
          <div className="ord-empty"><MessageSquare /><strong>No SMS here</strong><small>{q ? 'Nothing matches that search.' : 'Dialog EZ Cash SMS appear here as the forwarder sends them.'}</small></div>
        ) : (
          <div className="ord-list">
            {pageRows.map(l => {
              const t = Date.parse(l.receivedAt) || 0;
              const isOpen = open === l.rnNumber;
              return (
                <div key={l.rnNumber} className={`sms-row ${isOpen ? 'is-open' : ''}`}>
                  <button type="button" className="ord-row sms-head" onClick={() => setOpen(isOpen ? null : l.rnNumber)} aria-expanded={isOpen}>
                    <span className="ord-c-order">
                      <span className="dep-kind is-green"><Smartphone /></span>
                      <span className="ord-stack">
                        <b className="ord-mono">{l.rnNumber}</b>
                        <small>{(l.payerPhones || []).length ? `from ${(l.payerPhones || []).map(p => `0${p}`).join(', ')}` : 'payer number not in SMS'} · {timeAgo(t)}</small>
                      </span>
                    </span>
                    <span className="ord-c-amount">{lkr(l.amountLkr)}</span>
                    <span className="ord-c-status">
                      {l.status === 'REDEEMED' ? <span className="ord-pill is-green"><i />Credited</span> : <span className="ord-pill is-amber"><i />Not claimed</span>}
                      {l.redeemedBy && <small className="sms-who">{l.redeemedBy}</small>}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="sms-body">
                      <p className="dep-sms ord-mono">{l.rawSms || 'No SMS text saved.'}</p>
                      <div className="ord-links">
                        <button type="button" className="ord-ghost" onClick={() => copy(l.rnNumber)}><Copy /><span>Copy RN</span></button>
                        <button type="button" className="ord-ghost" onClick={() => onFindDeposit(l.rnNumber)}><FileCheck /><span>Find deposit</span></button>
                        <small className="usr-muted">Received {fmtTime(t)}{l.redeemedAt ? ` · credited ${fmtTime(Date.parse(l.redeemedAt))}` : ''}</small>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <Pager page={page} setPage={setPage} total={rows.length} size={15} />
      </div>
    </div>
  );
};

/* ---------------- Reviews ---------------- */

const reviewTime = (r) => Number(String(r.id || '').replace(/^rev-/, '')) || Date.parse(r.date || '') || 0;
const Stars = ({ n }) => (
  <span className="rev-stars" aria-label={`${n} of 5 stars`}>
    {[1, 2, 3, 4, 5].map(i => <Star key={i} className={i <= n ? 'is-on' : ''} />)}
  </span>
);

export const ReviewsDesk = ({ reviews, onDelete }) => {
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState('ALL');
  const [busy, setBusy] = useState(null);
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [search, rating]);
  const list = (reviews || []).filter(r => r && r.id);
  const q = search.trim().toLowerCase();
  const base = list.filter(r => !q || [r.name, r.text, r.location].some(v => String(v || '').toLowerCase().includes(q)));
  const stars = (r) => Math.max(0, Math.min(5, Math.round(Number(r.rating) || 0)));
  const rows = base.filter(r => rating === 'ALL' || (rating === 'LOW' ? stars(r) <= 3 : stars(r) === Number(rating))).sort((a, b) => reviewTime(b) - reviewTime(a));
  const pageRows = rows.slice(page * 12, page * 12 + 12);
  const avg = list.length ? list.reduce((s, r) => s + stars(r), 0) / list.length : 0;
  const low = list.filter(r => stars(r) <= 3).length;

  const remove = async (r) => {
    if (!window.confirm(`Delete the review by "${r.name || 'Unknown'}"? This can't be undone.`)) return;
    setBusy(r.id);
    await onDelete(r);
    setBusy(null);
  };

  return (
    <div className="ord-desk">
      <Stats items={[
        { icon: MessageSquare, label: 'Reviews on the site', value: list.length, cls: 'is-blue', onClick: () => setRating('ALL') },
        { icon: Star, label: 'Average rating', value: list.length ? avg.toFixed(1) : '—', cls: 'is-amber' },
        { icon: CheckCircle2, label: '5-star reviews', value: list.filter(r => stars(r) === 5).length, cls: 'is-green', onClick: () => setRating('5') },
        { icon: AlertTriangle, label: '3 stars or less', value: low, cls: 'is-red', onClick: () => setRating('LOW') },
      ]} />
      <div className="ord-panel">
        <div className="ord-toolbar">
          <div className="ord-search">
            <Search />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, place or review text…" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X /></button>}
          </div>
        </div>
        <div className="ord-tabs" role="tablist">
          {[['ALL', 'All'], ['5', '5 ★'], ['4', '4 ★'], ['LOW', '3 ★ or less']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={rating === id} className={`ord-tab ${rating === id ? 'is-active' : ''}`} onClick={() => setRating(id)}>{label}</button>
          ))}
        </div>
        {pageRows.length === 0 ? (
          <div className="ord-empty"><Star /><strong>No reviews here</strong><small>{q ? 'Nothing matches that search.' : 'Try another filter.'}</small></div>
        ) : (
          <div className="rev-grid">
            {pageRows.map(r => (
              <article key={r.id} className={`rev-card ${stars(r) <= 3 ? 'is-low' : ''}`}>
                <header>
                  <span className="usr-avatar">{String(r.name || '?').trim().charAt(0).toUpperCase() || '?'}</span>
                  <span className="ord-stack">
                    <b>{r.flag ? `${r.flag} ` : ''}{r.name || 'Unknown'}</b>
                    <small>{[r.location, r.date || (reviewTime(r) ? timeAgo(reviewTime(r)) : '')].filter(Boolean).join(' · ')}</small>
                  </span>
                  <button type="button" className="ord-copy rev-del" onClick={() => remove(r)} disabled={busy === r.id} aria-label="Delete review">
                    {busy === r.id ? <Loader2 className="dep-spin" /> : <Trash2 />}
                  </button>
                </header>
                <Stars n={stars(r)} />
                <p>{r.text}</p>
              </article>
            ))}
          </div>
        )}
        <Pager page={page} setPage={setPage} total={rows.length} size={12} />
      </div>
    </div>
  );
};
