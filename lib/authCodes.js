// Signup and password-reset codes. They used to live in server memory, so
// every restart (each deploy) threw away the codes people were waiting for.
// They are now kept in the database under authCodes/{kind}/{emailHash}:
// only a hash of the code, never the code or the email itself.

import crypto from 'crypto';

export const CODE_TTL_MS = 15 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const MAX_SENDS = 3;

export const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');
export const emailKey = (email) => crypto.createHash('sha256').update(String(email || '').trim().toLowerCase()).digest('hex').slice(0, 40);

// A new code for this email, or { error }. A new code keeps the wrong-guess
// count of the last live one, and each email gets at most MAX_SENDS codes
// per window, so asking again never gives more guesses.
export function nextCode(prev, now = Date.now(), { minGapMs = 0 } = {}) {
  const live = prev && now < prev.expires;
  if (live && minGapMs && now - (prev.sentAt || 0) < minGapMs) return { error: 'wait' };
  if (live && (prev.sends || 1) >= MAX_SENDS) return { error: 'too_many' };
  const code = String(crypto.randomInt(100000, 1000000));
  return {
    code,
    entry: {
      hash: hashCode(code),
      expires: live ? prev.expires : now + CODE_TTL_MS,
      attempts: live ? prev.attempts || 0 : 0,
      sends: live ? (prev.sends || 1) + 1 : 1,
      sentAt: now,
    },
  };
}

// Checks a code. result: 'ok' | 'wrong' | 'expired'. next: the record to
// keep (null removes it; undefined leaves it as it is).
export function checkCode(entry, code, now = Date.now()) {
  if (!entry || typeof entry !== 'object' || !entry.hash) return { result: 'expired', next: undefined };
  if (now > entry.expires) return { result: 'expired', next: null };
  // A used-up record stays until it expires, so a new code can't reset the count.
  if ((entry.attempts || 0) >= MAX_ATTEMPTS) return { result: 'expired', next: undefined };
  const a = Buffer.from(hashCode(String(code || '').trim()));
  const b = Buffer.from(String(entry.hash));
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return { result: 'ok', next: null };
  return { result: 'wrong', next: { ...entry, attempts: (entry.attempts || 0) + 1 } };
}

// Database-backed store. Falls back to memory if the database can't be
// reached, so codes still work (until a restart) during an outage.
export function codeStore(kind, { rtdbGet, rtdbPut, rtdbTransaction }) {
  const memory = new Map();
  const path = (email) => `authCodes/${kind}/${emailKey(email)}`;
  return {
    async get(email) {
      try { return (await rtdbGet(path(email))) || null; } catch (e) {
        console.warn(`[authCodes] read failed, using memory: ${e.message}`);
        return memory.get(emailKey(email)) || null;
      }
    },
    async set(email, entry) {
      memory.set(emailKey(email), entry);
      try { await rtdbPut(path(email), entry); } catch (e) { console.warn(`[authCodes] write failed, kept in memory: ${e.message}`); }
    },
    async remove(email) {
      memory.delete(emailKey(email));
      try { await rtdbPut(path(email), null); } catch (_) { /* expires anyway */ }
    },
    // Checks a code with compare-and-set, so parallel guesses each count.
    async check(email, code) {
      let outcome = { result: 'expired' };
      try {
        await rtdbTransaction(path(email), (cur) => {
          outcome = checkCode(cur, code);
          return outcome.next;
        });
      } catch (e) {
        console.warn(`[authCodes] check via memory: ${e.message}`);
        outcome = checkCode(memory.get(emailKey(email)), code);
      }
      if (outcome.next === null) memory.delete(emailKey(email));
      else if (outcome.next) memory.set(emailKey(email), outcome.next);
      return outcome.result;
    },
  };
}
