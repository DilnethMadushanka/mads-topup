import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft, Trophy, Flame, ShoppingBag, Calendar, Infinity
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
  1: { bg: 'linear-gradient(135deg,#cc040a,#e8060c)', label: 'CHAMPION',  labelClr: '#cc040a', barBg: 'linear-gradient(90deg,#cc040a,#ff4444)', ringClr: '#cc040a' },
  2: { bg: 'linear-gradient(135deg,#64748b,#94a3b8)', label: 'RUNNER UP', labelClr: '#64748b', barBg: 'linear-gradient(90deg,#64748b,#94a3b8)', ringClr: '#64748b' },
  3: { bg: 'linear-gradient(135deg,#92400e,#d97706)', label: '3RD PLACE', labelClr: '#b45309', barBg: 'linear-gradient(90deg,#92400e,#d97706)', ringClr: '#d97706' },
};

function PodiumCard({ user, rank, isCenter }) {
  const cfg = RANK_CFG[rank] || RANK_CFG[3];
  const av = isCenter ? 80 : 66;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: isCenter ? 'translateY(-16px)' : 'none' }}>
      {isCenter
        ? <div style={{ background: cfg.bg, color: '#fff', borderRadius: 99, padding: '4px 14px', fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', marginBottom: 8, boxShadow: '0 4px 16px rgba(204,4,10,0.45)', whiteSpace: 'nowrap' }}>🏆 {cfg.label}</div>
        : <div style={{ height: 26 }} />
      }
      <div style={{ width: av + 8, height: av + 8, borderRadius: '50%', border: `3px solid ${cfg.ringClr}`, padding: 2, boxShadow: `0 0 0 2px white, 0 6px 24px ${cfg.ringClr}40`, marginBottom: -(av / 2), position: 'relative', zIndex: 2, background: '#fff' }}>
        <Avatar name={user.name} src={user.avatar} size={av} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: cfg.bg, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>{rank}</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 20, paddingTop: av / 2 + 14, paddingBottom: 0, paddingLeft: 12, paddingRight: 12, width: '100%', minWidth: 0, boxShadow: isCenter ? '0 8px 40px rgba(204,4,10,0.14), 0 2px 8px rgba(0,0,0,0.08)' : '0 4px 20px rgba(0,0,0,0.08)', border: isCenter ? '1.5px solid rgba(204,4,10,0.15)' : '1.5px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 900, fontSize: isCenter ? 14 : 12, color: '#0f172a', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px' }}>{user.name}</p>
        <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 900, color: cfg.labelClr, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{cfg.label}</p>
        <div style={{ marginTop: 12, width: '100%', background: cfg.barBg, borderRadius: '0 0 18px 18px', padding: isCenter ? '13px 8px' : '10px 8px', textAlign: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: isCenter ? 18 : 15, lineHeight: 1 }}>{fmtLkr(user.totalLkr)}</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: 700, marginTop: 2 }}>{user.orderCount} order{user.orderCount !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>
  );
}

function ContenderRow({ user, rank }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#fff', borderRadius: 14, border: hovered ? '1px solid rgba(204,4,10,0.2)' : '1px solid #f1f5f9', boxShadow: hovered ? '0 4px 18px rgba(204,4,10,0.10)' : '0 1px 4px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}
    >
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: rank <= 5 ? 'rgba(204,4,10,0.08)' : '#f8fafc', border: rank <= 5 ? '1.5px solid rgba(204,4,10,0.2)' : '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: rank <= 5 ? '#cc040a' : '#64748b', flexShrink: 0 }}>{rank}</div>
      <Avatar name={user.name} src={user.avatar} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 1 }}>{user.orderCount} order{user.orderCount !== 1 ? 's' : ''}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 900, fontSize: 13, color: '#cc040a' }}>{fmtLkr(user.totalLkr)}</div>
        <div style={{ fontSize: 9, color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>spent</div>
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

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#fff5f5 0%,#ffffff 40%,#fafbff 100%)', paddingBottom: 60 }}>

      {/* Sticky top nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={closeLeaderboardPage} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 99, background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background='#fee2e2'; e.currentTarget.style.color='#cc040a'; e.currentTarget.style.borderColor='rgba(204,4,10,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.color='#475569'; e.currentTarget.style.borderColor='#e2e8f0'; }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 900, fontSize: 14, color: '#0f172a' }}>Hall of Fame</div>
        <div style={{ width: 72 }} />
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>

        {/* Hero header */}
        <div style={{ textAlign: 'center', padding: '36px 0 28px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#cc040a,#ff4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(204,4,10,0.35)' }}>
            <Trophy size={30} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px', color: '#0f172a' }}>
            Hall of <span style={{ color: '#cc040a' }}>Fame</span>
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b', fontWeight: 600 }}>Sri Lanka's top game top-up champions</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '3px 12px', borderRadius: 99, background: 'rgba(204,4,10,0.07)', border: '1px solid rgba(204,4,10,0.2)', fontSize: 9, fontWeight: 900, color: '#cc040a', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            <Flame size={9} /> {tab === 'month' ? `${monthName} ${now.getFullYear()}` : 'All Time'}
          </div>

          {/* Tab toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', marginTop: 20, background: '#f1f5f9', borderRadius: 99, padding: 4, gap: 2 }}>
            {[{key:'month',icon:<Calendar size={12}/>,label:'This Month'},{key:'all',icon:<span style={{fontSize:12}}>∞</span>,label:'All Time'}].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 18px', borderRadius: 99, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12, background: tab === t.key ? '#cc040a' : 'transparent', color: tab === t.key ? '#fff' : '#64748b', boxShadow: tab === t.key ? '0 2px 12px rgba(204,4,10,0.35)' : 'none', transition: 'all 0.2s' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Podium */}
        <div style={{ background: 'linear-gradient(145deg,#eef2ff 0%,#e8f0fe 40%,#ede9fe 80%)', borderRadius: 24, padding: '48px 16px 0', boxShadow: '0 4px 32px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.95)', marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent)' }} />
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8', fontWeight: 700, fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>Loading leaderboard…
            </div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎮</div>
              <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700 }}>No data yet — be the first top spender!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'flex-end' }}>
              <div>{second ? <PodiumCard user={second} rank={2} isCenter={false}/> : <div style={{height:180}}/>}</div>
              <div>{first  ? <PodiumCard user={first}  rank={1} isCenter={true} /> : <div style={{height:200}}/>}</div>
              <div>{third  ? <PodiumCard user={third}  rank={3} isCenter={false}/> : <div style={{height:180}}/>}</div>
            </div>
          )}
        </div>

        {/* Contenders */}
        {!loading && rest.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ height: 1, flex: 1, background: '#e2e8f0' }} />
              <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>THE CONTENDERS</span>
              <div style={{ height: 1, flex: 1, background: '#e2e8f0' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rest.map((user, i) => <ContenderRow key={user.key} user={user} rank={i + 4} />)}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 36, padding: '16px', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
            <ShoppingBag size={13} color="#cc040a" />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#cc040a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rankings update in real time</span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
            Based on total LKR spent on completed orders · {tab === 'month' ? `${monthName} ${now.getFullYear()}` : 'All time'}
          </p>
        </div>
      </div>
    </div>
  );
};
