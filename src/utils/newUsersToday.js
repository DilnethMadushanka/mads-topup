// "Today's new registrations" for the admin overview. The store runs on Sri
// Lanka time, so "today" is the Asia/Colombo calendar day whatever time zone
// the admin's phone or laptop is set to.

const SL_TZ = 'Asia/Colombo';

// The account's sign-up time in ms, or null. Firestore Timestamps
// ({ seconds }) and ISO strings are both accepted.
export const signupTime = (u) => {
  const v = u?.createdAt;
  if (v === undefined || v === null || v === '') return null;
  const t = typeof v === 'object' && typeof v.seconds === 'number' ? v.seconds * 1000
    : typeof v === 'object' && typeof v.toDate === 'function' ? v.toDate().getTime()
    : new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
};

// "YYYY-MM-DD" in Sri Lanka time.
export const sriLankaDay = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: SL_TZ });

export const sriLankaTime = (t) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: SL_TZ });

// Accounts created today (Sri Lanka time), newest first. One person with two
// records under the same email (an old Google + email sign-up) counts once,
// as their first record of the day.
export function newUsersToday(users, now = Date.now()) {
  const today = sriLankaDay(now);
  const byPerson = new Map();
  for (const u of users || []) {
    if (!u || typeof u !== 'object') continue;
    const t = signupTime(u);
    if (t === null || t > now + 5 * 60 * 1000 || sriLankaDay(t) !== today) continue;
    const key = String(u.email || '').trim().toLowerCase() || `uid:${u.uid}`;
    const seen = byPerson.get(key);
    if (!seen || t < seen.t) byPerson.set(key, { u, t });
  }
  return [...byPerson.values()].sort((a, b) => b.t - a.t).map(({ u }) => u);
}
