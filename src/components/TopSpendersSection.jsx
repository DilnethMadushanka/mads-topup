import React, { useState, useEffect } from 'react';
import { Trophy, Crown, ChevronRight, Flame, Star } from 'lucide-react';

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

/* ─── Avatar bubble ───────────────────────────────────── */
function AvatarBubble({ name, src, size = 64 }) {
  const [imgErr, setImgErr] = useState(false);
  const initials = (name || '?').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const palettes = [
    ['#cc040a', '#ff6b6b'],
    ['#f97316', '#fb923c'],
    ['#7c3aed', '#a78bfa'],
    ['#059669', '#34d399'],
    ['#0284c7', '#38bdf8'],
    ['#db2777', '#f472b6'],
    ['#d97706', '#fbbf24'],
  ];
  const idx = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palettes.length;
  const [c1, c2] = palettes[idx];

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '3px solid #fff',
      boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
      overflow: 'hidden', flexShrink: 0,
      background: `linear-gradient(135deg, ${c1}, ${c2})`
    }}>
      {src && !imgErr ? (
        <img src={src} alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setImgErr(true)} />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: size * 0.33, lineHeight: 1 }}>
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Podium card ─────────────────────────────────────── */
function PodiumCard({ user, rank }) {
  const isFirst = rank === 1;
  const avatarSize = isFirst ? 80 : 64;

  const rankCfg = {
    1: {
      bar: 'linear-gradient(90deg, #cc040a 0%, #ff6b6b 50%, #cc040a 100%)',
      labelColor: '#cc040a',
      label: 'TOP SPENDER',
      cardShadow: '0 10px 40px rgba(204,4,10,0.2), 0 2px 10px rgba(0,0,0,0.08)',
      cardBorder: '2px solid rgba(204,4,10,0.12)',
    },
    2: {
      bar: 'linear-gradient(90deg, #94a3b8, #cbd5e1)',
      labelColor: '#64748b',
      label: '2ND PLACE',
      cardShadow: '0 4px 20px rgba(0,0,0,0.08)',
      cardBorder: '1.5px solid rgba(0,0,0,0.06)',
    },
    3: {
      bar: 'linear-gradient(90deg, #ca8a04, #fbbf24)',
      labelColor: '#92400e',
      label: '3RD PLACE',
      cardShadow: '0 4px 20px rgba(0,0,0,0.08)',
      cardBorder: '1.5px solid rgba(0,0,0,0.06)',
    },
  }[rank];

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Champion crown — sits ABOVE the avatar, not overlapping it */}
      {isFirst && (
        <div style={{
          background: '#cc040a', color: '#fff',
          borderRadius: 99, padding: '3px 10px',
          fontSize: 9, fontWeight: 900, letterSpacing: '0.1em',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          boxShadow: '0 2px 8px rgba(204,4,10,0.45)',
          marginBottom: 6, whiteSpace: 'nowrap',
          zIndex: 3
        }}>
          <Crown size={10} /> CHAMPION
        </div>
      )}

      {/* Spacer for non-first to keep alignment */}
      {!isFirst && <div style={{ height: 26 }} />}

      {/* Avatar — sits above card (negative margin into card) */}
      <div style={{ position: 'relative', zIndex: 2, marginBottom: -avatarSize / 2 }}>
        <AvatarBubble name={user.name} src={user.avatar} size={avatarSize} />
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        background: '#fff',
        borderRadius: 20,
        boxShadow: rankCfg.cardShadow,
        border: rankCfg.cardBorder,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: avatarSize / 2 + 12,
        paddingBottom: 0,
        paddingLeft: 8, paddingRight: 8,
      }}>
        {/* Name */}
        <p style={{
          fontWeight: 900, fontSize: isFirst ? 14 : 12,
          color: '#1e293b', maxWidth: '100%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textAlign: 'center', padding: '0 4px', lineHeight: 1.2,
        }}>
          {user.name}
        </p>

        {/* Rank label */}
        <p style={{
          fontSize: 9, fontWeight: 900,
          color: rankCfg.labelColor,
          letterSpacing: '0.14em',
          marginTop: 4
        }}>
          {rankCfg.label}
        </p>

        {/* Stats */}
        <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginTop: 5 }}>
          {user.orderCount} top-up{user.orderCount !== 1 ? 's' : ''} · {fmtLkr(user.totalLkr)}
        </p>

        {/* Rank bar */}
        <div style={{
          marginTop: 12, width: '100%',
          background: rankCfg.bar,
          padding: '10px 0', textAlign: 'center',
        }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 22, lineHeight: 1 }}>
            {rank}
          </span>
        </div>
      </div>
    </div>
  );
}

