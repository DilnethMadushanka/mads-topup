import React, { useMemo, useState } from 'react';
import { Search, X, Gamepad2, Tag, TrendingUp, AlertTriangle, RotateCcw, Save, Loader2, Percent } from 'lucide-react';
import { RESELLER_TIERS } from '../../data/resellerTiers';

// Admin "Game Prices": edit package prices against MooGold's cost, see the
// margin and what each reseller tier pays, and save only what changed.
// Uses the .ord-* / .dep-* styles plus .prc-* (index.css).

const lkr = (v) => `Rs. ${Math.round(Number(v) || 0).toLocaleString('en-US')}`;
const LOW_MARGIN = 0.05;

// Built-in price: AppContext remembers it before applying an override.
const basePrice = (pkg) => Number(pkg.basePriceLkr ?? pkg.priceLkr) || 0;
const marginOf = (price, cost) => (cost > 0 && price > 0 ? { lkr: price - cost, pct: (price - cost) / price } : null);

const MarginBadge = ({ m }) => {
  if (!m) return <span className="prc-margin is-none">No cost data</span>;
  const cls = m.lkr < 0 ? 'is-bad' : m.pct < LOW_MARGIN ? 'is-warn' : 'is-ok';
  return <span className={`prc-margin ${cls}`}>{m.lkr < 0 ? '−' : '+'}{lkr(Math.abs(m.lkr))} · {m.lkr < 0 ? '−' : ''}{Math.abs(m.pct * 100).toFixed(1)}%</span>;
};

