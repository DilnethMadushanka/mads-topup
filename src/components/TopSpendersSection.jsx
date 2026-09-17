import React, { useState, useEffect } from 'react';
import { Trophy, Crown, Medal, ChevronRight, Flame, Star } from 'lucide-react';

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
      if (uData) {
        Object.values(uData).forEach(u => {
          if (!u) return;
          if (u.uid) usersMap[u.uid] = u;
          if (u.email) usersMap[u.email.toLowerCase()] = u;
        });
      }
    }

    if (!ordersRes.ok) return [];
    const data = await ordersRes.json();
    if (!data) return [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const flatOrders = [];
    Object.values(data).forEach(entry => {
      if (!entry) return;
      if (entry.id || entry.gameId) {
        flatOrders.push(entry);
      } else if (typeof entry === 'object') {
        Object.values(entry).forEach(o => {
          if (o && (o.id || o.gameId)) flatOrders.push(o);
        });
      }
    });

    const spendMap = {};
    flatOrders.forEach(order => {
      if (!order) return;
      if (['FAILED', 'REFUNDED', 'CANCELLED'].includes(order.status)) return;
      if (order.createdAt) {
        try {
          const d = new Date(order.createdAt);
          if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return;
        } catch {}
      }
      const amount = parseFloat(order.priceLkr || 0);
      if (!amount || amount <= 0) return;

      const key = order.userId || order.userUid || order.userEmail || order.userName || 'anon';
      if (!key || key === 'anon') return;

      const userInfo = usersMap[key] || usersMap[(order.userEmail || '').toLowerCase()] || null;
      if (!spendMap[key]) {
        spendMap[key] = {
          key,
          name: userInfo?.name || order.userName || order.ign || key,
          avatar: userInfo?.avatar || order.userAvatar || '',
          totalLkr: 0,
          orderCount: 0,
        };
      }
      spendMap[key].totalLkr += amount;
      spendMap[key].orderCount += 1;
      if (userInfo?.name) spendMap[key].name = userInfo.name;
      if (userInfo?.avatar) spendMap[key].avatar = userInfo.avatar;
    });

    return Object.values(spendMap)
      .filter(u => u.name && u.name.length > 1)
      .sort((a, b) => b.totalLkr - a.totalLkr)
      .slice(0, 3);
  } catch (e) {
    console.warn('[TopSpenders] fetch error:', e.message);
    return [];
  }
}

function fmtLkr(val) {
  if (!val || val <= 0) return 'Rs. 0';
  if (val >= 100000) return `Rs. ${(val / 1000).toFixed(0)}K`;
  if (val >= 1000) return `Rs. ${(val / 1000).toFixed(1)}K`;
  return `Rs. ${Math.round(val).toLocaleString()}`;
}

function AvatarBubble({ name, src, size = 'md' }) {
  const [imgErr, setImgErr] = useState(false);
  const sizes = { sm: 56, md: 64, lg: 80 };
  const px = sizes[size] || 64;
  const initials = (name || '?').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();

  const palettes = [
    ['#cc040a', '#ff4d4f'],
    ['#f97316', '#fb923c'],
    ['#7c3aed', '#a78bfa'],
    ['#059669', '#34d399'],
    ['#0284c7', '#38bdf8'],
    ['#db2777', '#f472b6'],
    ['#d97706', '#fbbf24'],
  ];
  const pidx = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palettes.length;
  const [c1, c2] = palettes[pidx];

  return (
    <div
      style={{ width: px, height: px, borderRadius: '50%', border: '3px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', overflow: 'hidden', flexShrink: 0 }}
    >
      {src && !imgErr ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgErr(true)} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${c1}, ${c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: px * 0.34, fontFamily: 'inherit' }}>{initials}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Individual podium card ─────────────────────────── */
function PodiumCard({ user, rank }) {
  const isFirst = rank === 1;

  const rankBars = {
    1: { bar: 'linear-gradient(90deg, #cc040a 0%, #ff6b6b 50%, #cc040a 100%)', label: 'TOP SPENDER', labelColor: '#cc040a' },
    2: { bar: 'linear-gradient(90deg, #8b9aab, #c0cdd8)', label: '2ND PLACE', labelColor: '#6b7280' },
    3: { bar: 'linear-gradient(90deg, #c9974a, #e8c27a)', label: '3RD PLACE', labelColor: '#92400e' },
  };
  const cfg = rankBars[rank];

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: '#fff',
      borderRadius: 20,
      boxShadow: isFirst
        ? '0 8px 40px rgba(204,4,10,0.18), 0 2px 8px rgba(0,0,0,0.08)'
        : '0 4px 20px rgba(0,0,0,0.08)',
      border: isFirst ? '2px solid rgba(204,4,10,0.15)' : '1.5px solid rgba(0,0,0,0.06)',
      paddingBottom: 0,
      overflow: 'hidden',
      transform: isFirst ? 'translateY(-20px)' : 'none',
      transition: 'transform 0.3s, box-shadow 0.3s',
      minWidth: 0,
    }}>

      {/* Avatar — floats above card (negative margin) */}
      <div style={{ marginTop: isFirst ? -28 : -24, zIndex: 2, position: 'relative' }}>
        {isFirst && (
          <div style={{
            position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
            background: '#cc040a', color: '#fff', borderRadius: 99, padding: '3px 10px',
            fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 4,
            boxShadow: '0 2px 8px rgba(204,4,10,0.4)'
          }}>
            <Crown size={10} /> CHAMPION
          </div>
        )}
        <AvatarBubble name={user.name} src={user.avatar} size={isFirst ? 'lg' : 'md'} />
      </div>

      {/* Name */}
      <p style={{
        marginTop: 10, fontWeight: 900, fontSize: isFirst ? 15 : 13,
        color: '#1e293b', maxWidth: '90%', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', padding: '0 8px'
      }}>
        {user.name}
      </p>

      {/* Rank label */}
      <p style={{ fontSize: 10, fontWeight: 800, color: cfg.labelColor, letterSpacing: '0.12em', marginTop: 3 }}>
        {cfg.label}
      </p>

      {/* Order count + spend */}
      <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 4 }}>
        {user.orderCount} top-up{user.orderCount !== 1 ? 's' : ''} · {fmtLkr(user.totalLkr)}
      </p>

      {/* Rank number bar */}
      <div style={{
        marginTop: 14, width: '100%',
        background: cfg.bar,
        padding: '10px 0', textAlign: 'center',
      }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 22, lineHeight: 1 }}>{rank}</span>
      </div>
    </div>
  );
}

