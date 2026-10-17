import React, { useEffect, useState } from 'react';
import {
  Search, Copy, X, Ticket, Gift, CheckCircle2, PauseCircle, PlayCircle, Trash2, Plus,
  Sparkles, Clock, Loader2, Users, Wallet, Ban, RefreshCw, Settings
} from 'lucide-react';
import { voucherState } from '../../../lib/vouchers.js';

// Admin "Promo Vouchers": create codes, watch how they're used, pause,
// change limits and see who redeemed them. Every change goes to the server
// one voucher at a time. Uses the .ord-* / .dep-* styles plus .vch-*.

const STATE_META = {
  active: { label: 'Active', cls: 'is-green' },
  paused: { label: 'Paused', cls: 'is-amber' },
  used_up: { label: 'Used up', cls: 'is-slate' },
  expired: { label: 'Expired', cls: 'is-red' },
};
const TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'used_up', label: 'Used up' },
  { id: 'expired', label: 'Expired' },
];

const money = (v, cur) => (cur === 'USDT' ? `$${(Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : `Rs. ${Math.round(Number(v) || 0).toLocaleString('en-US')}`);
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo' }) : '');
const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' }) : '—');
const randomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return `MADS-${Array.from(bytes, b => chars[b % chars.length]).join('')}`;
};
// <input type="date"> value <-> ISO at the end of that day in Sri Lanka.
const dateToIso = (d) => (d ? new Date(`${d}T23:59:59+05:30`).toISOString() : null);
const isoToDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }) : '');

const copyText = async (text, showToast) => {
  try { await navigator.clipboard.writeText(String(text)); showToast?.(`Copied ${text}`); } catch { showToast?.('Could not copy', 'error'); }
};

export const VoucherPill = ({ v }) => {
  const meta = STATE_META[voucherState(v)] || STATE_META.active;
  return <span className={`ord-pill ${meta.cls}`}><i />{meta.label}</span>;
};

const Usage = ({ v }) => {
  const used = Number(v.usedCount) || 0;
  const max = Number(v.maxUses) || 0;
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <span className="vch-usage">
      <span className="vch-bar"><i style={{ width: `${pct}%` }} /></span>
      <small><b>{used}</b> / {max || '∞'} used</small>
    </span>
  );
};

const CreateVoucher = ({ onCreate }) => {
  const [code, setCode] = useState('');
  const [currency, setCurrency] = useState('LKR');
  const [value, setValue] = useState('');
  const [maxUses, setMaxUses] = useState('100');
  const [expiry, setExpiry] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const val = parseFloat(value) || 0;
  const uses = parseInt(maxUses, 10) || 0;
  const ready = code.trim().length >= 3 && val > 0 && uses > 0 && !busy;

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    const r = await onCreate({ code: code.trim().toUpperCase(), currency, value: val, maxUses: uses, expiresAt: dateToIso(expiry), note: note.trim() });
    setBusy(false);
    if (r?.ok) { setCode(''); setValue(''); setExpiry(''); setNote(''); }
  };

  return (
    <form className="ord-panel vch-create" onSubmit={submit}>
      <h4 className="usr-h"><Sparkles />New voucher</h4>
      <label className="dep-label">
        <span>Code</span>
        <span className="vch-code-row">
          <input className="dep-input ord-mono" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} placeholder="WELCOME100" maxLength={32} />
          <button type="button" className="ord-ghost" onClick={() => setCode(randomCode())}><RefreshCw /><span>Random</span></button>
        </span>
      </label>
      <div className="dep-label">
        <span>Gives</span>
        <div className="dep-seg vch-cur">
          {['LKR', 'USDT'].map(c => <button key={c} type="button" className={currency === c ? 'is-active' : ''} onClick={() => setCurrency(c)}>{c}</button>)}
        </div>
      </div>
      <div className="usr-amounts">
        <label className="dep-label"><span>Value ({currency})</span><input className="dep-input ord-mono" type="number" inputMode="decimal" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder={currency === 'USDT' ? '5' : '100'} /></label>
        <label className="dep-label"><span>Max uses</span><input className="dep-input ord-mono" type="number" inputMode="numeric" min="1" step="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} /></label>
      </div>
      <div className="usr-amounts">
        <label className="dep-label"><span>Expires (optional)</span><input className="dep-input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></label>
        <label className="dep-label"><span>Note (optional)</span><input className="dep-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Facebook giveaway" maxLength={120} /></label>
      </div>
      {val > 0 && uses > 0 && (
        <p className="vch-cost"><Wallet />If every use is redeemed, this gives away <b>{money(val * uses, currency)}</b>.</p>
      )}
      <button type="submit" className="ord-act is-blue-solid usr-save" disabled={!ready}>
        {busy ? <><Loader2 className="dep-spin" />Creating…</> : <><Plus />Create voucher</>}
      </button>
    </form>
  );
};

export const VouchersDesk = ({ vouchers, onCreate, onOpen }) => {
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const list = vouchers.filter(v => v && v.code);
  const q = search.trim().toUpperCase();
  const base = list.filter(v => !q || String(v.code).toUpperCase().includes(q) || String(v.note || '').toUpperCase().includes(q));
  const counts = Object.fromEntries(TABS.map(t => [t.id, t.id === 'ALL' ? base.length : base.filter(v => voucherState(v) === t.id).length]));
  const rows = base.filter(v => tab === 'ALL' || voucherState(v) === tab)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || String(a.code).localeCompare(String(b.code)));

  const redeemed = list.reduce((s, v) => s + (Number(v.usedCount) || 0), 0);
  const givenLkr = list.filter(v => v.currency !== 'USDT').reduce((s, v) => s + (Number(v.usedCount) || 0) * (Number(v.value) || 0), 0);
  const givenUsdt = list.filter(v => v.currency === 'USDT').reduce((s, v) => s + (Number(v.usedCount) || 0) * (Number(v.value) || 0), 0);
  const stats = [
    { icon: Ticket, label: `Active of ${list.length} codes`, value: list.filter(v => voucherState(v) === 'active').length, cls: 'is-blue', onClick: () => setTab('active') },
    { icon: Users, label: 'Times redeemed', value: redeemed.toLocaleString('en-US'), cls: 'is-green' },
    { icon: Gift, label: `Given away${givenUsdt ? ` + ${money(givenUsdt, 'USDT')}` : ''}`, value: money(givenLkr, 'LKR'), cls: 'is-amber' },
    { icon: Ban, label: 'Used up or expired', value: list.filter(v => ['used_up', 'expired'].includes(voucherState(v))).length, cls: 'is-red', onClick: () => setTab('used_up') },
  ];

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
      <div className="vch-layout">
        <CreateVoucher onCreate={onCreate} />
        <div className="ord-panel">
          <div className="ord-toolbar">
            <div className="ord-search">
              <Search />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code or note…" />
              {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X /></button>}
            </div>
          </div>
          <div className="ord-tabs" role="tablist">
            {TABS.map(t => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`ord-tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}<span>{counts[t.id]}</span>
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <div className="ord-empty"><Ticket /><strong>No vouchers here</strong><small>{q ? 'Nothing matches that search.' : 'Create one with the form.'}</small></div>
          ) : (
            <div className="ord-list">
              {rows.map(v => (
                <button key={v.code} type="button" className="ord-row vch-row" onClick={() => onOpen(v)}>
                  <span className="ord-c-order">
                    <span className={`vch-ico ${v.currency === 'USDT' ? 'is-amber' : ''}`}><Ticket /></span>
                    <span className="ord-stack">
                      <b className="ord-mono">{v.code}</b>
                      <small>{v.note || (v.expiresAt ? `Expires ${fmtDate(v.expiresAt)}` : 'No expiry')}</small>
                    </span>
                  </span>
                  <span className="ord-c-amount">{money(v.value, v.currency)}</span>
                  <span className="vch-c-usage"><Usage v={v} /></span>
                  <span className="ord-c-status"><VoucherPill v={v} /></span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const VoucherDetail = ({ voucher, onClose, onUpdate, onDelete, fetchLog, showToast }) => {
  const v = voucher;
  const state = voucherState(v);
  const [maxUses, setMaxUses] = useState(String(v.maxUses || ''));
  const [expiry, setExpiry] = useState(isoToDate(v.expiresAt));
  const [note, setNote] = useState(v.note || '');
  const [busy, setBusy] = useState(null);
  const [log, setLog] = useState(null);
  const [loadingLog, setLoadingLog] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoadingLog(true);
    fetchLog(v.code).then(list => { if (alive) { setLog(list); setLoadingLog(false); } });
    return () => { alive = false; };
  }, [v.code, fetchLog]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const changed = String(v.maxUses || '') !== maxUses || isoToDate(v.expiresAt) !== expiry || (v.note || '') !== note;
  const run = async (name, fn) => { setBusy(name); const r = await fn(); setBusy(null); return r; };
  const save = () => run('save', () => onUpdate({ code: v.code, maxUses: parseInt(maxUses, 10), expiresAt: dateToIso(expiry), note }));
  const togglePause = () => run('pause', () => onUpdate({ code: v.code, active: v.active === false }, v.active === false ? `${v.code} is live again.` : `${v.code} paused.`));
  const remove = async () => {
    if (!window.confirm(`Delete ${v.code}?\n\nCustomers can't redeem it any more. Wallet credit already given stays.`)) return;
    const r = await run('delete', () => onDelete(v.code));
    if (r?.ok) onClose();
  };

  return (
    <div className="ord-sheet-wrap" onClick={onClose}>
      <div className="ord-sheet" role="dialog" aria-modal="true" aria-label={`Voucher ${v.code}`} onClick={(e) => e.stopPropagation()}>
        <div className="ord-sheet-head">
          <span className={`vch-ico is-lg ${v.currency === 'USDT' ? 'is-amber' : ''}`}><Ticket /></span>
          <div className="ord-stack">
            <b className="ord-mono">{v.code}</b>
            <small>{money(v.value, v.currency)} per use{v.note ? ` · ${v.note}` : ''}</small>
          </div>
          <button type="button" className="ord-x" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="ord-sheet-body">
          <div className="ord-summary">
            <VoucherPill v={v} />
            <strong>{money(v.value, v.currency)}</strong>
            <span className="ord-mono">{v.code}<button type="button" className="ord-copy" onClick={() => copyText(v.code, showToast)} aria-label="Copy code"><Copy /></button></span>
          </div>

          <section className="ord-sec">
            <h4><Users />Usage</h4>
            <Usage v={v} />
            <div className="ord-grid vch-grid">
              <div className="ord-field"><small>Given away</small><span>{money((Number(v.usedCount) || 0) * (Number(v.value) || 0), v.currency)}</span></div>
              <div className="ord-field"><small>Left</small><span>{Math.max(0, (Number(v.maxUses) || 0) - (Number(v.usedCount) || 0))} uses</span></div>
              <div className="ord-field"><small>Created</small><span>{v.createdAt ? fmtDate(v.createdAt) : '—'}</span></div>
              <div className="ord-field"><small>Expires</small><span>{v.expiresAt ? fmtDate(v.expiresAt) : 'Never'}</span></div>
            </div>
          </section>

          <section className="ord-sec">
            <h4><Settings />Settings</h4>
            <div className="usr-amounts">
              <label className="dep-label"><span>Max uses</span><input className="dep-input ord-mono" type="number" min={Math.max(1, Number(v.usedCount) || 0)} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} /></label>
              <label className="dep-label"><span>Expires</span><input className="dep-input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></label>
            </div>
            <label className="dep-label vch-note"><span>Note</span><input className="dep-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="Where this code was shared" /></label>
            {changed && (
              <button type="button" className="ord-act is-blue-solid usr-save vch-save" onClick={save} disabled={Boolean(busy)}>
                {busy === 'save' ? <><Loader2 className="dep-spin" />Saving…</> : 'Save changes'}
              </button>
            )}
          </section>

          <section className="ord-sec">
            <h4><Clock />Redeemed by</h4>
            {loadingLog ? <small className="usr-muted">Loading…</small>
              : !log ? <small className="usr-muted">Could not load the list.</small>
                : log.length === 0 ? <small className="usr-muted">Nobody has redeemed this code yet.</small>
                  : (
                    <ul className="usr-logs">
                      {log.map(e => (
                        <li key={e.id} className="usr-log">
                          <span className="usr-log-ico"><CheckCircle2 /></span>
                          <span className="ord-stack"><b>{e.userEmail && e.userEmail !== 'N/A' ? e.userEmail : e.userId}</b><small>{money(e.value, e.currency)}</small></span>
                          <span className="usr-log-side"><small>{fmtDateTime(e.redeemedAt)}</small></span>
                        </li>
                      ))}
                    </ul>
                  )}
          </section>
        </div>
        <div className="ord-sheet-foot">
          <div className="ord-actions">
            <button type="button" className="ord-act is-red" onClick={remove} disabled={Boolean(busy)}>
              {busy === 'delete' ? 'Deleting…' : <><Trash2 />Delete</>}
            </button>
            {(state === 'active' || state === 'paused') && (
              <button type="button" className={`ord-act ${v.active === false ? 'is-green' : 'is-slate'}`} onClick={togglePause} disabled={Boolean(busy)}>
                {busy === 'pause' ? 'Saving…' : v.active === false ? <><PlayCircle />Resume</> : <><PauseCircle />Pause</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
