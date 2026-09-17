// Free Player IGN Lookup & Memory Cache Service
// Caches verified Player ID -> Real In-Game Name mappings 100% FREE in LocalStorage & Firebase

const IGN_CACHE_KEY = 'mads_verified_ign_cache';

export const getCachedIgn = (playerId) => {
  if (!playerId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(IGN_CACHE_KEY);
    if (raw) {
      const cache = JSON.parse(raw);
      return cache[playerId.trim()] || null;
    }
  } catch (e) {}
  return null;
};

export const saveCachedIgn = (playerId, ignName) => {
  if (!playerId || !ignName || typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(IGN_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[playerId.trim()] = ignName.trim();
    localStorage.setItem(IGN_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {}
};

/**
 * Perform Live IGN Lookup & RapidAPI / SmileOne Support for MLBB and All Games
 */
export const lookupFreePlayerIgn = async (gameId = '', playerId = '', zoneId = '') => {
  const cleanId = String(playerId).trim();
  const cleanZone = String(zoneId).trim();
  if (!cleanId) return null;

  // 1. Check local & memory cache first (100% Free)
  const cached = getCachedIgn(cleanId);
  if (cached) {
    return { success: true, ign: cached, isReal: true, source: 'CACHE' };
  }

  const gKey = String(gameId).toLowerCase();

  // 2. Mobile Legends (MLBB) Real Username Lookup via SmileOne API Engine
  if (gKey.includes('mobilelegend') || gKey.includes('mlbb') || gKey.includes('ml')) {

    // Primary: Server-side proxy (avoids CORS) → /api/mlbb-ign
    try {
      const proxyRes = await fetch('/api/mlbb-ign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: cleanId, zone_id: cleanZone }),
        signal: AbortSignal.timeout(8000)
      });

      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data.success && data.ign && String(data.ign).trim()) {
          const finalIgn = String(data.ign).trim();
          saveCachedIgn(cleanId, finalIgn);
          return { success: true, ign: finalIgn, isReal: true, source: data.source || 'MLBB_PROXY' };
        }
        // If proxy returned a clear failure (bad ID/zone), stop here
        if (!data.success && data.error) {
          return null;
        }
      }
    } catch (e) {
      console.warn('MLBB IGN proxy note:', e.message);
    }

    // Fallback: Direct SmileOne Gateway (may be blocked by browser CORS)
    try {
      const params = new URLSearchParams();
      params.append('user_id', cleanId);
      params.append('zone_id', cleanZone);
      params.append('pid', '13');
      params.append('checkrole', '1');

      const res = await fetch('https://www.smile.one/merchant/mobilelegends/checkrole', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: params.toString(),
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.code === 200 || data.code === '200' || data.username || data.username_decode) {
          const rawName = data.username_decode || data.username || data.role_name || data.nickname || data.name;
          let realName = rawName;
          try { realName = decodeURIComponent(rawName); } catch(e) {}
          if (realName && String(realName).trim()) {
            const finalIgn = String(realName).trim();
            saveCachedIgn(cleanId, finalIgn);
            return { success: true, ign: finalIgn, isReal: true, source: 'SMILEONE_API', data };
          }
        }
      }
    } catch (e) {
      console.warn('SmileOne MLBB lookup note:', e.message);
    }

    // Fallback: SmileOne BR Gateway
    try {
      const params = new URLSearchParams();
      params.append('user_id', cleanId);
      params.append('zone_id', cleanZone);
      params.append('pid', '13');
      params.append('checkrole', '1');

      const res = await fetch('https://www.smile.one/br/merchant/mobilelegends/checkrole', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: params.toString(),
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.code === 200 || data.code === '200' || data.username || data.username_decode) {
          const rawName = data.username_decode || data.username || data.role_name || data.nickname || data.name;
          let realName = rawName;
          try { realName = decodeURIComponent(rawName); } catch(e) {}
          if (realName && String(realName).trim()) {
            const finalIgn = String(realName).trim();
            saveCachedIgn(cleanId, finalIgn);
            return { success: true, ign: finalIgn, isReal: true, source: 'SMILEONE_BR_API', data };
          }
        }
      }
    } catch (e) {
      console.warn('SmileOne BR lookup note:', e.message);
    }
  }


  // 3. Free Fire Community & Multi-Gateway API
  if (gKey.includes('freefire') || gKey.includes('ff')) {
    const ffEndpoints = [
      `https://ff-api-cyan.vercel.app/api/info?uid=${cleanId}`,
      `https://free-fire-api-seven.vercel.app/api/info?uid=${cleanId}`,
      `https://region-info-freefire.vercel.app/api/info?uid=${cleanId}`,
      `https://api.vytis.id.vn/ff/info?uid=${cleanId}`
    ];

    for (const endpoint of ffEndpoints) {
      try {
        const res = await fetch(endpoint, { signal: AbortSignal.timeout(2500) });
        if (res.ok) {
          const data = await res.json();
          const realName = data.nickname || data.name || data.username || data.player_name || data.data?.nickname;
          if (realName && String(realName).trim()) {
            const finalIgn = String(realName).trim();
            saveCachedIgn(cleanId, finalIgn);
            return { success: true, ign: finalIgn, isReal: true, source: 'FF_COMMUNITY_API' };
          }
        }
      } catch (err) {}
    }
  }

  // 4. RapidAPI Lookup for All Games
  const rapidApiKey = (typeof process !== 'undefined' && process.env?.VITE_RAPIDAPI_KEY) || 
                      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RAPIDAPI_KEY) || 
                      '59700d286cmsh2ce0c96f798ab10p15ad77jsnb92bdbb87d29';

  let apiPath = '';
  if (gKey.includes('freefire') || gKey.includes('ff')) {
    apiPath = `ff-global/${cleanId}`;
  } else if (gKey.includes('pubg')) {
    apiPath = `pubgm-global/${cleanId}`;
  } else if (gKey.includes('mobilelegend') || gKey.includes('mlbb') || gKey.includes('ml')) {
    apiPath = `mobile-legends/${cleanId}/${cleanZone || ''}`;
  } else if (gKey.includes('blood')) {
    apiPath = `blood-strike/${cleanId}`;
  } else if (gKey.includes('honor') || gKey.includes('hok')) {
    apiPath = `honor-of-kings/${cleanId}`;
  }

  if (rapidApiKey && apiPath) {
    try {
      const res = await fetch(`https://id-game-checker.p.rapidapi.com/${apiPath}`, {
        headers: {
          'x-rapidapi-host': 'id-game-checker.p.rapidapi.com',
          'x-rapidapi-key': rapidApiKey,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const data = await res.json();
        const realName = data.data?.username || data.username || data.nickname || data.name || data.result?.username;
        if (realName) {
          saveCachedIgn(cleanId, realName);
          return { success: true, ign: realName, isReal: true, source: 'RAPID_API', data };
        }
      }
    } catch (e) {
      console.warn('RapidAPI lookup warning:', e);
    }
  }

  return null;
};
