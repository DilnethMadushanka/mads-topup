import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, Crown, Medal, ChevronRight, Flame } from 'lucide-react';

const RTDB_URL = 'https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app';

/** Fetch all orders from RTDB and compute top spenders */
async function fetchTopSpenders() {
  try {
    const res = await fetch(`${RTDB_URL}/orders.json`);
    if (!res.ok) throw new Error('RTDB fetch failed');
    const data = await res.json();
    if (!data) return [];

    // Also fetch users for name/avatar enrichment
    let usersMap = {};
    try {
      const uRes = await fetch(`${RTDB_URL}/users.json`);
      if (uRes.ok) {
        const uData = await uRes.json();
        if (uData) {
          Object.values(uData).forEach(u => {
            if (u && u.uid) usersMap[u.uid] = u;
            if (u && u.email) usersMap[u.email.toLowerCase()] = u;
          });
        }
      }
    } catch (e) {}

    const spendMap = {};

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // data can be an object (keys = orderId) or nested under uid
    const flatOrders = [];
    Object.values(data).forEach(entry => {
      if (!entry) return;
      if (entry.id || entry.gameId) {
        // Direct order object
        flatOrders.push(entry);
      } else if (typeof entry === 'object') {
        // Possibly a user's order map
        Object.values(entry).forEach(o => {
          if (o && (o.id || o.gameId)) flatOrders.push(o);
        });
      }
    });

    flatOrders.forEach(order => {
      if (!order) return;
      if (order.status === 'FAILED' || order.status === 'REFUNDED' || order.status === 'CANCELLED') return;

      // Filter to current month
      if (order.createdAt) {
        try {
          const d = new Date(order.createdAt);
          if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return;
        } catch (e) {}
      }

      const amount = parseFloat(order.priceLkr || 0);
      if (!amount || amount <= 0) return;

      const key = order.userId || order.userUid || order.userEmail || order.userName || order.ign || 'anon';
      if (key === 'anon' || !key) return;

      // Enrich with user info
      let userInfo = usersMap[key] || usersMap[(order.userEmail || '').toLowerCase()] || null;
      const name = userInfo?.name || order.userName || order.ign || key;
      const avatar = userInfo?.avatar || order.userAvatar || '';

      if (!spendMap[key]) {
        spendMap[key] = { key, name, avatar, totalLkr: 0, orderCount: 0 };
      }
      spendMap[key].totalLkr += amount;
      spendMap[key].orderCount += 1;
      // Update name/avatar if we have better info
      if (userInfo?.name) spendMap[key].name = userInfo.name;
      if (userInfo?.avatar) spendMap[key].avatar = userInfo.avatar;
    });

    return Object.values(spendMap)
      .filter(u => u.name && u.name.length > 1)
      .sort((a, b) => b.totalLkr - a.totalLkr)
      .slice(0, 3);
  } catch (e) {
    console.warn('[TopSpenders] RTDB fetch error:', e.message);
    return [];
  }
}

/** Format LKR nicely */
function fmtLkr(val) {
  if (!val || val <= 0) return 'Rs. 0';
  if (val >= 100000) return `Rs. ${(val / 1000).toFixed(0)}K`;
  if (val >= 1000) return `Rs. ${(val / 1000).toFixed(1)}K`;
  return `Rs. ${Math.round(val).toLocaleString()}`;
}