export const PricesDesk = ({ games, customPrices = {}, onSave, showToast }) => {
  const [search, setSearch] = useState('');
  const [gameId, setGameId] = useState('ALL');
  const [view, setView] = useState('ALL');
  const [edits, setEdits] = useState({}); // packageId -> string typed, or null = reset
  const [busy, setBusy] = useState(false);
  const [confirmLoss, setConfirmLoss] = useState(null);

  const rows = useMemo(() => games.flatMap(g => (g.packages || []).map(p => ({ g, p }))), [games]);
  const current = (p) => (customPrices[p.id] != null ? Number(customPrices[p.id]) : basePrice(p));
  const shown = (p) => (Object.prototype.hasOwnProperty.call(edits, p.id) ? (edits[p.id] === null ? basePrice(p) : Number(edits[p.id]) || 0) : current(p));
  const isOverride = (p) => customPrices[p.id] != null;
  const isEdited = (p) => Object.prototype.hasOwnProperty.call(edits, p.id) && shown(p) !== current(p);

  const q = search.trim().toLowerCase();
  const filtered = rows.filter(({ g, p }) => (gameId === 'ALL' || g.id === gameId)
    && (!q || `${g.name} ${p.name} ${p.id}`.toLowerCase().includes(q))
    && (view === 'ALL' || (view === 'CUSTOM' && isOverride(p)) || (view === 'LOW' && (() => { const m = marginOf(shown(p), p.moongoldCost); return m && m.pct < LOW_MARGIN; })())));
  const byGame = games.map(g => ({ g, items: filtered.filter(r => r.g.id === g.id) })).filter(x => x.items.length);

  const margins = rows.map(({ p }) => marginOf(current(p), p.moongoldCost)).filter(Boolean);
  const lowest = margins.reduce((m, x) => (x.pct < m ? x.pct : m), Infinity);
  const changed = rows.filter(({ p }) => isEdited(p));
  const stats = [
    { icon: Gamepad2, label: `Packages in ${games.length} games`, value: rows.length, cls: 'is-blue', onClick: () => setView('ALL') },
    { icon: Tag, label: 'Custom prices', value: rows.filter(({ p }) => isOverride(p)).length, cls: 'is-green', onClick: () => setView('CUSTOM') },
    { icon: TrendingUp, label: 'Lowest margin', value: Number.isFinite(lowest) ? `${(lowest * 100).toFixed(1)}%` : '—', cls: 'is-amber' },
    { icon: AlertTriangle, label: `Under ${LOW_MARGIN * 100}% margin`, value: margins.filter(m => m.pct < LOW_MARGIN).length, cls: 'is-red', onClick: () => setView('LOW') },
  ];

  const setPrice = (p, value) => setEdits(e => ({ ...e, [p.id]: value }));
  const save = async (allowBelowCost = false) => {
    const changes = Object.fromEntries(changed.map(({ p }) => [p.id, edits[p.id] === null || shown(p) === basePrice(p) ? null : shown(p)]));
    setBusy(true);
    const r = await onSave(changes, { allowBelowCost });
    setBusy(false);
    if (r?.ok) {
      setEdits({}); setConfirmLoss(null);
      showToast?.(`${changed.length} price${changed.length > 1 ? 's' : ''} saved. The site and the Telegram bot use them now.`);
    } else if (r?.belowCost) {
      setConfirmLoss(r.belowCost);
    } else {
      showToast?.(r?.error || 'Prices were not saved.', 'error');
    }
  };

  return (
    <div className="ord-desk prc-desk">
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Package, game or code…" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X /></button>}
          </div>
          <select className="ord-select" value={gameId} onChange={(e) => setGameId(e.target.value)} aria-label="Game">
            <option value="ALL">All games</option>
            {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="ord-tabs" role="tablist">
          {[['ALL', 'All packages'], ['CUSTOM', 'Custom price'], ['LOW', 'Low margin']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} className={`ord-tab ${view === id ? 'is-active' : ''}`} onClick={() => setView(id)}>{label}</button>
          ))}
        </div>
        <p className="prc-note"><Percent />Margin = price − MooGold cost. Reseller columns show what each tier pays ({RESELLER_TIERS.slice().reverse().map(t => `${t.name} ${Math.round(t.rate * 100)}%`).join(' · ')}).</p>
      </div>

      {byGame.length === 0 && <div className="ord-panel ord-empty"><Gamepad2 /><strong>No packages here</strong><small>Try another filter.</small></div>}

      {byGame.map(({ g, items }) => (
        <div key={g.id} className="ord-panel">
          <div className="prc-game">
            {g.logo ? <img src={g.logo} alt="" className="ord-game" /> : <span className="ord-game is-text">{g.name.slice(0, 2)}</span>}
            <span className="ord-stack"><b>{g.name}</b><small>{g.publisher} · {items.length} package{items.length > 1 ? 's' : ''}</small></span>
          </div>
          <div className="ord-head prc-grid" aria-hidden="true">
            <span>Package</span><span className="is-right">MooGold cost</span><span>Price (LKR)</span><span>Margin</span><span>Resellers pay</span>
          </div>
          <div className="ord-list">
            {items.map(({ p }) => {
              const price = shown(p);
              const m = marginOf(price, p.moongoldCost);
              const edited = isEdited(p);
              return (
                <div key={p.id} className={`ord-row prc-grid prc-row ${edited ? 'is-edited' : ''}`}>
                  <span className="ord-c-order">
                    {p.image ? <img src={p.image} alt="" className="prc-img" loading="lazy" /> : <span className="prc-img" />}
                    <span className="ord-stack">
                      <b>{p.name}</b>
                      <small className="ord-mono">{p.id}{isOverride(p) && !edited ? ' · custom' : ''}{edited ? ' · edited' : ''}</small>
                    </span>
                  </span>
                  <span className="prc-cost">{p.moongoldCost ? lkr(p.moongoldCost) : '—'}</span>
                  <span className="prc-price">
                    <span className="prc-input">
                      <i>Rs.</i>
                      <input type="number" inputMode="numeric" min="1" value={Object.prototype.hasOwnProperty.call(edits, p.id) && edits[p.id] !== null ? edits[p.id] : price} onChange={(e) => setPrice(p, e.target.value)} aria-label={`Price for ${p.name}`} />
                    </span>
                    {(isOverride(p) || edited) && (
                      <button type="button" className="ord-copy" title={`Back to Rs. ${basePrice(p).toLocaleString('en-US')}`} onClick={() => setPrice(p, null)} aria-label="Reset to built-in price"><RotateCcw /></button>
                    )}
                  </span>
                  <span className="prc-m"><MarginBadge m={m} /></span>
                  <span className="prc-tiers">
                    {RESELLER_TIERS.slice().reverse().map(t => <small key={t.id}><b>{t.name[0]}</b> {lkr(Math.round(price * (1 - t.rate)))}</small>)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {changed.length > 0 && (
        <div className="prc-bar">
          {confirmLoss ? (
            <>
              <span><AlertTriangle /><b>Below MooGold cost:</b> {confirmLoss.join(', ')}. Every sale loses money.</span>
              <button type="button" className="ord-act is-slate" onClick={() => setConfirmLoss(null)} disabled={busy}>Fix prices</button>
              <button type="button" className="ord-act is-red-solid" onClick={() => save(true)} disabled={busy}>{busy ? <Loader2 className="dep-spin" /> : 'Save anyway'}</button>
            </>
          ) : (
            <>
              <span><b>{changed.length}</b> price{changed.length > 1 ? 's' : ''} changed</span>
              <button type="button" className="ord-act is-slate" onClick={() => setEdits({})} disabled={busy}>Discard</button>
              <button type="button" className="ord-act is-blue-solid" onClick={() => save(false)} disabled={busy || changed.some(({ p }) => !(shown(p) > 0))}>
                {busy ? <><Loader2 className="dep-spin" />Saving…</> : <><Save />Save &amp; publish</>}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
