import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Inbox, ArrowLeft, Copy, ExternalLink, Send, CheckCircle2,
  Clock, AlertTriangle, Image as ImageIcon, MessageSquare, Zap
} from 'lucide-react';

const STATUS_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'OPEN', label: 'Open' },
  { id: 'IN_PROGRESS', label: 'In progress' },
  { id: 'RESOLVED', label: 'Resolved' },
  { id: 'CLOSED', label: 'Closed' },
];

const STATUS_META = {
  OPEN: { label: 'Open', cls: 'is-open' },
  IN_PROGRESS: { label: 'In progress', cls: 'is-progress' },
  RESOLVED: { label: 'Resolved', cls: 'is-resolved' },
  CLOSED: { label: 'Closed', cls: 'is-closed' },
};

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const PRIORITY_RANK = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const QUICK_REPLIES = [
  'Hi! We are checking your order now. Please give us a few minutes.',
  'Your top-up has been completed successfully. Please check your game account ✅',
  'Please send a screenshot of the payment or the error so we can help faster.',
  'Please double-check your Player ID (UID) and send it here.',
  'Your refund has been processed to your MADS wallet.',
];

const timeAgo = (iso) => {
  const t = new Date(iso).getTime();
  if (!t) return '';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return 'now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const clockTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const initialOf = (name) => String(name || '?').trim().charAt(0).toUpperCase() || '?';

/**
 * Admin support desk: an inbox (ticket list on the left, conversation on the right)
 * that fits the screen, so each pane scrolls on its own instead of the whole page.
 */
export const SupportDesk = ({
  tickets, search, setSearch, statusFilter, setStatusFilter,
  sendTicketMessage, updateTicketStatus, updateTicketPriority, showToast, onOpenOrder,
}) => {
  const [selectedId, setSelectedId] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [isSending, setIsSending] = useState(false);
  const threadRef = useRef(null);

  const counts = useMemo(() => {
    const c = { ALL: tickets.length, OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 };
    tickets.forEach((t) => { if (c[t.status] !== undefined) c[t.status] += 1; });
    return c;
  }, [tickets]);

  const list = useMemo(() => {
    const q = (search || '').toLowerCase().trim();
    return tickets
      .filter((t) => {
        if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
        if (!q) return true;
        return [t.id, t.userEmail || t.email, t.userName || t.name, t.subject, t.orderId]
          .some((v) => String(v || '').toLowerCase().includes(q));
      })
      .sort((a, b) => {
        // Waiting tickets first, then by priority, then newest activity.
        const waitA = a.status === 'OPEN' || a.status === 'IN_PROGRESS' ? 0 : 1;
        const waitB = b.status === 'OPEN' || b.status === 'IN_PROGRESS' ? 0 : 1;
        if (waitA !== waitB) return waitA - waitB;
        const pr = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
        if (waitA === 0 && pr !== 0) return pr;
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
      });
  }, [tickets, search, statusFilter]);

  // Look the ticket up by id on every render so new replies show straight away.
  const active = list.find((t) => t.id === selectedId) || tickets.find((t) => t.id === selectedId) || list[0] || null;
  const messages = Array.isArray(active?.messages) ? active.messages : [];

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.id, messages.length]);

  const openTicket = (id) => {
    setSelectedId(id);
    setMobileOpen(true);
    setReply('');
  };

  const send = async (resolveAfter = false) => {
    const text = reply.trim();
    if (!text || !active || isSending) return;
    setIsSending(true);
    try {
      const ok = await sendTicketMessage(active.id, text, 'admin');
      if (ok === false) return;
      setReply('');
      if (resolveAfter) updateTicketStatus(active.id, 'RESOLVED');
      else if (active.status === 'OPEN') updateTicketStatus(active.id, 'IN_PROGRESS');
      else showToast(`Reply sent to ${active.userName || 'customer'}`);
    } finally {
      setIsSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(false);
    }
  };

  const copyId = () => {
    if (!active) return;
    navigator.clipboard?.writeText(active.id).then(() => showToast('Ticket ID copied')).catch(() => {});
  };

  return (
    <div className={`sd-desk${mobileOpen && active ? ' is-thread-open' : ''}`}>
      {/* ── Left: ticket list ── */}
      <aside className="sd-list">
        <div className="sd-list-head">
          <div className="sd-search">
            <Search />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ID, name, email, order..." />
          </div>
          <div className="sd-tabs" role="tablist">
            {STATUS_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={statusFilter === t.id}
                onClick={() => setStatusFilter(t.id)}
                className={`sd-tab ${STATUS_META[t.id]?.cls || ''}${statusFilter === t.id ? ' is-active' : ''}`}
              >
                {t.label}<span>{counts[t.id]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sd-items">
          {list.length === 0 ? (
            <div className="sd-empty-list">
              <Inbox />
              <p>No tickets here.</p>
            </div>
          ) : list.map((t) => {
            const last = Array.isArray(t.messages) && t.messages.length ? t.messages[t.messages.length - 1] : null;
            const waiting = last && last.sender !== 'admin' && (t.status === 'OPEN' || t.status === 'IN_PROGRESS');
            const meta = STATUS_META[t.status] || STATUS_META.OPEN;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => openTicket(t.id)}
                className={`sd-item${active?.id === t.id ? ' is-active' : ''}${waiting ? ' is-waiting' : ''}`}
              >
                <span className={`sd-avatar ${meta.cls}`}>{initialOf(t.userName)}</span>
                <span className="sd-item-body">
                  <span className="sd-item-top">
                    <span className="sd-item-name">{t.userName || t.userEmail || 'Customer'}</span>
                    <span className="sd-item-time">{timeAgo(t.updatedAt || t.createdAt)}</span>
                  </span>
                  <span className="sd-item-subject">{t.subject || 'No subject'}</span>
                  <span className="sd-item-preview">
                    {last ? `${last.sender === 'admin' ? 'You: ' : ''}${last.text || (last.attachmentUrl ? 'Sent a screenshot' : '')}` : 'No messages yet'}
                  </span>
                  <span className="sd-item-tags">
                    <span className={`sd-status ${meta.cls}`}>{meta.label}</span>
                    {(t.priority === 'HIGH' || t.priority === 'URGENT') && (
                      <span className={`sd-prio is-${t.priority.toLowerCase()}`}><AlertTriangle />{t.priority}</span>
                    )}
                    {t.category && <span className="sd-cat">{t.category}</span>}
                    {waiting && <span className="sd-waiting">Needs reply</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Right: conversation ── */}
      <section className="sd-thread">
        {active ? (
          <>
            <header className="sd-thread-head">
              <button type="button" className="sd-back" onClick={() => setMobileOpen(false)} aria-label="Back to tickets">
                <ArrowLeft />
              </button>
              <span className={`sd-avatar is-lg ${(STATUS_META[active.status] || STATUS_META.OPEN).cls}`}>{initialOf(active.userName)}</span>
              <div className="sd-thread-title">
                <h3>{active.subject || 'No subject'}</h3>
                <p>
                  <strong>{active.userName || 'Customer'}</strong>
                  {active.userEmail && <span> · {active.userEmail}</span>}
                </p>
              </div>
              <button type="button" className="sd-id" onClick={copyId} title="Copy ticket ID">
                {active.id}<Copy />
              </button>
            </header>

            <div className="sd-controls">
              <div className="sd-seg" role="group" aria-label="Ticket status">
                {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => active.status !== s && updateTicketStatus(active.id, s)}
                    className={`${STATUS_META[s].cls}${active.status === s ? ' is-active' : ''}`}
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
              <label className={`sd-prio-select is-${String(active.priority || 'MEDIUM').toLowerCase()}`}>
                <span>Priority</span>
                <select value={active.priority || 'MEDIUM'} onChange={(e) => updateTicketPriority(active.id, e.target.value)}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              {active.orderId && (
                <button type="button" className="sd-order" onClick={() => onOpenOrder(active.orderId)}>
                  Order {active.orderId}<ExternalLink />
                </button>
              )}
            </div>

            <div className="sd-messages" ref={threadRef}>
              <div className="sd-opened"><Clock />Opened {clockTime(active.createdAt)}</div>
              {messages.map((msg, i) => {
                const isAdmin = msg.sender === 'admin';
                return (
                  <div key={msg.id || i} className={`sd-msg${isAdmin ? ' is-admin' : ''}`}>
                    <div className="sd-bubble">
                      {msg.text && <p>{msg.text}</p>}
                      {msg.attachmentUrl && (
                        <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="sd-attach">
                          <img src={msg.attachmentUrl} alt="Attachment" loading="lazy" />
                          <span><ImageIcon />Open full screenshot</span>
                        </a>
                      )}
                    </div>
                    <div className="sd-msg-meta">{isAdmin ? 'You' : (msg.senderName || active.userName || 'Customer')} · {clockTime(msg.timestamp)}</div>
                  </div>
                );
              })}
            </div>

            <div className="sd-composer">
              <div className="sd-quick">
                {QUICK_REPLIES.map((q) => (
                  <button key={q} type="button" onClick={() => setReply(q)} title={q}>{q}</button>
                ))}
              </div>
              <div className="sd-compose-row">
                <textarea
                  rows={2}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Type your reply… (Enter to send, Shift+Enter for a new line)"
                />
                <div className="sd-compose-btns">
                  <button type="button" className="sd-send" disabled={!reply.trim() || isSending} onClick={() => send(false)}>
                    <Send /><span>Send</span>
                  </button>
                  <button type="button" className="sd-send is-resolve" disabled={!reply.trim() || isSending} onClick={() => send(true)} title="Send and mark resolved">
                    <CheckCircle2 /><span>Send &amp; resolve</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="sd-empty-thread">
            <span><MessageSquare /></span>
            <h4>No ticket selected</h4>
            <p>Pick a ticket from the list to read and reply.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export const SupportDeskStats = ({ tickets }) => {
  const open = tickets.filter((t) => t.status === 'OPEN').length;
  const progress = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const urgent = tickets.filter((t) => (t.priority === 'URGENT' || t.priority === 'HIGH') && (t.status === 'OPEN' || t.status === 'IN_PROGRESS')).length;
  const waiting = tickets.filter((t) => {
    const m = Array.isArray(t.messages) ? t.messages : [];
    return m.length && m[m.length - 1].sender !== 'admin' && (t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  }).length;
  const items = [
    { icon: MessageSquare, label: 'Needs reply', value: waiting, cls: 'is-rose' },
    { icon: Inbox, label: 'Open', value: open, cls: 'is-amber' },
    { icon: Zap, label: 'In progress', value: progress, cls: 'is-blue' },
    { icon: AlertTriangle, label: 'High / urgent', value: urgent, cls: 'is-red' },
  ];
  return (
    <div className="sd-stats">
      {items.map(({ icon: Icon, label, value, cls }) => (
        <div key={label} className={`sd-stat ${cls}`}>
          <span className="sd-stat-ico"><Icon /></span>
          <span><strong>{value}</strong><small>{label}</small></span>
        </div>
      ))}
    </div>
  );
};
