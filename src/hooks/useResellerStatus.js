import { useEffect, useState } from 'react';
import { postServerApi, getUserAuthToken } from '../services/serverApi';

// The signed-in user's reseller tier and sales (approved resellers) or their
// verified deposit towards joining (everyone else), from the server, which
// is what charges the tier price. One request per page load per account.
let cached = { uid: null, promise: null };

export const refreshResellerStatus = () => { cached = { uid: null, promise: null }; };

export function useResellerStatus(userProfile) {
  const uid = userProfile?.uid || null;
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!uid) { setStatus(null); return undefined; }
    let alive = true;
    if (cached.uid !== uid || !cached.promise) {
      cached = {
        uid,
        promise: (async () => {
          const token = await getUserAuthToken();
          if (!token) return null;
          const { ok, data } = await postServerApi('/api/reseller/status', {}, token);
          return ok ? data : null;
        })().catch(() => null),
      };
    }
    cached.promise.then((data) => { if (alive) setStatus(data); });
    return () => { alive = false; };
  }, [uid]);

  return status;
}

// The discount rate to show and charge. 0 until the server has answered, so
// the site never quotes a price the server would refuse.
export const resellerRateOf = (status) => (status?.approved ? Number(status.tier?.rate) || 0 : 0);