/** Avatar bubble — letter initial or real image */
function Avatar({ name, src, size = 'md', ring = '' }) {
  const [imgError, setImgError] = useState(false);
  const sizeMap = {
    sm: 'w-10 h-10 text-base',
    md: 'w-14 h-14 text-xl',
    lg: 'w-20 h-20 text-3xl'
  };
  const initials = (name || '?').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();

  const colors = [
    'from-[#cc040a] to-rose-700',
    'from-orange-500 to-amber-500',
    'from-purple-600 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-sky-500 to-blue-600',
    'from-pink-500 to-rose-500',
    'from-yellow-500 to-orange-500',
  ];
  const colorIdx = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  const showImg = src && !imgError;

  return (
    <div className={`relative rounded-full ${sizeMap[size]} ${ring} overflow-hidden flex-shrink-0`}>
      {showImg ? (
        <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center`}>
          <span className="font-black text-white">{initials}</span>
        </div>
      )}
    </div>
  );
}

/** A single podium card */
function SpenderCard({ user, rank }) {
  const cfg = {
    1: {
      label: 'TOP SPENDER',
      badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
      barGrad: 'from-[#cc040a] via-rose-600 to-[#cc040a]',
      numColor: 'text-amber-300',
      border: 'border-[#cc040a]/40',
      bg: 'bg-gradient-to-b from-[#1c060a] via-[#130910] to-[#0d0a12]',
      glow: 'shadow-2xl shadow-red-900/50',
      ring: 'ring-4 ring-amber-400/50 ring-offset-2 ring-offset-[#130910]',
      avatarSize: 'lg',
      elevated: true,
      icon: <Crown className="w-3 h-3" />,
    },
    2: {
      label: '2ND PLACE',
      badgeColor: 'text-slate-300 bg-slate-700/30 border-slate-600/30',
      barGrad: 'from-slate-500 to-slate-600',
      numColor: 'text-slate-300',
      border: 'border-slate-700/40',
      bg: 'bg-[#0f1117]',
      glow: 'shadow-lg shadow-black/40',
      ring: 'ring-2 ring-slate-500/40 ring-offset-1 ring-offset-[#0f1117]',
      avatarSize: 'md',
      elevated: false,
      icon: <Medal className="w-3 h-3" />,
    },
    3: {
      label: '3RD PLACE',
      badgeColor: 'text-amber-600 bg-amber-900/20 border-amber-700/30',
      barGrad: 'from-amber-700 to-yellow-700',
      numColor: 'text-amber-600',
      border: 'border-amber-900/30',
      bg: 'bg-[#0f1117]',
      glow: 'shadow-lg shadow-black/40',
      ring: 'ring-2 ring-amber-700/40 ring-offset-1 ring-offset-[#0f1117]',
      avatarSize: 'md',
      elevated: false,
      icon: <Medal className="w-3 h-3" />,
    },
  }[rank];

  return (
    <div className={`relative flex flex-col items-center rounded-2xl border ${cfg.border} ${cfg.bg} ${cfg.glow} px-4 py-5 text-center transition-all duration-300 hover:scale-[1.025] ${cfg.elevated ? '-translate-y-5' : ''}`}>
      {/* Champion crown badge */}
      {rank === 1 && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="inline-flex items-center gap-1 bg-amber-400 text-black px-3 py-1 rounded-full text-[10px] font-black tracking-wider shadow-lg shadow-amber-500/40">
            <Crown className="w-3 h-3" />
            CHAMPION
          </span>
        </div>
      )}

      {/* Avatar */}
      <div className={rank === 1 ? 'mt-3' : 'mt-1'}>
        <Avatar name={user.name} src={user.avatar} size={cfg.avatarSize} ring={cfg.ring} />
      </div>

      {/* Name */}
      <p className={`mt-2.5 font-black text-white ${rank === 1 ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'} leading-tight w-full px-1 truncate`}>
        {user.name}
      </p>

      {/* Rank badge */}
      <span className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-extrabold tracking-wider ${cfg.badgeColor}`}>
        {cfg.icon}
        {cfg.label}
      </span>

      {/* Order count */}
      <p className="mt-1 text-[10px] text-slate-600 font-semibold">
        {user.orderCount} top-up{user.orderCount !== 1 ? 's' : ''}
      </p>

      {/* Rank number bar */}
      <div className={`mt-3 w-full rounded-xl bg-gradient-to-r ${cfg.barGrad} py-2.5`}>
        <span className="text-xl font-black text-white drop-shadow">{rank}</span>
      </div>

      {/* Spend total */}
      <p className={`mt-2 text-sm font-black ${cfg.numColor}`}>{fmtLkr(user.totalLkr)}</p>
    </div>
  );
}

/** Placeholder when no real data */
function PlaceholderCard({ rank }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-800/40 bg-[#0f1117] px-4 py-5 text-center opacity-40">
      <div className={`rounded-full bg-slate-800 flex items-center justify-center mb-3 ${rank === 1 ? 'w-20 h-20' : 'w-14 h-14'}`}>
        <span className="text-slate-600 text-2xl font-black">?</span>
      </div>
      <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">— Place</p>
      <div className="mt-3 w-full rounded-xl bg-slate-800 py-2.5">
        <span className="text-xl font-black text-slate-600">{rank}</span>
      </div>
    </div>
  );
}

export const TopSpendersSection = () => {
  const [topSpenders, setTopSpenders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchTopSpenders().then(data => {
      setTopSpenders(data);
      setLoading(false);
    });
  }, []);

  const first = topSpenders[0];
  const second = topSpenders[1];
  const third = topSpenders[2];

  return (
    <section className="py-10 px-4 bg-[#0d1220]">
      <div className="max-w-3xl mx-auto">

        {/* Section header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#cc040a]/15 border border-[#cc040a]/25 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#cc040a]" />
            </div>
            <div>
              <h2 className="text-white font-black text-xl font-heading">Top Spenders</h2>
              <p className="text-slate-500 text-xs font-semibold mt-0.5">Most valued customers this month</p>
              <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full bg-[#cc040a]/10 border border-[#cc040a]/20 text-[10px] font-extrabold text-[#cc040a] tracking-widest">
                <Flame className="w-3 h-3" />
                THIS MONTH
              </span>
            </div>
          </div>

          <button className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#cc040a] hover:bg-[#990207] text-white text-xs font-extrabold transition-all shadow-md shadow-red-900/30 cursor-pointer">
            View Leaderboard
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Podium: 2nd | 1st | 3rd */}
        {loading ? (
          <div className="grid grid-cols-3 gap-3 items-end animate-pulse">
            {[2, 1, 3].map(r => <PlaceholderCard key={r} rank={r} />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 items-end">
            {/* 2nd */}
            <div>{second ? <SpenderCard user={second} rank={2} /> : <PlaceholderCard rank={2} />}</div>
            {/* 1st — elevated */}
            <div>{first ? <SpenderCard user={first} rank={1} /> : <PlaceholderCard rank={1} />}</div>
            {/* 3rd */}
            <div>{third ? <SpenderCard user={third} rank={3} /> : <PlaceholderCard rank={3} />}</div>
          </div>
        )}

        {/* Mobile button */}
        <div className="mt-5 sm:hidden">
          <button className="w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-[#cc040a] hover:bg-[#990207] text-white text-xs font-extrabold transition-all shadow-md shadow-red-900/30 cursor-pointer">
            View Full Leaderboard <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Empty state */}
        {!loading && topSpenders.length === 0 && (
          <p className="text-center text-slate-600 text-xs font-semibold mt-2">
            🎮 Be the first top spender this month!
          </p>
        )}
      </div>
    </section>
  );
};
