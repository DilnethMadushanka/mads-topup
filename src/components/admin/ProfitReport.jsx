import React, { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, ChevronDown, AlertTriangle, Wallet, ShoppingCart, Coins } from 'lucide-react';

// Admin "Daily Profit" tab: each day's completed top-ups, sale price against
// MooGold's cost. Worked out on the server (/api/admin/profit).
const fieldCls = "px-3 py-2 rounded-xl border-2 text-xs font-bold focus:outline-none focus:border-[#1677ff] transition-all";
const fieldStyle = { background: 'var(--adm-input-bg)', borderColor: 'var(--adm-border)', color: 'var(--adm-text)' };
const cardStyle = { background: 'var(--adm-surface)', borderColor: 'var(--adm-border)', boxShadow: 'var(--adm-shadow)' };
const mutedStyle = { color: 'var(--adm-text-muted)' };
const textStyle = { color: 'var(--adm-text)' };

const RATE_KEY = 'mads_admin_profit_rate';
const RANGES = [7, 30, 90];
const lkr = (v) => `Rs. ${Math.round(Number(v) || 0).toLocaleString('en-US')}`;
const signedLkr = (v) => `${v < 0 ? '−' : ''}Rs. ${Math.abs(Math.round(Number(v) || 0)).toLocaleString('en-US')}`;
const profitColor = (v) => (v < 0 ? '#ef4444' : '#10b981');
const margin = (profit, sale) => (sale > 0 ? `${((profit / sale) * 100).toFixed(1)}%` : '—');
const dayLabel = (date, today) => {
  if (date === today) return 'Today';
  const d = new Date(`${date}T00:00:00Z`);
  const y = new Date(`${today}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  if (d.getTime() === y.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
};
const timeOf = (iso) => {
  const t = new Date(iso);
  return isNaN(t) ? '' : t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' });
};

const SOURCE = {
  moogold: { label: 'MooGold', cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', title: 'Cost from MooGold order history' },
  estimate: { label: 'Estimate', cls: 'bg-amber-500/15 text-amber-500 border-amber-500/30', title: 'Cost from the catalog MooGold price' },
  none: { label: 'No cost', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30', title: 'No MooGold cost found; left out of profit' },
};

const readRate = () => {
  try {
    const v = Number(localStorage.getItem(RATE_KEY));
    return v >= 100 && v <= 1000 ? v : 340;
  } catch (e) {
    return 340;
  }
};

const Summary = ({ icon: Icon, label, value, sub, color = '#1677ff' }) => (
  <div className="rounded-2xl border-2 p-4 min-w-0" style={cardStyle}>
    <div className="flex items-center gap-2.5 mb-2">
      <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        <Icon className="w-4.5 h-4.5" />
      </span>
      <span className="text-[10px] font-black uppercase tracking-wide" style={mutedStyle}>{label}</span>
    </div>
    <div className="text-lg sm:text-xl font-black truncate" style={{ color: color === '#1677ff' ? 'var(--adm-text)' : color }}>{value}</div>
    {sub && <div className="text-[11px] font-bold mt-0.5" style={mutedStyle}>{sub}</div>}
  </div>
);

const OrderLine = ({ o }) => {
  const s = SOURCE[o.source] || SOURCE.none;
  return (
    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[56px_1fr_110px_110px_110px] gap-x-3 gap-y-1 items-center px-4 py-2.5 border-t text-xs" style={{ borderColor: 'var(--adm-border)' }}>
      <span className="hidden sm:block font-mono font-bold" style={mutedStyle}>{timeOf(o.time)}</span>
      <div className="min-w-0">
        <div className="font-bold truncate" style={textStyle}>{o.gameName || 'Top-up'} · {o.packageName}</div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="sm:hidden font-mono text-[10px]" style={mutedStyle}>{timeOf(o.time)}</span>
          <span className="font-mono text-[10px] truncate" style={mutedStyle}>{o.id}</span>
          <span title={s.title} className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${s.cls}`}>{s.label}</span>
          {o.mgRefunded && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase border bg-red-500/15 text-red-500 border-red-500/30">Refunded at MooGold</span>}
        </div>
      </div>
      <span className="sm:hidden text-right font-black" style={{ color: o.profitLkr === null ? 'var(--adm-text-muted)' : profitColor(o.profitLkr) }}>
        {o.profitLkr === null ? '—' : signedLkr(o.profitLkr)}
      </span>
      <span className="col-span-2 sm:col-span-1 sm:text-right text-[11px] sm:text-xs font-bold" style={mutedStyle}>
        <span className="sm:hidden">Sale </span><span style={textStyle}>{lkr(o.saleLkr)}</span>
        <span className="sm:hidden"> · Cost {o.costLkr === null ? '—' : `${lkr(o.costLkr)} ($${o.costUsd.toFixed(2)})`}</span>
      </span>
      <span className="hidden sm:block text-right font-bold" style={mutedStyle}>
        {o.costLkr === null ? '—' : <><span style={textStyle}>{lkr(o.costLkr)}</span><br /><span className="text-[10px]">${o.costUsd.toFixed(2)}</span></>}
      </span>
      <span className="hidden sm:block text-right font-black" style={{ color: o.profitLkr === null ? 'var(--adm-text-muted)' : profitColor(o.profitLkr) }}>
        {o.profitLkr === null ? '—' : signedLkr(o.profitLkr)}
      </span>
    </div>
  );
};

