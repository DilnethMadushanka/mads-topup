import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Crown, ChevronRight, Flame, Sparkles, TrendingUp } from 'lucide-react';

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

    const spendMap = {};
    flatOrders.forEach(order => {
      if (!order || ['FAILED','REFUNDED','CANCELLED'].includes(order.status)) return;
      if (order.createdAt) {
        try {
          const d = new Date(order.createdAt);
          if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return;
        } catch {}
      }
      const amount = parseFloat(order.priceLkr || 0);
      if (!amount || amount <= 0) return;
      const key = order.userId || order.userUid || order.userEmail || order.userName || 'anon';
      if (!key || key === 'anon') return;
      const userInfo = usersMap[key] || usersMap[(order.userEmail || '').toLowerCase()] || null;
      if (!spendMap[key]) spendMap[key] = { key, name: userInfo?.name || order.userName || order.ign || key, avatar: userInfo?.avatar || order.userAvatar || '', totalLkr: 0, orderCount: 0 };
      spendMap[key].totalLkr += amount;
      spendMap[key].orderCount += 1;
      if (userInfo?.name) spendMap[key].name = userInfo.name;
      if (userInfo?.avatar) spendMap[key].avatar = userInfo.avatar;
    });
    return Object.values(spendMap).filter(u => u.name && u.name.length > 1).sort((a, b) => b.totalLkr - a.totalLkr).slice(0, 3);
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
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * ease));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, started, duration]);
  return value;
}

/* ─── Avatar ─────────────────────────────────────────── */
function Avatar({ name, src, size = 64, ring }) {
  const [err, setErr] = useState(false);
  const initials = (name || '?').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const palettes = ['#cc040a,#ff6b6b','#f97316,#fb923c','#7c3aed,#a78bfa','#059669,#34d399','#0284c7,#38bdf8','#db2777,#f472b6','#d97706,#fbbf24'].map(s => s.split(','));
  const [c1, c2] = palettes[(name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palettes.length];

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: ring || '3.5px solid #fff',
      boxShadow: '0 6px 20px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1)',
      overflow: 'hidden', flexShrink: 0,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      position: 'relative',
    }}>
      {src && !err
        ? <img src={src} alt={name} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: size * 0.33, lineHeight: 1, letterSpacing: '-0.5px' }}>{initials}</span>
          </div>
      }
    </div>
  );
}

/* ─── Sparkle particles ───────────────────────────────── */
function Particles() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 'inherit' }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2,
          borderRadius: '50%',
          background: i % 2 === 0 ? 'rgba(204,4,10,0.5)' : 'rgba(255,150,150,0.4)',
          top: `${15 + i * 13}%`, left: `${8 + i * 14}%`,
          animation: `ts-float ${2.5 + i * 0.4}s ease-in-out infinite`,
          animationDelay: `${i * 0.35}s`,
        }} />
      ))}
    </div>
  );
}

