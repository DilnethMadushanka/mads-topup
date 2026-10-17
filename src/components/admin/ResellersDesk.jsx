import React, { useEffect, useState } from 'react';
import {
  Search, X, Crown, Clock, CheckCircle2, Ban, TrendingUp, Smartphone, Send, User, Store,
  Wallet, Mail, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Copy
} from 'lucide-react';
import { RESELLER_MIN_DEPOSIT_LKR, resellerTierFor } from '../../data/resellerTiers';

// Admin "Reseller Network": applications, the joining-deposit check, and the
// approve / reject / suspend actions (all decided by the server). Uses the
// .ord-* / .dep-* / .usr-* styles plus .rsl-* (index.css).

const STATUS_META = {
  PENDING: { label: 'Pending', cls: 'is-amber' },
  APPROVED: { label: 'Approved', cls: 'is-green' },
  SUSPENDED: { label: 'Suspended', cls: 'is-violet' },
  REJECTED: { label: 'Rejected', cls: 'is-red' },
};
const TABS = ['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED', 'ALL'];
const PAGE_SIZE = 12;
const lkr = (v) => `Rs. ${Math.round(Number(v) || 0).toLocaleString('en-US')}`;
const lc = (v) => String(v || '').trim().toLowerCase();
const time = (a) => Date.parse(a?.submittedAt || a?.updatedAt || '') || 0;
const fmtDate = (t) => (t ? new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' }) : '—');
const timeAgo = (t) => {
  if (!t) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export const appAccount = (app, users) => users.find(u => app.approvedKey && u.uid === app.approvedKey)
  || users.find(u => app.userId && u.uid === app.userId)
  || users.find(u => lc(app.emailAddress || app.email) && lc(u.email) === lc(app.emailAddress || app.email))
  || null;

const Pill = ({ status }) => {
  const m = STATUS_META[status] || { label: status || '—', cls: 'is-slate' };
  return <span className={`ord-pill ${m.cls}`}><i />{m.label}</span>;
};

// Joining deposit, fetched once per application and shared by list and sheet.
const depositCache = new Map();
const useDeposit = (app, fetchDeposit) => {
  const [info, setInfo] = useState(() => depositCache.get(app?.id) || null);
  useEffect(() => {
    if (!app?.id || app.status === 'APPROVED' || !fetchDeposit) return undefined;
    let alive = true;
    fetchDeposit(app.id).then(d => { if (d) depositCache.set(app.id, d); if (alive) setInfo(d || { failed: true }); });
    return () => { alive = false; };
  }, [app?.id, app?.status, fetchDeposit]);
  return info;
};

const DepositChip = ({ app, fetchDeposit }) => {
  const d = useDeposit(app, fetchDeposit);
  if (!d) return <small className="dep-sub">Checking deposit…</small>;
  if (d.failed) return null;
  const need = d.requiredLkr || RESELLER_MIN_DEPOSIT_LKR;
  const done = d.depositLkr >= need;
  return <small className={`dep-chip ${done ? '' : 'is-warn'}`}>{done ? 'Deposit done' : `Deposit ${lkr(d.depositLkr)} / ${lkr(need)}`}</small>;
};

export const ResellersDesk = ({ applications, users, search, onSearch, onOpen, fetchDeposit }) => {
  const [tab, setTab] = useState('PENDING');
  const [page, setPage] = useState(0);
  useEffect(() => { if (search) setTab('ALL'); }, [search]);
  useEffect(() => { setPage(0); }, [tab, search]);

  const q = lc(search);
  const base = applications.filter(a => a && a.id && (!q || [a.storeName, a.realName, a.emailAddress, a.whatsappNumber, a.id, a.resellerCode].some(v => lc(v).includes(q))));
  const counts = Object.fromEntries(TABS.map(t => [t, t === 'ALL' ? base.length : base.filter(a => a.status === t).length]));
  const rows = base.filter(a => tab === 'ALL' || a.status === tab).sort((a, b) => (tab === 'PENDING' ? time(a) - time(b) : time(b) - time(a)));
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const active = users.filter(u => u.isReseller && u.resellerStatus === 'APPROVED');
  const stats = [
    { icon: Clock, label: 'Applications waiting', value: applications.filter(a => a?.status === 'PENDING').length, cls: 'is-amber', onClick: () => setTab('PENDING') },
    { icon: Crown, label: 'Active resellers', value: active.length, cls: 'is-green', onClick: () => setTab('APPROVED') },
    { icon: TrendingUp, label: 'Sold by resellers', value: lkr(active.reduce((s, u) => s + (Number(u.resellerSalesLkr) || 0), 0)), cls: 'is-blue' },
    { icon: Ban, label: 'Suspended or rejected', value: applications.filter(a => a?.status === 'SUSPENDED' || a?.status === 'REJECTED').length, cls: 'is-red', onClick: () => setTab('SUSPENDED') },
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
      <div className="ord-panel">
        <div className="ord-toolbar">
          <div className="ord-search">
            <Search />
            <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Store, name, email, WhatsApp, reseller code…" />
            {search && <button type="button" onClick={() => onSearch('')} aria-label="Clear search"><X /></button>}
          </div>
        </div>
        <div className="ord-tabs" role="tablist">
          {TABS.map(t => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={`ord-tab ${tab === t ? 'is-active' : ''} ${t === 'PENDING' && counts.PENDING ? 'has-alert' : ''}`} onClick={() => setTab(t)}>
              {t === 'ALL' ? 'All' : STATUS_META[t].label}<span>{counts[t]}</span>
            </button>
          ))}
        </div>
        <div className="ord-head rsl-grid" aria-hidden="true">
          <span>Store</span><span>Contact</span><span>Sales / deposit</span><span>Status</span>
        </div>
        {pageRows.length === 0 ? (
          <div className="ord-empty"><Crown /><strong>{tab === 'PENDING' && !q ? 'No applications waiting' : 'Nothing here'}</strong><small>{q ? 'Nothing matches that search.' : 'Try another tab.'}</small></div>
        ) : (
          <div className="ord-list">
            {pageRows.map(a => {
              const acct = appAccount(a, users);
              const tier = acct && acct.isReseller ? resellerTierFor(acct) : null;
              return (
                <button key={a.id} type="button" className={`ord-row rsl-grid rsl-row ${a.status === 'PENDING' ? 'is-action' : ''}`} onClick={() => onOpen(a)}>
                  <span className="ord-c-order">
                    <span className={`vch-ico ${a.status === 'APPROVED' ? 'is-amber' : ''}`}><Crown /></span>
                    <span className="ord-stack">
                      <b>{a.storeName || 'Untitled store'}</b>
                      <small>{a.realName || '—'} · {timeAgo(time(a))}</small>
                    </span>
                  </span>
                  <span className="ord-c-user ord-stack">
                    <b className="ord-mono">{a.whatsappNumber || '—'}</b>
                    <small>{a.emailAddress || a.email || ''}</small>
                  </span>
                  <span className="rsl-c-sales ord-stack">
                    {a.status === 'APPROVED' && acct
                      ? <><b>{lkr(acct.resellerSalesLkr)} sold</b><small>{tier ? `${tier.name} · ${Math.round(tier.rate * 100)}% off` : ''}</small></>
                      : a.status === 'PENDING'
                        ? <><b>{a.dailySale || '—'}</b><DepositChip app={a} fetchDeposit={fetchDeposit} /></>
                        : <><b>{a.dailySale || '—'}</b><small>{a.statusReason || ''}</small></>}
                  </span>
                  <span className="ord-c-status"><Pill status={a.status} /></span>
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
    <span className={mono ? 'ord-mono' : ''}>{children}{onCopy && <button type="button" className="ord-copy" onClick={onCopy} aria-label={`Copy ${label}`}><Copy /></button>}</span>
  </div>
);

const REJECT_REASONS = ['No joining deposit', 'Could not verify the store', 'Duplicate application'];
const SUSPEND_REASONS = ['Customer complaints', 'Reselling outside the rules', 'Asked to leave'];

export const ResellerDetail = ({ app, users, onClose, onSetStatus, onResendEmail, fetchDeposit, onOpenUser, showToast }) => {
  const a = app;
  const acct = appAccount(a, users);
  const deposit = useDeposit(a, fetchDeposit);
  const [mode, setMode] = useState(null); // 'approve' | 'reject' | 'suspend'
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const need = deposit?.requiredLkr || RESELLER_MIN_DEPOSIT_LKR;
  const depositDone = deposit && !deposit.failed && deposit.depositLkr >= need;
  const returning = Boolean(acct?.resellerJoinedAt);
  const tier = acct?.isReseller ? resellerTierFor(acct) : null;
  const phone = String(a.whatsappNumber || '').replace(/[^\d]/g, '');
  const copy = (v) => async () => { try { await navigator.clipboard.writeText(v); showToast?.('Copied'); } catch { /* ignore */ } };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const go = async (status) => {
    setBusy(true);
    const r = await onSetStatus(a, status, reason.trim());
    setBusy(false);
    if (r?.ok) { setMode(null); setReason(''); }
  };
  const resend = async () => { setBusy(true); await onResendEmail(a); setBusy(false); };
  const pct = deposit && !deposit.failed ? Math.min(100, Math.round((deposit.depositLkr / need) * 100)) : 0;

  return (
    <div className="ord-sheet-wrap" onClick={busy ? undefined : onClose}>
      <div className="ord-sheet usr-sheet" role="dialog" aria-modal="true" aria-label={a.storeName || 'Reseller application'} onClick={(e) => e.stopPropagation()}>
        <div className="ord-sheet-head">
          <span className={`vch-ico is-lg ${a.status === 'APPROVED' ? 'is-amber' : ''}`}><Crown /></span>
          <div className="ord-stack">
            <b>{a.storeName || 'Untitled store'}</b>
            <small>{a.realName || '—'} · {a.id}</small>
          </div>
          <button type="button" className="ord-x" onClick={onClose} aria-label="Close" disabled={busy}><X /></button>
        </div>
        <div className="ord-sheet-body">
          <div className="ord-summary rsl-summary">
            <Pill status={a.status} />
            {tier && <strong className="rsl-tier">{tier.name} · {Math.round(tier.rate * 100)}% off</strong>}
          </div>

          {a.status !== 'APPROVED' && (
            <div className={`dep-verdict ${depositDone || returning ? 'is-ok' : deposit?.failed ? 'is-info' : 'is-warn'}`}>
              <Wallet />
              <span>
                <b>{returning ? 'Returning reseller' : depositDone ? 'Joining deposit done' : 'Joining deposit not done yet'}</b>
                {returning ? 'They already paid the joining deposit before; approving gives their reseller prices back.'
                  : !deposit ? 'Checking their verified deposits…'
                    : deposit.failed || deposit.note ? (deposit.note || 'Could not check the deposit.')
                      : <>Verified deposits {lkr(deposit.depositLkr)} of {lkr(need)}.{!depositDone && ' The server only approves once this is reached.'}</>}
                {!returning && deposit && !deposit.failed && <span className="vch-bar rsl-bar"><i style={{ width: `${pct}%` }} /></span>}
              </span>
            </div>
          )}

          {(a.status === 'REJECTED' || a.status === 'SUSPENDED') && a.statusReason && (
            <div className="dep-verdict is-bad"><AlertTriangle /><span><b>{a.status === 'SUSPENDED' ? 'Suspended' : 'Rejected'}</b>{a.statusReason}</span></div>
          )}

          <section className="ord-sec">
            <h4><Store />Application</h4>
            <div className="ord-grid">
              <Field label="Applicant">{a.realName || '—'}</Field>
              <Field label="Daily sales">{a.dailySale || '—'}</Field>
              <Field label="WhatsApp" mono onCopy={a.whatsappNumber ? copy(a.whatsappNumber) : null}>{a.whatsappNumber || '—'}</Field>
              <Field label="Email" onCopy={a.emailAddress ? copy(a.emailAddress) : null}>{a.emailAddress || '—'}</Field>
              <Field label="Store">{a.isRunningStore ? 'Runs a store' : 'No store yet'}</Field>
              <Field label="Social reach">{a.hasSocialReach ? 'Yes' : 'No'}</Field>
              <Field label="Applied">{fmtDate(time(a))}</Field>
              {a.resellerCode && <Field label="Reseller code" mono onCopy={copy(a.resellerCode)}>{a.resellerCode}</Field>}
            </div>
            <div className="ord-links">
              {phone && <a className="ord-ghost is-green" href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"><Smartphone /><span>WhatsApp</span></a>}
              {a.emailAddress && <a className="ord-ghost" href={`mailto:${a.emailAddress}`}><Send /><span>Email</span></a>}
            </div>
          </section>

          <section className="ord-sec">
            <h4><User />Account</h4>
            {acct ? (
              <>
                <div className="ord-grid">
                  <Field label="Customer">{acct.name || acct.email}</Field>
                  <Field label="Wallet">{lkr(acct.walletBalance)}{Number(acct.walletUsdt) ? ` · $${Number(acct.walletUsdt).toFixed(2)}` : ''}</Field>
                  <Field label="Reseller access">{acct.isReseller && acct.resellerStatus === 'APPROVED' ? 'On' : 'Off'}</Field>
                  <Field label="Sold as reseller">{lkr(acct.resellerSalesLkr)}</Field>
                </div>
                <div className="ord-links"><button type="button" className="ord-ghost" onClick={() => onOpenUser(acct)}><User /><span>Open account (tier, wallet)</span></button></div>
              </>
            ) : <small className="usr-muted">No customer account matches this application yet.</small>}
          </section>
        </div>

        <div className="ord-sheet-foot">
          {mode === 'reject' || mode === 'suspend' ? (
            <div className="dep-confirm">
              <small>{mode === 'suspend' ? 'Suspending turns their reseller prices off right away' : 'Reason (kept with the application)'}</small>
              <div className="dep-reasons">
                {(mode === 'suspend' ? SUSPEND_REASONS : REJECT_REASONS).map(r => <button key={r} type="button" className={`dep-reason ${reason === r ? 'is-active' : ''}`} onClick={() => setReason(r)}>{r}</button>)}
              </div>
              <input className="dep-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Or write the reason" maxLength={200} />
              <div className="ord-actions">
                <button type="button" className="ord-act is-slate" onClick={() => setMode(null)} disabled={busy}>Back</button>
                <button type="button" className="ord-act is-red-solid" onClick={() => go(mode === 'suspend' ? 'SUSPENDED' : 'REJECTED')} disabled={busy}>
                  {busy ? <><Loader2 className="dep-spin" />Saving…</> : mode === 'suspend' ? 'Suspend reseller' : 'Reject application'}
                </button>
              </div>
            </div>
          ) : mode === 'approve' ? (
            <div className="dep-confirm">
              <p>Approve <b>{a.storeName}</b>? {acct ? <b>{acct.email}</b> : 'Their account'} gets reseller prices and the codes by email.</p>
              <div className="ord-actions">
                <button type="button" className="ord-act is-slate" onClick={() => setMode(null)} disabled={busy}>Back</button>
                <button type="button" className="ord-act is-green" onClick={() => go('APPROVED')} disabled={busy}>
                  {busy ? <><Loader2 className="dep-spin" />Approving…</> : 'Yes, approve'}
                </button>
              </div>
            </div>
          ) : (
            <div className="ord-actions">
              {a.status === 'PENDING' && <button type="button" className="ord-act is-red" onClick={() => setMode('reject')}>Reject</button>}
              {a.status === 'APPROVED' && <button type="button" className="ord-act is-red" onClick={() => setMode('suspend')}><Ban />Suspend</button>}
              {a.status === 'APPROVED' && <button type="button" className="ord-act is-blue" onClick={resend} disabled={busy}>{busy ? 'Sending…' : <><Mail />Resend email</>}</button>}
              {a.status !== 'APPROVED' && (
                <button type="button" className="ord-act is-green" onClick={() => setMode('approve')} disabled={!acct || (!depositDone && !returning && !deposit?.failed)}>
                  <CheckCircle2 />{a.status === 'PENDING' ? 'Approve' : 'Approve again'}
                </button>
              )}
            </div>
          )}
          {a.status !== 'APPROVED' && !mode && !acct && <small className="dep-foot-note">Can't approve: no customer account matches this application.</small>}
          {a.status !== 'APPROVED' && !mode && acct && deposit && !deposit.failed && !depositDone && !returning && <small className="dep-foot-note">Waiting for {lkr(need - deposit.depositLkr)} more in verified deposits.</small>}
        </div>
      </div>
    </div>
  );
};
