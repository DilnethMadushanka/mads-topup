import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { uploadToR2Storage } from '../services/storageService';
import { 
  MessageSquare, X, Send, Paperclip, Plus, AlertCircle,
  ShieldCheck, ChevronLeft, RefreshCw, Image, Headset, ChevronRight
} from 'lucide-react';

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
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Order Issue');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [replyText, setReplyText] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Active Ticket Object — Bug 3: no [0] fallback; null if no match
  const currentTicket = (supportTickets || []).find(t => t.id === activeTicketId) || null;

  // Bug 2: auto-scroll chat to newest message
  const messagesEndRef = useRef(null);
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentTicket?.messages?.length, activeTicketId]);

  const handleOpenChat = (ticketId) => {
    setActiveTicketId(ticketId);
    setView('chat');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentFile(file);
    setIsUploading(true);
    const res = await uploadToR2Storage(file, 'support-attachments');
    setIsUploading(false);
    if (res.success) {
      setAttachmentUrl(res.url);
      showToast('Image screenshot uploaded to support system!');
    } else {
      showToast('Upload failed', 'error');
    }
  };

  const handleCreateTicketSubmit = (e) => {
    e.preventDefault();
    if (!initialMessage.trim()) {
      showToast('Please type your message!', 'error');
      return;
    }

    const created = createSupportTicket({
      subject: subject.trim() || `${category} Support Request`,
      category,
      message: initialMessage.trim(),
      orderId: selectedOrderId || null,
      attachmentUrl: attachmentUrl || null
    });

    setSubject('');
    setCategory('Order Issue'); // Bug 6: reset category to default
    setInitialMessage('');
    setSelectedOrderId('');
    setAttachmentUrl('');
    setAttachmentFile(null);
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
      OPEN:        { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: '🟡' },
      IN_PROGRESS: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: '🔵' },
      RESOLVED:    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: '✅' },
      CLOSED:      { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', icon: '⚫' },
    };
    const s = map[status] || map.CLOSED;
    return (
      <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 9px', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}`, letterSpacing: '0.06em' }}>
        {s.icon} {status?.replace('_', ' ')}
      </span>
    );
  };

  // Bug 1: Return empty array when not logged in — prevents data leak to unauthenticated users
  const userTickets = !isLoggedIn
    ? []
    : (supportTickets || []).filter(t =>
        t.userEmail?.toLowerCase() === userProfile?.email?.toLowerCase() ||
        t.userId === userProfile?.uid
      );

  return (
    <>
      {/* Global 24/7 Support Floating Button */}
      <button
        onClick={() => setIsSupportOpen(true)}
        aria-label="Open 24/7 Live Customer Support"
        title="24/7 Live Customer Support"
        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 40, width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#cc040a,#ff3b41)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(204,4,10,0.45)', border: 'none', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(204,4,10,0.55)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(204,4,10,0.45)'; }}
      >
        <Headset style={{ width: 24, height: 24 }} />
        <span style={{ position: 'absolute', top: 2, right: 2, width: 13, height: 13, background: '#22c55e', borderRadius: '50%', border: '2.5px solid #fff' }} />
        <span style={{ position: 'absolute', top: 2, right: 2, width: 13, height: 13, background: '#4ade80', borderRadius: '50%', animation: 'smPing 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
      </button>

      {/* Main Support Drawer / Modal Overlay */}
      {isSupportOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: 16, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#f8fafc', width: '100%', maxWidth: 440, height: '92vh', borderRadius: 28, boxShadow: '0 32px 80px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'smSlide 0.25s ease' }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#cc040a 0%,#e8181e 60%,#ff4444 100%)', padding: '18px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -40, right: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                {view !== 'list' && (
                  <button onClick={() => setView('list')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10, padding: '6px 8px', color: '#fff', cursor: 'pointer', display: 'flex' }}>
                    <ChevronLeft style={{ width: 16, height: 16 }} />
                  </button>
                )}
                <div style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Headset style={{ width: 20, height: 20, color: '#fff' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: 14, color: '#fff' }}>MADS Customer Support</h3>
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', padding: '2px 8px', borderRadius: 99 }}>24/7 LIVE</span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                    {view === 'list' && 'My Support Tickets'}
                    {view === 'create' && 'Submit New Inquiry'}
                    {view === 'chat' && ('Ticket ' + (currentTicket?.id || ''))}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                {view === 'list' && (
                  <button onClick={() => setView('create')} style={{ background: '#fff', border: 'none', borderRadius: 12, padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#cc040a', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
                    <Plus style={{ width: 13, height: 13 }} /> New
                  </button>
                )}
                <button onClick={() => setIsSupportOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

              {/* LIST VIEW */}
              {view === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {!isLoggedIn && (
                    <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 18, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertCircle style={{ width: 15, height: 15, color: '#f97316', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: '#9a3412', fontWeight: 600 }}>Log in to save & sync your tickets!</span>
                      </div>
                      <button onClick={() => openAuth('login')} style={{ background: '#f97316', border: 'none', borderRadius: 10, padding: '5px 12px', color: '#fff', fontSize: 10, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>Log In</button>
                    </div>
                  )}
                  {userTickets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 16px 32px' }}>
                      <div style={{ width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg,#fff0f0,#ffe4e4)', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <MessageSquare style={{ width: 30, height: 30, color: '#cc040a' }} />
                      </div>
                      <h4 style={{ margin: '0 0 8px', fontWeight: 900, fontSize: 15, color: '#0f172a' }}>No Support Tickets Yet</h4>
                      <p style={{ margin: '0 0 20px', fontSize: 12, color: '#64748b', lineHeight: 1.6, maxWidth: 260, marginLeft: 'auto', marginRight: 'auto' }}>Need help with your top-up, payment, or account? Open a ticket and we'll assist instantly!</p>
                      <button onClick={() => setView('create')} style={{ background: 'linear-gradient(135deg,#cc040a,#ff3b41)', border: 'none', borderRadius: 16, padding: '12px 28px', color: '#fff', fontWeight: 900, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 24px rgba(204,4,10,0.35)' }}>
                        <Plus style={{ width: 15, height: 15 }} /> Open New Ticket
                      </button>
                    </div>
                  ) : (
                    userTickets.map(tck => (
                      <div key={tck.id} onClick={() => handleOpenChat(tck.id)}
                        style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 20, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.18s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#cc040a'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(204,4,10,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>{tck.id}</span>
                            <span style={{ fontSize: 9, background: '#fef2f2', color: '#cc040a', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 99, fontWeight: 800 }}>{tck.category}</span>
                          </div>
                          {getStatusBadge(tck.status)}
                        </div>
                        <h4 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: 12, color: '#0f172a' }}>{tck.subject}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(tck.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span style={{ fontSize: 10, color: '#cc040a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3 }}>View Chat <ChevronRight style={{ width: 12, height: 12 }} /></span>
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
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Inquiry Type</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { val: 'Order Issue', icon: '📦', label: 'Order Issue' },
                        { val: 'Wallet Deposit', icon: '💰', label: 'Wallet / Payment' },
                        { val: 'Game ID Verification', icon: '🎮', label: 'Game ID Help' },
                        { val: 'General Inquiry', icon: '❓', label: 'General' },
                      ].map(opt => (
                        <button key={opt.val} type="button" onClick={() => setCategory(opt.val)}
                          style={{ border: `2px solid ${category === opt.val ? '#cc040a' : '#e2e8f0'}`, background: category === opt.val ? '#fff0f0' : '#fff', borderRadius: 16, padding: '10px 8px', cursor: 'pointer', textAlign: 'center', fontSize: 11, fontWeight: 700, color: category === opt.val ? '#cc040a' : '#475569', transition: 'all 0.15s' }}>
                          <div style={{ fontSize: 18, marginBottom: 4 }}>{opt.icon}</div>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {orders && orders.length > 0 && (
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Link Related Order</label>
                      <select value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)} style={{ width: '100%', background: '#fff', border: '2px solid #e2e8f0', borderRadius: 14, padding: '10px 14px', fontSize: 12, outline: 'none' }} onFocus={e => e.target.style.borderColor = '#cc040a'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                        <option value="">— No specific order —</option>
                        {orders.map(o => <option key={o.id} value={o.id}>{o.id} · {o.gameName} ({o.packageName})</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Subject</label>
                    <input type="text" placeholder="e.g. Free Fire diamonds not received" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', background: '#fff', border: '2px solid #e2e8f0', borderRadius: 14, padding: '10px 14px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#0f172a', boxSizing: 'border-box', transition: 'border-color 0.15s' }} onFocus={e => e.target.style.borderColor = '#cc040a'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 900, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Detailed Message</label>
                    <textarea rows={4} placeholder="Describe your issue in detail..." value={initialMessage} onChange={e => setInitialMessage(e.target.value)} required style={{ width: '100%', background: '#fff', border: '2px solid #e2e8f0', borderRadius: 14, padding: '10px 14px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#0f172a', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6, transition: 'border-color 0.15s' }} onFocus={e => e.target.style.borderColor = '#cc040a'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                  <div style={{ background: '#fff', border: '2px dashed #e2e8f0', borderRadius: 16, padding: '12px 14px' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Image style={{ width: 14, height: 14, color: '#cc040a' }} /> Attach Screenshot (Optional)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} style={{ fontSize: 11, color: '#64748b', flex: 1 }} />
                      {isUploading && <span style={{ fontSize: 11, color: '#cc040a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><RefreshCw style={{ width: 12, height: 12, animation: 'smSpin 1s linear infinite' }} /> Uploading...</span>}
                    </div>
                    {attachmentUrl && <div style={{ marginTop: 8, fontSize: 10, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 10, padding: '6px 10px', fontFamily: 'monospace' }}>✔ Attached successfully</div>}
                  </div>
                  <button type="submit"
                    style={{ background: 'linear-gradient(135deg,#cc040a,#ff3b41)', border: 'none', borderRadius: 18, padding: 14, color: '#fff', fontWeight: 900, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 24px rgba(204,4,10,0.35)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(204,4,10,0.45)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(204,4,10,0.35)'; }}
                  >
                    <Send style={{ width: 16, height: 16 }} /> Submit Support Ticket
                  </button>
                </form>
              )}

              {/* CHAT VIEW */}
              {view === 'chat' && currentTicket && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
                  <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 18, padding: '12px 14px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 12, color: '#0f172a' }}>{currentTicket.subject}</span>
                      {getStatusBadge(currentTicket.status)}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
                      <span>#{currentTicket.id}</span>
                      <span>· {currentTicket.category}</span>
                      {currentTicket.orderId && <span style={{ color: '#cc040a', fontWeight: 700 }}>· {currentTicket.orderId}</span>}
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
                    {currentTicket.messages.map(msg => {
                      const isAdmin = msg.sender === 'admin';
                      return (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-start' : 'flex-end' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                            {isAdmin && <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#cc040a,#ff4444)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Headset style={{ width: 10, height: 10, color: '#fff' }} /></div>}
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>{msg.senderName || (isAdmin ? 'MADS Support' : 'You')}</span>
                            <span style={{ fontSize: 9, color: '#94a3b8' }}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: isAdmin ? '4px 18px 18px 18px' : '18px 4px 18px 18px', fontSize: 12, fontWeight: 500, lineHeight: 1.6, background: isAdmin ? '#fff' : 'linear-gradient(135deg,#cc040a,#e8181e)', color: isAdmin ? '#0f172a' : '#fff', border: isAdmin ? '1.5px solid #e2e8f0' : 'none', boxShadow: isAdmin ? '0 2px 8px rgba(0,0,0,0.06)' : '0 4px 16px rgba(204,4,10,0.3)' }}>
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                            {msg.attachmentUrl && (
                              <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 8, borderRadius: 12, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)' }}>
                                <img src={msg.attachmentUrl} alt="Attachment" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />
                                <span style={{ display: 'block', padding: '4px 8px', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 9, textAlign: 'center', fontFamily: 'monospace' }}>Tap to view full image ↗</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  <form onSubmit={handleSendReply} style={{ borderTop: '1.5px solid #f1f5f9', paddingTop: 12, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {attachmentUrl && (
                      <div style={{ fontSize: 10, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 10, padding: '5px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'monospace' }}>
                        <span>✔ Screenshot attached</span>
                        <button type="button" onClick={() => setAttachmentUrl('')} style={{ color: '#cc040a', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10 }}>✕ Remove</button>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: '#f8fafc', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#cc040a'; e.currentTarget.style.color = '#cc040a'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}>
                        <Paperclip style={{ width: 16, height: 16 }} />
                        <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                      </label>
                      <input type="text" placeholder="Type your message..." value={replyText} onChange={e => setReplyText(e.target.value)}
                        style={{ flex: 1, background: '#fff', border: '2px solid #e2e8f0', borderRadius: 14, padding: '10px 14px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#0f172a', transition: 'border-color 0.15s' }}
                        onFocus={e => e.target.style.borderColor = '#cc040a'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                      <button type="submit" disabled={!replyText.trim() && !attachmentUrl}
                        style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: (!replyText.trim() && !attachmentUrl) ? '#e2e8f0' : 'linear-gradient(135deg,#cc040a,#ff3b41)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (!replyText.trim() && !attachmentUrl) ? 'not-allowed' : 'pointer', boxShadow: (!replyText.trim() && !attachmentUrl) ? 'none' : '0 4px 14px rgba(204,4,10,0.4)' }}>
                        <Send style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ background: '#fff', borderTop: '1.5px solid #f1f5f9', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0 }}>
              <ShieldCheck style={{ width: 13, height: 13, color: '#22c55e' }} />
              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.06em', fontFamily: 'monospace' }}>MADS TOPUP · 256-BIT ENCRYPTED SUPPORT</span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
            </div>

          </div>
        </div>
      )}

      <style>{`
        @keyframes smSlide { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        @keyframes smPing { 75%,100% { transform:scale(2); opacity:0; } }
        @keyframes smSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>
    </>
  );
};