function PlaceholderCard({ rank }) {
  const isFirst = rank === 1;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: '#f8fafc', borderRadius: 20, border: '1.5px dashed #e2e8f0',
      overflow: 'hidden', opacity: 0.5,
      transform: isFirst ? 'translateY(-20px)' : 'none',
    }}>
      <div style={{ marginTop: isFirst ? -28 : -24 }}>
        <div style={{ width: isFirst ? 80 : 64, height: isFirst ? 80 : 64, borderRadius: '50%', background: '#e2e8f0', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#94a3b8', fontWeight: 900, fontSize: 22 }}>?</span>
        </div>
      </div>
      <p style={{ marginTop: 10, fontWeight: 700, fontSize: 12, color: '#94a3b8' }}>—</p>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.1em' }}>
        {rank === 1 ? 'TOP SPENDER' : rank === 2 ? '2ND PLACE' : '3RD PLACE'}
      </p>
      <div style={{ marginTop: 14, width: '100%', background: '#e2e8f0', padding: '10px 0', textAlign: 'center' }}>
        <span style={{ color: '#94a3b8', fontWeight: 900, fontSize: 22 }}>{rank}</span>
      </div>
    </div>
  );
}

export const TopSpendersSection = () => {
  const [topSpenders, setTopSpenders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopSpenders().then(d => { setTopSpenders(d); setLoading(false); });
  }, []);

  const first = topSpenders[0];
  const second = topSpenders[1];
  const third = topSpenders[2];

  return (
    <section style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 50%, #fafafa 100%)', padding: '48px 16px' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 48, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Icon box */}
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #cc040a, #ff4d4f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(204,4,10,0.35)',
              flexShrink: 0
            }}>
              <Trophy size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontWeight: 900, fontSize: 20, color: '#1e293b', fontFamily: 'inherit' }}>
                Top Spenders
              </h2>
              <p style={{ margin: '2px 0 0', fontWeight: 600, fontSize: 12, color: '#64748b' }}>
                Most valued customers this month
              </p>
              {/* THIS MONTH badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                marginTop: 6, padding: '2px 10px', borderRadius: 99,
                background: 'rgba(204,4,10,0.08)', border: '1px solid rgba(204,4,10,0.2)',
                fontSize: 9, fontWeight: 900, color: '#cc040a', letterSpacing: '0.12em'
              }}>
                <Flame size={10} /> THIS MONTH
              </span>
            </div>
          </div>

          {/* View Leaderboard button */}
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 18px', borderRadius: 12,
            background: 'linear-gradient(135deg, #cc040a, #ff4d4f)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontWeight: 800, fontSize: 12, letterSpacing: '0.02em',
            boxShadow: '0 4px 14px rgba(204,4,10,0.35)',
            flexShrink: 0, whiteSpace: 'nowrap'
          }}>
            View Leaderboard <ChevronRight size={14} />
          </button>
        </div>

        {/* ── Podium container ── */}
        <div style={{
          background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 50%, #f5f0ff 100%)',
          borderRadius: 24,
          padding: '40px 20px 0',
          boxShadow: '0 2px 24px rgba(0,0,0,0.07)',
          border: '1px solid rgba(255,255,255,0.9)',
        }}>
          {/* 3-col grid: 2nd | 1st | 3rd */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignItems: 'flex-end' }}>
              {[2, 1, 3].map(r => (
                <div key={r} style={{
                  height: r === 1 ? 200 : 170, borderRadius: 20,
                  background: 'rgba(255,255,255,0.6)',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignItems: 'flex-end' }}>
              {/* 2nd */}
              <div style={{ paddingTop: 28 }}>
                {second ? <PodiumCard user={second} rank={2} /> : <PlaceholderCard rank={2} />}
              </div>
              {/* 1st */}
              <div style={{ paddingTop: 28 }}>
                {first ? <PodiumCard user={first} rank={1} /> : <PlaceholderCard rank={1} />}
              </div>
              {/* 3rd */}
              <div style={{ paddingTop: 28 }}>
                {third ? <PodiumCard user={third} rank={3} /> : <PlaceholderCard rank={3} />}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && topSpenders.length === 0 && (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, fontWeight: 600, padding: '16px 0 32px' }}>
              🎮 Be the first top spender this month!
            </p>
          )}
        </div>

        {/* Mobile view leaderboard */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 28px',
            borderRadius: 12, background: 'linear-gradient(135deg, #cc040a, #ff4d4f)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontWeight: 800, fontSize: 12, boxShadow: '0 4px 14px rgba(204,4,10,0.3)'
          }}>
            <Star size={13} /> View Full Leaderboard <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </section>
  );
};
