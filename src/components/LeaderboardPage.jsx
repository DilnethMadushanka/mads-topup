import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft, Trophy, Flame, ShoppingBag, Calendar, Infinity, Crown
} from 'lucide-react';

const RTDB_URL = 'https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app';

async function fetchAllSpenders(filterMonth = true) {
  try {
    const [ordersRes, usersRes] = await Promise.all([
      fetch(`${RTDB_URL}/orders.json`),
      fetch(`${RTDB_URL}/users.json`),
    ]);

    let usersMap = {};
    if (usersRes.ok) {
      const uData = await usersRes.json();
      if (uData) Object.values(uData).forEach(u => {
        if (!u) return;
        if (u.uid)   usersMap[u.uid] = u;
        if (u.email) usersMap[u.email.toLowerCase()] = u;
      });
    }

    if (!ordersRes.ok) return [];
    const data = await ordersRes.json();
    if (!data) return [];

    const now = new Date();
    const flatOrders = [];
    Object.values(data).forEach(entry => {
      if (!entry) return;
      if (entry.id || entry.gameId) flatOrders.push(entry);
      else if (typeof entry === 'object')
        Object.values(entry).forEach(o => { if (o && (o.id || o.gameId)) flatOrders.push(o); });
    });

    const spendMap = {}, uidToEmail = {};

    flatOrders.forEach(order => {
      if (!order || ['FAILED', 'REFUNDED', 'CANCELLED'].includes(order.status)) return;
      if (filterMonth && order.createdAt) {
        try {
          const d = new Date(order.createdAt);
          if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return;
        } catch {}
      }
      const amount = parseFloat(order.priceLkr || 0);
      if (!amount || amount <= 0) return;

      const uid   = order.userId || order.userUid || null;
      const email = (order.userEmail || '').toLowerCase() || null;
      let key = uid || email;
      if (!key) return;

      if (uid && email) {
        if (!uidToEmail[uid]) uidToEmail[uid] = email;
        if (!spendMap[uid] && spendMap[email]) { spendMap[uid] = spendMap[email]; delete spendMap[email]; }
        key = uid;
      }

      const userInfo = usersMap[uid] || usersMap[email] || null;
      const name = userInfo?.name || order.userName || order.ign || uid || email || '?';

      if (!spendMap[key]) {
        spendMap[key] = { key, name, avatar: userInfo?.avatar || order.userAvatar || '', totalLkr: 0, orderCount: 0 };
      }
      spendMap[key].totalLkr   += amount;
      spendMap[key].orderCount += 1;
      if (userInfo?.name)   spendMap[key].name   = userInfo.name;
      if (userInfo?.avatar) spendMap[key].avatar = userInfo.avatar;
    });

    return Object.values(spendMap)
      .filter(u => u.name && u.name.length > 1 && u.totalLkr > 0)
      .sort((a, b) => b.totalLkr - a.totalLkr);
  } catch { return []; }
}

function fmtLkr(val) {
  if (!val || val <= 0) return 'Rs. 0';
  if (val >= 100000) return `Rs. ${(val / 1000).toFixed(0)}K`;
  if (val >= 1000)   return `Rs. ${(val / 1000).toFixed(1)}K`;
  return `Rs. ${Math.round(val).toLocaleString()}`;
}

