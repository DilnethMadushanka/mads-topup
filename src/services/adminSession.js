/**
 * adminSession.js — Secure in-memory admin session token manager.
 *
 * Replaces localStorage for admin token storage. The token lives in a
 * module-level JS variable (not reachable by XSS-injected scripts) with
 * sessionStorage as a tab-reload backup.
 *
 * sessionStorage is scoped to a single browser tab and is automatically
 * cleared when the tab closes — far safer than localStorage which persists
 * indefinitely across every tab and browser restart.
 *
 * No server changes needed — the token is still sent as
 * "Authorization: Bearer <token>" in API request headers, exactly as before.
 */

const _S_KEY = 'mads_adm_s';  // sessionStorage token key  (obfuscated)
const _E_KEY = 'mads_adm_e';  // sessionStorage expiry key

// Primary in-memory store — module-level variables are NOT accessible to
// injected scripts via window.*, document.*, or localStorage.
let _token = null;
let _expiresAt = null;

// Initialise from sessionStorage on module load (survives F5 / reload)
try {
  const t = sessionStorage.getItem(_S_KEY);
  const e = sessionStorage.getItem(_E_KEY);
  if (t && e && Date.now() < Number(e)) {
    _token = t;
    _expiresAt = Number(e);
  }
} catch (_) {}

/**
 * Persist the admin token returned by /api/admin/login.
 * @param {string} token     - cryptographic Bearer token from server
 * @param {number} expiresAt - Unix ms timestamp of token expiry
 */
export function saveAdminToken(token, expiresAt) {
  _token = token;
  _expiresAt = Number(expiresAt) || 0;
  try {
    sessionStorage.setItem(_S_KEY, token);
    sessionStorage.setItem(_E_KEY, String(_expiresAt));
  } catch (_) {}
  // Remove any legacy localStorage entries left over from the old approach
  try {
    localStorage.removeItem('mads_admin_session_token');
    localStorage.removeItem('mads_admin_session_expires');
  } catch (_) {}
}

/**
 * Return the current valid admin token, or null if expired / not set.
 */
export function getAdminToken() {
  // 1. In-memory check
  if (_token && _expiresAt && Date.now() < _expiresAt) return _token;
  // 2. sessionStorage fallback (e.g. after a hard reload)
  try {
    const t = sessionStorage.getItem(_S_KEY);
    const e = sessionStorage.getItem(_E_KEY);
    if (t && e && Date.now() < Number(e)) {
      _token = t;
      _expiresAt = Number(e);
      return _token;
    }
  } catch (_) {}
  // 3. Legacy localStorage migration path (one-time, then cleared)
  try {
    const t = localStorage.getItem('mads_admin_session_token');
    const e = localStorage.getItem('mads_admin_session_expires');
    if (t && e && Date.now() < Number(e)) {
      saveAdminToken(t, Number(e));
      return _token;
    }
  } catch (_) {}
  return null;
}

/**
 * Wipe the admin token from all stores (call on logout or expiry).
 */
export function clearAdminToken() {
  _token = null;
  _expiresAt = null;
  try { sessionStorage.removeItem(_S_KEY); } catch (_) {}
  try { sessionStorage.removeItem(_E_KEY); } catch (_) {}
  try {
    localStorage.removeItem('mads_admin_session_token');
    localStorage.removeItem('mads_admin_session_expires');
  } catch (_) {}
}

/**
 * Quick validity check without exposing the raw token string.
 */
export function isAdminTokenValid() {
  return !!getAdminToken();
}