export const ProfitReport = () => {
  const [days, setDays] = useState(30);
  const [rate, setRate] = useState(readRate);
  const [rateInput, setRateInput] = useState(String(readRate()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/profit?days=${days}&rate=${rate}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
      setOpen((cur) => cur ?? json.days?.[0]?.date ?? null);
    } catch (e) {
      setError(e.message || 'Could not load the profit report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days, rate]);

  const applyRate = () => {
    const v = Number(rateInput);
    if (!(v >= 100 && v <= 1000)) { setRateInput(String(rate)); return; }
    try { localStorage.setItem(RATE_KEY, String(v)); } catch (e) {}
    setRate(v);
  };

  const today = data?.toDate || '';
  const todayRow = data?.days?.find((d) => d.date === today);
  const t = data?.totals;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border-2 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4" style={cardStyle}>
        <div>
          <span className="text-[10px] font-black uppercase tracking-wide block mb-1.5" style={mutedStyle}>Period</span>
          <div className="flex gap-1.5">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setDays(r)} className={`px-3.5 py-2 rounded-xl text-xs font-black border-2 cursor-pointer transition-all ${days === r ? 'bg-[#1677ff] border-[#1677ff] text-white' : ''}`} style={days === r ? undefined : { borderColor: 'var(--adm-border)', ...mutedStyle }}>
                {r} days
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-wide block mb-1.5" style={mutedStyle}>MooGold rate (1 USD)</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black" style={mutedStyle}>Rs.</span>
            <input type="number" inputMode="decimal" min="100" max="1000" value={rateInput} onChange={(e) => setRateInput(e.target.value)} onBlur={applyRate} onKeyDown={(e) => e.key === 'Enter' && applyRate()} className={`${fieldCls} w-24`} style={fieldStyle} />
          </div>
        </div>
        <button onClick={load} disabled={loading} className="sm:ml-auto px-4 py-2 rounded-xl text-xs font-black border-2 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60" style={{ borderColor: 'var(--adm-border)', color: '#1677ff' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border-2 p-4 text-xs font-bold flex items-center gap-2 border-red-500/30 bg-red-500/10 text-red-500">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {data && !data.moogoldHistory && (
        <div className="rounded-2xl border-2 p-4 text-xs font-bold flex items-start gap-2 border-amber-500/30 bg-amber-500/10 text-amber-500">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>MooGold order history could not be read right now, so costs are catalog estimates. Orders with no catalog cost are left out of profit.</span>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Summary icon={TrendingUp} label="Today's profit" value={signedLkr(todayRow?.profitLkr || 0)} sub={`${todayRow?.count || 0} orders · ${margin(todayRow?.profitLkr || 0, (todayRow?.saleLkr || 0) - (todayRow?.noCostSaleLkr || 0))}`} color={profitColor(todayRow?.profitLkr || 0)} />
          <Summary icon={Coins} label={`Profit · ${days} days`} value={signedLkr(t.profitLkr)} sub={`Margin ${margin(t.profitLkr, t.saleLkr - t.noCostSaleLkr)}`} color={profitColor(t.profitLkr)} />
          <Summary icon={ShoppingCart} label="Sales" value={lkr(t.saleLkr)} sub={`${t.count} completed orders`} />
          <Summary icon={Wallet} label="MooGold cost" value={lkr(t.costLkr)} sub={t.noCost ? `${t.noCost} orders with no cost` : `at Rs. ${data.rate} / USD`} color="#f59e0b" />
        </div>
      )}

      {data && (
        <div className="rounded-3xl border-2 overflow-hidden" style={cardStyle}>
          <div className="hidden sm:grid grid-cols-[1fr_90px_120px_120px_120px_70px_24px] gap-3 px-5 py-3 text-[10px] font-black uppercase tracking-wide" style={{ ...mutedStyle, background: 'var(--adm-surface-2)' }}>
            <span>Day</span><span className="text-right">Orders</span><span className="text-right">Sales</span><span className="text-right">Cost</span><span className="text-right">Profit</span><span className="text-right">Margin</span><span />
          </div>
          {data.days.length === 0 && (
            <div className="p-8 text-center text-xs font-bold" style={mutedStyle}>No completed top-ups in this period.</div>
          )}
          {data.days.map((d) => {
            const isOpen = open === d.date;
            return (
              <div key={d.date} className="border-t first:border-t-0" style={{ borderColor: 'var(--adm-border)' }}>
                <button onClick={() => setOpen(isOpen ? null : d.date)} className="w-full text-left px-4 sm:px-5 py-3.5 cursor-pointer hover:bg-[var(--adm-surface-hover)] transition-colors">
                  <div className="hidden sm:grid grid-cols-[1fr_90px_120px_120px_120px_70px_24px] gap-3 items-center text-xs">
                    <span className="font-black" style={textStyle}>{dayLabel(d.date, today)} <span className="font-mono font-bold text-[10px] ml-1" style={mutedStyle}>{d.date}</span></span>
                    <span className="text-right font-bold" style={textStyle}>{d.count}{d.noCost ? <span className="text-amber-500"> ({d.noCost}?)</span> : null}</span>
                    <span className="text-right font-bold" style={textStyle}>{lkr(d.saleLkr)}</span>
                    <span className="text-right font-bold" style={mutedStyle}>{lkr(d.costLkr)}</span>
                    <span className="text-right font-black" style={{ color: profitColor(d.profitLkr) }}>{signedLkr(d.profitLkr)}</span>
                    <span className="text-right font-bold" style={mutedStyle}>{margin(d.profitLkr, d.saleLkr - d.noCostSaleLkr)}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={mutedStyle} />
                  </div>
                  <div className="sm:hidden flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black" style={textStyle}>{dayLabel(d.date, today)}</div>
                      <div className="text-[11px] font-bold" style={mutedStyle}>{d.count} orders · {lkr(d.saleLkr)} sales{d.noCost ? ` · ${d.noCost} no cost` : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black" style={{ color: profitColor(d.profitLkr) }}>{signedLkr(d.profitLkr)}</div>
                      <div className="text-[10px] font-bold" style={mutedStyle}>{margin(d.profitLkr, d.saleLkr - d.noCostSaleLkr)}</div>
                    </div>
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={mutedStyle} />
                  </div>
                </button>
                {isOpen && (
                  <div style={{ background: 'var(--adm-surface-2)' }}>
                    <div className="hidden sm:grid grid-cols-[56px_1fr_110px_110px_110px] gap-3 px-4 py-2 text-[10px] font-black uppercase tracking-wide" style={mutedStyle}>
                      <span>Time</span><span>Order</span><span className="text-right">Sale</span><span className="text-right">MooGold cost</span><span className="text-right">Profit</span>
                    </div>
                    {d.orders.map((o) => <OrderLine key={o.id} o={o} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!data && loading && (
        <div className="rounded-3xl border-2 p-10 text-center text-xs font-bold" style={{ ...cardStyle, ...mutedStyle }}>Loading profit report…</div>
      )}
    </div>
  );
};
