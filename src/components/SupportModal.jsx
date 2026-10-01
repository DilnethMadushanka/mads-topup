import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { uploadToR2Storage } from '../services/storageService';
import { orderBelongsToUser, filterUserOrders } from '../utils/ownership';
import {
  MessageSquare, X, Send, Paperclip, Plus, AlertCircle,
  ShieldCheck, ChevronLeft, RefreshCw, Image, Headset, ChevronRight, Minus, ZoomIn, Check
} from 'lucide-react';

const RED = '#cc040a';

// White & Red clean theme tokens
const NEON = {
  cyan: '#e02020',
  violet: '#c0392b',
  green: '#27ae60',
  bg: '#ffffff',
  bgDeep: '#f5f5f5',
  surface: '#f9f9f9',
  surface2: '#f0f0f0',
  border: 'rgba(224,32,32,0.2)',
  borderViolet: 'rgba(192,57,43,0.25)',
  textDim: '#888888',
};

const QUICK_CHIPS = [
  { label: '💳 Payment Pending', text: 'My payment is pending / not verified yet. Can you please check?' },
  { label: '📦 Order Status', text: 'Can you please check the current status of my order?' },
  { label: '💰 Wallet Recharge Help', text: 'I need help with my wallet recharge / top-up.' },
];

export const SupportModal = () => {
  const {
    isSupportOpen,
    setIsSupportOpen,
    supportTickets,
    createSupportTicket,
    sendTicketMessage,
    activeTicketId,
    setActiveTicketId,
    orders,
    userProfile,
    isLoggedIn,
    openAuth,
    showToast
  } = useApp();

  const [view, setView] = useState('list'); // 'list' | 'chat' | 'create'
  const [isMinimized, setIsMinimized] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Order Issue');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [replyText, setReplyText] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Active Ticket Object — no [0] fallback; null if no match
  const currentTicket = (supportTickets || []).find(t => t.id === activeTicketId) || null;

  // Auto-scroll chat to newest message
  const messagesEndRef = useRef(null);
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentTicket?.messages?.length, activeTicketId]);

  useEffect(() => {
    if (isSupportOpen) {
      setIsMinimized(false);
      setView('list'); // Bug 6 fix: reset view to list on every reopen
    }
  }, [isSupportOpen]);

  // Bug 4 fix: clear shared attachment state whenever the user switches views
  useEffect(() => {
    setAttachmentUrl('');
    setAttachmentFile(null);
  }, [view]);

  useEffect(() => {
    if (!lightboxUrl) return;
    const onKey = (e) => { if (e.key === 'Escape') setLightboxUrl(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxUrl]);

  const handleOpenChat = (ticketId) => {
    setActiveTicketId(ticketId);
    setView('chat');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentFile(file);
    setIsUploading(true);
    // Uses the verified /api/upload-file → Cloudflare R2 pipeline (storageService.js)
    // so attachments actually persist and display reliably.
    try {
      // Bug 8 fix: wrap in try/finally so isUploading is always cleared even if upload throws
      const res = await uploadToR2Storage(file, 'support-attachments');
      if (res.success) {
        setAttachmentUrl(res.url);
        showToast('Image screenshot uploaded to support system!');
      } else {
        showToast(res.error || 'Upload failed', 'error');
      }
    } catch (err) {
      showToast('Upload failed. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateTicketSubmit = (e) => {
    e.preventDefault();
    if (!initialMessage.trim()) {
      showToast('Please type your message!', 'error');
      return;
    }

    createSupportTicket({
      subject: subject.trim() || `${category} Support Request`,
      category,
      message: initialMessage.trim(),
      orderId: selectedOrderId || null,
      attachmentUrl: attachmentUrl || null
    });

    setSubject('');
    setCategory('Order Issue');
    setInitialMessage('');
    setSelectedOrderId('');
    setAttachmentUrl('');
    setAttachmentFile(null);
    // createSupportTicket() already calls setActiveTicketId(newTicket.id) internally
    setView('chat');
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() && !attachmentUrl) return;
    if (!currentTicket) return;

    sendTicketMessage(currentTicket.id, replyText.trim(), 'user', attachmentUrl);
    setReplyText('');
    setAttachmentUrl('');
    setAttachmentFile(null);
  };

  const getStatusBadge = (status) => {
    const map = {
      OPEN:        { color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
      IN_PROGRESS: { color: '#cc040a', bg: '#fee2e2', border: 'var(--sm-red-border,#fca5a5)' },
      RESOLVED:    { color: 'var(--sm-green,#15803d)', bg: '#dcfce7', border: '#86efac' },
      CLOSED:      { color: 'var(--sm-text2,#475569)', bg: '#f1f5f9', border: '#cbd5e1' },
    };
    const s = map[status] || map.CLOSED;
    return (
      <span style={{ fontSize: 9.5, fontWeight: 900, padding: '3px 10px', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}`, letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />{status?.replace('_', ' ')}
      </span>
    );
  };

  // Bug 1 fix: use a ticket-specific ownership check instead of orderBelongsToUser() which
  // is designed for orders. Tickets use userId + userEmail (no phone). Also avoids the guest
  // UID mismatch where a ticket created before login gets a random userId that never matches.
  const userTickets = !isLoggedIn
    ? []
    : (supportTickets || []).filter(t => {
        if (!t || !userProfile) return false;
        const matchUid = Boolean(userProfile.uid) && t.userId === userProfile.uid;
        const matchEmail = Boolean(userProfile.email) && Boolean(t.userEmail) &&
          t.userEmail.toLowerCase() === userProfile.email.toLowerCase();
        return matchUid || matchEmail;
      });

  // Filter orders strictly for current user
  const userOrders = !isLoggedIn ? [] : filterUserOrders(orders, userProfile);

  const applyChip = (chip, setter, currentVal) => {
    setter(currentVal && currentVal.trim() ? `${currentVal.trim()} ${chip.text}` : chip.text);
  };

  const inputFocusHandlers = {
    onFocus: e => { e.target.style.borderColor = RED; e.target.style.boxShadow = '0 0 0 4px rgba(204,4,10,0.12)'; },
    onBlur: e => { e.target.style.borderColor = 'var(--sm-border,#e2e8f0)'; e.target.style.boxShadow = 'none'; }
  };

  // ── Shared style tokens ──
  const labelStyle = { display: 'block', fontSize: 10.5, fontWeight: 900, color: 'var(--sm-muted,#64748b)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' };
  const fieldStyle = { width: '100%', background: 'var(--sm-surface,#ffffff)', border: '2px solid var(--sm-border,#e2e8f0)', borderRadius: 14, padding: '11px 14px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', outline: 'none', color: 'var(--sm-text,#0f172a)', boxSizing: 'border-box', transition: 'box-shadow 0.15s, border-color 0.15s' };
  const redBtn = { background: RED, border: 'none', color: '#ffffff', fontWeight: 900, cursor: 'pointer', boxShadow: '0 6px 18px rgba(204,4,10,0.3)', transition: 'transform 0.15s, background 0.15s' };
  const chipStyle = { fontSize: 10.5, fontWeight: 800, color: RED, background: 'var(--sm-surface,#ffffff)', border: '1.5px solid var(--sm-red-border,#fecaca)', borderRadius: 99, padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s' };

  const headerSubtitle = view === 'list' ? 'My Tickets' : view === 'create' ? 'New Inquiry' : `Ticket ${currentTicket?.id || ''}`;

  return (
    <>
      {/* Global 24/7 Support Floating Button */}
      {(!isSupportOpen || isMinimized) && (
        <button
          onClick={() => { setIsSupportOpen(true); setIsMinimized(false); }}
          aria-label="Open 24/7 Live Customer Support"
          title="24/7 Live Customer Support"
          className="sm-fab"
          style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 40, height: 58, minWidth: 58, borderRadius: 99, background: 'linear-gradient(135deg,#ef1c25,#cc040a)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '0 18px', border: '2px solid rgba(255,255,255,0.35)', cursor: 'pointer', boxShadow: '0 8px 28px rgba(204,4,10,0.45)', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)'; e.currentTarget.style.boxShadow = '0 12px 34px rgba(204,4,10,0.55)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(204,4,10,0.45)'; }}
        >
          <Headset style={{ width: 24, height: 24 }} />
          <span className="sm-fab-label" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.02em' }}>Support</span>
          <span style={{ position: 'absolute', top: 2, right: 2, width: 13, height: 13, background: NEON.green, borderRadius: '50%', border: '2.5px solid #ffffff' }} />
          <span style={{ position: 'absolute', top: 2, right: 2, width: 13, height: 13, background: NEON.green, borderRadius: '50%', animation: 'smPing 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
          {isMinimized && currentTicket && (
            <span style={{ position: 'absolute', bottom: -6, left: 8, background: '#0f172a', color: '#fff', fontSize: 9, fontWeight: 900, borderRadius: 99, padding: '2px 8px', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>chat</span>
          )}
        </button>
      )}

      {/* Main Support Drawer / Modal Overlay */}
      {isSupportOpen && !isMinimized && (
        <div className="sm-overlay" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: 16, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
          <div className="sm-panel" style={{
            width: '100%', maxWidth: 440, height: '92vh', borderRadius: 28,
            display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'smSlide 0.28s cubic-bezier(0.16,1,0.3,1)',
            background: 'var(--sm-bg,#f8fafc)',
            border: '1px solid rgba(204,4,10,0.2)',
            boxShadow: '0 30px 90px rgba(15,23,42,0.35), 0 4px 24px rgba(204,4,10,0.15)'
          }}>

            {/* Header — bright red hero */}
            <div style={{ position: 'relative', flexShrink: 0, padding: '18px 18px 20px', background: 'var(--sm-surface,#ffffff)', color: 'var(--sm-text,#0f172a)', overflow: 'hidden', borderBottom: '1px solid var(--sm-border,#e2e8f0)' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg,#ef1c25,#cc040a,#990207)' }} />
              <div style={{ position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'var(--sm-red-soft,#fff1f2)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  {view !== 'list' && (
                    <button onClick={() => setView('list')} aria-label="Back to tickets" style={{ background: 'var(--sm-surface2,#f1f5f9)', border: '1px solid var(--sm-border,#e2e8f0)', borderRadius: 11, padding: '7px 8px', color: 'var(--sm-text2,#475569)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                      <ChevronLeft style={{ width: 16, height: 16 }} />
                    </button>
                  )}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 15, background: '#cc040a', boxShadow: '0 6px 16px rgba(204,4,10,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Headset style={{ width: 21, height: 21, color: '#ffffff' }} />
                    </div>
                    <span style={{ position: 'absolute', bottom: -2, right: -2, width: 13, height: 13, borderRadius: '50%', background: '#22c55e', border: '2.5px solid #ffffff' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ margin: 0, fontWeight: 900, fontSize: 15, letterSpacing: '0.02em', whiteSpace: 'nowrap', color: 'var(--sm-text,#0f172a)' }}>MADS SUPPORT</h3>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 900, color: 'var(--sm-green,#15803d)', background: 'var(--sm-green-soft,#f0fdf4)', border: '1px solid #86efac', padding: '2px 8px', borderRadius: 99 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', animation: 'smPulse 1.6s ease-in-out infinite' }} />
                        ONLINE
                      </span>
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--sm-muted,#64748b)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      24/7 Live Support · {headerSubtitle}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {view === 'list' && (
                    <button onClick={() => setView('create')} style={{ background: RED, border: 'none', borderRadius: 11, padding: '8px 13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 900, color: '#ffffff', boxShadow: '0 4px 14px rgba(204,4,10,0.3)' }}>
                      <Plus style={{ width: 14, height: 14 }} /> New
                    </button>
                  )}
                  <button onClick={() => setIsMinimized(true)} title="Minimize" style={{ background: 'var(--sm-surface2,#f1f5f9)', border: '1px solid var(--sm-border,#e2e8f0)', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sm-text2,#475569)', cursor: 'pointer' }}>
                    <Minus style={{ width: 14, height: 14 }} />
                  </button>
                  <button onClick={() => setIsSupportOpen(false)} title="Close" style={{ background: 'var(--sm-surface2,#f1f5f9)', border: '1px solid var(--sm-border,#e2e8f0)', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sm-text2,#475569)', cursor: 'pointer' }}>
                    <X style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="sm-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16, marginTop: -10, borderRadius: '20px 20px 0 0', background: 'var(--sm-bg,#f8fafc)', position: 'relative' }}>

              {/* LIST VIEW */}
              {view === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {!isLoggedIn && (
                    <div style={{ background: 'var(--sm-red-soft,#fff1f2)', border: '1.5px solid var(--sm-red-border,#fecaca)', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertCircle style={{ width: 16, height: 16, color: RED, flexShrink: 0 }} />
                        <span style={{ fontSize: 11.5, color: 'var(--sm-red-text,#b91c1c)', fontWeight: 700 }}>Log in to save &amp; sync your tickets!</span>
                      </div>
                      <button onClick={() => openAuth('login')} style={{ ...redBtn, borderRadius: 10, padding: '6px 14px', fontSize: 10.5, flexShrink: 0 }}>Log In</button>
                    </div>
                  )}
                  {userTickets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px 16px 24px' }}>
                      <div style={{ width: 84, height: 84, borderRadius: 28, background: 'linear-gradient(135deg,#fee2e2,#fff1f2)', border: '2px solid var(--sm-red-border,#fecaca)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 8px 24px rgba(204,4,10,0.12)' }}>
                        <MessageSquare style={{ width: 34, height: 34, color: RED }} />
                      </div>
                      <h4 style={{ margin: '0 0 8px', fontWeight: 900, fontSize: 17, color: 'var(--sm-text,#0f172a)' }}>No Support Tickets Yet</h4>
                      <p style={{ margin: '0 auto 22px', fontSize: 12.5, color: 'var(--sm-muted,#64748b)', lineHeight: 1.6, maxWidth: 270 }}>Need help with your top-up, payment, or account? Open a ticket and we'll assist instantly!</p>
                      <button onClick={() => setView('create')} style={{ ...redBtn, borderRadius: 16, padding: '13px 30px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <Plus style={{ width: 16, height: 16 }} /> Open New Ticket
                      </button>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 28 }}>
                        {[['⚡', 'Fast replies'], ['🔒', 'Secure chat'], ['🕐', '24/7 online']].map(([ic, tx]) => (
                          <div key={tx} style={{ background: 'var(--sm-surface,#ffffff)', border: '1.5px solid var(--sm-border,#e2e8f0)', borderRadius: 14, padding: '10px 6px' }}>
                            <div style={{ fontSize: 18, marginBottom: 3 }}>{ic}</div>
                            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--sm-text2,#475569)' }}>{tx}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    userTickets.map(tck => {
                      const barColor = { OPEN: '#f59e0b', IN_PROGRESS: RED, RESOLVED: '#16a34a', CLOSED: '#94a3b8' }[tck.status] || '#94a3b8';
                      const lastMsg = (tck.messages || [])[(tck.messages || []).length - 1];
                      return (
                        <div key={tck.id} onClick={() => handleOpenChat(tck.id)}
                          className="sm-card"
                          style={{ background: 'var(--sm-surface,#ffffff)', border: '1.5px solid var(--sm-border,#e2e8f0)', borderLeft: `5px solid ${barColor}`, borderRadius: 18, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.18s', boxShadow: '0 2px 10px rgba(15,23,42,0.05)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sm-muted,#94a3b8)', fontFamily: 'monospace' }}>{tck.id}</span>
                              <span style={{ fontSize: 9.5, background: 'var(--sm-red-soft,#fff1f2)', color: RED, border: '1px solid var(--sm-red-border,#fecaca)', padding: '2px 9px', borderRadius: 99, fontWeight: 800, whiteSpace: 'nowrap' }}>{tck.category}</span>
                            </div>
                            {getStatusBadge(tck.status)}
                          </div>
                          <h4 style={{ margin: '0 0 4px', fontWeight: 900, fontSize: 13.5, color: 'var(--sm-text,#0f172a)' }}>{tck.subject}</h4>
                          {lastMsg?.text && (
                            <p style={{ margin: '0 0 10px', fontSize: 11.5, color: 'var(--sm-muted,#64748b)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lastMsg.sender === 'admin' ? 'Support: ' : 'You: '}{lastMsg.text}
                            </p>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            {/* Bug 7 fix: show date for old tickets instead of time-only */}
                            <span style={{ fontSize: 10.5, color: 'var(--sm-muted,#94a3b8)', fontWeight: 600 }}>{(() => { const d = new Date(tck.updatedAt); const isToday = new Date().toDateString() === d.toDateString(); return isToday ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' }); })()}</span>
                            <span style={{ fontSize: 11, color: RED, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 3 }}>View Chat <ChevronRight style={{ width: 13, height: 13 }} /></span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* CREATE VIEW */}
              {view === 'create' && (
                <form onSubmit={handleCreateTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={labelStyle}>Inquiry Type</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                      {[
                        { val: 'Order Issue', icon: '📦', label: 'Order Issue' },
                        { val: 'Wallet Deposit', icon: '💰', label: 'Wallet / Payment' },
                        { val: 'Game ID Verification', icon: '🎮', label: 'Game ID Help' },
                        { val: 'General Inquiry', icon: '❓', label: 'General' },
                      ].map(opt => {
                        const on = category === opt.val;
                        return (
                          <button key={opt.val} type="button" onClick={() => setCategory(opt.val)}
                            style={{ position: 'relative', border: `2px solid ${on ? RED : 'var(--sm-border,#e2e8f0)'}`, background: on ? 'var(--sm-red-soft,#fff1f2)' : 'var(--sm-surface,#ffffff)', borderRadius: 16, padding: '13px 8px', cursor: 'pointer', textAlign: 'center', fontSize: 11.5, fontWeight: 800, color: on ? RED : 'var(--sm-text2,#475569)', transition: 'all 0.15s', boxShadow: on ? '0 6px 16px rgba(204,4,10,0.14)' : 'none' }}>
                            {on && <span style={{ position: 'absolute', top: 7, right: 7, width: 16, height: 16, borderRadius: '50%', background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check style={{ width: 10, height: 10, color: '#fff' }} strokeWidth={3.5} /></span>}
                            <div style={{ fontSize: 22, marginBottom: 5 }}>{opt.icon}</div>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {userOrders && userOrders.length > 0 && (
                    <div>
                      <label style={labelStyle}>Link Related Order</label>
                      <select value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)} style={fieldStyle} {...inputFocusHandlers}>
                        <option value="">— No specific order —</option>
                        {userOrders.map(o => <option key={o.id} value={o.id}>{o.id} · {o.gameName} ({o.packageName})</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>Subject</label>
                    <input type="text" placeholder="e.g. Free Fire diamonds not received" value={subject} onChange={e => setSubject(e.target.value)} style={fieldStyle} {...inputFocusHandlers} />
                  </div>
                  <div>
                    <label style={labelStyle}>Detailed Message</label>
                    <div className="sm-chip-row" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 9, paddingBottom: 2 }}>
                      {QUICK_CHIPS.map(chip => (
                        <button key={chip.label} type="button" onClick={() => applyChip(chip, setInitialMessage, initialMessage)} style={chipStyle}>
                          {chip.label}
                        </button>
                      ))}
                    </div>
                    <textarea rows={4} placeholder="Describe your issue in detail..." value={initialMessage} onChange={e => setInitialMessage(e.target.value)} required style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.6 }} {...inputFocusHandlers} />
                  </div>
                  <div style={{ background: 'var(--sm-surface,#ffffff)', border: '2px dashed var(--sm-red-border,#fca5a5)', borderRadius: 18, padding: '14px 16px' }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--sm-text2,#334155)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 9, background: 'var(--sm-red-soft2,#fee2e2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image style={{ width: 14, height: 14, color: RED }} /></span>
                      Attach Screenshot <span style={{ color: 'var(--sm-muted,#94a3b8)', fontWeight: 600 }}>(Optional)</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} style={{ fontSize: 11, color: 'var(--sm-muted,#64748b)', flex: 1, minWidth: 0 }} />
                      {isUploading && <span style={{ fontSize: 11, color: RED, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}><RefreshCw style={{ width: 12, height: 12, animation: 'smSpin 1s linear infinite' }} /> Uploading...</span>}
                    </div>
                    {attachmentUrl && (
                      <div style={{ marginTop: 12 }}>
                        <div className="sm-thumb" onClick={() => setLightboxUrl(attachmentUrl)} style={{ position: 'relative', width: 84, height: 84, borderRadius: 14, overflow: 'hidden', cursor: 'zoom-in', border: '2px solid var(--sm-red-border,#fecaca)' }}>
                          <img src={attachmentUrl} alt="Attachment preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <div className="sm-thumb-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}>
                            <ZoomIn style={{ width: 18, height: 18, color: '#fff' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <button type="submit"
                    style={{ ...redBtn, borderRadius: 16, padding: 15, fontSize: 13.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = '#b00308'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = RED; }}
                  >
                    <Send style={{ width: 16, height: 16 }} /> Submit Support Ticket
                  </button>
                </form>
              )}

              {/* CHAT VIEW */}
              {view === 'chat' && currentTicket && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
                  <div style={{ background: 'var(--sm-surface,#ffffff)', border: '1.5px solid var(--sm-border,#e2e8f0)', borderLeft: `5px solid ${RED}`, borderRadius: 16, padding: '12px 14px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 900, fontSize: 13, color: 'var(--sm-text,#0f172a)' }}>{currentTicket.subject}</span>
                      {getStatusBadge(currentTicket.status)}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', fontSize: 10.5, color: 'var(--sm-muted,#94a3b8)', fontFamily: 'monospace' }}>
                      <span>#{currentTicket.id}</span>
                      <span>· {currentTicket.category}</span>
                      {currentTicket.orderId && <span style={{ color: RED, fontWeight: 800 }}>· {currentTicket.orderId}</span>}
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 4 }}>
                    {currentTicket.messages.map(msg => {
                      const isAdmin = msg.sender === 'admin';
                      return (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-start' : 'flex-end' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            {isAdmin && (
                              <div style={{ width: 22, height: 22, borderRadius: '50%', background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(204,4,10,0.35)' }}>
                                <Headset style={{ width: 11, height: 11, color: '#ffffff' }} />
                              </div>
                            )}
                            <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--sm-text2,#475569)' }}>{msg.senderName || (isAdmin ? 'MADS Support' : 'You')}</span>
                            <span style={{ fontSize: 9.5, color: 'var(--sm-muted,#94a3b8)' }}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div style={{
                            maxWidth: '85%', padding: '11px 15px',
                            borderRadius: isAdmin ? '5px 18px 18px 18px' : '18px 5px 18px 18px',
                            fontSize: 12.5, fontWeight: 500, lineHeight: 1.6,
                            background: isAdmin ? 'var(--sm-surface,#ffffff)' : 'linear-gradient(135deg,#ef1c25,#cc040a)',
                            color: isAdmin ? 'var(--sm-text,#0f172a)' : '#ffffff',
                            border: isAdmin ? '1.5px solid var(--sm-border,#e2e8f0)' : 'none',
                            boxShadow: isAdmin ? '0 2px 8px rgba(15,23,42,0.05)' : '0 6px 18px rgba(204,4,10,0.28)'
                          }}>
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                            {msg.attachmentUrl && (
                              <div className="sm-thumb" onClick={() => setLightboxUrl(msg.attachmentUrl)} style={{ position: 'relative', marginTop: 8, borderRadius: 12, overflow: 'hidden', border: '1.5px solid rgba(0,0,0,0.12)', cursor: 'zoom-in' }}>
                                <img src={msg.attachmentUrl} alt="Attachment" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />
                                <div className="sm-thumb-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0, transition: 'opacity 0.15s' }}>
                                  <ZoomIn style={{ width: 16, height: 16, color: '#fff' }} />
                                  <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>View full image</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  <form onSubmit={handleSendReply} style={{ borderTop: '1px solid var(--sm-border,#e2e8f0)', paddingTop: 12, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }} className="sm-chip-row">
                      {QUICK_CHIPS.map(chip => (
                        <button key={chip.label} type="button" onClick={() => applyChip(chip, setReplyText, replyText)} style={chipStyle}>
                          {chip.label}
                        </button>
                      ))}
                    </div>
                    {attachmentUrl && (
                      <div style={{ fontSize: 10.5, background: 'var(--sm-green-soft,#f0fdf4)', color: 'var(--sm-green,#15803d)', border: '1px solid #86efac', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'monospace' }}>
                        <span>✔ Screenshot attached</span>
                        <button type="button" onClick={() => setAttachmentUrl('')} style={{ color: '#dc2626', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10.5 }}>✕ Remove</button>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--sm-surface,#ffffff)', border: '2px solid var(--sm-border,#e2e8f0)', borderRadius: 18, padding: 5 }}>
                      <label style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0, background: 'var(--sm-surface2,#f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--sm-muted,#64748b)', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = RED; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--sm-surface2,#f1f5f9)'; e.currentTarget.style.color = 'var(--sm-muted,#64748b)'; }}>
                        <Paperclip style={{ width: 17, height: 17 }} />
                        <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                      </label>
                      <input type="text" placeholder={isUploading ? 'Uploading screenshot...' : 'Type your message...'} value={replyText} onChange={e => setReplyText(e.target.value)}
                        style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', padding: '10px 4px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', outline: 'none', color: 'var(--sm-text,#0f172a)' }} />
                      <button type="submit" disabled={!replyText.trim() && !attachmentUrl}
                        style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0, background: (!replyText.trim() && !attachmentUrl) ? 'var(--sm-border,#e2e8f0)' : RED, border: 'none', color: (!replyText.trim() && !attachmentUrl) ? 'var(--sm-muted,#94a3b8)' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (!replyText.trim() && !attachmentUrl) ? 'not-allowed' : 'pointer', boxShadow: (!replyText.trim() && !attachmentUrl) ? 'none' : '0 4px 14px rgba(204,4,10,0.4)', transition: 'transform 0.12s, box-shadow 0.12s' }}
                        onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.transform = 'scale(1.06)'; } }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
                        <Send style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* CHAT VIEW FALLBACK (If ticket not found) */}
              {view === 'chat' && !currentTicket && (
                <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                  <div style={{ width: 70, height: 70, borderRadius: 22, background: 'var(--sm-red-soft,#fff1f2)', border: '2px solid var(--sm-red-border,#fecaca)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <AlertCircle style={{ width: 28, height: 28, color: RED }} />
                  </div>
                  <h4 style={{ margin: '0 0 8px', fontWeight: 900, fontSize: 16, color: 'var(--sm-text,#0f172a)' }}>Ticket Not Found</h4>
                  <p style={{ margin: '0 auto 20px', fontSize: 12.5, color: 'var(--sm-muted,#64748b)', lineHeight: 1.6, maxWidth: 280 }}>This ticket could not be loaded or may have been closed.</p>
                  <button onClick={() => setView('list')} style={{ ...redBtn, borderRadius: 14, padding: '11px 26px', fontSize: 12.5 }}>
                    Back to Tickets
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ background: 'var(--sm-surface,#ffffff)', borderTop: '1px solid var(--sm-border,#e2e8f0)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0 }}>
              <ShieldCheck style={{ width: 13, height: 13, color: '#16a34a' }} />
              <span style={{ fontSize: 9.5, color: 'var(--sm-muted,#94a3b8)', fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'monospace' }}>MADS TOPUP · 256-BIT ENCRYPTED SUPPORT</span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'smPulse 1.6s ease-in-out infinite' }} />
            </div>

          </div>
        </div>
      )}

      {/* Fullscreen image lightbox */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out', animation: 'smFadeIn 0.15s ease' }}>
          <button onClick={() => setLightboxUrl(null)} aria-label="Close preview" style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
          <img src={lightboxUrl} alt="Full preview" onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'default' }} />
        </div>
      )}

      <style>{`
        @keyframes smSlide { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        @keyframes smFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes smPing { 75%,100% { transform:scale(2.1); opacity:0; } }
        @keyframes smSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes smPulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
        .sm-card:hover { border-color: rgba(204,4,10,0.4) !important; box-shadow: 0 8px 22px rgba(204,4,10,0.12) !important; transform: translateY(-1px); }
        .sm-thumb:hover .sm-thumb-overlay { opacity: 1 !important; }
        .sm-scroll::-webkit-scrollbar { width: 6px; }
        .sm-scroll::-webkit-scrollbar-track { background: transparent; }
        .sm-scroll::-webkit-scrollbar-thumb { background: rgba(204,4,10,0.25); border-radius: 99px; }
        .sm-chip-row::-webkit-scrollbar { height: 0; }
        @media (max-width: 640px) {
          .sm-overlay { padding: 0 !important; align-items: stretch !important; }
          .sm-panel { max-width: 100% !important; height: 100vh !important; height: 100dvh !important; border-radius: 0 !important; }
          .sm-fab-label { display: none; }
          .sm-fab { padding: 0 !important; width: 58px; }
        }
      `}</style>
    </>
  );
};
