import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { uploadToR2Storage } from '../services/storageService';
import { orderBelongsToUser, filterUserOrders } from '../utils/ownership';
import {
  MessageSquare, X, Send, Paperclip, Plus, AlertCircle,
  ShieldCheck, ChevronLeft, RefreshCw, Image, Headset, ChevronRight, Minus, ZoomIn
} from 'lucide-react';

// Cyberpunk / neon gaming theme tokens
const NEON = {
  cyan: '#00f0ff',
  violet: '#8b5cf6',
  green: '#39ff88',
  bg: '#0b0f19',
  bgDeep: '#07090e',
  surface: '#111827',
  surface2: '#161f2e',
  border: 'rgba(0,240,255,0.18)',
  borderViolet: 'rgba(139,92,246,0.25)',
  textDim: '#8b96ad',
};

const QUICK_CHIPS = [
  { label: '💳 Payment Pending', text: 'My payment is pending / not verified yet. Can you please check?' },
  { label: '📦 Order Status', text: 'Can you please check the current status of my order?' },
  { label: '💰 Wallet Recharge Help', text: 'I need help with my wallet recharge / top-up.' },
];

// Contextual quick-reply chips for use inside an open ticket conversation
const CHAT_CHIPS = [
  { label: '⏳ Still Waiting', text: 'I am still waiting for a response. Could you please update me on this?' },
  { label: '✅ Resolved', text: 'My issue has been resolved. Thank you for your help!' },
  { label: '📸 More Info', text: 'Here is some additional information that may help resolve my issue:' },
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
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');

  // Refs to reset file inputs on upload failure or view switch
  const fileInputCreateRef = useRef(null);
  const fileInputChatRef = useRef(null);

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
    if (isSupportOpen) setIsMinimized(false);
  }, [isSupportOpen]);

  useEffect(() => {
    if (!lightboxUrl) return;
    const onKey = (e) => { if (e.key === 'Escape') setLightboxUrl(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxUrl]);

  // Reset attachment state and file inputs whenever the active view changes
  useEffect(() => {
    setAttachmentUrl('');
    if (fileInputCreateRef.current) fileInputCreateRef.current.value = '';
    if (fileInputChatRef.current) fileInputChatRef.current.value = '';
  }, [view]);

  // Auto-redirect: if a ticket disappears from Firestore while in chat view, go back to list
  useEffect(() => {
    if (view === 'chat' && !currentTicket && activeTicketId) {
      const t = setTimeout(() => setView('list'), 1500);
      return () => clearTimeout(t);
    }
  }, [view, currentTicket, activeTicketId]);

  const handleOpenChat = (ticketId) => {
    setActiveTicketId(ticketId);
    setView('chat');
  };

  // Allow any user (authenticated or guest) to open the create ticket form
  const handleNewTicket = () => {
    setView('create');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    // Uses the verified /api/upload-file → Cloudflare R2 pipeline (storageService.js)
    // so attachments actually persist and display reliably.
    const res = await uploadToR2Storage(file, 'support-attachments');
    setIsUploading(false);
    if (res.success) {
      setAttachmentUrl(res.url);
      showToast('Image screenshot uploaded to support system!');
    } else {
      // Reset the DOM file input so the user can immediately reselect the same file
      if (fileInputCreateRef.current) fileInputCreateRef.current.value = '';
      if (fileInputChatRef.current) fileInputChatRef.current.value = '';
      showToast(res.error || 'Upload failed', 'error');
    }
  };

  const handleCreateTicketSubmit = (e) => {
    e.preventDefault();
    if (!initialMessage.trim()) {
      showToast('Please type your message!', 'error');
      return;
    }
    try {
      const isEmail = guestContact.includes('@');
      const created = createSupportTicket({
        subject: subject.trim() || `${category} Support Request`,
        category,
        message: initialMessage.trim(),
        orderId: selectedOrderId || null,
        attachmentUrl: attachmentUrl || null,
        userName: guestName.trim() || userProfile?.name || 'Verified Gamer',
        userEmail: isEmail ? guestContact.trim() : (userProfile?.email || 'customer@madstopup.com'),
        userPhone: !isEmail && guestContact.trim() ? guestContact.trim() : (userProfile?.phone || '')
      });
      setSubject('');
      setCategory('Order Issue');
      setInitialMessage('');
      setSelectedOrderId('');
      setAttachmentUrl('');
      setGuestName('');
      setGuestContact('');
      if (fileInputCreateRef.current) fileInputCreateRef.current.value = '';
      if (created?.id) {
        setActiveTicketId(created.id);
      }
      setView('chat');
    } catch (err) {
      showToast('Failed to create ticket. Please try again.', 'error');
    }
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() && !attachmentUrl) return;
    if (!currentTicket) return;

    sendTicketMessage(currentTicket.id, replyText.trim(), 'user', attachmentUrl);
    setReplyText('');
    setAttachmentUrl('');
    if (fileInputChatRef.current) fileInputChatRef.current.value = '';
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

  // Return tickets owned by this user (by account uid/email/phone) or created on this local browser
  const userTickets = (supportTickets || []).filter(t => {
    if (!t || !t.id) return false;
    let myIds = [];
    try { myIds = JSON.parse(localStorage.getItem('mads_my_ticket_ids') || '[]'); } catch (e) {}
    if (myIds.includes(t.id) || (activeTicketId && t.id === activeTicketId)) return true;
    if (isLoggedIn && userProfile) {
      if (userProfile.uid && (t.userId === userProfile.uid || t.uid === userProfile.uid)) return true;
      if (userProfile.email && (t.userEmail?.toLowerCase() === userProfile.email.toLowerCase() || t.email?.toLowerCase() === userProfile.email.toLowerCase())) return true;
      if (userProfile.phone && (t.phone === userProfile.phone || t.userPhone === userProfile.phone)) return true;
    }
    return false;
  });

  // Filter orders strictly for current user
  const userOrders = !isLoggedIn ? [] : filterUserOrders(orders, userProfile);

  const applyChip = (chip, setter, currentVal) => {
    setter(currentVal && currentVal.trim() ? `${currentVal.trim()} ${chip.text}` : chip.text);
  };

  const inputFocusHandlers = {
    onFocus: e => { e.target.style.borderColor = NEON.cyan; e.target.style.boxShadow = `0 0 0 3px rgba(0,240,255,0.15), 0 0 18px rgba(0,240,255,0.25)`; },
    onBlur: e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }
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
          style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 40, width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,#0b0f19,#161f2e)', color: NEON.cyan, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${NEON.cyan}66`, cursor: 'pointer', boxShadow: `0 0 0 1px rgba(139,92,246,0.2), 0 8px 28px rgba(0,0,0,0.5), 0 0 24px rgba(0,240,255,0.35)`, transition: 'transform 0.2s, box-shadow 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = `0 0 0 1px rgba(139,92,246,0.35), 0 10px 34px rgba(0,0,0,0.55), 0 0 34px rgba(0,240,255,0.55)`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 0 0 1px rgba(139,92,246,0.2), 0 8px 28px rgba(0,0,0,0.5), 0 0 24px rgba(0,240,255,0.35)`; }}
        >
          <Headset style={{ width: 24, height: 24, filter: `drop-shadow(0 0 6px ${NEON.cyan})` }} />
          <span style={{ position: 'absolute', top: 3, right: 3, width: 12, height: 12, background: NEON.green, borderRadius: '50%', border: '2px solid #0b0f19', boxShadow: `0 0 8px ${NEON.green}` }} />
          <span style={{ position: 'absolute', top: 3, right: 3, width: 12, height: 12, background: NEON.green, borderRadius: '50%', animation: 'smPing 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
          {isMinimized && currentTicket && (
            <span style={{ position: 'absolute', bottom: -6, left: -6, background: 'linear-gradient(135deg,#00f0ff,#8b5cf6)', color: '#04050a', fontSize: 9, fontWeight: 900, borderRadius: 99, padding: '2px 6px', boxShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>chat</span>
          )}
        </button>
      )}

      {/* Main Support Drawer / Modal Overlay */}
      {isSupportOpen && !isMinimized && (
        <div className="sm-overlay" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: 16, background: 'rgba(4,5,10,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="sm-panel" style={{
            width: '100%', maxWidth: 440, height: '92vh', borderRadius: 26,
            display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'smSlide 0.28s cubic-bezier(0.16,1,0.3,1)',
            background: 'linear-gradient(180deg, rgba(11,15,25,0.92), rgba(7,9,14,0.95))',
            backdropFilter: 'blur(18px) saturate(140%)',
            WebkitBackdropFilter: 'blur(18px) saturate(140%)',
            border: `1px solid ${NEON.border}`,
            boxShadow: `0 0 0 1px rgba(139,92,246,0.12), 0 30px 90px rgba(0,0,0,0.6), 0 0 60px rgba(0,240,255,0.08), inset 0 1px 0 rgba(255,255,255,0.04)`
          }}>

            {/* Header */}
            <div style={{ position: 'relative', flexShrink: 0, padding: '18px 18px 15px', background: 'linear-gradient(135deg, rgba(0,240,255,0.08), rgba(139,92,246,0.1))', borderBottom: `1px solid ${NEON.border}`, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #00f0ff, #8b5cf6, transparent)', boxShadow: '0 0 12px rgba(0,240,255,0.6)' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {view !== 'list' && (
                    <button onClick={() => setView('list')} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${NEON.border}`, borderRadius: 10, padding: '6px 8px', color: NEON.cyan, cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                      <ChevronLeft style={{ width: 16, height: 16 }} />
                    </button>
                  )}
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg,#00f0ff,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 18px rgba(0,240,255,0.45)' }}>
                    <Headset style={{ width: 19, height: 19, color: '#04050a' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <h3 style={{ margin: 0, fontWeight: 900, fontSize: 13.5, color: '#f1f5f9', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>MADS SUPPORT</h3>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 800, color: NEON.green, background: 'rgba(57,255,136,0.1)', border: '1px solid rgba(57,255,136,0.35)', padding: '2px 8px', borderRadius: 99, textShadow: '0 0 6px rgba(57,255,136,0.6)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: NEON.green, boxShadow: `0 0 6px ${NEON.green}`, animation: 'smPulse 1.6s ease-in-out infinite' }} />
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
                    <button onClick={handleNewTicket} style={{ background: 'linear-gradient(135deg,#00f0ff,#8b5cf6)', border: 'none', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 900, color: '#04050a', boxShadow: '0 0 16px rgba(0,240,255,0.35)' }}>
                      <Plus style={{ width: 13, height: 13 }} /> New
                    </button>
                  )}
                  <button onClick={() => setIsMinimized(true)} title="Minimize" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${NEON.border}`, borderRadius: 9, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: NEON.textDim, cursor: 'pointer' }}>
                    <Minus style={{ width: 14, height: 14 }} />
                  </button>
                  <button onClick={() => setIsSupportOpen(false)} title="Close" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${NEON.border}`, borderRadius: 9, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: NEON.textDim, cursor: 'pointer' }}>
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
                    <div style={{ background: 'rgba(250,204,21,0.06)', border: '1.5px solid rgba(250,204,21,0.3)', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertCircle style={{ width: 15, height: 15, color: '#facc15', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: '#fde68a', fontWeight: 600 }}>Log in to save &amp; sync your tickets!</span>
                      </div>
                      <button onClick={() => openAuth('login')} style={{ background: '#facc15', border: 'none', borderRadius: 10, padding: '5px 12px', color: '#1c1917', fontSize: 10, fontWeight: 900, cursor: 'pointer', flexShrink: 0 }}>Log In</button>
                    </div>
                  )}
                  {userTickets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 16px 32px' }}>
                      <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg, rgba(0,240,255,0.1), rgba(139,92,246,0.14))', border: `1.5px solid ${NEON.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 30px rgba(0,240,255,0.12)' }}>
                        <MessageSquare style={{ width: 28, height: 28, color: NEON.cyan }} />
                      </div>
                      <h4 style={{ margin: '0 0 8px', fontWeight: 900, fontSize: 15, color: '#f1f5f9' }}>No Support Tickets Yet</h4>
                      <p style={{ margin: '0 0 20px', fontSize: 12, color: NEON.textDim, lineHeight: 1.6, maxWidth: 260, marginLeft: 'auto', marginRight: 'auto' }}>Need help with your top-up, payment, or account? Open a ticket and we'll assist instantly!</p>
                      <button onClick={handleNewTicket} style={{ background: 'linear-gradient(135deg,#00f0ff,#8b5cf6)', border: 'none', borderRadius: 16, padding: '12px 28px', color: '#04050a', fontWeight: 900, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 0 24px rgba(0,240,255,0.35)' }}>
                        <Plus style={{ width: 15, height: 15 }} /> Open New Ticket
                      </button>
                    </div>
                  ) : (
                    userTickets.map(tck => (
                      <div key={tck.id} onClick={() => handleOpenChat(tck.id)}
                        className="sm-card"
                        style={{ background: NEON.surface, border: `1.5px solid rgba(255,255,255,0.08)`, borderRadius: 18, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.18s', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: NEON.textDim, fontFamily: 'monospace' }}>{tck.id}</span>
                            <span style={{ fontSize: 9, background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.35)', padding: '2px 8px', borderRadius: 99, fontWeight: 800 }}>{tck.category}</span>
                          </div>
                          {getStatusBadge(tck.status)}
                        </div>
                        <h4 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: 12, color: '#e2e8f0' }}>{tck.subject}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 10, color: NEON.textDim }}>{(() => { const d = new Date(tck.updatedAt); const now = new Date(); return d.toDateString() === now.toDateString() ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); })()}</span>
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
                  {!isLoggedIn && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'rgba(0,240,255,0.03)', padding: 12, borderRadius: 14, border: `1px dashed ${NEON.border}` }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: NEON.textDim, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Name</label>
                        <input type="text" placeholder="e.g. Kasun SLAyer" value={guestName} onChange={e => setGuestName(e.target.value)} style={{ width: '100%', background: NEON.surface, border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', fontSize: 11, fontFamily: 'inherit', outline: 'none', color: '#e2e8f0', boxSizing: 'border-box' }} {...inputFocusHandlers} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: NEON.textDim, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>WhatsApp or Email</label>
                        <input type="text" placeholder="e.g. 0771234567 or email" value={guestContact} onChange={e => setGuestContact(e.target.value)} style={{ width: '100%', background: NEON.surface, border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', fontSize: 11, fontFamily: 'inherit', outline: 'none', color: '#e2e8f0', boxSizing: 'border-box' }} {...inputFocusHandlers} />
                      </div>
                    </div>
                  )}
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
                          style={{ border: `1.5px solid ${category === opt.val ? NEON.cyan : 'rgba(255,255,255,0.1)'}`, background: category === opt.val ? 'rgba(0,240,255,0.08)' : NEON.surface, borderRadius: 14, padding: '10px 8px', cursor: 'pointer', textAlign: 'center', fontSize: 11, fontWeight: 700, color: category === opt.val ? NEON.cyan : '#94a3b8', transition: 'all 0.15s', boxShadow: category === opt.val ? '0 0 14px rgba(0,240,255,0.2)' : 'none' }}>
                          <div style={{ fontSize: 18, marginBottom: 4 }}>{opt.icon}</div>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {userOrders && userOrders.length > 0 && (
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: NEON.textDim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Link Related Order</label>
                      <select value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)} style={{ width: '100%', background: NEON.surface, border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 14px', fontSize: 12, outline: 'none', color: '#e2e8f0' }} {...inputFocusHandlers}>
                        <option value="">— No specific order —</option>
                        {userOrders.map(o => <option key={o.id} value={o.id}>{o.id} · {o.gameName} ({o.packageName})</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: NEON.textDim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Subject</label>
                    <input type="text" placeholder="e.g. Free Fire diamonds not received" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', background: NEON.surface, border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 14px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#e2e8f0', boxSizing: 'border-box', transition: 'box-shadow 0.15s, border-color 0.15s' }} {...inputFocusHandlers} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontSize: 10, fontWeight: 900, color: NEON.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Detailed Message</label>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {QUICK_CHIPS.map(chip => (
                        <button key={chip.label} type="button" onClick={() => applyChip(chip, setInitialMessage, initialMessage)}
                          style={{ fontSize: 10, fontWeight: 700, color: NEON.cyan, background: 'rgba(0,240,255,0.06)', border: `1px solid ${NEON.border}`, borderRadius: 99, padding: '5px 11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {chip.label}
                        </button>
                      ))}
                    </div>
                    <textarea rows={4} placeholder="Describe your issue in detail..." value={initialMessage} onChange={e => setInitialMessage(e.target.value)} required style={{ width: '100%', background: NEON.surface, border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 14px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#e2e8f0', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6, transition: 'box-shadow 0.15s, border-color 0.15s' }} {...inputFocusHandlers} />
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: `1.5px dashed ${NEON.border}`, borderRadius: 16, padding: '12px 14px' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Image style={{ width: 14, height: 14, color: NEON.cyan }} /> Attach Screenshot (Optional)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input ref={fileInputCreateRef} type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} style={{ fontSize: 11, color: NEON.textDim, flex: 1 }} />
                      {isUploading && <span style={{ fontSize: 11, color: NEON.cyan, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><RefreshCw style={{ width: 12, height: 12, animation: 'smSpin 1s linear infinite' }} /> Uploading...</span>}
                    </div>
                    {attachmentUrl && (
                      <div style={{ marginTop: 10 }}>
                        <div className="sm-thumb" onClick={() => setLightboxUrl(attachmentUrl)} style={{ position: 'relative', width: 84, height: 84, borderRadius: 12, overflow: 'hidden', cursor: 'zoom-in', border: `1.5px solid ${NEON.border}` }}>
                          <img src={attachmentUrl} alt="Attachment preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <div className="sm-thumb-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}>
                            <ZoomIn style={{ width: 18, height: 18, color: '#fff' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <button type="submit"
                    style={{ background: 'linear-gradient(135deg,#00f0ff,#8b5cf6)', border: 'none', borderRadius: 18, padding: 14, color: '#04050a', fontWeight: 900, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 0 28px rgba(0,240,255,0.35)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 36px rgba(0,240,255,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(0,240,255,0.35)'; }}
                  >
                    <Send style={{ width: 16, height: 16 }} /> Submit Support Ticket
                  </button>
                </form>
              )}

              {/* CHAT VIEW */}
              {view === 'chat' && currentTicket && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
                  <div style={{ background: NEON.surface, border: `1.5px solid rgba(255,255,255,0.08)`, borderRadius: 16, padding: '12px 14px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 12, color: '#e2e8f0' }}>{currentTicket.subject}</span>
                      {getStatusBadge(currentTicket.status)}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 10, color: NEON.textDim, fontFamily: 'monospace' }}>
                      <span>#{currentTicket.id}</span>
                      <span>· {currentTicket.category}</span>
                      {currentTicket.orderId && <span style={{ color: NEON.cyan, fontWeight: 700 }}>· {currentTicket.orderId}</span>}
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 4 }}>
                    {((Array.isArray(currentTicket.messages) ? currentTicket.messages : Object.values(currentTicket.messages || {})).filter(Boolean)).sort((a, b) => {
                      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                      return ta - tb;
                    }).map(msg => {
                      const isAdmin = msg.sender === 'admin';
                      return (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-start' : 'flex-end' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            {isAdmin && (
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#00f0ff,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(0,240,255,0.45)' }}>
                                <Headset style={{ width: 10, height: 10, color: '#04050a' }} />
                              </div>
                            )}
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>{msg.senderName || (isAdmin ? 'MADS Support' : 'You')}</span>
                            <span style={{ fontSize: 9, color: NEON.textDim }}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div style={{
                            maxWidth: '85%', padding: '10px 14px',
                            borderRadius: isAdmin ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                            fontSize: 12, fontWeight: 500, lineHeight: 1.6,
                            background: isAdmin ? NEON.surface2 : 'linear-gradient(135deg,#00c2d1,#7c3aed)',
                            color: isAdmin ? '#e2e8f0' : '#ffffff',
                            border: isAdmin ? '1.5px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.25)',
                            boxShadow: isAdmin ? '0 2px 10px rgba(0,0,0,0.3)' : '0 0 22px rgba(0,194,209,0.35), 0 0 22px rgba(124,58,237,0.2)'
                          }}>
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                            {msg.attachmentUrl && (
                              <div className="sm-thumb" onClick={() => setLightboxUrl(msg.attachmentUrl)} style={{ position: 'relative', marginTop: 8, borderRadius: 12, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.25)', cursor: 'zoom-in' }}>
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
                  <form onSubmit={handleSendReply} style={{ borderTop: `1px solid rgba(255,255,255,0.08)`, paddingTop: 12, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }} className="sm-chip-row">
                      {CHAT_CHIPS.map(chip => (
                        <button key={chip.label} type="button" onClick={() => applyChip(chip, setReplyText, replyText)}
                          style={{ fontSize: 10, fontWeight: 700, color: NEON.cyan, background: 'rgba(0,240,255,0.06)', border: `1px solid ${NEON.border}`, borderRadius: 99, padding: '5px 11px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {chip.label}
                        </button>
                      ))}
                    </div>
                    {attachmentUrl && (
                      <div style={{ fontSize: 10, background: 'rgba(57,255,136,0.08)', color: '#86efac', border: '1px solid rgba(57,255,136,0.3)', borderRadius: 10, padding: '5px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'monospace' }}>
                        <span>✔ Screenshot attached</span>
                        <button type="button" onClick={() => setAttachmentUrl('')} style={{ color: '#fca5a5', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10 }}>✕ Remove</button>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: NEON.surface, border: `1.5px solid rgba(255,255,255,0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: NEON.textDim, transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = NEON.cyan; e.currentTarget.style.color = NEON.cyan; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,240,255,0.3)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = NEON.textDim; e.currentTarget.style.boxShadow = 'none'; }}>
                        <Paperclip style={{ width: 16, height: 16 }} />
                        <input ref={fileInputChatRef} type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} style={{ display: 'none' }} />
                      </label>
                      <input type="text" placeholder={isUploading ? 'Uploading screenshot...' : 'Type your message...'} value={replyText} onChange={e => setReplyText(e.target.value)}
                        style={{ flex: 1, minWidth: 0, background: NEON.surface, border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '11px 14px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#e2e8f0', transition: 'box-shadow 0.15s, border-color 0.15s' }}
                        {...inputFocusHandlers} />
                      <button type="submit" disabled={!replyText.trim() && !attachmentUrl}
                        style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: (!replyText.trim() && !attachmentUrl) ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#00f0ff,#8b5cf6)', border: 'none', color: (!replyText.trim() && !attachmentUrl) ? NEON.textDim : '#04050a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (!replyText.trim() && !attachmentUrl) ? 'not-allowed' : 'pointer', boxShadow: (!replyText.trim() && !attachmentUrl) ? 'none' : '0 0 18px rgba(0,240,255,0.4)', transition: 'transform 0.12s, box-shadow 0.12s' }}
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
                  <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(0,240,255,0.06)', border: `1.5px solid ${NEON.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <AlertCircle style={{ width: 26, height: 26, color: NEON.cyan }} />
                  </div>
                  <h4 style={{ margin: '0 0 8px', fontWeight: 900, fontSize: 15, color: '#f1f5f9' }}>Ticket Not Found</h4>
                  <p style={{ margin: '0 0 20px', fontSize: 12, color: NEON.textDim, lineHeight: 1.6, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>This ticket could not be loaded or may have been closed.</p>
                  <button onClick={() => setView('list')} style={{ background: 'linear-gradient(135deg,#00f0ff,#8b5cf6)', border: 'none', borderRadius: 14, padding: '10px 24px', color: '#04050a', fontWeight: 800, fontSize: 12, cursor: 'pointer', boxShadow: '0 0 22px rgba(0,240,255,0.35)' }}>
                    Back to Tickets
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderTop: `1px solid rgba(255,255,255,0.06)`, padding: '9px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0 }}>
              <ShieldCheck style={{ width: 12, height: 12, color: NEON.green }} />
              <span style={{ fontSize: 9.5, color: NEON.textDim, fontWeight: 600, letterSpacing: '0.06em', fontFamily: 'monospace' }}>MADS TOPUP · 256-BIT ENCRYPTED SUPPORT</span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: NEON.green, display: 'inline-block', boxShadow: `0 0 6px ${NEON.green}`, animation: 'smPulse 1.6s ease-in-out infinite' }} />
            </div>

          </div>
        </div>
      )}

      {/* Fullscreen image lightbox */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(3,4,8,0.92)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out', animation: 'smFadeIn 0.15s ease' }}>
          <button onClick={() => setLightboxUrl(null)} aria-label="Close preview" style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: `1px solid ${NEON.border}`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
          <img
            src={lightboxUrl}
            alt="Full preview"
            onClick={e => e.stopPropagation()}
            onError={e => {
              e.target.style.display = 'none';
              const fb = e.target.nextSibling;
              if (fb) fb.style.display = 'flex';
            }}
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 16, boxShadow: `0 0 60px rgba(0,240,255,0.25), 0 0 100px rgba(139,92,246,0.15)`, border: `1px solid ${NEON.border}`, cursor: 'default' }}
          />
          <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#f87171', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
            <AlertCircle style={{ width: 32, height: 32, color: '#f87171' }} />
            <span>Image could not be loaded</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes smSlide { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        @keyframes smFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes smPing { 75%,100% { transform:scale(2.1); opacity:0; } }
        @keyframes smSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes smPulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
        .sm-card:hover { border-color: rgba(0,240,255,0.45) !important; box-shadow: 0 4px 22px rgba(0,240,255,0.14) !important; transform: translateY(-1px); }
        .sm-thumb:hover .sm-thumb-overlay { opacity: 1 !important; }
        .sm-scroll::-webkit-scrollbar { width: 6px; }
        .sm-scroll::-webkit-scrollbar-track { background: transparent; }
        .sm-scroll::-webkit-scrollbar-thumb { background: rgba(0,240,255,0.25); border-radius: 99px; }
        .sm-chip-row::-webkit-scrollbar { height: 0; }
        @media (max-width: 640px) {
          .sm-overlay { padding: 0 !important; align-items: stretch !important; }
          .sm-panel { max-width: 100% !important; height: 100vh !important; height: 100dvh !important; border-radius: 0 !important; }
        }
      `}</style>
    </>
  );
};
