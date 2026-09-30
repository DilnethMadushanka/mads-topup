import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Crown, ChevronRight, Flame, Sparkles, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';

const RTDB_URL = 'https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app';

async function fetchTopSpenders() {
  try {
    const [ordersRes, usersRes] = await Promise.all([
      fetch(`${RTDB_URL}/orders.json`),
      fetch(`${RTDB_URL}/users.json`)
    ]);
    let usersMap = {};
    if (usersRes.ok) {
      const uData = await usersRes.json();
      if (uData) Object.values(uData).forEach(u => {
        if (!u) return;
        if (u.uid) usersMap[u.uid] = u;
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
      else if (typeof entry === 'object') Object.values(entry).forEach(o => { if (o && (o.id || o.gameId)) flatOrders.push(o); });
    });

    const spendMap = {};   // keyed by uid (preferred) or lowercased email
    const uidToEmail = {}; // track uid→email for cross-dedup

    flatOrders.forEach(order => {
      if (!order || ['FAILED', 'REFUNDED', 'CANCELLED'].includes(order.status)) return;
      if (order.createdAt) {
        try {
          const d = new Date(order.createdAt);
          if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return;
        } catch {}
      }
      const amount = parseFloat(order.priceLkr || 0);
      if (!amount || amount <= 0) return;

      // ── BUG FIX: Normalize key — always prefer uid so same person isn't split
      const uid   = order.userId || order.userUid || null;
      const email = (order.userEmail || '').toLowerCase() || null;

      // Resolve canonical key: uid wins, then email
      let key = uid || email;
      if (!key) return;

      // If we see a uid for an email we already have, merge them
      if (uid && email) {
        if (!uidToEmail[uid]) uidToEmail[uid] = email;
        // If email entry exists but uid entry doesn't yet, rename it
        if (!spendMap[uid] && spendMap[email]) {
          spendMap[uid] = spendMap[email];
          delete spendMap[email];
        }
        key = uid; // always use uid as canonical key
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
      .sort((a, b) => b.totalLkr - a.totalLkr)
      .slice(0, 3);
  } catch (e) { return []; }
}

function fmtLkr(val) {
  if (!val || val <= 0) return 'Rs. 0';
  if (val >= 100000) return `Rs. ${(val / 1000).toFixed(0)}K`;
  if (val >= 1000) return `Rs. ${(val / 1000).toFixed(1)}K`;
  return `Rs. ${Math.round(val).toLocaleString()}`;
}

function useCountUp(target, duration = 1200, started = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!started || !target) return;
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, started, duration]);
  return value;
}

/* ─── Avatar ─────────────────────────────────────────── */
function Avatar({ name, src, size = 64, ringColor = '#fff' }) {
  const [err, setErr] = useState(false);
  // Only use alphabetic chars for initials
  const letters = (name || '?').replace(/[^a-zA-Z\s]/g, '').trim();
  const initials = (letters || name || '?').split(/\s+/).map(p => p[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?';
  const palettes = ['#cc040a,#ff6b6b', '#f97316,#fb923c', '#7c3aed,#a78bfa', '#059669,#34d399', '#0284c7,#38bdf8', '#db2777,#f472b6', '#d97706,#fbbf24'].map(s => s.split(','));
  const [c1, c2] = palettes[(name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palettes.length];

  return (
    <div style={{ width: size, height: size, borderRadius: '50%', border: `3.5px solid ${ringColor}`, boxShadow: '0 6px 20px rgba(0,0,0,0.18)', overflow: 'hidden', flexShrink: 0, background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
      {src && !err
        ? <img src={src} alt={name} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: size * 0.34, lineHeight: 1 }}>{initials}</span>
          </div>
      }
    </div>
  );
}

/* ─── Podium card ─────────────────────────────────────── */
function PodiumCard({ user, rank, visible }) {
  const isFirst = rank === 1;
  const countVal = useCountUp(user.totalLkr, 1400, visible);

  const cfgMap = {
    1: { ring: 'linear-gradient(135deg,#ff4d4f,#cc040a)', accent: '#ff6b6b', step: 'linear-gradient(180deg,rgba(204,4,10,0.55),rgba(204,4,10,0.08))', label: 'TOP SPENDER' },
    2: { ring: 'linear-gradient(135deg,#e2e8f0,#94a3b8)', accent: '#cbd5e1', step: 'linear-gradient(180deg,rgba(148,163,184,0.38),rgba(148,163,184,0.05))', label: '2ND PLACE' },
    3: { ring: 'linear-gradient(135deg,#fbbf24,#b45309)', accent: '#fbbf24', step: 'linear-gradient(180deg,rgba(217,119,6,0.42),rgba(217,119,6,0.05))', label: '3RD PLACE' },
  };
  const cfg = cfgMap[rank];

  return (
    <div
      className={`tsp-col tsp-rank-${rank}`}
      style={{
        animation: visible ? `tsp-rise 0.6s cubic-bezier(0.22,1,0.36,1) ${rank === 1 ? 0 : rank === 2 ? 0.1 : 0.2}s both` : 'none',
        opacity: visible ? undefined : 0,
      }}
    >
      {isFirst && (
        <div className="tsp-crown"><Crown size={18} fill="#fbbf24" color="#fbbf24" /></div>
      )}

      {/* Avatar with gradient ring */}
      <div className="tsp-avatar-wrap">
        <div className="tsp-ring" style={{ background: cfg.ring }}>
          <div className="tsp-ring-inner">
            <Avatar name={user.name} src={user.avatar} size={0 /* sized by CSS */} ringColor="transparent" />
          </div>
        </div>
        <div className="tsp-rank-dot" style={{ background: cfg.ring }}>{rank}</div>
      </div>

      <p className="tsp-name" title={user.name}>{user.name}</p>
      <p className="tsp-label" style={{ color: cfg.accent }}>{cfg.label}</p>

      <p className="tsp-amount" style={{ color: isFirst ? '#fff' : '#e2e8f0' }}>{fmtLkr(countVal)}</p>
      <span className="tsp-orders">{user.orderCount} top-up{user.orderCount !== 1 ? 's' : ''}</span>

      {/* Podium step */}
      <div className="tsp-step" style={{ background: cfg.step, borderTopColor: cfg.accent }}>
        <span className="tsp-step-num" style={{ color: cfg.accent }}>{rank}</span>
      </div>
    </div>
  );
}

function SkeletonCard({ rank }) {
  return (
    <div className={`tsp-col tsp-rank-${rank}`}>
      <div className="tsp-avatar-wrap">
        <div className="tsp-skeleton tsp-skeleton-avatar" />
      </div>
      <div className="tsp-skeleton" style={{ width: '62%', height: 12, borderRadius: 8, marginTop: 14 }} />
      <div className="tsp-skeleton" style={{ width: '40%', height: 9, borderRadius: 8, marginTop: 8 }} />
      <div className="tsp-skeleton" style={{ width: '50%', height: 14, borderRadius: 8, marginTop: 12 }} />
      <div className="tsp-step tsp-step-skeleton" />
    </div>
  );
}

/* Shown once data has loaded but nobody holds that rank yet */
function EmptySlot({ rank }) {
  return (
    <div className={`tsp-col tsp-rank-${rank}`}>
      <div className="tsp-avatar-wrap">
        <div className="tsp-empty-avatar">?</div>
      </div>
      <p className="tsp-name" style={{ color: 'rgba(255,255,255,0.55)' }}>Open spot</p>
      <p className="tsp-label" style={{ color: 'rgba(255,255,255,0.3)' }}>COULD BE YOU</p>
      <div className="tsp-step tsp-step-skeleton" style={{ borderTopStyle: 'dashed' }}>
        <span className="tsp-step-num" style={{ color: 'rgba(255,255,255,0.25)' }}>{rank}</span>
      </div>
    </div>
  );
}

/* ─── Main section ────────────────────────────────────── */
export const TopSpendersSection = () => {
  const { openLeaderboardPage } = useApp();
  const [topSpenders, setTopSpenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetchTopSpenders().then(d => { setTopSpenders(d); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [loading]);

  const [first, second, third] = topSpenders;

  return (
    <section ref={ref} className="tsp-section">
      {/* ambience */}
      <div className="tsp-glow tsp-glow-a" />
      <div className="tsp-glow tsp-glow-b" />
      <div className="tsp-grid-bg" />

      <div className="tsp-inner">

        {/* Header */}
        <div className="tsp-header">
          <div className="tsp-header-left">
            <div className="tsp-trophy-box">
              <Trophy size={22} color="#fff" />
            </div>
            <div>
              <div className="tsp-title-row">
                <h2 className="tsp-title">Top Spenders</h2>
                <Sparkles size={15} color="#ff6b6b" />
              </div>
              <p className="tsp-subtitle">Most valued customers this month</p>
            </div>
          </div>

          <div className="tsp-header-right">
            <span className="tsp-month-badge">
              <Flame size={11} /> THIS MONTH
            </span>
            <button className="tsp-btn tsp-btn-desktop" onClick={openLeaderboardPage}>
              <TrendingUp size={14} /> View Leaderboard <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Podium */}
        <div className="tsp-podium">
          {loading ? (
            <div className="tsp-cols">
              <SkeletonCard rank={2} />
              <SkeletonCard rank={1} />
              <SkeletonCard rank={3} />
            </div>
          ) : topSpenders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0 36px' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🎮</p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 700 }}>Be the first top spender this month!</p>
            </div>
          ) : (
            <div className="tsp-cols">
              {second ? <PodiumCard user={second} rank={2} visible={visible} /> : <EmptySlot rank={2} />}
              {first  ? <PodiumCard user={first}  rank={1} visible={visible} /> : <EmptySlot rank={1} />}
              {third  ? <PodiumCard user={third}  rank={3} visible={visible} /> : <EmptySlot rank={3} />}
            </div>
          )}
        </div>

        {/* Bottom CTA (always visible) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 26 }}>
          <button className="tsp-btn tsp-btn-bottom" onClick={openLeaderboardPage}>
            <span className="tsp-btn-dot"></span>
            View Full Leaderboard
            <span className="tsp-btn-chevron"><ChevronRight size={15} /></span>
          </button>
        </div>
      </div>

      <style>{`
        .tsp-section {
          position: relative; overflow: hidden;
          margin-top: 40px;
          padding: 56px 24px 52px;
          border-radius: 32px;
          color: #fff;
          background: linear-gradient(160deg, #0f1528 0%, #0d1220 55%, #150a10 100%);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 30px 70px -30px rgba(13,18,32,0.7);
        }
        .tsp-glow { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(90px); }
        .tsp-glow-a { top: -140px; left: 50%; transform: translateX(-50%); width: 520px; height: 300px; background: rgba(204,4,10,0.28); }
        .tsp-glow-b { bottom: -120px; right: -80px; width: 320px; height: 320px; background: rgba(124,58,237,0.16); }
        .tsp-grid-bg {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.05;
          background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px);
          background-size: 44px 44px;
          -webkit-mask-image: radial-gradient(ellipse at 50% 20%, #000 0%, transparent 70%);
          mask-image: radial-gradient(ellipse at 50% 20%, #000 0%, transparent 70%);
        }
        .tsp-inner { position: relative; z-index: 1; max-width: 820px; margin: 0 auto; }

        /* header */
        .tsp-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 40px; }
        .tsp-header-left { display: flex; align-items: center; gap: 14px; }
        .tsp-header-right { display: flex; align-items: center; gap: 12px; }
        .tsp-trophy-box {
          width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #cc040a 0%, #ff4d4f 100%);
          box-shadow: 0 10px 28px -6px rgba(204,4,10,0.65), inset 0 1px 0 rgba(255,255,255,0.25);
        }
        .tsp-title-row { display: flex; align-items: center; gap: 8px; }
        .tsp-title { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: #fff; line-height: 1.1; }
        .tsp-subtitle { margin: 4px 0 0; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.5); }
        .tsp-month-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 99px;
          background: rgba(204,4,10,0.14); border: 1px solid rgba(255,107,107,0.3);
          font-size: 10px; font-weight: 800; color: #ff8a8a; letter-spacing: 0.14em;
        }

        /* buttons */
        .tsp-btn {
          display: inline-flex; align-items: center; gap: 8px;
          height: 44px; padding: 0 22px; border-radius: 999px;
          background: rgba(255,255,255,0.06); color: #fff;
          border: 1px solid rgba(255,255,255,0.14);
          font-family: inherit; font-size: 12.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
          cursor: pointer; white-space: nowrap;
          transition: transform 0.25s cubic-bezier(.22,1,.36,1), background 0.25s, border-color 0.25s, box-shadow 0.25s;
        }
        .tsp-btn:hover { background: #cc040a; border-color: #cc040a; transform: translateY(-2px); box-shadow: 0 12px 30px -8px rgba(204,4,10,0.7); }
        .tsp-btn:active { transform: translateY(0) scale(0.98); }
        .tsp-btn-bottom { height: 50px; padding: 0 30px; font-size: 13px; background: #fff; color: #cc040a; border-color: #fff; }
        .tsp-btn-bottom:hover { background: #cc040a; color: #fff; }
        .tsp-btn-dot { width: 7px; height: 7px; border-radius: 50%; background: #cc040a; animation: tsp-pulse 1.8s ease-in-out infinite; }
        .tsp-btn-bottom:hover .tsp-btn-dot { background: #fff; }
        .tsp-btn-chevron { display: flex; transition: transform 0.2s; }
        .tsp-btn:hover .tsp-btn-chevron { transform: translateX(3px); }

        /* podium */
        .tsp-podium {
          border-radius: 28px; padding: 44px 18px 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015));
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
          overflow: hidden; position: relative;
        }
        .tsp-cols { display: grid; grid-template-columns: 1fr 1.15fr 1fr; gap: 12px; align-items: end; }
        .tsp-col { display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; min-width: 0; }
        .tsp-crown { position: absolute; top: -30px; animation: tsp-bob 3s ease-in-out infinite; filter: drop-shadow(0 4px 10px rgba(251,191,36,0.5)); }

        .tsp-rank-1 { --av: 92px; --name: 16px; --amt: 26px; --step: 96px; }
        .tsp-rank-2, .tsp-rank-3 { --av: 70px; --name: 14px; --amt: 20px; }
        .tsp-rank-2 { --step: 68px; }
        .tsp-rank-3 { --step: 52px; }

        .tsp-avatar-wrap { position: relative; }
        .tsp-ring { padding: 3px; border-radius: 50%; box-shadow: 0 14px 34px -10px rgba(0,0,0,0.7); }
        .tsp-ring-inner { padding: 3px; border-radius: 50%; background: #0d1220; }
        .tsp-ring-inner > div { width: var(--av) !important; height: var(--av) !important; border: 0 !important; box-shadow: none !important; }
        .tsp-rank-dot {
          position: absolute; bottom: -4px; right: -4px; width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; color: #fff; border: 2px solid #0d1220;
        }
        .tsp-name { margin: 14px 0 0; max-width: 100%; padding: 0 4px; font-size: var(--name); font-weight: 700; color: #fff; letter-spacing: -0.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tsp-label { margin: 4px 0 0; font-size: 10px; font-weight: 800; letter-spacing: 0.16em; }
        .tsp-amount { margin: 10px 0 0; font-size: var(--amt); font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; line-height: 1; }
        .tsp-orders { margin-top: 8px; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); }

        .tsp-step {
          width: 100%; height: var(--step); margin-top: 18px;
          border-radius: 16px 16px 0 0; border-top: 2px solid;
          display: flex; align-items: flex-start; justify-content: center; padding-top: 10px;
        }
        .tsp-step-num { font-size: 34px; font-weight: 800; line-height: 1; opacity: 0.85; }
        .tsp-step-skeleton { border-top-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); }

        /* skeleton */
        .tsp-skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.05) 75%);
          background-size: 200% auto; animation: tsp-shimmer 1.5s linear infinite;
        }
        .tsp-empty-avatar {
          width: var(--av); height: var(--av); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: calc(var(--av) * 0.4); font-weight: 800; color: rgba(255,255,255,0.3);
          border: 2px dashed rgba(255,255,255,0.22); background: rgba(255,255,255,0.03);
        }
        .tsp-skeleton-avatar { width: var(--av); height: var(--av); border-radius: 50%; }

        @keyframes tsp-shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes tsp-rise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tsp-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes tsp-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(204,4,10,0.5); } 50% { box-shadow: 0 0 0 6px rgba(204,4,10,0); } }

        /* tablet / phone */
        @media (max-width: 640px) {
          .tsp-section { padding: 36px 14px 34px; border-radius: 26px; margin-top: 28px; }
          .tsp-header { margin-bottom: 28px; }
          .tsp-header-right .tsp-btn-desktop { display: none; }
          .tsp-trophy-box { width: 44px; height: 44px; border-radius: 14px; }
          .tsp-title { font-size: 20px; }
          .tsp-subtitle { font-size: 12px; }
          .tsp-podium { padding: 38px 8px 0; border-radius: 22px; }
          .tsp-cols { gap: 6px; grid-template-columns: 1fr 1.1fr 1fr; }
          .tsp-rank-1 { --av: 64px; --name: 13px; --amt: 18px; --step: 78px; }
          .tsp-rank-2, .tsp-rank-3 { --av: 50px; --name: 12px; --amt: 15px; }
          .tsp-rank-2 { --step: 54px; }
          .tsp-rank-3 { --step: 40px; }
          .tsp-crown { top: -26px; }
          .tsp-crown svg { width: 15px; height: 15px; }
          .tsp-rank-dot { width: 21px; height: 21px; font-size: 10px; }
          .tsp-label { font-size: 8px; letter-spacing: 0.1em; }
          .tsp-orders { font-size: 9.5px; padding: 2px 7px; }
          .tsp-step-num { font-size: 26px; }
          .tsp-step { margin-top: 14px; }
          .tsp-btn-bottom { height: 46px; padding: 0 24px; font-size: 12px; }
        }
      `}</style>
    </section>
  );
};
