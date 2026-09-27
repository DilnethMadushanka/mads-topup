import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { uploadToR2Storage } from '../services/storageService';
import { orderBelongsToUser, filterUserOrders } from '../utils/ownership';
import {
  MessageSquare, X, Send, Paperclip, Plus, AlertCircle,
  ShieldCheck, ChevronLeft, RefreshCw, Image, Headset, ChevronRight, Minus, ZoomIn
} from 'lucide-react';

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
      OPEN:        { color: '#facc15', glow: 'rgba(250,204,21,0.5)', icon: '●' },
      IN_PROGRESS: { color: NEON.cyan, glow: 'rgba(0,240,255,0.5)', icon: '●' },
      RESOLVED:    { color: NEON.green, glow: 'rgba(57,255,136,0.5)', icon: '●' },
      CLOSED:      { color: '#64748b', glow: 'rgba(100,116,139,0.4)', icon: '●' },
    };
    const s = map[status] || map.CLOSED;
    return (
      <span style={{ fontSize: 9, fontWeight: 900, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', color: s.color, border: `1px solid ${s.color}55`, letterSpacing: '0.06em', textShadow: `0 0 8px ${s.glow}`, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 7 }}>{s.icon}</span>{status?.replace('_', ' ')}
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
    onFocus: e => { e.target.style.borderColor = NEON.cyan; e.target.style.boxShadow = `0 0 0 3px rgba(224,32,32,0.15)`; },
    onBlur: e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }
  };

  return (
    <>
      {/* Global 24/7 Support Floating Button */}
      {(!isSupportOpen || isMinimized) && (
        <button
          onClick={() => { setIsSupportOpen(true); setIsMinimized(false); }}
          aria-label="Open 24/7 Live Customer Support"
          title="24/7 Live Customer Support"
          className="sm-fab"
          style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 40, width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,#e02020,#c0392b)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid rgba(224,32,32,0.5)`, cursor: 'pointer', boxShadow: `0 4px 20px rgba(224,32,32,0.4), 0 8px 28px rgba(0,0,0,0.15)`, transition: 'transform 0.2s, box-shadow 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = `0 6px 28px rgba(224,32,32,0.55), 0 10px 34px rgba(0,0,0,0.2)`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 4px 20px rgba(224,32,32,0.4), 0 8px 28px rgba(0,0,0,0.15)`; }}
        >
          <Headset style={{ width: 24, height: 24 }} />
          <span style={{ position: 'absolute', top: 3, right: 3, width: 12, height: 12, background: NEON.green, borderRadius: '50%', border: '2px solid #e02020', boxShadow: `0 0 8px ${NEON.green}` }} />
          <span style={{ position: 'absolute', top: 3, right: 3, width: 12, height: 12, background: NEON.green, borderRadius: '50%', animation: 'smPing 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
          {isMinimized && currentTicket && (
            <span style={{ position: 'absolute', bottom: -6, left: -6, background: 'linear-gradient(135deg,#e02020,#c0392b)', color: '#fff', fontSize: 9, fontWeight: 900, borderRadius: 99, padding: '2px 6px', boxShadow: '0 2px 10px rgba(224,32,32,0.4)' }}>chat</span>
          )}
        </button>
      )}

      {/* Main Support Drawer / Modal Overlay */}
      {isSupportOpen && !isMinimized && (
        <div className="sm-overlay" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: 16, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}>
          <div className="sm-panel" style={{
            width: '100%', maxWidth: 440, height: '92vh', borderRadius: 26,
            display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'smSlide 0.28s cubic-bezier(0.16,1,0.3,1)',
            background: '#ffffff',
            backdropFilter: 'blur(18px) saturate(140%)',
            WebkitBackdropFilter: 'blur(18px) saturate(140%)',
            border: `1px solid rgba(224,32,32,0.18)`,
            boxShadow: `0 30px 90px rgba(0,0,0,0.18), 0 4px 24px rgba(224,32,32,0.1), inset 0 1px 0 rgba(255,255,255,0.9)`
          }}>

            {/* Header */}
            <div style={{ position: 'relative', flexShrink: 0, padding: '18px 18px 15px', background: 'linear-gradient(135deg, rgba(224,32,32,0.06), rgba(192,57,43,0.04))', borderBottom: `1px solid rgba(224,32,32,0.15)`, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #e02020, #c0392b, transparent)' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {view !== 'list' && (
                    <button onClick={() => setView('list')} style={{ background: 'rgba(224,32,32,0.07)', border: `1px solid rgba(224,32,32,0.2)`, borderRadius: 10, padding: '6px 8px', color: NEON.cyan, cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                      <ChevronLeft style={{ width: 16, height: 16 }} />
                    </button>
                  )}
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg,#e02020,#c0392b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(224,32,32,0.4)' }}>
                    <Headset style={{ width: 19, height: 19, color: '#ffffff' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <h3 style={{ margin: 0, fontWeight: 900, fontSize: 13.5, color: '#1a1a1a', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>MADS SUPPORT</h3>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 800, color: '#16a34a', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.35)', padding: '2px 8px', borderRadius: 99 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', animation: 'smPulse 1.6s ease-in-out infinite' }} />
                        ONLINE
                      </span>
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: 10.5, color: NEON.textDim, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {view === 'list' && 'Agent Network · My Tickets'}
                      {view === 'create' && 'Agent Network · New Inquiry'}
                      {view === 'chat' && `Agent Network · ${currentTicket?.id || ''}`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {view === 'list' && (
                    <button onClick={() => setView('create')} style={{ background: 'linear-gradient(135deg,#e02020,#c0392b)', border: 'none', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 900, color: '#ffffff', boxShadow: '0 4px 14px rgba(224,32,32,0.35)' }}>
                      <Plus style={{ width: 13, height: 13 }} /> New
                    </button>
                  )}
                  <button onClick={() => setIsMinimized(true)} title="Minimize" style={{ background: 'rgba(0,0,0,0.05)', border: `1px solid rgba(0,0,0,0.12)`, borderRadius: 9, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: NEON.textDim, cursor: 'pointer' }}>
                    <Minus style={{ width: 14, height: 14 }} />
                  </button>
                  <button onClick={() => setIsSupportOpen(false)} title="Close" style={{ background: 'rgba(0,0,0,0.05)', border: `1px solid rgba(0,0,0,0.12)`, borderRadius: 9, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: NEON.textDim, cursor: 'pointer' }}>
                    <X style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="sm-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

              {/* LIST VIEW */}
              {view === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {!isLoggedIn && (
                    <div style={{ background: 'rgba(224,32,32,0.05)', border: '1.5px solid rgba(224,32,32,0.25)', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertCircle style={{ width: 15, height: 15, color: '#e02020', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>Log in to save &amp; sync your tickets!</span>
                      </div>
                      <button onClick={() => openAuth('login')} style={{ background: 'linear-gradient(135deg,#e02020,#c0392b)', border: 'none', borderRadius: 10, padding: '5px 12px', color: '#ffffff', fontSize: 10, fontWeight: 900, cursor: 'pointer', flexShrink: 0 }}>Log In</button>
                    </div>
                  )}
                  {userTickets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 16px 32px' }}>
                      <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg, rgba(224,32,32,0.08), rgba(192,57,43,0.1))', border: `1.5px solid rgba(224,32,32,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 20px rgba(224,32,32,0.1)' }}>
                        <MessageSquare style={{ width: 28, height: 28, color: NEON.cyan }} />
                      </div>
                      <h4 style={{ margin: '0 0 8px', fontWeight: 900, fontSize: 15, color: '#1a1a1a' }}>No Support Tickets Yet</h4>
                      <p style={{ margin: '0 0 20px', fontSize: 12, color: NEON.textDim, lineHeight: 1.6, maxWidth: 260, marginLeft: 'auto', marginRight: 'auto' }}>Need help with your top-up, payment, or account? Open a ticket and we'll assist instantly!</p>
                      <button onClick={() => setView('create')} style={{ background: 'linear-gradient(135deg,#e02020,#c0392b)', border: 'none', borderRadius: 16, padding: '12px 28px', color: '#ffffff', fontWeight: 900, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(224,32,32,0.35)' }}>
                        <Plus style={{ width: 15, height: 15 }} /> Open New Ticket
                      </button>
                    </div>
                  ) : (
                    userTickets.map(tck => (
                      <div key={tck.id} onClick={() => handleOpenChat(tck.id)}
                        className="sm-card"
                        style={{ background: NEON.surface, border: `1.5px solid rgba(0,0,0,0.08)`, borderRadius: 18, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.18s', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: NEON.textDim, fontFamily: 'monospace' }}>{tck.id}</span>
                            <span style={{ fontSize: 9, background: 'rgba(224,32,32,0.08)', color: '#c0392b', border: '1px solid rgba(224,32,32,0.25)', padding: '2px 8px', borderRadius: 99, fontWeight: 800 }}>{tck.category}</span>
                          </div>
                          {getStatusBadge(tck.status)}
                        </div>
                        <h4 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: 12, color: '#1a1a1a' }}>{tck.subject}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          {/* Bug 7 fix: show date for old tickets instead of time-only */}
                          <span style={{ fontSize: 10, color: NEON.textDim }}>{(() => { const d = new Date(tck.updatedAt); const isToday = new Date().toDateString() === d.toDateString(); return isToday ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' }); })()}</span>
                          <span style={{ fontSize: 10, color: NEON.cyan, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3 }}>View Chat <ChevronRight style={{ width: 12, height: 12 }} /></span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* CREATE VIEW */}
              {view === 'create' && (
                <form onSubmit={handleCreateTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: NEON.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Inquiry Type</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { val: 'Order Issue', icon: '📦', label: 'Order Issue' },
                        { val: 'Wallet Deposit', icon: '💰', label: 'Wallet / Payment' },
                        { val: 'Game ID Verification', icon: '🎮', label: 'Game ID Help' },
                        { val: 'General Inquiry', icon: '❓', label: 'General' },
                      ].map(opt => (
                        <button key={opt.val} type="button" onClick={() => setCategory(opt.val)}
                          style={{ border: `1.5px solid ${category === opt.val ? '#e02020' : 'rgba(0,0,0,0.12)'}`, background: category === opt.val ? 'rgba(224,32,32,0.07)' : NEON.surface, borderRadius: 14, padding: '10px 8px', cursor: 'pointer', textAlign: 'center', fontSize: 11, fontWeight: 700, color: category === opt.val ? '#e02020' : '#666666', transition: 'all 0.15s', boxShadow: category === opt.val ? '0 4px 14px rgba(224,32,32,0.15)' : 'none' }}>
                          <div style={{ fontSize: 18, marginBottom: 4 }}>{opt.icon}</div>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {userOrders && userOrders.length > 0 && (
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: NEON.textDim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Link Related Order</label>
                      <select value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)} style={{ width: '100%', background: NEON.surface, border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 14, padding: '10px 14px', fontSize: 12, outline: 'none', color: '#1a1a1a' }} {...inputFocusHandlers}>
                        <option value="">— No specific order —</option>
                        {userOrders.map(o => <option key={o.id} value={o.id}>{o.id} · {o.gameName} ({o.packageName})</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: NEON.textDim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Subject</label>
                    <input type="text" placeholder="e.g. Free Fire diamonds not received" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', background: NEON.surface, border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 14, padding: '10px 14px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#1a1a1a', boxSizing: 'border-box', transition: 'box-shadow 0.15s, border-color 0.15s' }} {...inputFocusHandlers} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontSize: 10, fontWeight: 900, color: NEON.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Detailed Message</label>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {QUICK_CHIPS.map(chip => (
                        <button key={chip.label} type="button" onClick={() => applyChip(chip, setInitialMessage, initialMessage)}
                          style={{ fontSize: 10, fontWeight: 700, color: '#e02020', background: 'rgba(224,32,32,0.06)', border: `1px solid rgba(224,32,32,0.2)`, borderRadius: 99, padding: '5px 11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {chip.label}
                        </button>
                      ))}
                    </div>
                    <textarea rows={4} placeholder="Describe your issue in detail..." value={initialMessage} onChange={e => setInitialMessage(e.target.value)} required style={{ width: '100%', background: NEON.surface, border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 14, padding: '10px 14px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#1a1a1a', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6, transition: 'box-shadow 0.15s, border-color 0.15s' }} {...inputFocusHandlers} />
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.02)', border: `1.5px dashed rgba(224,32,32,0.25)`, borderRadius: 16, padding: '12px 14px' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#555555', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Image style={{ width: 14, height: 14, color: NEON.cyan }} /> Attach Screenshot (Optional)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} style={{ fontSize: 11, color: NEON.textDim, flex: 1 }} />
                      {isUploading && <span style={{ fontSize: 11, color: NEON.cyan, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><RefreshCw style={{ width: 12, height: 12, animation: 'smSpin 1s linear infinite' }} /> Uploading...</span>}
                    </div>
                    {attachmentUrl && (
                      <div style={{ marginTop: 10 }}>
                        <div className="sm-thumb" onClick={() => setLightboxUrl(attachmentUrl)} style={{ position: 'relative', width: 84, height: 84, borderRadius: 12, overflow: 'hidden', cursor: 'zoom-in', border: `1.5px solid rgba(224,32,32,0.2)` }}>
                          <img src={attachmentUrl} alt="Attachment preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <div className="sm-thumb-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}>
                            <ZoomIn style={{ width: 18, height: 18, color: '#fff' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <button type="submit"
                    style={{ background: 'linear-gradient(135deg,#e02020,#c0392b)', border: 'none', borderRadius: 18, padding: 14, color: '#ffffff', fontWeight: 900, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(224,32,32,0.4)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(224,32,32,0.55)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(224,32,32,0.4)'; }}
                  >
                    <Send style={{ width: 16, height: 16 }} /> Submit Support Ticket
                  </button>
                </form>
              )}

              {/* CHAT VIEW */}
              {view === 'chat' && currentTicket && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
                  <div style={{ background: NEON.surface, border: `1.5px solid rgba(0,0,0,0.08)`, borderRadius: 16, padding: '12px 14px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 12, color: '#1a1a1a' }}>{currentTicket.subject}</span>
                      {getStatusBadge(currentTicket.status)}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 10, color: NEON.textDim, fontFamily: 'monospace' }}>
                      <span>#{currentTicket.id}</span>
                      <span>· {currentTicket.category}</span>
                      {currentTicket.orderId && <span style={{ color: NEON.cyan, fontWeight: 700 }}>· {currentTicket.orderId}</span>}
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 4 }}>
                    {currentTicket.messages.map(msg => {
                      const isAdmin = msg.sender === 'admin';
                      return (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-start' : 'flex-end' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            {isAdmin && (
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#e02020,#c0392b)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(224,32,32,0.4)' }}>
                                <Headset style={{ width: 10, height: 10, color: '#ffffff' }} />
                              </div>
                            )}
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#555555' }}>{msg.senderName || (isAdmin ? 'MADS Support' : 'You')}</span>
                            <span style={{ fontSize: 9, color: NEON.textDim }}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div style={{
                            maxWidth: '85%', padding: '10px 14px',
                            borderRadius: isAdmin ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                            fontSize: 12, fontWeight: 500, lineHeight: 1.6,
                            background: isAdmin ? '#f0f0f0' : 'linear-gradient(135deg,#e02020,#c0392b)',
                            color: isAdmin ? '#1a1a1a' : '#ffffff',
                            border: isAdmin ? '1.5px solid rgba(0,0,0,0.08)' : '1px solid rgba(192,57,43,0.5)',
                            boxShadow: isAdmin ? '0 2px 8px rgba(0,0,0,0.06)' : '0 4px 16px rgba(224,32,32,0.3)'
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
                  <form onSubmit={handleSendReply} style={{ borderTop: `1px solid rgba(0,0,0,0.08)`, paddingTop: 12, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }} className="sm-chip-row">
                      {QUICK_CHIPS.map(chip => (
                        <button key={chip.label} type="button" onClick={() => applyChip(chip, setReplyText, replyText)}
                          style={{ fontSize: 10, fontWeight: 700, color: '#e02020', background: 'rgba(224,32,32,0.06)', border: `1px solid rgba(224,32,32,0.2)`, borderRadius: 99, padding: '5px 11px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {chip.label}
                        </button>
                      ))}
                    </div>
                    {attachmentUrl && (
                      <div style={{ fontSize: 10, background: 'rgba(22,163,74,0.08)', color: '#15803d', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 10, padding: '5px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'monospace' }}>
                        <span>✔ Screenshot attached</span>
                        <button type="button" onClick={() => setAttachmentUrl('')} style={{ color: '#dc2626', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10 }}>✕ Remove</button>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: NEON.surface, border: `1.5px solid rgba(0,0,0,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: NEON.textDim, transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#e02020'; e.currentTarget.style.color = '#e02020'; e.currentTarget.style.boxShadow = '0 0 10px rgba(224,32,32,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; e.currentTarget.style.color = NEON.textDim; e.currentTarget.style.boxShadow = 'none'; }}>
                        <Paperclip style={{ width: 16, height: 16 }} />
                        <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                      </label>
                      <input type="text" placeholder={isUploading ? 'Uploading screenshot...' : 'Type your message...'} value={replyText} onChange={e => setReplyText(e.target.value)}
                        style={{ flex: 1, minWidth: 0, background: NEON.surface, border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 14, padding: '11px 14px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#1a1a1a', transition: 'box-shadow 0.15s, border-color 0.15s' }}
                        {...inputFocusHandlers} />
                      <button type="submit" disabled={!replyText.trim() && !attachmentUrl}
                        style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: (!replyText.trim() && !attachmentUrl) ? 'rgba(0,0,0,0.06)' : 'linear-gradient(135deg,#e02020,#c0392b)', border: 'none', color: (!replyText.trim() && !attachmentUrl) ? NEON.textDim : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (!replyText.trim() && !attachmentUrl) ? 'not-allowed' : 'pointer', boxShadow: (!replyText.trim() && !attachmentUrl) ? 'none' : '0 4px 14px rgba(224,32,32,0.4)', transition: 'transform 0.12s, box-shadow 0.12s' }}
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
                  <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(224,32,32,0.06)', border: `1.5px solid rgba(224,32,32,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <AlertCircle style={{ width: 26, height: 26, color: NEON.cyan }} />
                  </div>
                  <h4 style={{ margin: '0 0 8px', fontWeight: 900, fontSize: 15, color: '#1a1a1a' }}>Ticket Not Found</h4>
                  <p style={{ margin: '0 0 20px', fontSize: 12, color: NEON.textDim, lineHeight: 1.6, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>This ticket could not be loaded or may have been closed.</p>
                  <button onClick={() => setView('list')} style={{ background: 'linear-gradient(135deg,#e02020,#c0392b)', border: 'none', borderRadius: 14, padding: '10px 24px', color: '#ffffff', fontWeight: 800, fontSize: 12, cursor: 'pointer', boxShadow: '0 4px 14px rgba(224,32,32,0.35)' }}>
                    Back to Tickets
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ background: 'rgba(224,32,32,0.03)', borderTop: `1px solid rgba(224,32,32,0.12)`, padding: '9px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0 }}>
              <ShieldCheck style={{ width: 12, height: 12, color: '#16a34a' }} />
              <span style={{ fontSize: 9.5, color: NEON.textDim, fontWeight: 600, letterSpacing: '0.06em', fontFamily: 'monospace' }}>MADS TOPUP · 256-BIT ENCRYPTED SUPPORT</span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', boxShadow: `0 0 6px #16a34a`, animation: 'smPulse 1.6s ease-in-out infinite' }} />
            </div>

          </div>
        </div>
      )}

      {/* Fullscreen image lightbox */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out', animation: 'smFadeIn 0.15s ease' }}>
          <button onClick={() => setLightboxUrl(null)} aria-label="Close preview" style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.12)', border: `1px solid rgba(255,255,255,0.2)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
          <img src={lightboxUrl} alt="Full preview" onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 16, boxShadow: `0 0 60px rgba(224,32,32,0.2), 0 20px 60px rgba(0,0,0,0.4)`, border: `1px solid rgba(255,255,255,0.15)`, cursor: 'default' }} />
        </div>
      )}

      <style>{`
        @keyframes smSlide { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        @keyframes smFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes smPing { 75%,100% { transform:scale(2.1); opacity:0; } }
        @keyframes smSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes smPulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
        .sm-card:hover { border-color: rgba(224,32,32,0.35) !important; box-shadow: 0 4px 18px rgba(224,32,32,0.1) !important; transform: translateY(-1px); }
        .sm-thumb:hover .sm-thumb-overlay { opacity: 1 !important; }
        .sm-scroll::-webkit-scrollbar { width: 6px; }
        .sm-scroll::-webkit-scrollbar-track { background: transparent; }
        .sm-scroll::-webkit-scrollbar-thumb { background: rgba(224,32,32,0.25); border-radius: 99px; }
        .sm-chip-row::-webkit-scrollbar { height: 0; }
        @media (max-width: 640px) {
          .sm-overlay { padding: 0 !important; align-items: stretch !important; }
          .sm-panel { max-width: 100% !important; height: 100vh !important; height: 100dvh !important; border-radius: 0 !important; }
        }
      `}</style>
    </>
  );
};
