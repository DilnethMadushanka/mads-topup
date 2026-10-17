import React, { useCallback, useEffect, useState } from 'react';
import { Clock, RefreshCw, ArrowDownLeft, ArrowUpRight, Gift, Users, ShieldCheck, Undo2, Loader2 } from 'lucide-react';
import { getUserAuthToken } from '../services/serverApi';

// The customer's wallet history from the server (/api/my-wallet-history):
// deposits, orders paid from the wallet, refunds, gift vouchers, referral
// cashback and changes made by support. Works on any phone or browser the
// customer logs in from. Styles: .wh-* in index.css.

const KIND = {
  deposit: { icon: ArrowDownLeft, cls: 'is-in' },
  order: { icon: ArrowUpRight, cls: 'is-out' },
  refund: { icon: Undo2, cls: 'is-muted' },
  admin: { icon: ShieldCheck, cls: 'is-in' },
  voucher: { icon: Gift, cls: 'is-gold' },
  referral: { icon: Users, cls: 'is-teal' },
};
const STATUS = { pending: 'Checking', rejected: 'Rejected', failed: 'Refunded' };
const TABS = [['all', 'All'], ['in', 'Money in'], ['out', 'Spent']];

const money = (e) => {
  const parts = [];
  const lkr = e.shownLkr ?? e.lkr;
  if (lkr) parts.push(`${lkr > 0 ? '+' : '−'}Rs. ${Math.abs(lkr).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
  if (e.usdt) parts.push(`${e.usdt > 0 ? '+' : '−'}$${Math.abs(e.usdt).toFixed(2)}`);
  return parts.join(' · ') || 'Rs. 0';
};
const when = (iso) => {
  const t = Date.parse(iso || '');
  if (!t) return '';
  return new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const WalletHistory = ({ localPayments = [] }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getUserAuthToken();
      if (!token) throw new Error('Log in to see your wallet history.');
      const res = await fetch('/api/my-wallet-history', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not load your history.');
      setData(json);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // A deposit sent from this browser a moment ago may not be in the
  // server's copy yet (it is cached for 30 seconds): show it until it is.
  const serverIds = new Set((data?.entries || []).map(e => e.id));
  const recentLocal = localPayments
    .filter(p => p && p.id && !serverIds.has(`dep-${p.id}`) && Date.now() - Date.parse(p.timestamp || p.createdAt || 0) < 10 * 60000)
    .map(p => ({ id: `dep-${p.id}`, at: p.timestamp || '', kind: 'deposit', title: 'Deposit', detail: [p.method, p.referenceNumber].filter(Boolean).join(' · '), lkr: p.currency === 'LKR' ? Number(p.amount) || 0 : 0, usdt: p.currency !== 'LKR' ? Number(p.amount) || 0 : 0, status: 'pending' }));
  const entries = [...recentLocal, ...(data?.entries || [])];
  const shown = entries.filter(e => tab === 'all' || (tab === 'in' ? e.lkr > 0 || e.usdt > 0 : e.lkr < 0 || e.usdt < 0));
  const visible = showAll ? shown : shown.slice(0, 8);
  const totals = data?.totals;

  return (
    <section className="wh-card" aria-labelledby="wh-title">
      <div className="wh-head">
        <span className="wh-ico"><Clock /></span>
        <span className="wh-titles">
          <h3 id="wh-title">Wallet history</h3>
          <small>Deposits, orders and refunds</small>
        </span>
        <button type="button" className="wh-refresh" onClick={load} disabled={loading} aria-label="Refresh history">
          <RefreshCw className={loading ? 'wh-spin' : ''} />
        </button>
      </div>

      {totals && (
        <div className="wh-sums">
          <span className="is-in"><small>Money in</small><b>Rs. {totals.inLkr.toLocaleString('en-US')}</b></span>
          <span className="is-out"><small>Spent</small><b>Rs. {totals.outLkr.toLocaleString('en-US')}</b></span>
          <span className="is-wait"><small>Checking</small><b>{totals.pending + recentLocal.length}</b></span>
        </div>
      )}

      <div className="wh-tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => { setTab(id); setShowAll(false); }}>{label}</button>
        ))}
      </div>

      {loading && !data && <div className="wh-empty"><Loader2 className="wh-spin" /><span>Loading your history…</span></div>}
      {!loading && error && !data && (
        <div className="wh-empty is-error"><span>{error}</span><button type="button" onClick={load}>Try again</button></div>
      )}
      {data && shown.length === 0 && (
        <div className="wh-empty"><span className="wh-empty-ico">📭</span><b>Nothing here yet</b><span>Your deposits and orders will show here.</span></div>
      )}

      {visible.length > 0 && (
        <ul className="wh-list">
          {visible.map(e => {
            const k = KIND[e.kind] || KIND.deposit;
            const Icon = k.icon;
            const cls = e.status === 'rejected' || e.status === 'failed' ? 'is-muted' : e.status === 'pending' ? 'is-wait' : k.cls;
            return (
              <li key={e.id} className={`wh-row ${cls}`}>
                <span className="wh-row-ico"><Icon /></span>
                <span className="wh-row-main">
                  <b>{e.title}</b>
                  <small>{[e.detail, e.note].filter(Boolean).join(' · ') || ' '}</small>
                </span>
                <span className="wh-row-end">
                  <b className={e.status === 'rejected' || e.status === 'failed' ? 'is-struck' : ''}>{money(e)}</b>
                  <small>{STATUS[e.status] ? <i className={`wh-tag is-${e.status}`}>{STATUS[e.status]}</i> : null}{when(e.at)}</small>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {shown.length > visible.length && (
        <button type="button" className="wh-more" onClick={() => setShowAll(true)}>Show all {shown.length}</button>
      )}
    </section>
  );
};
