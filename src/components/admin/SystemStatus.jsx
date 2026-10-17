import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity, RefreshCw, Zap, Database, Cloud, Mail, Wallet, Smartphone, ShieldCheck, Archive,
  Send, Server, CheckCircle2, AlertTriangle, XCircle, GitBranch
} from 'lucide-react';

// Admin "System status": what the server has set up and whether each part
// answers right now (MooGold, database, R2, email, payments, backups,
// Telegram bot). Replaces the old Moongold / R2 tabs, whose settings were
// only saved in the browser and whose "Test connection" always said yes.

let cache = { at: 0, data: null };
export const useSystemStatus = (maxAgeMs = 60000) => {
  const [data, setData] = useState(cache.data);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const load = useCallback(async (force = false) => {
    if (!force && cache.data && Date.now() - cache.at < maxAgeMs) { setData(cache.data); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/system-status', { credentials: 'same-origin' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(res.status === 401 ? 'Admin session expired. Log in again.' : (json.error || 'Could not load the status.'));
      cache = { at: Date.now(), data: json };
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [maxAgeMs]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: () => load(true) };
};

const fmtAgo = (iso) => {
  const t = Date.parse(iso || '');
  if (!t) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 48 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};
const fmtUptime = (sec) => {
  const d = Math.floor(sec / 86400); const h = Math.floor((sec % 86400) / 3600); const m = Math.floor((sec % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
};
const backupAge = (name) => {
  const m = String(name || '').match(/rtdb-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})/);
  return m ? fmtAgo(`${m[1]}T${m[2]}:${m[3]}:00Z`) : '';
};

// One row per part: { level: 'ok' | 'warn' | 'bad', title, detail, fix }.
export const statusRows = (d) => {
  if (!d) return [];
  const rows = [];
  const mg = d.moogold || {};
  rows.push({
    key: 'moogold', icon: Zap, title: 'MooGold top-ups',
    level: !mg.configured ? 'bad' : mg.ok ? (mg.balanceUsd < 20 ? 'warn' : 'ok') : 'bad',
    detail: !mg.configured ? 'Partner ID or secret missing in .env.'
      : mg.ok ? `Balance $${Number(mg.balanceUsd).toFixed(2)} (≈ Rs. ${Math.round(mg.balanceUsd * 305).toLocaleString('en-US')})${mg.balanceUsd < 20 ? ' — low, top up the MooGold wallet.' : ''}`
        : `Not answering: ${mg.error || 'unknown error'}`,
  });
  const db = d.database || {};
  rows.push({ key: 'db', icon: Database, title: 'Database', level: !db.ok ? 'bad' : db.secretSet ? 'ok' : 'warn', detail: !db.ok ? `Not answering: ${db.error}` : db.secretSet ? `Connected (${db.ms} ms)` : 'Connected, but FIREBASE_DB_SECRET is not set: wallet writes will fail.' });
  const r2 = d.r2 || {};
  rows.push({ key: 'r2', icon: Cloud, title: 'R2 storage (slips, images)', level: !r2.configured ? 'warn' : r2.ok ? 'ok' : 'bad', detail: !r2.configured ? 'R2 keys not set: slip and image uploads are off.' : r2.ok ? `Bucket "${r2.bucket}" reachable (${r2.ms} ms)` : `Bucket "${r2.bucket}": ${r2.error}` });
  const mail = d.email?.providers || [];
  rows.push({ key: 'mail', icon: Mail, title: 'Email (OTP, approvals)', level: mail.length ? 'ok' : 'bad', detail: mail.length ? mail.join(' + ') : 'No email provider set (Zoho or Resend): sign-up codes can not be sent.' });
  const p = d.payments || {};
  rows.push({ key: 'binance', icon: Wallet, title: 'Binance Pay auto-check', level: p.binance ? 'ok' : 'warn', detail: p.binance ? 'Read-only API key set.' : 'No API key: every Binance deposit waits for manual approval.' });
  rows.push({
    key: 'ezcash', icon: Smartphone, title: 'EZ Cash SMS forwarder',
    level: !p.ezcashWebhook ? 'warn' : 'ok',
    detail: !p.ezcashWebhook ? 'EZCASH_WEBHOOK_SECRET not set: SMS are refused, deposits wait for manual approval.'
      : `${p.ezcashSmsInMemory} SMS since the last restart${p.ezcashLastSmsAt ? `, last ${fmtAgo(p.ezcashLastSmsAt)}` : ''}. SMS are kept in memory only.`,
  });
  rows.push({ key: 'genie', icon: Wallet, title: 'Card payments (Genie)', level: p.genieOwnKey ? 'ok' : 'warn', detail: p.genieOwnKey ? 'Own app key set in .env.' : 'Using the key written in the code (public on GitHub). Put GENIE_APP_KEY in .env and rotate it.' });
  const a = d.admin || {};
  rows.push({ key: 'admin', icon: ShieldCheck, title: 'Admin login', level: a.totpSet && a.passwordSet ? 'ok' : 'bad', detail: a.totpSet && a.passwordSet ? 'Password + authenticator code required.' : 'ADMIN_PASSWORD or ADMIN_TOTP_SECRET missing.' });
  const b = d.backups || {};
  const ageH = (() => { const m = String(b.latest || '').match(/rtdb-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})/); return m ? (Date.now() - Date.parse(`${m[1]}T${m[2]}:${m[3]}:00Z`)) / 3600000 : Infinity; })();
  rows.push({ key: 'backup', icon: Archive, title: 'Daily database backup', level: b.disabled ? 'warn' : ageH < 30 ? 'ok' : 'bad', detail: b.disabled ? 'Turned off (BACKUP_DISABLED=1).' : b.latest ? `${b.count} kept, newest ${backupAge(b.latest)}` : 'No backup yet.' });
  const tg = d.telegram;
  rows.push({ key: 'tg', icon: Send, title: 'Telegram bot', level: !tg ? 'warn' : /online|active|running|healthy/i.test(String(tg.status)) ? 'ok' : 'warn', detail: tg ? `@${tg.botUsername} · ${tg.status}${tg.lastLatencyMs ? ` · ${tg.lastLatencyMs} ms` : ''}` : 'Not running.' });
  return rows;
};

