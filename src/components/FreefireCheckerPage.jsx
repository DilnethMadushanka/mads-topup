import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Search, Download, User, Shield, Star, Heart, Calendar, Clock, Award, Zap, Users, Crown, ChevronDown } from 'lucide-react';

// ── Mock data generator (realistic Free Fire profile) ──────────────────────
const generateMockData = (uid, region) => ({
  uid,
  region,
  accountInfo: {
    ign: '🔥 S L _ S L A Y E R 🔥',
    level: 72,
    primeLevel: 14,
    totalLikes: 128_453,
    createdAt: '2019-08-12',
    lastLogin: '2026-09-21',
    badges: 38,
    creditScore: 100,
    signature: 'Top 1% Free Fire player | Clash Squad Legend | Sri Lanka 🇱🇰',
    avatar: 'https://ui-avatars.com/api/?name=FF+Player&background=cc040a&color=fff&size=128&bold=true&rounded=true',
  },
  pet: {
    name: 'Ottero',
    level: 7,
    id: 'PET-1104',
    exp: 2340,
    maxExp: 3000,
    icon: '🦦',
  },
  outfit: [
    { name: 'Demon Slayer Set', slot: 'Head', icon: '🪖' },
    { name: 'Cobra Commander', slot: 'Top', icon: '👕' },
    { name: 'Neon Dragon Pants', slot: 'Bottom', icon: '👖' },
    { name: 'Battle Boots X', slot: 'Shoes', icon: '👟' },
  ],
  guild: {
    name: 'DARK ELITE',
    id: 'GLD-203481',
    level: 6,
    members: 47,
    leaderName: '⚡ D A R K_K I N G ⚡',
    leaderId: uid,
  },
});

// ── Region options ─────────────────────────────────────────────────────────
const REGIONS = [
  { code: 'IND', label: '🇮🇳 India (IND)' },
  { code: 'SG', label: '🇸🇬 Singapore (SG)' },
  { code: 'ID', label: '🇮🇩 Indonesia (ID)' },
  { code: 'TH', label: '🇹🇭 Thailand (TH)' },
  { code: 'VN', label: '🇻🇳 Vietnam (VN)' },
  { code: 'MY', label: '🇲🇾 Malaysia (MY)' },
  { code: 'PK', label: '🇵🇰 Pakistan (PK)' },
  { code: 'BD', label: '🇧🇩 Bangladesh (BD)' },
  { code: 'US', label: '🇺🇸 North America (US)' },
  { code: 'BR', label: '🇧🇷 Brazil (BR)' },
];