/* ─── Podium card ─────────────────────────────────────── */
function PodiumCard({ user, rank, visible }) {
  const isFirst = rank === 1;
  const avatarSize = isFirst ? 84 : 68;
  const countVal = useCountUp(user.totalLkr, 1400, visible);

  const configs = {
    1: {
      barGrad: 'linear-gradient(90deg, #b91c1c 0%, #cc040a 40%, #ef4444 70%, #cc040a 100%)',
      barShadow: '0 4px 18px rgba(204,4,10,0.55)',
      labelColor: '#cc040a', label: 'TOP SPENDER',
      glow: '0 16px 50px rgba(204,4,10,0.22), 0 4px 16px rgba(0,0,0,0.10)',
      border: '2px solid rgba(204,4,10,0.14)',
      headerHeight: 64,
      avatarRing: '4px solid rgba(204,4,10,0.25)',
    },
    2: {
      barGrad: 'linear-gradient(90deg, #6b7280, #9ca3af, #6b7280)',
      barShadow: '0 4px 12px rgba(100,116,139,0.3)',
      labelColor: '#475569', label: '2ND PLACE',
      glow: '0 8px 30px rgba(0,0,0,0.10)',
      border: '1.5px solid rgba(0,0,0,0.07)',
      headerHeight: 44,
      avatarRing: '3.5px solid #fff',
    },
    3: {
      barGrad: 'linear-gradient(90deg, #92400e, #d97706, #f59e0b, #d97706, #92400e)',
      barShadow: '0 4px 12px rgba(217,119,6,0.35)',
      labelColor: '#92400e', label: '3RD PLACE',
      glow: '0 8px 30px rgba(0,0,0,0.10)',
      border: '1.5px solid rgba(0,0,0,0.07)',
      headerHeight: 44,
      avatarRing: '3.5px solid #fff',
    },
  }[rank];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      animation: visible ? `ts-rise ${0.45 + rank * 0.12}s cubic-bezier(0.34,1.56,0.64,1) forwards` : 'none',
      opacity: visible ? 1 : 0,
    }}>
      {/* Champion badge above avatar */}
      {isFirst ? (
        <div style={{
          background: 'linear-gradient(135deg, #cc040a, #ff4d4f)',
          color: '#fff', borderRadius: 99,
          padding: '4px 14px', marginBottom: 8,
          fontSize: 9.5, fontWeight: 900, letterSpacing: '0.12em',
          display: 'inline-flex', alignItems: 'center', gap: 5,
          boxShadow: '0 4px 14px rgba(204,4,10,0.5)',
          whiteSpace: 'nowrap',
        }}>
          <Crown size={11} /> CHAMPION
        </div>
      ) : (
        <div style={{ height: 30 }} />
      )}

      {/* Avatar floats above card */}
      <div style={{ position: 'relative', zIndex: 2, marginBottom: -(avatarSize / 2) }}>
        <Avatar name={user.name} src={user.avatar} size={avatarSize} ring={configs.avatarRing} />
        {/* Rank badge on avatar bottom-right */}
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 22, height: 22, borderRadius: '50%',
          background: configs.barGrad,
          boxShadow: configs.barShadow,
          border: '2px solid #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 900, color: '#fff',
        }}>{rank}</div>
      </div>

      {/* Card body */}
      <div style={{
        width: '100%', background: '#fff',
        borderRadius: 22, boxShadow: configs.glow, border: configs.border,
        overflow: 'hidden', position: 'relative',
        paddingTop: avatarSize / 2 + 14,
        paddingLeft: 10, paddingRight: 10, paddingBottom: 0,
        transition: 'transform 0.25s, box-shadow 0.25s',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = isFirst ? '0 22px 60px rgba(204,4,10,0.28), 0 4px 16px rgba(0,0,0,0.10)' : '0 14px 40px rgba(0,0,0,0.14)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = configs.glow; }}
      >
        {isFirst && <Particles />}

        {/* Name */}
        <p style={{
          margin: 0, fontWeight: 900,
          fontSize: isFirst ? 15 : 12.5,
          color: '#0f172a', textAlign: 'center',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          padding: '0 4px', lineHeight: 1.25,
          letterSpacing: '-0.2px',
        }}>{user.name}</p>

        {/* Label */}
        <p style={{
          margin: '5px 0 0', fontSize: 9.5, fontWeight: 900,
          color: configs.labelColor, textAlign: 'center', letterSpacing: '0.14em',
        }}>{configs.label}</p>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <span style={{
            fontSize: 10, color: '#94a3b8', fontWeight: 600,
            background: '#f8fafc', borderRadius: 99, padding: '2px 8px',
            border: '1px solid #e2e8f0',
          }}>
            {user.orderCount} top-up{user.orderCount !== 1 ? 's' : ''}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 800,
            color: configs.labelColor,
            background: isFirst ? 'rgba(204,4,10,0.07)' : '#f8fafc',
            borderRadius: 99, padding: '2px 8px',
            border: `1px solid ${isFirst ? 'rgba(204,4,10,0.15)' : '#e2e8f0'}`,
          }}>
            {fmtLkr(countVal)}
          </span>
        </div>

        {/* Rank bar */}
        <div style={{
          marginTop: 14, width: '100%',
          background: configs.barGrad,
          boxShadow: configs.barShadow,
          padding: isFirst ? '13px 0' : '10px 0',
          textAlign: 'center',
          backgroundSize: '200% auto',
          animation: 'ts-shimmer 3s linear infinite',
        }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: isFirst ? 26 : 20, lineHeight: 1, textShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>{rank}</span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard({ rank }) {
  const isFirst = rank === 1;
  const sz = isFirst ? 84 : 68;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ height: isFirst ? 38 : 30 }} />
      <div style={{ width: sz, height: sz, borderRadius: '50%', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% auto', animation: 'ts-shimmer 1.5s linear infinite', marginBottom: -(sz / 2), zIndex: 2, position: 'relative', border: '3.5px solid #fff' }} />
      <div style={{ width: '100%', background: '#f8fafc', borderRadius: 22, border: '1.5px solid #f1f5f9', overflow: 'hidden', paddingTop: sz / 2 + 14, paddingBottom: 0 }}>
        <div style={{ margin: '0 auto 8px', width: '60%', height: 13, borderRadius: 8, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% auto', animation: 'ts-shimmer 1.5s linear infinite' }} />
        <div style={{ margin: '0 auto 12px', width: '40%', height: 10, borderRadius: 8, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% auto', animation: 'ts-shimmer 1.5s linear infinite' }} />
        <div style={{ width: '100%', height: isFirst ? 52 : 44, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% auto', animation: 'ts-shimmer 1.5s linear infinite' }} />
      </div>
    </div>
  );
}

/* ─── Main export ─────────────────────────────────────── */
export const TopSpendersSection = () => {
  const [topSpenders, setTopSpenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetchTopSpenders().then(d => { setTopSpenders(d); setLoading(false); });
  }, []);

  // Intersection observer — trigger animations on scroll into view
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.2 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [loading]);

  const [first, second, third] = topSpenders;

  return (
    <section ref={ref} style={{
      background: 'linear-gradient(160deg, #fff5f5 0%, #fef2f2 30%, #f8faff 70%, #fafafa 100%)',
      padding: '56px 16px 64px',
      marginTop: 36,
      borderRadius: 28,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative red orb */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(204,4,10,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(204,4,10,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 52, gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Icon */}
            <div style={{
              width: 54, height: 54, borderRadius: 16, flexShrink: 0,
              background: 'linear-gradient(135deg, #cc040a 0%, #ff4d4f 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(204,4,10,0.4), 0 2px 6px rgba(204,4,10,0.2)',
              animation: 'ts-bob 3s ease-in-out infinite',
            }}>
              <Trophy size={24} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontWeight: 900, fontSize: 22, color: '#0f172a', letterSpacing: '-0.4px', fontFamily: 'inherit' }}>
                  Top Spenders
                </h2>
                <Sparkles size={16} color="#cc040a" style={{ flexShrink: 0 }} />
              </div>
              <p style={{ margin: '3px 0 0', fontWeight: 600, fontSize: 12.5, color: '#64748b' }}>
                Most valued customers this month
              </p>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7,
                padding: '3px 12px', borderRadius: 99,
                background: 'rgba(204,4,10,0.07)',
                border: '1px solid rgba(204,4,10,0.18)',
                fontSize: 9, fontWeight: 900, color: '#cc040a', letterSpacing: '0.15em',
              }}>
                <Flame size={9} style={{ flexShrink: 0 }} /> THIS MONTH
              </span>
            </div>
          </div>

          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', borderRadius: 14,
              background: 'linear-gradient(135deg, #cc040a 0%, #ff4d4f 100%)',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: 12.5, letterSpacing: '0.01em',
              boxShadow: '0 6px 20px rgba(204,4,10,0.38), 0 2px 6px rgba(204,4,10,0.2)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(204,4,10,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(204,4,10,0.38), 0 2px 6px rgba(204,4,10,0.2)'; }}
          >
            <TrendingUp size={14} /> View Leaderboard <ChevronRight size={14} />
          </button>
        </div>

        {/* ── Podium panel ── */}
        <div style={{
          background: 'linear-gradient(145deg, #eef2ff 0%, #e8f0fe 40%, #ede9fe 80%, #f0f4ff 100%)',
          borderRadius: 26,
          padding: '52px 24px 0',
          boxShadow: '0 4px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
          border: '1px solid rgba(255,255,255,0.95)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Subtle inner shine */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', borderRadius: '26px 26px 0 0' }} />

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[2,1,3].map(r => <SkeletonCard key={r} rank={r} />)}
            </div>
          ) : topSpenders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0 40px' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🎮</p>
              <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700 }}>Be the first top spender this month!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'flex-end' }}>
              <div>{second ? <PodiumCard user={second} rank={2} visible={visible} /> : <SkeletonCard rank={2} />}</div>
              <div>{first  ? <PodiumCard user={first}  rank={1} visible={visible} /> : <SkeletonCard rank={1} />}</div>
              <div>{third  ? <PodiumCard user={third}  rank={3} visible={visible} /> : <SkeletonCard rank={3} />}</div>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '11px 32px', borderRadius: 14,
            background: 'linear-gradient(135deg, #cc040a 0%, #ff4d4f 100%)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontWeight: 800, fontSize: 12.5,
            boxShadow: '0 6px 20px rgba(204,4,10,0.38)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(204,4,10,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(204,4,10,0.38)'; }}
          >
            <Sparkles size={13} /> View Full Leaderboard <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ts-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes ts-rise {
          from { opacity: 0; transform: translateY(28px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ts-bob {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
        @keyframes ts-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50%       { transform: translateY(-12px) scale(1.2); opacity: 1; }
        }
      `}</style>
    </section>
  );
};
