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

/* ─── Podium card (responsive via CSS classes) ────────── */
function PodiumCard({ user, rank, visible }) {
  const isFirst = rank === 1;
  const countVal = useCountUp(user.totalLkr, 1400, visible);

  const cfgMap = {
    1: { barGrad: 'linear-gradient(90deg,#b91c1c,#cc040a,#ef4444,#cc040a)', labelColor: '#cc040a', label: 'TOP SPENDER', glow: '0 16px 50px rgba(204,4,10,0.22),0 4px 16px rgba(0,0,0,0.10)', border: '2px solid rgba(204,4,10,0.14)' },
    2: { barGrad: 'linear-gradient(90deg,#6b7280,#9ca3af,#6b7280)', labelColor: '#475569', label: '2ND PLACE', glow: '0 8px 30px rgba(0,0,0,0.10)', border: '1.5px solid rgba(0,0,0,0.07)' },
    3: { barGrad: 'linear-gradient(90deg,#92400e,#d97706,#f59e0b,#d97706,#92400e)', labelColor: '#92400e', label: '3RD PLACE', glow: '0 8px 30px rgba(0,0,0,0.10)', border: '1.5px solid rgba(0,0,0,0.07)' },
  };
  const cfg = cfgMap[rank];

  return (
    <div className={`ts-card-wrap ts-card-rank-${rank}`} style={{ animationDelay: `${rank === 1 ? 0 : rank === 2 ? 0.1 : 0.2}s`, animation: visible ? 'ts-rise 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none', opacity: visible ? 1 : 0 }}>

      {/* Champion badge */}
      {isFirst ? (
        <div className="ts-champion-badge">
          <Crown size={10} /> CHAMPION
        </div>
      ) : (
        <div className="ts-badge-spacer" />
      )}

      {/* Avatar */}
      <div className="ts-avatar-wrap" style={{ marginBottom: 'var(--av-half-neg)' }}>
        <Avatar name={user.name} src={user.avatar} size={0 /* overridden by CSS var */} ringColor={isFirst ? 'rgba(204,4,10,0.3)' : '#fff'} />
        {/* Rank badge on avatar */}
        <div className="ts-rank-dot" style={{ background: cfg.barGrad }}>
          {rank}
        </div>
      </div>

      {/* Card */}
      <div className="ts-card" style={{ boxShadow: cfg.glow, border: cfg.border }}>
        {isFirst && <ParticleDots />}

        <p className="ts-name">{user.name}</p>

        <p className="ts-label" style={{ color: cfg.labelColor }}>{cfg.label}</p>

        <div className="ts-chips">
          <span className="ts-chip">{user.orderCount} top-up{user.orderCount !== 1 ? 's' : ''}</span>
          <span className="ts-chip ts-chip-amount" style={{ color: cfg.labelColor, borderColor: cfg.labelColor + '33', background: cfg.labelColor + '0d' }}>
            {fmtLkr(countVal)}
          </span>
        </div>

        {/* Rank bar */}
        <div className="ts-bar" style={{ background: cfg.barGrad }}>
          <span className="ts-bar-num">{rank}</span>
        </div>
      </div>
    </div>
  );
}

function ParticleDots() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 'inherit' }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', width: 4, height: 4, borderRadius: '50%', background: i % 2 === 0 ? 'rgba(204,4,10,0.4)' : 'rgba(255,100,100,0.35)', top: `${15 + i * 15}%`, left: `${10 + i * 16}%`, animation: `ts-float ${2.5 + i * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }} />
      ))}
    </div>
  );
}

