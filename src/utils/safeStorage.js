// Browser storage can be full (big cached lists) or have no room at all
// (some private tabs). A plain setItem then throws "The quota has been
// exceeded", and inside a React effect that blanks the whole screen.
// Make every setItem safe: on a full store, drop the rebuildable caches
// (the server/Firebase copy is the real one) and try once more; if it still
// doesn't fit, skip the write instead of crashing.
const CACHE_KEYS = [
  'mads_users_list', 'mads_orders', 'mads_manual_payments', 'mads_support_tickets',
  'mads_reseller_applications', 'mads_user_reviews', 'mads_verified_ign_cache',
];

const isQuotaError = (e) => e && (
  e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
  e.code === 22 || e.code === 1014 || /quota/i.test(String(e.message || ''))
);

if (typeof window !== 'undefined' && window.Storage && !window.Storage.prototype.__madsSafe) {
  const original = window.Storage.prototype.setItem;
  window.Storage.prototype.setItem = function safeSetItem(key, value) {
    try {
      return original.call(this, key, value);
    } catch (e) {
      if (!isQuotaError(e)) throw e;
      for (const k of CACHE_KEYS) {
        if (k !== key) { try { this.removeItem(k); } catch (_) {} }
      }
      try {
        return original.call(this, key, value);
      } catch (e2) {
        console.warn(`[Storage] No room to save "${key}", skipped.`);
        return undefined;
      }
    }
  };
  window.Storage.prototype.__madsSafe = true;
}
