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
// Set when the user logged in with "Remember me" off: the token then lives in
// sessionStorage and the login ends when the browser is closed.
const SESSION_ONLY_FLAG = 'mads_session_only';

export const setSessionToken = (token, remember = true) => {
  if (!token) return;
  try {
    if (remember) {
      localStorage.setItem(SESSION_KEY, token);
      localStorage.removeItem(SESSION_ONLY_FLAG);
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, token);
      localStorage.setItem(SESSION_ONLY_FLAG, '1');
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (_) {}
};

export const getSessionToken = () => {
  try { return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || null; } catch (_) { return null; }
};

export const clearSessionToken = () => {
  try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
  try { localStorage.removeItem(SESSION_ONLY_FLAG); } catch (_) {}
};

// A "Remember me"-off login whose browser has since been closed: the
// sessionStorage token is gone, so the saved profile is logged out too.
export const endExpiredSessionOnlyLogin = () => {
  try {
    if (localStorage.getItem(SESSION_ONLY_FLAG) && !sessionStorage.getItem(SESSION_KEY)) {
      localStorage.removeItem(SESSION_ONLY_FLAG);
      localStorage.removeItem('mads_user_profile');
    }
  } catch (_) {}
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

// Same as getUserAuthToken, but for background reads: uses the cached ID
// token and never logs the user out when there is no token.
export const getQuietAuthToken = async () => {
  try {
    const { auth } = await import('./firebaseAuth.js');
    if (auth && auth.currentUser) return await auth.currentUser.getIdToken();
  } catch (_) {}
  return getSessionToken();
};

// GET one of our own server endpoints (same fallback as postServerApi).
// The admin session cookie is sent along on same-origin requests.
export const getServerApi = async (path, token) => {
  const endpoints = [path, `https://madstopup.com${path}`];
  let last = { ok: false, status: 0, data: { error: 'Server unreachable. Please try again.' } };
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        credentials: 'same-origin',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
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

// Runs load() now and then every intervalMs while the tab is visible (and
// again as soon as it becomes visible). Replaces the old live database
// listeners for data that now comes from the server. Returns a stop function.
export const pollServer = (load, intervalMs = 15000) => {
  let stopped = false;
  let running = false;
  const tick = async () => {
    if (stopped || running) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    running = true;
    try { await load(); } catch (_) {} finally { running = false; }
  };
  tick();
  const timer = setInterval(tick, intervalMs);
  const onVisible = () => { if (typeof document !== 'undefined' && !document.hidden) tick(); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
  return () => {
    stopped = true;
    clearInterval(timer);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
  };
};