function Avatar({ name = '?', src, size = 48 }) {
  const [err, setErr] = useState(false);
  const letters = (name || '?').replace(/[^a-zA-Z\s]/g, '').trim();
  const initials = (letters || name || '?').split(/\s+/).map(p => p[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?';
  const palettes = [['#cc040a','#ff6b6b'],['#f97316','#fb923c'],['#7c3aed','#a78bfa'],['#059669','#34d399'],['#0284c7','#38bdf8'],['#db2777','#f472b6'],['#d97706','#fbbf24']];
  const [c1, c2] = palettes[(name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palettes.length];

  return (
    <div style={{ width: size, height: size, borderRadius: '50%', border: '3px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', overflow: 'hidden', flexShrink: 0, background: `linear-gradient(135deg, ${c1}, ${c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {src && !err
        ? <img src={src} alt={name} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <span style={{ color: '#fff', fontWeight: 900, fontSize: size * 0.35, lineHeight: 1 }}>{initials}</span>
      }
    </div>
  );
}

const RANK_CFG = {
  1: { ring: 'linear-gradient(135deg,#ff4d4f,#cc040a)', accent: '#cc040a', step: 'linear-gradient(180deg,rgba(204,4,10,0.22),rgba(204,4,10,0.03))', label: 'CHAMPION' },
  2: { ring: 'linear-gradient(135deg,#e2e8f0,#94a3b8)', accent: '#64748b', step: 'linear-gradient(180deg,rgba(100,116,139,0.22),rgba(100,116,139,0.03))', label: 'RUNNER UP' },
  3: { ring: 'linear-gradient(135deg,#fbbf24,#b45309)', accent: '#b45309', step: 'linear-gradient(180deg,rgba(217,119,6,0.26),rgba(217,119,6,0.03))', label: '3RD PLACE' },
};

function PodiumCard({ user, rank, isCenter }) {
  const cfg = RANK_CFG[rank] || RANK_CFG[3];
  return (
    <div className={`hof-col hof-rank-${rank}`}>
      {isCenter && <div className="hof-crown"><Crown size={20} fill="#fbbf24" color="#fbbf24" /></div>}

      <div className="hof-avatar-wrap">
        <div className="hof-ring" style={{ background: cfg.ring }}>
          <div className="hof-ring-inner hof-av">
            <Avatar name={user.name} src={user.avatar} size={0} />
          </div>
        </div>
        <div className="hof-rank-dot" style={{ background: cfg.ring }}>{rank}</div>
      </div>

      <p className="hof-name" title={user.name}>{user.name}</p>
      <p className="hof-label" style={{ color: cfg.accent }}>{cfg.label}</p>
      <p className="hof-amount" style={{ color: isCenter ? '#cc040a' : '#0f172a' }}>{fmtLkr(user.totalLkr)}</p>
      <span className="hof-orders">{user.orderCount} order{user.orderCount !== 1 ? 's' : ''}</span>

      <div className="hof-step" style={{ background: cfg.step, borderTopColor: cfg.accent }}>
        <span className="hof-step-num" style={{ color: cfg.accent }}>{rank}</span>
      </div>
    </div>
  );
}

function EmptySlot({ rank }) {
  return (
    <div className={`hof-col hof-rank-${rank}`}>
      <div className="hof-avatar-wrap"><div className="hof-empty-avatar">?</div></div>
      <p className="hof-name" style={{ color: '#94a3b8' }}>Open spot</p>
      <p className="hof-label" style={{ color: '#cbd5e1' }}>COULD BE YOU</p>
      <div className="hof-step hof-step-empty">
        <span className="hof-step-num" style={{ color: '#cbd5e1' }}>{rank}</span>
      </div>
    </div>
  );
}

function ContenderRow({ user, rank, topTotal }) {
  const pct = topTotal > 0 ? Math.max(4, Math.round((user.totalLkr / topTotal) * 100)) : 0;
  const hot = rank <= 10;
  return (
    <div className="hof-row">
      <div className={`hof-row-rank ${hot ? 'hof-row-rank-hot' : ''}`}>{rank}</div>
      <div className="hof-av hof-av-sm"><Avatar name={user.name} src={user.avatar} size={0} /></div>
      <div className="hof-row-main">
        <div className="hof-row-top">
          <span className="hof-row-name">{user.name}</span>
          <span className="hof-row-amount">{fmtLkr(user.totalLkr)}</span>
        </div>
        <div className="hof-row-bottom">
          <div className="hof-bar"><div className="hof-bar-fill" style={{ width: `${pct}%` }} /></div>
          <span className="hof-row-orders">{user.orderCount} order{user.orderCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}

export const LeaderboardPage = () => {
  const { closeLeaderboardPage } = useApp();
  const [tab, setTab]       = useState('month');
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData([]);
    fetchAllSpenders(tab === 'month').then(d => { setData(d); setLoading(false); });
  }, [tab]);

  const [first, second, third] = data;
  const rest = data.slice(3);
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long' });
  const periodLabel = tab === 'month' ? `${monthName} ${now.getFullYear()}` : 'All Time';

  return (
    <div className="hof-page">
      <div className="hof-glow hof-glow-a" />
      <div className="hof-glow hof-glow-b" />
      <div className="hof-grid-bg" />

      {/* Sticky glass nav */}
      <div className="hof-nav">
        <button onClick={closeLeaderboardPage} className="hof-back">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="hof-nav-title">Hall of Fame</div>
        <div style={{ width: 84 }} />
      </div>

      <div className="hof-wrap">

        {/* Hero header */}
        <div className="hof-hero">
          <div className="hof-trophy"><Trophy size={30} color="#fff" strokeWidth={2.3} /></div>
          <h1 className="hof-h1">Hall of <span>Fame</span></h1>
          <p className="hof-sub">Sri Lanka&apos;s top game top-up champions</p>

          <span className="hof-period"><Flame size={11} /> {periodLabel}</span>

          <div className="hof-tabs">
            {[{ key: 'month', icon: <Calendar size={13} />, label: 'This Month' }, { key: 'all', icon: <Infinity size={13} />, label: 'All Time' }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`hof-tab ${tab === t.key ? 'hof-tab-active' : ''}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Podium */}
        <div className="hof-podium">
          {loading ? (
            <div className="hof-state">
              <div className="hof-spinner" />
              Loading leaderboard…
            </div>
          ) : data.length === 0 ? (
            <div className="hof-state">
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎮</div>
              No data yet — be the first top spender!
            </div>
          ) : (
            <div className="hof-cols">
              {second ? <PodiumCard user={second} rank={2} isCenter={false} /> : <EmptySlot rank={2} />}
              {first  ? <PodiumCard user={first}  rank={1} isCenter={true}  /> : <EmptySlot rank={1} />}
              {third  ? <PodiumCard user={third}  rank={3} isCenter={false} /> : <EmptySlot rank={3} />}
            </div>
          )}
        </div>

        {/* Contenders */}
        {!loading && rest.length > 0 && (
          <div className="hof-contenders">
            <div className="hof-divider">
              <span /><em>THE CONTENDERS</em><span />
            </div>
            <div className="hof-list">
              {rest.map((user, i) => <ContenderRow key={user.key} user={user} rank={i + 4} topTotal={first ? first.totalLkr : 0} />)}
            </div>
          </div>
        )}

        {/* Footer note */}
        <div className="hof-foot">
          <div className="hof-foot-top">
            <ShoppingBag size={14} color="#cc040a" />
            <span>Rankings update in real time</span>
          </div>
          <p>Based on total LKR spent on completed orders · {periodLabel}</p>
        </div>
      </div>

      <style>{`
        .hof-page {
          position: relative; overflow: hidden; min-height: 100vh; padding-bottom: 72px; color: #0f172a;
          background: linear-gradient(170deg, #fff5f5 0%, #ffffff 42%, #fafbff 100%);
        }
        .hof-glow { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(100px); }
        .hof-glow-a { top: -160px; left: 50%; transform: translateX(-50%); width: 640px; height: 340px; background: rgba(204,4,10,0.13); }
        .hof-glow-b { top: 520px; right: -140px; width: 360px; height: 360px; background: rgba(204,4,10,0.07); }
        .hof-grid-bg {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.05;
          background-image: linear-gradient(#cc040a 1px, transparent 1px), linear-gradient(90deg, #cc040a 1px, transparent 1px);
          background-size: 48px 48px;
          -webkit-mask-image: radial-gradient(ellipse at 50% 12%, #000 0%, transparent 65%);
          mask-image: radial-gradient(ellipse at 50% 12%, #000 0%, transparent 65%);
        }

        /* nav */
        .hof-nav {
          position: sticky; top: 0; z-index: 20;
          display: flex; align-items: center; gap: 12px; padding: 12px 20px;
          background: rgba(255,255,255,0.85); backdrop-filter: blur(16px) saturate(150%); -webkit-backdrop-filter: blur(16px) saturate(150%);
          border-bottom: 1px solid rgba(204,4,10,0.10); box-shadow: 0 8px 24px -16px rgba(15,23,42,0.18);
        }
        .hof-back {
          display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 16px; border-radius: 999px;
          background: #fff; border: 1.5px solid #e2e8f0; color: #334155;
          font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;
        }
        .hof-back:hover { background: #cc040a; border-color: #cc040a; color: #fff; }
        .hof-nav-title { flex: 1; text-align: center; font-size: 14px; font-weight: 800; letter-spacing: 0.04em; color: #0f172a; }

        .hof-wrap { position: relative; z-index: 1; max-width: 760px; margin: 0 auto; padding: 0 16px; }

        /* hero */
        .hof-hero { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 44px 0 34px; }
        .hof-trophy {
          width: 68px; height: 68px; border-radius: 20px; margin: 0 auto 18px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #cc040a, #ff4d4f);
          box-shadow: 0 14px 36px -8px rgba(204,4,10,0.7), inset 0 1px 0 rgba(255,255,255,0.25);
        }
        .hof-h1 { margin: 0; font-size: 40px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; color: #0f172a; }
        .hof-h1 span { color: #cc040a; }
        .hof-sub { margin: 10px 0 0; font-size: 14px; font-weight: 500; color: #64748b; }
        .hof-period {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; padding: 6px 14px; border-radius: 99px;
          background: rgba(204,4,10,0.07); border: 1px solid rgba(204,4,10,0.2);
          font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #cc040a;
        }
        .hof-tabs { display: inline-flex; gap: 2px; margin-top: 22px; padding: 4px; border-radius: 99px; background: #f1f5f9; border: 1px solid #e2e8f0; }
        .hof-tab {
          display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 20px; border-radius: 99px; border: 0;
          background: transparent; color: #64748b; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.25s;
        }
        .hof-tab:hover { color: #0f172a; }
        .hof-tab-active { background: #cc040a; color: #fff; box-shadow: 0 8px 22px -6px rgba(204,4,10,0.7); }

        /* podium */
        .hof-podium {
          position: relative; overflow: hidden; border-radius: 30px; padding: 56px 18px 0;
          background: linear-gradient(180deg, #ffffff, #fff6f6);
          border: 1px solid rgba(204,4,10,0.12); box-shadow: inset 0 1px 0 #fff, 0 30px 60px -34px rgba(204,4,10,0.28);
        }
        .hof-cols { display: grid; grid-template-columns: 1fr 1.15fr 1fr; gap: 12px; align-items: end; }
        .hof-col { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; min-width: 0; }
        .hof-crown { position: absolute; top: -34px; animation: hof-bob 3s ease-in-out infinite; filter: drop-shadow(0 4px 10px rgba(251,191,36,0.5)); }
        .hof-rank-1 { --av: 96px; --name: 17px; --amt: 28px; --step: 104px; }
        .hof-rank-2, .hof-rank-3 { --av: 72px; --name: 14px; --amt: 21px; }
        .hof-rank-2 { --step: 72px; }
        .hof-rank-3 { --step: 54px; }

        .hof-avatar-wrap { position: relative; }
        .hof-ring { padding: 3px; border-radius: 50%; box-shadow: 0 14px 30px -12px rgba(15,23,42,0.35); }
        .hof-ring-inner { padding: 3px; border-radius: 50%; background: #fff; }
        .hof-av > div { width: var(--av) !important; height: var(--av) !important; border: 0 !important; box-shadow: none !important; }
        .hof-av span { font-size: calc(var(--av) * 0.36) !important; }
        .hof-rank-dot {
          position: absolute; bottom: -4px; right: -4px; width: 27px; height: 27px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; border: 2px solid #fff;
        }
        .hof-name { margin: 14px 0 0; max-width: 100%; padding: 0 4px; font-size: var(--name); font-weight: 700; color: #0f172a; letter-spacing: -0.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hof-label { margin: 4px 0 0; font-size: 10px; font-weight: 800; letter-spacing: 0.16em; }
        .hof-amount { margin: 10px 0 0; font-size: var(--amt); font-weight: 800; letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; }
        .hof-orders { margin-top: 8px; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; }
        .hof-step {
          width: 100%; height: var(--step); margin-top: 18px; border-radius: 16px 16px 0 0; border-top: 2px solid;
          display: flex; align-items: flex-start; justify-content: center; padding-top: 10px;
        }
        .hof-step-num { font-size: 36px; font-weight: 800; line-height: 1; opacity: 0.85; }
        .hof-step-empty { border-top-color: #cbd5e1; border-top-style: dashed; background: #f8fafc; }
        .hof-empty-avatar {
          width: var(--av); height: var(--av); border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: calc(var(--av) * 0.4); font-weight: 800; color: #cbd5e1;
          border: 2px dashed #cbd5e1; background: #f8fafc;
        }
        .hof-state { text-align: center; padding: 56px 0 64px; color: #94a3b8; font-size: 13px; font-weight: 600; }
        .hof-spinner { width: 30px; height: 30px; margin: 0 auto 12px; border-radius: 50%; border: 3px solid #fee2e2; border-top-color: #cc040a; animation: hof-spin 0.8s linear infinite; }

        /* contenders */
        .hof-contenders { margin-top: 40px; }
        .hof-divider { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .hof-divider span { height: 1px; flex: 1; background: linear-gradient(90deg, transparent, #e2e8f0); }
        .hof-divider span:last-child { background: linear-gradient(270deg, transparent, #e2e8f0); }
        .hof-divider em { font-style: normal; font-size: 10px; font-weight: 800; letter-spacing: 0.22em; color: #94a3b8; white-space: nowrap; }
        .hof-list { display: flex; flex-direction: column; gap: 10px; }
        .hof-row {
          display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 18px;
          background: #fff; border: 1px solid #f1f5f9; box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 10px 24px -18px rgba(15,23,42,0.18);
          transition: transform 0.25s cubic-bezier(.22,1,.36,1), background 0.25s, border-color 0.25s;
        }
        .hof-row:hover { transform: translateY(-2px); border-color: rgba(204,4,10,0.25); box-shadow: 0 18px 34px -18px rgba(204,4,10,0.3); }
        .hof-row-rank {
          width: 34px; height: 34px; flex-shrink: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; color: #94a3b8; background: #f8fafc; border: 1px solid #e2e8f0;
        }
        .hof-row-rank-hot { color: #cc040a; background: rgba(204,4,10,0.08); border-color: rgba(204,4,10,0.22); }
        .hof-av-sm { --av: 42px; flex-shrink: 0; }
        .hof-av-sm > div { border: 2px solid #fff !important; box-shadow: 0 2px 8px rgba(15,23,42,0.15) !important; }
        .hof-row-main { flex: 1; min-width: 0; }
        .hof-row-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
        .hof-row-name { font-size: 14px; font-weight: 700; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hof-row-amount { font-size: 14px; font-weight: 800; color: #cc040a; flex-shrink: 0; font-variant-numeric: tabular-nums; }
        .hof-row-bottom { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
        .hof-bar { flex: 1; height: 5px; border-radius: 99px; background: #f1f5f9; overflow: hidden; }
        .hof-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #cc040a, #ff6b6b); }
        .hof-row-orders { font-size: 11px; font-weight: 600; color: #94a3b8; flex-shrink: 0; }

        /* footer */
        .hof-foot { margin-top: 40px; padding: 18px; text-align: center; border-radius: 18px; background: #fff; border: 1px solid #f1f5f9; box-shadow: 0 10px 24px -18px rgba(15,23,42,0.18); }
        .hof-foot-top { display: flex; align-items: center; justify-content: center; gap: 7px; margin-bottom: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #cc040a; }
        .hof-foot p { margin: 0; font-size: 12px; font-weight: 500; color: #94a3b8; }

        @keyframes hof-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes hof-spin { to { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .hof-nav { padding: 10px 14px; }
          .hof-hero { padding: 32px 0 26px; }
          .hof-trophy { width: 58px; height: 58px; border-radius: 17px; }
          .hof-h1 { font-size: 32px; }
          .hof-podium { padding: 46px 8px 0; border-radius: 24px; }
          .hof-cols { gap: 6px; grid-template-columns: 1fr 1.1fr 1fr; }
          .hof-rank-1 { --av: 66px; --name: 13px; --amt: 18px; --step: 80px; }
          .hof-rank-2, .hof-rank-3 { --av: 52px; --name: 12px; --amt: 15px; }
          .hof-rank-2 { --step: 56px; }
          .hof-rank-3 { --step: 42px; }
          .hof-crown { top: -28px; }
          .hof-crown svg { width: 16px; height: 16px; }
          .hof-rank-dot { width: 21px; height: 21px; font-size: 10px; }
          .hof-label { font-size: 8px; letter-spacing: 0.1em; }
          .hof-orders { font-size: 9.5px; padding: 2px 7px; }
          .hof-step-num { font-size: 26px; }
          .hof-step { margin-top: 14px; }
          .hof-row { padding: 10px 12px; gap: 10px; }
          .hof-row-rank { width: 28px; height: 28px; font-size: 12px; }
          .hof-av-sm { --av: 36px; }
        }
      `}</style>
    </div>
  );
};
