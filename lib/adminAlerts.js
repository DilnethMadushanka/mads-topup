// Alerts for the shop owner: new deposits, failed orders, a low MooGold
// balance, new reseller applications and new support tickets. Sent to
// Telegram (through the shop's bot) and, for the important ones, by email.
//
// .env (all optional except a chat id or an email):
//   ADMIN_ALERT_TELEGRAM_CHAT_ID  your Telegram user id (or several, comma separated)
//   ADMIN_ALERT_BOT_TOKEN         defaults to TELEGRAM_BOT_TOKEN
//   ADMIN_ALERT_EMAIL             defaults to ADMIN_EMAIL
//   ADMIN_ALERT_EMAIL_TYPES       defaults to failed_order,low_balance,reseller
//   ADMIN_ALERT_LOW_BALANCE_USD   defaults to 20
//   ADMIN_ALERTS=off              turns everything off

export const ALERT_TYPES = {
  deposit: { icon: '💰', label: 'New deposit' },
  failed_order: { icon: '❌', label: 'Order failed' },
  low_balance: { icon: '⚠️', label: 'MooGold balance low' },
  reseller: { icon: '🤝', label: 'New reseller application' },
  ticket: { icon: '🎫', label: 'New support ticket' },
  test: { icon: '✅', label: 'Test alert' },
};

const split = (v) => String(v || '').split(',').map(s => s.trim()).filter(Boolean);

export function alertConfig(env = {}) {
  return {
    off: String(env.ADMIN_ALERTS || '').toLowerCase() === 'off',
    botToken: String(env.ADMIN_ALERT_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || '').trim(),
    chatIds: split(env.ADMIN_ALERT_TELEGRAM_CHAT_ID),
    emails: split(env.ADMIN_ALERT_EMAIL ?? env.ADMIN_EMAIL),
    emailTypes: new Set(split(env.ADMIN_ALERT_EMAIL_TYPES || 'failed_order,low_balance,reseller,test')),
    lowBalanceUsd: Number(env.ADMIN_ALERT_LOW_BALANCE_USD) > 0 ? Number(env.ADMIN_ALERT_LOW_BALANCE_USD) : 20,
  };
}

export const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Message text: a bold title line, then "label: value" lines.
export function formatAlert(type, { title, lines = [] }) {
  const t = ALERT_TYPES[type] || { icon: '🔔', label: 'Alert' };
  const rows = lines.filter(l => l && l[1] !== undefined && l[1] !== null && l[1] !== '');
  return {
    subject: `${t.icon} ${t.label}${title ? `: ${title}` : ''}`,
    html: `<b>${t.icon} ${escapeHtml(t.label)}</b>${title ? `\n${escapeHtml(title)}` : ''}${rows.length ? '\n\n' : ''}${rows.map(([k, v]) => `<b>${escapeHtml(k)}:</b> ${escapeHtml(v)}`).join('\n')}`,
    text: `${t.icon} ${t.label}${title ? `\n${title}` : ''}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}`,
  };
}

// send(type, { title, lines, key, throttleMs }) — a key with throttleMs is
// sent at most once in that time (e.g. low balance every 6 hours).
export function createAlerter({ config, fetchFn = fetch, sendMail = null, now = () => Date.now(), log = console }) {
  const last = new Map();
  const ready = () => !config.off && ((config.botToken && config.chatIds.length) || (sendMail && config.emails.length));

  async function send(type, { title = '', lines = [], key = '', throttleMs = 0 } = {}) {
    if (!ready()) return { sent: false, reason: config.off ? 'off' : 'not set up' };
    if (key && throttleMs) {
      const prev = last.get(key);
      if (prev && now() - prev < throttleMs) return { sent: false, reason: 'throttled' };
      last.set(key, now());
    }
    const msg = formatAlert(type, { title, lines });
    const out = { sent: false, telegram: 0, email: 0, errors: [] };
    if (config.botToken) {
      for (const chatId of config.chatIds) {
        try {
          const res = await fetchFn(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: msg.html, parse_mode: 'HTML', disable_web_page_preview: true }),
          });
          if (res.ok) out.telegram++;
          else out.errors.push(`Telegram ${chatId}: HTTP ${res.status}${res.status === 400 || res.status === 403 ? ' (send /start to the bot first and check the chat id)' : ''}`);
        } catch (e) { out.errors.push(`Telegram ${chatId}: ${e.message}`); }
      }
    }
    if (sendMail && config.emailTypes.has(type)) {
      for (const to of config.emails) {
        try {
          await sendMail({ to, subject: `[MADS] ${msg.subject}`, text: msg.text, html: `<pre style="font:14px/1.5 system-ui,sans-serif;white-space:pre-wrap">${msg.html}</pre>` });
          out.email++;
        } catch (e) { out.errors.push(`Email ${to}: ${e.message}`); }
      }
    }
    out.sent = out.telegram + out.email > 0;
    if (out.errors.length) log.warn?.(`[Admin Alert] ${type}: ${out.errors.join('; ')}`);
    return out;
  }
  return { send, ready, config };
}

// New records since the last check. state: { watermark (ms), recent: { id: ms } }.
// Items up to lookbackMs older than the watermark still count (browser clocks
// can be a little behind), but each id is only reported once.
export function pickNew(node, state, { timeOf, now = Date.now(), lookbackMs = 30 * 60000, keepMs = 3 * 3600000 }) {
  const first = !state || !Number.isFinite(state.watermark);
  const watermark = first ? now : state.watermark;
  const recent = { ...(first ? {} : state.recent || {}) };
  const fresh = [];
  let newest = watermark;
  for (const [id, item] of Object.entries(node || {})) {
    if (!item || typeof item !== 'object') continue;
    const t = Date.parse(timeOf(item) || '');
    if (!Number.isFinite(t)) continue;
    if (t > newest) newest = Math.min(t, now);
    if (t <= watermark - lookbackMs || recent[id]) continue;
    // First run: what is there now is old news; just remember it.
    if (first) { recent[id] = now; continue; }
    recent[id] = now;
    fresh.push({ id, ...item });
  }
  for (const [id, at] of Object.entries(recent)) if (now - at > keepMs) delete recent[id];
  fresh.sort((a, b) => Date.parse(timeOf(a)) - Date.parse(timeOf(b)));
  return { fresh, state: { watermark: newest, recent } };
}