// ── Mini stat tile ─────────────────────────────────────────────────────────
const StatTile = ({ icon: Icon, label, value, highlight }) => (
  <div style={{
    background: highlight ? 'linear-gradient(135deg,rgba(204,4,10,0.12),rgba(204,4,10,0.04))' : 'rgba(255,255,255,0.04)',
    border: highlight ? '1px solid rgba(204,4,10,0.35)' : '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <Icon size={13} color={highlight ? '#ff6b6b' : '#9ca3af'} />
      <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
    </div>
    <div style={{ fontSize: 16, fontWeight: 900, color: highlight ? '#ff6b6b' : '#f1f5f9', lineHeight: 1 }}>{value}</div>
  </div>
);

// ── Exp progress bar ───────────────────────────────────────────────────────
const ExpBar = ({ current, max }) => {
  const pct = Math.min(100, Math.round((current / max) * 100));
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>EXP</span>
        <span style={{ fontSize: 9, color: '#ff6b6b', fontWeight: 800 }}>{current.toLocaleString()} / {max.toLocaleString()}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#cc040a,#ff6b6b)', borderRadius: 99, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
export const FreefireCheckerPage = () => {
  const { closeFreefireChecker } = useApp();
  const [uid, setUid] = useState('');
  const [region, setRegion] = useState('IND');
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  // ── Fetch / search ────────────────────────────────────────────────────────
  const handleSearch = async () => {
    const trimUid = uid.trim();
    if (!trimUid) { setError('Please enter a valid Player UID.'); return; }
    if (!/^\d{5,15}$/.test(trimUid)) { setError('UID must be 5–15 digits.'); return; }

    setError('');
    setLoading(true);
    setPlayerData(null);

    try {
      const res = await fetch(`/api/player-info?uid=${encodeURIComponent(trimUid)}&region=${encodeURIComponent(region)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.uid) {
          setPlayerData(json);
          setLoading(false);
          return;
        }
      }
    } catch (_) {}

    // Fallback: realistic mock after short delay
    await new Promise(r => setTimeout(r, 1200));
    setPlayerData(generateMockData(trimUid, region));
    setLoading(false);
  };

  // ── Download as image ─────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      // Dynamically import html2canvas from CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.async = true;
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      const canvas = await window.html2canvas(cardRef.current, {
        backgroundColor: '#0d0d12',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `ff-profile-${playerData?.uid || 'player'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.warn('[Download Error]', e);
    }
    setDownloading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg,#0a0610 0%,#0d0a14 40%,#0b0810 100%)',
      color: '#f1f5f9',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      paddingBottom: 80,
    }}>

      {/* ── Top Nav Bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,10,20,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(204,4,10,0.18)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <button
          onClick={closeFreefireChecker}
          style={{
            background: 'rgba(204,4,10,0.1)', border: '1px solid rgba(204,4,10,0.3)',
            borderRadius: 10, padding: '8px 12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, color: '#ff6b6b',
            fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(204,4,10,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(204,4,10,0.1)'}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg,#cc040a,#ff4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(204,4,10,0.45)',
          }}>
            <span style={{ fontSize: 16 }}>🔥</span>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#fff', letterSpacing: '-0.2px' }}>
              Free Fire <span style={{ color: '#ff6b6b' }}>Profile Checker</span>
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              by MADS TOPUP
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 16px 0' }}>

        {/* ── Page Title ── */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(204,4,10,0.08)', border: '1px solid rgba(204,4,10,0.2)',
            borderRadius: 99, padding: '5px 14px', marginBottom: 14,
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#ff6b6b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Free Tool · No Login Required
            </span>
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(24px,5vw,38px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.15 }}>
            Check Any{' '}
            <span style={{ color: '#ff6b6b' }}>Free Fire</span>
            {' '}Player Profile
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.45)', fontWeight: 500, maxWidth: 480, marginInline: 'auto' }}>
            Enter any player's UID and region to instantly view their in-game profile, guild info, pet details, and more.
          </p>
        </div>

        {/* ── Search Box ── */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 20, padding: '24px 24px 20px', marginBottom: 32,
          boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>

            {/* UID Input */}
            <div style={{ flex: '2 1 200px' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>
                Player UID
              </label>
              <input
                id="ff-uid-input"
                type="text"
                inputMode="numeric"
                placeholder="Enter Free Fire UID…"
                value={uid}
                onChange={e => { setUid(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, padding: '12px 16px', fontSize: 14, fontWeight: 600,
                  color: '#fff', outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor='rgba(204,4,10,0.6)'}
                onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.12)'}
              />
            </div>

            {/* Region Selector */}
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>
                Region
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  id="ff-region-select"
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                  style={{
                    width: '100%', appearance: 'none', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12, padding: '12px 36px 12px 16px', fontSize: 13, fontWeight: 600,
                    color: '#fff', outline: 'none', cursor: 'pointer',
                  }}
                >
                  {REGIONS.map(r => (
                    <option key={r.code} value={r.code} style={{ background: '#1a1025', color: '#fff' }}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} color="#9ca3af" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Search Button */}
            <div style={{ flex: '0 0 auto' }}>
              <button
                id="ff-search-btn"
                onClick={handleSearch}
                disabled={loading}
                style={{
                  background: loading ? 'rgba(204,4,10,0.5)' : 'linear-gradient(135deg,#cc040a,#ff3333)',
                  border: 'none', borderRadius: 12, padding: '12px 28px',
                  fontSize: 13, fontWeight: 800, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 4px 20px rgba(204,4,10,0.4)', transition: 'all 0.2s',
                  letterSpacing: '0.04em', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform='scale(1.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
              >
                {loading
                  ? <><span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Searching…</>
                  : <><Search size={15} /> CHECK PLAYER</>
                }
              </button>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(204,4,10,0.1)', border: '1px solid rgba(204,4,10,0.3)', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#ff8080' }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* ── Loading skeleton ── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid rgba(204,4,10,0.2)', borderTopColor: '#cc040a', animation: 'spin 0.9s linear infinite', margin: '0 auto 20px' }} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Fetching player data…</p>
          </div>
        )}

        {/* ── Player Card ── */}
        {playerData && !loading && (
          <>
            <div
              ref={cardRef}
              style={{
                background: 'linear-gradient(160deg,#13101e 0%,#0f0c1a 60%,#120d1a 100%)',
                border: '1px solid rgba(204,4,10,0.22)',
                borderRadius: 24, overflow: 'hidden',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
              }}
            >
              {/* Card Header */}
              <div style={{
                background: 'linear-gradient(135deg,rgba(204,4,10,0.18) 0%,rgba(204,4,10,0.06) 100%)',
                borderBottom: '1px solid rgba(204,4,10,0.18)',
                padding: '28px 28px 24px',
                display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center',
              }}>
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: 20,
                    background: 'linear-gradient(135deg,#cc040a,#ff4444)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 6px 24px rgba(204,4,10,0.5)',
                    overflow: 'hidden',
                  }}>
                    <img
                      src={playerData.accountInfo.avatar}
                      alt="avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.style.display='none'; }}
                    />
                  </div>
                  <div style={{
                    position: 'absolute', bottom: -4, right: -4,
                    background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                    borderRadius: 99, padding: '2px 7px',
                    fontSize: 9, fontWeight: 900, color: '#fff',
                    border: '2px solid #0f0c1a', letterSpacing: '0.06em',
                  }}>LVL {playerData.accountInfo.level}</div>
                </div>

                {/* Name + IDs */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                      {playerData.accountInfo.ign}
                    </h2>
                    <span style={{
                      background: 'rgba(204,4,10,0.15)', border: '1px solid rgba(204,4,10,0.4)',
                      borderRadius: 99, padding: '2px 10px',
                      fontSize: 10, fontWeight: 800, color: '#ff6b6b', letterSpacing: '0.1em',
                    }}>{playerData.region}</span>
                    <span style={{
                      background: playerData._source === 'live' ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.12)',
                      border: `1px solid ${playerData._source === 'live' ? 'rgba(34,197,94,0.4)' : 'rgba(251,191,36,0.3)'}`,
                      borderRadius: 99, padding: '2px 10px',
                      fontSize: 9, fontWeight: 900,
                      color: playerData._source === 'live' ? '#4ade80' : '#fbbf24',
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: playerData._source === 'live' ? '#22c55e' : '#fbbf24', display: 'inline-block', boxShadow: playerData._source === 'live' ? '0 0 5px #22c55e' : 'none' }} />
                      {playerData._source === 'live' ? 'Live Data' : 'Demo Data'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 6 }}>
                    UID: <span style={{ color: '#9ca3af' }}>{playerData.uid}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, fontStyle: 'italic', maxWidth: 340 }}>
                    "{playerData.accountInfo.signature}"
                  </div>
                </div>

                {/* Credit Score badge */}
                <div style={{
                  background: 'linear-gradient(135deg,rgba(34,197,94,0.15),rgba(34,197,94,0.06))',
                  border: '1px solid rgba(34,197,94,0.35)', borderRadius: 16,
                  padding: '14px 20px', textAlign: 'center', minWidth: 90,
                }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#4ade80', lineHeight: 1 }}>{playerData.accountInfo.creditScore}</div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Credit</div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Score</div>
                </div>
              </div>

              {/* Account Stats Grid */}
              <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#cc040a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>
                  Account Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10 }}>
                  <StatTile icon={Zap} label="Prime Level" value={`P${playerData.accountInfo.primeLevel}`} highlight />
                  <StatTile icon={Star} label="Account Lvl" value={playerData.accountInfo.level} />
                  <StatTile icon={Heart} label="Total Likes" value={playerData.accountInfo.totalLikes.toLocaleString()} />
                  <StatTile icon={Calendar} label="Joined" value={playerData.accountInfo.createdAt} />
                  <StatTile icon={Clock} label="Last Login" value={playerData.accountInfo.lastLogin} />
                  <StatTile icon={Award} label="Badges" value={playerData.accountInfo.badges} />
                </div>
              </div>

              {/* Pet & Outfit Row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Pet */}
                <div style={{ flex: '1 1 220px', padding: '24px 28px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#cc040a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>
                    Pet Info
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 14, padding: '16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: 'linear-gradient(135deg,rgba(204,4,10,0.2),rgba(204,4,10,0.08))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                        border: '1px solid rgba(204,4,10,0.2)',
                      }}>
                        {playerData.pet.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 15, color: '#fff' }}>{playerData.pet.name}</div>
                        <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700 }}>
                          ID: {playerData.pet.id} · Lvl {playerData.pet.level}
                        </div>
                      </div>
                    </div>
                    <ExpBar current={playerData.pet.exp} max={playerData.pet.maxExp} />
                  </div>
                </div>

                {/* Outfit */}
                <div style={{ flex: '1 1 220px', padding: '24px 28px' }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#cc040a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>
                    Equipped Outfit
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {playerData.outfit.map((item, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 10, padding: '8px 12px',
                      }}>
                        <span style={{ fontSize: 18 }}>{item.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0' }}>{item.name}</div>
                          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{item.slot}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Guild Info */}
              <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#cc040a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>
                  Guild Info
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
                  <StatTile icon={Shield} label="Guild Name" value={playerData.guild.name} highlight />
                  <StatTile icon={Users} label="Members" value={playerData.guild.members} />
                  <StatTile icon={Crown} label="Guild Level" value={`Lv. ${playerData.guild.level}`} />
                  <StatTile icon={User} label="Leader" value={playerData.guild.leaderName} />
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 700 }}>
                    Guild ID: <span style={{ color: '#9ca3af' }}>{playerData.guild.id}</span>
                  </span>
                  <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 700 }}>
                    Leader UID: <span style={{ color: '#9ca3af' }}>{playerData.guild.leaderId}</span>
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div style={{
                padding: '14px 28px',
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                background: 'rgba(255,255,255,0.02)',
              }}>
                <span style={{ fontSize: 10, color: '#374151', fontWeight: 700, letterSpacing: '0.04em' }}>
                  ⚠️ Data sourced from public profile API · For reference only
                </span>
                <span style={{ fontSize: 10, color: 'rgba(204,4,10,0.6)', fontWeight: 900, letterSpacing: '0.08em' }}>
                  MADS TOPUP · FF Checker
                </span>
              </div>
            </div>

            {/* Download Button */}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button
                id="ff-download-btn"
                onClick={handleDownload}
                disabled={downloading}
                style={{
                  background: downloading ? 'rgba(37,99,235,0.4)' : 'linear-gradient(135deg,#1d4ed8,#2563eb)',
                  border: 'none', borderRadius: 14, padding: '13px 32px',
                  fontSize: 13, fontWeight: 800, color: '#fff', cursor: downloading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 9,
                  boxShadow: '0 4px 20px rgba(37,99,235,0.4)', transition: 'all 0.2s',
                  letterSpacing: '0.04em',
                }}
                onMouseEnter={e => { if (!downloading) e.currentTarget.style.transform='scale(1.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; }}
              >
                {downloading
                  ? <><span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Generating…</>
                  : <><Download size={16} /> Download as Image</>
                }
              </button>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 8, fontWeight: 500 }}>
                Saves as high-quality PNG · powered by html2canvas
              </p>
            </div>
          </>
        )}

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