const LEVEL_ICON = { ok: CheckCircle2, warn: AlertTriangle, bad: XCircle };

export const SystemStatusPage = () => {
  const { data, loading, error, reload } = useSystemStatus(0);
  const rows = statusRows(data);
  const bad = rows.filter(r => r.level === 'bad').length;
  const warn = rows.filter(r => r.level === 'warn').length;
  const srv = data?.server;

  return (
    <div className="ord-desk">
      <div className={`dep-verdict sys-head ${!data ? 'is-info' : bad ? 'is-bad' : warn ? 'is-warn' : 'is-ok'}`}>
        <Activity />
        <span>
          <b>{!data ? (error || 'Checking…') : bad ? `${bad} part${bad > 1 ? 's' : ''} not working` : warn ? `Working, ${warn} thing${warn > 1 ? 's' : ''} to look at` : 'Everything is working'}</b>
          {srv && <>Server up {fmtUptime(srv.uptimeSeconds)} · Node {srv.node}{srv.commit ? <> · running <code>{srv.commit.slice(0, 7)}</code></> : ''}</>}
        </span>
        <button type="button" className="ord-ghost" onClick={reload} disabled={loading}><RefreshCw className={loading ? 'dep-spin' : ''} /><span>Check again</span></button>
      </div>

      <div className="sys-grid">
        {rows.map(r => {
          const Icon = r.icon; const L = LEVEL_ICON[r.level];
          return (
            <div key={r.key} className={`ord-panel sys-card is-${r.level}`}>
              <span className="sys-ico"><Icon /></span>
              <span className="ord-stack">
                <b>{r.title}</b>
                <small>{r.detail}</small>
              </span>
              <L className="sys-level" />
            </div>
          );
        })}
      </div>

      {srv && (
        <div className="ord-panel sys-foot">
          <Server /><span>Started {fmtAgo(srv.startedAt)}</span>
          {srv.commit && <><GitBranch /><span>Deployed commit <code>{srv.commit.slice(0, 7)}</code> — compare with the latest on GitHub to confirm a deploy.</span></>}
        </div>
      )}
    </div>
  );
};

// Small version for the overview page.
export const SystemStatusMini = ({ onOpen }) => {
  const { data, error } = useSystemStatus();
  const rows = statusRows(data).filter(r => ['moogold', 'db', 'r2', 'mail', 'backup'].includes(r.key));
  return (
    <div className="sys-mini">
      {!data && <small className="usr-muted">{error || 'Checking…'}</small>}
      {rows.map(r => {
        const L = LEVEL_ICON[r.level];
        return (
          <button key={r.key} type="button" className={`sys-mini-row is-${r.level}`} onClick={onOpen}>
            <L />
            <span className="ord-stack"><b>{r.title}</b><small>{r.detail}</small></span>
          </button>
        );
      })}
    </div>
  );
};
