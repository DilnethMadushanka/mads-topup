// In-memory stand-in for the Realtime Database REST API, so the server's
// wallet code can be tested without touching the real database. Supports
// GET (with ETag), PUT (with if-match) and PATCH, like rtdbAdmin.js uses.
process.env.FIREBASE_DATABASE_URL = 'https://fake-rtdb.test';
process.env.FIREBASE_DB_SECRET = 'test-secret';

export function installFakeRtdb(initial = {}) {
  const state = { data: structuredClone(initial), writes: 0, beforePut: null };
  const at = (segments) => segments.reduce((n, k) => (n == null ? undefined : n[k]), state.data);
  const setAt = (segments, value) => {
    if (!segments.length) { state.data = value; return; }
    let node = state.data;
    for (const k of segments.slice(0, -1)) node = node[k] ??= {};
    if (value === null) delete node[segments.at(-1)];
    else node[segments.at(-1)] = value;
  };
  const etagOf = (v) => JSON.stringify(v ?? null);

  globalThis.fetch = async (url, opts = {}) => {
    const u = new URL(url);
    const segments = decodeURIComponent(u.pathname.replace(/\.json$/, '')).split('/').filter(Boolean);
    const method = opts.method || 'GET';
    const headers = Object.fromEntries(Object.entries(opts.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const reply = (status, body, extra = {}) => new Response(JSON.stringify(body ?? null), { status, headers: { 'content-type': 'application/json', ...extra } });

    if (method === 'GET') return reply(200, at(segments) ?? null, { etag: etagOf(at(segments)) });
    if (method === 'PUT') {
      if (state.beforePut) { const hook = state.beforePut; state.beforePut = null; hook(); }
      if (headers['if-match'] && headers['if-match'] !== etagOf(at(segments))) return reply(412, { error: 'etag mismatch' });
      setAt(segments, JSON.parse(opts.body));
      state.writes++;
      return reply(200, at(segments));
    }
    if (method === 'PATCH') {
      setAt(segments, { ...(at(segments) || {}), ...JSON.parse(opts.body) });
      state.writes++;
      return reply(200, at(segments));
    }
    return reply(405, { error: 'unsupported' });
  };
  return state;
}
