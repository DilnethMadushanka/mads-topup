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
 * Perform Free Live IGN Lookup & RapidAPI Support
 */
export const lookupFreePlayerIgn = async (gameId, playerId, zoneId = '') => {
  const cleanId = String(playerId).trim();
  if (!cleanId) return null;

  // 1. Check local & Firebase memory cache first (100% Free)
  const cached = getCachedIgn(cleanId);
  if (cached) {
    return { success: true, ign: cached, isReal: true, source: 'CACHE' };
  }

  // 2. Try RapidAPI if key is configured in .env
  const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY;
  if (rapidApiKey) {
    try {
      // Endpoint 1: Check ID Game (Free Fire)
      const isFreeFire = gameId?.toLowerCase().includes('freefire') || gameId?.toLowerCase().includes('ff');
      if (isFreeFire) {
        const res = await fetch(`https://check-id-game.p.rapidapi.com/api/rapid_api/ff_idgame/${cleanId}`, {
          headers: {
            'x-rapidapi-host': 'check-id-game.p.rapidapi.com',
            'x-rapidapi-key': rapidApiKey,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const data = await res.json();
          const realName = data.username || data.nickname || data.name || data.data?.username || data.result?.username;
          if (realName) {
            saveCachedIgn(cleanId, realName);
            return { success: true, ign: realName, isReal: true, source: 'RAPID_API' };
          }
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
