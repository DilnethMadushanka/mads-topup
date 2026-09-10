// Free Player IGN Lookup & Memory Cache Service
// Caches verified Player ID -> Real In-Game Name mappings 100% FREE in LocalStorage & Firebase

const IGN_CACHE_KEY = 'mads_verified_ign_cache';

export const getCachedIgn = (playerId) => {
  if (!playerId) return null;
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
  if (!playerId || !ignName) return;
  try {
    const raw = localStorage.getItem(IGN_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[playerId.trim()] = ignName.trim();
    localStorage.setItem(IGN_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {}
};

/**
 * Perform Live IGN Lookup & RapidAPI Support for All Games
 */
export const lookupFreePlayerIgn = async (gameId = '', playerId = '', zoneId = '') => {
  const cleanId = String(playerId).trim();
  if (!cleanId) return null;

  // 1. Check local & Firebase memory cache first (100% Free)
  const cached = getCachedIgn(cleanId);
  if (cached) {
    return { success: true, ign: cached, isReal: true, source: 'CACHE' };
  }

  const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY || '59700d286cmsh2ce0c96f798ab10p15ad77jsnb92bdbb87d29';
  const gKey = String(gameId).toLowerCase();

  // Determine RapidAPI path for the specific game
  let apiPath = '';
  if (gKey.includes('freefire') || gKey.includes('ff')) {
    apiPath = `ff-global/${cleanId}`;
  } else if (gKey.includes('pubg')) {
    apiPath = `pubgm-global/${cleanId}`;
  } else if (gKey.includes('mobilelegend') || gKey.includes('mlbb') || gKey.includes('ml')) {
    apiPath = `mobile-legends/${cleanId}/${zoneId || ''}`;
  } else if (gKey.includes('blood')) {
    apiPath = `blood-strike/${cleanId}`;
  } else if (gKey.includes('honor') || gKey.includes('hok')) {
    apiPath = `honor-of-kings/${cleanId}`;
  }

  // 2. Query RapidAPI if path matches
  if (rapidApiKey && apiPath) {
    try {
      const res = await fetch(`https://id-game-checker.p.rapidapi.com/${apiPath}`, {
        headers: {
          'x-rapidapi-host': 'id-game-checker.p.rapidapi.com',
          'x-rapidapi-key': rapidApiKey,
          'Content-Type': 'application/json'
        }
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

  // 3. Query open community lookup endpoints
  try {
    const isFreeFire = gameId?.toLowerCase().includes('freefire') || gameId?.toLowerCase().includes('ff');
    if (isFreeFire) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(`https://ff-api-cyan.vercel.app/api/info?uid=${cleanId}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const realName = data.nickname || data.name || data.username || data.player_name;
        if (realName) {
          saveCachedIgn(cleanId, realName);
          return { success: true, ign: realName, isReal: true, source: 'COMMUNITY_API' };
        }
      }
    }
  } catch (err) {
    // Silent fail over to clean fallback
  }

  return null;
};
