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

// Signed session from /api/auth/login, for username/password and reseller
// logins (Google logins use their Firebase ID token instead).
const SESSION_KEY = 'mads_session_token';

export const setSessionToken = (token) => {
  try { if (token) localStorage.setItem(SESSION_KEY, token); } catch (_) {}
};

export const getSessionToken = () => {
  try { return localStorage.getItem(SESSION_KEY) || null; } catch (_) { return null; }
};

export const clearSessionToken = () => {
  try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
};

// Asks AppContext to log the user out and ask them to log in again (their
// login predates signed sessions, or the session expired).
export const notifySessionExpired = () => {
  try { window.dispatchEvent(new Event('mads:session-expired')); } catch (_) {}
};

// Auth token for customer-facing server calls: a Firebase ID token for
// Google sign-ins, otherwise the signed session from a password login.
export const getUserAuthToken = async () => {
  const { auth } = await import('./firebaseAuth.js');
  if (auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken(true);
    } catch (e) {
      console.warn('Could not retrieve Auth ID Token:', e.message);
    }
  }
  const session = getSessionToken();
  if (session) return session;
  notifySessionExpired();
  return null;
};