function SkeletonCard({ rank }) {
  return (
    <div className={`ts-card-wrap ts-card-rank-${rank}`}>
      <div className="ts-badge-spacer" />
      <div className="ts-avatar-wrap" style={{ marginBottom: 'var(--av-half-neg)' }}>
        <div className="ts-skeleton ts-skeleton-avatar" />
      </div>
      <div className="ts-card ts-card-skeleton">
        <div className="ts-skeleton" style={{ width: '60%', height: 13, borderRadius: 8, margin: '0 auto 8px' }} />
        <div className="ts-skeleton" style={{ width: '40%', height: 10, borderRadius: 8, margin: '0 auto 12px' }} />
        <div className="ts-skeleton ts-skeleton-bar" />
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
    <section ref={ref} className="ts-section">
      <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(204,4,10,0.08) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(204,4,10,0.05) 0%,transparent 70%)', pointerEvents: 'none' }} />

      <div className="ts-inner">

        {/* Header */}
        <div className="ts-header">
          <div className="ts-header-left">
            <div className="ts-trophy-box">
              <Trophy size={22} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <h2 className="ts-title">Top Spenders</h2>
                <Sparkles size={15} color="#cc040a" />
              </div>
              <p className="ts-subtitle">Most valued customers this month</p>
              <span className="ts-month-badge">
                <Flame size={9} /> THIS MONTH
              </span>
            </div>
          </div>

          <button className="ts-btn ts-btn-desktop" onClick={openLeaderboardPage}>
            <TrendingUp size={13} /> View Leaderboard <ChevronRight size={13} />
          </button>
        </div>

        {/* Podium panel */}
        <div className="ts-panel">
          <div className="ts-panel-shine" />
          {loading ? (
            <div className="ts-grid">
              <SkeletonCard rank={2} />
              <SkeletonCard rank={1} />
              <SkeletonCard rank={3} />
            </div>
          ) : topSpenders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0 40px' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🎮</p>
              <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700 }}>Be the first top spender this month!</p>
            </div>
          ) : (
            <div className="ts-grid">
              <div>{second ? <PodiumCard user={second} rank={2} visible={visible} /> : <SkeletonCard rank={2} />}</div>
              <div>{first  ? <PodiumCard user={first}  rank={1} visible={visible} /> : <SkeletonCard rank={1} />}</div>
              <div>{third  ? <PodiumCard user={third}  rank={3} visible={visible} /> : <SkeletonCard rank={3} />}</div>
            </div>
          )}
        </div>

        {/* Bottom CTA (always visible) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <button className="ts-btn ts-btn-bottom" onClick={openLeaderboardPage}>
            <span className="ts-btn-dot"></span>
            View Full Leaderboard
            <span className="ts-btn-chevron"><ChevronRight size={14} /></span>
          </button>
        </div>
      </div>

      <style>{`
        /* ── Section & layout ──────────────────────────────── */
        .ts-section {
          background: #ffffff;
          padding: 52px 20px 60px;
          margin-top: 32px;
          border-radius: 24px;
          position: relative;
          overflow: hidden;
        }
        .ts-inner {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        /* ── Header ───────────────────────────────────────── */
        .ts-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 48px;
          flex-wrap: wrap;
        }
        .ts-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .ts-trophy-box {
          width: 52px; height: 52px; border-radius: 15px; flex-shrink: 0;
          background: linear-gradient(135deg, #cc040a 0%, #ff4d4f 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(204,4,10,0.4);
          animation: ts-bob 3s ease-in-out infinite;
        }
        .ts-title {
          margin: 0; font-weight: 900; font-size: 20px;
          color: #0f172a; letter-spacing: -0.4px; font-family: inherit;
        }
        .ts-subtitle {
          margin: 3px 0 0; font-weight: 600; font-size: 12px; color: #64748b;
        }
        .ts-month-badge {
          display: inline-flex; align-items: center; gap: 5px; margin-top: 7px;
          padding: 3px 11px; border-radius: 99px;
          background: rgba(204,4,10,0.07); border: 1px solid rgba(204,4,10,0.18);
          font-size: 9px; font-weight: 900; color: #cc040a; letter-spacing: 0.15em;
        }

        /* ── Buttons ──────────────────────────────────────── */
        .ts-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 28px; border-radius: 14px;
          background: #ffffff;
          color: #cc040a;
          border: 2px solid rgba(204,4,10,0.22);
          cursor: pointer;
          font-weight: 900; font-size: 12.5px; letter-spacing: 0.03em;
          box-shadow: 0 2px 12px rgba(204,4,10,0.10), 0 1px 0 rgba(255,255,255,0.9);
          transition: all 0.22s cubic-bezier(.22,1,.36,1);
          white-space: nowrap; font-family: inherit;
          position: relative; overflow: hidden;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        /* shimmer sweep on hover */
        .ts-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(110deg, transparent 30%, rgba(204,4,10,0.06) 50%, transparent 70%);
          transform: translateX(-100%);
          transition: transform 0.45s ease;
        }
        .ts-btn:hover::before { transform: translateX(100%); }
        .ts-btn:hover {
          background: #cc040a;
          color: #ffffff;
          border-color: #cc040a;
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(204,4,10,0.38), 0 2px 0 rgba(255,255,255,0.15) inset;
        }
        .ts-btn:hover .ts-btn-dot { background: #ffffff; box-shadow: 0 0 0 0 rgba(255,255,255,0.5); }
        .ts-btn:hover .ts-btn-chevron { color: #ffffff; transform: translateX(3px); }
        .ts-btn-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #cc040a;
          flex-shrink: 0;
          animation: ts-pulse-dot 1.8s ease-in-out infinite;
        }
        .ts-btn-chevron {
          transition: transform 0.2s; color: #cc040a;
          display: flex; align-items: center;
        }
        @keyframes ts-pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(204,4,10,0.45); }
          50%       { box-shadow: 0 0 0 5px rgba(204,4,10,0); }
        }
        .ts-btn-desktop { flex-shrink: 0; }
        .ts-btn-bottom { padding: 12px 32px; font-size: 13px; }

        /* ── Podium panel ─────────────────────────────────── */
        .ts-panel {
          background: linear-gradient(145deg, #eef2ff 0%, #e8f0fe 40%, #ede9fe 80%, #f0f4ff 100%);
          border-radius: 24px;
          padding: 52px 20px 0;
          box-shadow: 0 4px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9);
          border: 1px solid rgba(255,255,255,0.95);
          position: relative; overflow: hidden;
        }
        .ts-panel-shine {
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent);
          border-radius: 24px 24px 0 0;
        }
        .ts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
          align-items: flex-end;
        }

        /* ── Card wrapper (CSS vars for avatar sizing) ────── */
        .ts-card-rank-1 {
          --av-size: 80px;
          --av-half-neg: -40px;
          --name-size: 14px;
          --bar-pad: 13px 0;
          --bar-num-size: 24px;
          --pt-offset: 52px;
        }
        .ts-card-rank-2,
        .ts-card-rank-3 {
          --av-size: 66px;
          --av-half-neg: -33px;
          --name-size: 12px;
          --bar-pad: 10px 0;
          --bar-num-size: 20px;
          --pt-offset: 45px;
        }

        .ts-card-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* ── Champion badge ───────────────────────────────── */
        .ts-champion-badge {
          background: linear-gradient(135deg, #cc040a, #ff4d4f);
          color: #fff; border-radius: 99px;
          padding: 4px 12px; margin-bottom: 7px;
          font-size: 9px; font-weight: 900; letter-spacing: 0.12em;
          display: inline-flex; align-items: center; gap: 4px;
          box-shadow: 0 4px 14px rgba(204,4,10,0.5);
          white-space: nowrap;
        }
        .ts-badge-spacer { height: 28px; }

        /* ── Avatar wrap ──────────────────────────────────── */
        .ts-avatar-wrap {
          position: relative;
          z-index: 2;
          /* Override Avatar size via CSS var */
        }
        /* Re-target the avatar inner div to use CSS var */
        .ts-avatar-wrap > div:first-child {
          width: var(--av-size) !important;
          height: var(--av-size) !important;
        }
        .ts-rank-dot {
          position: absolute; bottom: -2px; right: -2px;
          width: 21px; height: 21px; border-radius: 50%;
          border: 2px solid #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 900; color: #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }

        /* ── Card body ────────────────────────────────────── */
        .ts-card {
          width: 100%; background: #fff;
          border-radius: 20px;
          overflow: hidden; position: relative;
          padding-top: var(--pt-offset);
          padding-left: 8px; padding-right: 8px; padding-bottom: 0;
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .ts-card:hover { transform: translateY(-4px); }
        .ts-card-skeleton { background: #f8fafc; }

        .ts-name {
          margin: 0; font-weight: 900; font-size: var(--name-size);
          color: #0f172a; text-align: center;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          padding: 0 4px; line-height: 1.25; letter-spacing: -0.2px;
        }
        .ts-label {
          margin: 5px 0 0; font-size: 9px; font-weight: 900;
          text-align: center; letter-spacing: 0.14em;
        }
        .ts-chips {
          display: flex; justify-content: center; flex-wrap: wrap;
          gap: 5px; margin-top: 7px;
        }
        .ts-chip {
          font-size: 9px; font-weight: 600; color: #94a3b8;
          background: #f8fafc; border-radius: 99px; padding: 2px 7px;
          border: 1px solid #e2e8f0;
        }
        .ts-chip-amount { font-weight: 800; }
        .ts-bar {
          margin-top: 12px; width: 100%;
          padding: var(--bar-pad); text-align: center;
        }
        .ts-bar-num {
          color: #fff; font-weight: 900;
          font-size: var(--bar-num-size);
          line-height: 1; text-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }

        /* ── Skeleton ─────────────────────────────────────── */
        .ts-skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%);
          background-size: 200% auto;
          animation: ts-shimmer 1.5s linear infinite;
        }
        .ts-skeleton-avatar {
          width: var(--av-size); height: var(--av-size);
          border-radius: 50%; border: 3.5px solid #fff;
        }
        .ts-skeleton-bar { width: 100%; height: 44px; }

        /* ── Animations ───────────────────────────────────── */
        @keyframes ts-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes ts-rise {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes ts-bob {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
        @keyframes ts-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.55; }
          50%       { transform: translateY(-10px) scale(1.2); opacity: 1; }
        }

        /* ── RESPONSIVE — Tablet (≤ 640px) ───────────────── */
        @media (max-width: 640px) {
          .ts-section  { padding: 36px 12px 44px; border-radius: 20px; }
          .ts-header   { margin-bottom: 32px; gap: 10px; }
          .ts-trophy-box { width: 44px; height: 44px; border-radius: 12px; }
          .ts-title    { font-size: 17px; }
          .ts-subtitle { font-size: 11px; }
          .ts-btn-desktop { display: none; }   /* hide desktop btn — bottom CTA covers it */
          .ts-panel    { padding: 38px 12px 0; border-radius: 20px; }
          .ts-grid     { gap: 10px; }

          .ts-card-rank-1 {
            --av-size: 62px; --av-half-neg: -31px;
            --name-size: 12px; --bar-pad: 10px 0;
            --bar-num-size: 20px; --pt-offset: 43px;
          }
          .ts-card-rank-2, .ts-card-rank-3 {
            --av-size: 50px; --av-half-neg: -25px;
            --name-size: 11px; --bar-pad: 8px 0;
            --bar-num-size: 17px; --pt-offset: 36px;
          }
          .ts-champion-badge { font-size: 8px; padding: 3px 9px; }
          .ts-badge-spacer   { height: 22px; }
          .ts-card  { border-radius: 16px; padding-left: 5px; padding-right: 5px; }
          .ts-label { font-size: 8px; }
          .ts-chips { gap: 4px; margin-top: 5px; }
          .ts-chip  { font-size: 8px; padding: 1.5px 5px; }
          .ts-bar   { margin-top: 8px; }
          .ts-rank-dot { width: 18px; height: 18px; font-size: 9px; }
        }

        /* ── RESPONSIVE — Mobile (≤ 400px) ───────────────── */
        @media (max-width: 400px) {
          .ts-section  { padding: 28px 10px 36px; border-radius: 16px; }
          .ts-panel    { padding: 30px 8px 0; border-radius: 16px; }
          .ts-grid     { gap: 7px; }
          .ts-header   { margin-bottom: 24px; }
          .ts-trophy-box { width: 38px; height: 38px; border-radius: 10px; }
          .ts-title    { font-size: 15px; }

          .ts-card-rank-1 {
            --av-size: 54px; --av-half-neg: -27px;
            --name-size: 11px; --bar-pad: 9px 0;
            --bar-num-size: 18px; --pt-offset: 38px;
          }
          .ts-card-rank-2, .ts-card-rank-3 {
            --av-size: 44px; --av-half-neg: -22px;
            --name-size: 10px; --bar-pad: 7px 0;
            --bar-num-size: 15px; --pt-offset: 32px;
          }
          .ts-champion-badge { font-size: 7.5px; padding: 3px 7px; gap: 3px; }
          .ts-badge-spacer   { height: 20px; }
          .ts-label { font-size: 7.5px; letter-spacing: 0.1em; }
          .ts-chip  { font-size: 7.5px; padding: 1px 4px; }
          .ts-chips { margin-top: 4px; gap: 3px; }
          .ts-rank-dot { width: 16px; height: 16px; font-size: 8px; }
          .ts-bar { margin-top: 6px; }
          .ts-card { border-radius: 14px; padding-left: 3px; padding-right: 3px; }
          .ts-btn-bottom { padding: 9px 20px; font-size: 11px; }
        }
      `}</style>
    </section>
  );
};