function PlaceholderCard({ rank }) {
  const isFirst = rank === 1;
  const sz = isFirst ? 80 : 64;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.45 }}>
      <div style={{ height: isFirst ? 32 : 26 }} />
      <div style={{
        width: sz, height: sz, borderRadius: '50%', background: '#e2e8f0',
        border: '3px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
        marginBottom: -sz / 2, zIndex: 2, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ color: '#94a3b8', fontWeight: 900, fontSize: 20 }}>?</span>
      </div>
      <div style={{
        width: '100%', background: '#f8fafc',
        borderRadius: 20, border: '1.5px dashed #e2e8f0',
        overflow: 'hidden', paddingTop: sz / 2 + 12, paddingBottom: 0
      }}>
        <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 11, color: '#94a3b8' }}>—</p>
        <p style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.12em', marginTop: 3, marginBottom: 12 }}>
          {rank === 1 ? 'TOP SPENDER' : rank === 2 ? '2ND PLACE' : '3RD PLACE'}
        </p>
        <div style={{ background: '#e2e8f0', padding: '10px 0', textAlign: 'center' }}>
          <span style={{ color: '#94a3b8', fontWeight: 900, fontSize: 22 }}>{rank}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main export ─────────────────────────────────────── */
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
    <section style={{
      background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 40%, #f8faff 100%)',
      padding: '48px 16px 56px',
      marginTop: 32,
      borderRadius: 24,
    }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 48, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 50, height: 50, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, #cc040a, #ff4d4f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 18px rgba(204,4,10,0.38)',
            }}>
              <Trophy size={23} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontWeight: 900, fontSize: 20, color: '#1e293b' }}>Top Spenders</h2>
              <p style={{ margin: '2px 0 0', fontWeight: 600, fontSize: 12, color: '#64748b' }}>Most valued customers this month</p>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6,
                padding: '2px 10px', borderRadius: 99,
                background: 'rgba(204,4,10,0.08)', border: '1px solid rgba(204,4,10,0.2)',
                fontSize: 9, fontWeight: 900, color: '#cc040a', letterSpacing: '0.12em'
              }}>
                <Flame size={10} /> THIS MONTH
              </span>
            </div>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 18px', borderRadius: 12,
            background: 'linear-gradient(135deg, #cc040a, #ff4d4f)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontWeight: 800, fontSize: 12,
            boxShadow: '0 4px 14px rgba(204,4,10,0.35)',
            flexShrink: 0, whiteSpace: 'nowrap'
          }}>
            View Leaderboard <ChevronRight size={14} />
          </button>
        </div>

        {/* Podium container */}
        <div style={{
          background: 'linear-gradient(135deg, #eef2ff 0%, #e8f0fe 50%, #f0f4ff 100%)',
          borderRadius: 24, padding: '44px 20px 0',
          boxShadow: '0 2px 24px rgba(0,0,0,0.06)',
          border: '1px solid rgba(255,255,255,0.95)',
        }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  height: 190, borderRadius: 20,
                  background: 'rgba(255,255,255,0.55)',
                  animation: 'ts-pulse 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`
                }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignItems: 'flex-end' }}>
              {/* 2nd */}
              <div>{second ? <PodiumCard user={second} rank={2} /> : <PlaceholderCard rank={2} />}</div>
              {/* 1st — taller/elevated */}
              <div>{first ? <PodiumCard user={first} rank={1} /> : <PlaceholderCard rank={1} />}</div>
              {/* 3rd */}
              <div>{third ? <PodiumCard user={third} rank={3} /> : <PlaceholderCard rank={3} />}</div>
            </div>
          )}

          {!loading && topSpenders.length === 0 && (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, fontWeight: 600, padding: '16px 0 32px' }}>
              🎮 Be the first top spender this month!
            </p>
          )}
        </div>

        {/* Bottom button */}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 28px', borderRadius: 12,
            background: 'linear-gradient(135deg, #cc040a, #ff4d4f)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontWeight: 800, fontSize: 12,
            boxShadow: '0 4px 14px rgba(204,4,10,0.32)'
          }}>
            <Star size={12} /> View Full Leaderboard <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ts-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </section>
  );
};
