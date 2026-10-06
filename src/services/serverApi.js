// POST to one of our own server endpoints. Tries the same-origin path first
// and falls back to the production host (e.g. when running the Vite dev
// server, which has no /api routes). Returns { ok, status, data }.
export const postServerApi = async (path, body, token) => {
  const endpoints = [path, `https://madstopup.com${path}`];
  let last = { ok: false, status: 0, data: { error: 'Server unreachable. Please try again.' } };
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body || {})
      });
      // A non-JSON reply means this host has no such API route (e.g. the
      // Vite dev server answering with index.html) — try the next host.
      if (!(res.headers.get('content-type') || '').includes('application/json')) continue;
      const data = await res.json().catch(() => ({}));
      last = { ok: res.ok, status: res.status, data };
      return last;
    } catch (_) {
      // network error — try the next endpoint
    }
  }
  return last;
};

// Auth token for customer-facing server calls: a Firebase ID token for
// Google sign-ins, otherwise the legacy WEB_SESSION token used by
// username/password and reseller logins (same scheme as moongoldApi.js).
export const getUserAuthToken = async (userProfile) => {
  const { auth } = await import('./firebaseAuth.js');
  if (auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken(true);
    } catch (e) {
      console.warn('Could not retrieve Auth ID Token:', e.message);
    }
  }
  const uid = userProfile?.uid || auth?.currentUser?.uid || '';
  const email = userProfile?.email || auth?.currentUser?.email || '';
  if (uid || email) return `WEB_SESSION:${uid || email}|${email}`;
  return null;
};
