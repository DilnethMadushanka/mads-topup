import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { uploadToR2Storage } from '../services/storageService';
import { filterUserOrders } from '../utils/ownership';
import {
  MessageSquare, X, Send, Paperclip, Plus, ShieldCheck, ChevronLeft, RefreshCw,
  Image, Headset, ChevronRight, Minus, ZoomIn, Check, Package, Wallet, Gamepad2,
  HelpCircle, LogIn, Zap, Clock, AlertCircle
} from 'lucide-react';

const QUICK_CHIPS = [
  { label: 'Payment pending', text: 'My payment is pending / not verified yet. Can you please check?' },
  { label: 'Order status', text: 'Can you please check the current status of my order?' },
  { label: 'Wallet recharge', text: 'I need help with my wallet recharge / top-up.' },
];

// Help topics double as ticket categories (the value is what the admin desk sees).
const TOPICS = [
  { val: 'Order Issue', label: 'Order issue', hint: 'Top-up not received', icon: Package, tone: 'blue' },
  { val: 'Wallet Deposit', label: 'Wallet / Payment', hint: 'Deposits & refunds', icon: Wallet, tone: 'gold' },
  { val: 'Game ID Verification', label: 'Game ID help', hint: 'Wrong ID or server', icon: Gamepad2, tone: 'teal' },
  { val: 'General Inquiry', label: 'Something else', hint: 'Ask us anything', icon: HelpCircle, tone: 'violet' },
];
const topicFor = (cat) => TOPICS.find(t => t.val === cat) || TOPICS[3];

const STATUS = {
  OPEN: { label: 'Open', cls: 'is-open' },
  IN_PROGRESS: { label: 'In progress', cls: 'is-progress' },
  RESOLVED: { label: 'Resolved', cls: 'is-resolved' },
  CLOSED: { label: 'Closed', cls: 'is-closed' },
};
const StatusPill = ({ status }) => {
  const s = STATUS[status] || STATUS.CLOSED;
  return <span className={`spt-status ${s.cls}`}><i />{s.label}</span>;
};

const shortTime = (ts) => {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return new Date().toDateString() === d.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

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
      setView('list'); // reset view to list on every reopen
    }
  }, [isSupportOpen]);

  // Clear shared attachment state whenever the user switches views
  useEffect(() => {
    setAttachmentUrl('');
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

  const startTicket = (cat) => {
    if (cat) setCategory(cat);
    setView('create');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    // Uses the verified /api/upload-file → Cloudflare R2 pipeline (storageService.js)
    try {
      const res = await uploadToR2Storage(file, 'support-attachments');
      if (res.success) {
        setAttachmentUrl(res.url);
        showToast('Screenshot uploaded!');
      } else {
        showToast(res.error || 'Upload failed', 'error');
      }
    } catch (err) {
      showToast('Upload failed. Please try again.', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
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
  };

  // Tickets use userId + userEmail (no phone), so match on those rather than the order helper.
  const userTickets = !isLoggedIn
    ? []
    : (supportTickets || []).filter(t => {
        if (!t || !userProfile) return false;
        const matchUid = Boolean(userProfile.uid) && t.userId === userProfile.uid;
        const matchEmail = Boolean(userProfile.email) && Boolean(t.userEmail) &&
          t.userEmail.toLowerCase() === userProfile.email.toLowerCase();
        return matchUid || matchEmail;
      });

  const userOrders = !isLoggedIn ? [] : filterUserOrders(orders, userProfile);

  const applyChip = (chip, setter, currentVal) => {
    setter(currentVal && currentVal.trim() ? `${currentVal.trim()} ${chip.text}` : chip.text);
  };

  const firstName = String(userProfile?.name || '').trim().split(/\s+/)[0];
  const canSend = Boolean(replyText.trim() || attachmentUrl);
  const headerTitle = view === 'create' ? 'New ticket' : view === 'chat' ? (currentTicket?.subject || 'Ticket') : 'MADS Support';

  return (
    <>
      {/* Floating support button */}
      {(!isSupportOpen || isMinimized) && (
        <button data-support-fab=""
          onClick={() => { setIsSupportOpen(true); setIsMinimized(false); }}
          aria-label="Open 24/7 Live Customer Support"
          title="24/7 Live Customer Support"
          className="spt-fab"
        >
          <Headset className="spt-fab-icon" />
          <span className="spt-fab-label">Support</span>
          <span className="spt-fab-dot" />
          {isMinimized && currentTicket && <span className="spt-fab-tag">chat</span>}
        </button>
      )}

      {isSupportOpen && !isMinimized && (
        <div className="spt-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsSupportOpen(false); }}>
          <div className="spt-panel" role="dialog" aria-label="MADS Support">

            {/* Header */}
            <div className={`spt-head ${view === 'list' ? 'is-home' : ''}`}>
              <div className="spt-head-bar">
                {view !== 'list' ? (
                  <button className="spt-icon-btn" onClick={() => setView('list')} aria-label="Back to tickets">
                    <ChevronLeft />
                  </button>
                ) : (
                  <div className="spt-head-avatar">
                    <Headset />
                    <span className="spt-live" />
                  </div>
                )}
                <div className="spt-head-title">
                  <h3>{headerTitle}</h3>
                  <p><span className="spt-live-dot" /> {view === 'chat' && currentTicket ? `#${currentTicket.id}` : 'Online now · replies in minutes'}</p>
                </div>
                <button className="spt-icon-btn" onClick={() => setIsMinimized(true)} title="Minimize" aria-label="Minimize">
                  <Minus />
                </button>
                <button className="spt-icon-btn" onClick={() => setIsSupportOpen(false)} title="Close" aria-label="Close">
                  <X />
                </button>
              </div>

              {view === 'list' && (
                <div className="spt-hello">
                  <h2>Hi{firstName ? ` ${firstName}` : ''} 👋</h2>
                  <p>How can we help you today?</p>
                </div>
              )}
            </div>

            {/* Body */}
            <div className={`spt-body spt-scroll ${view === 'chat' ? 'is-chat' : ''}`}>

              {/* LIST VIEW */}
              {view === 'list' && (
                <div className="spt-stack">
                  <button className="spt-cta" onClick={() => startTicket()}>
                    <span className="spt-cta-icon"><MessageSquare /></span>
                    <span className="spt-cta-text">
                      <b>Send us a message</b>
                      <small>We usually reply in a few minutes</small>
                    </span>
                    <span className="spt-cta-arrow"><ChevronRight /></span>
                  </button>

                  {!isLoggedIn && (
                    <div className="spt-login">
                      <span className="spt-login-icon"><LogIn /></span>
                      <span className="spt-login-text">Log in to save your tickets and get replies on any device.</span>
                      <button onClick={() => openAuth('login')}>Log in</button>
                    </div>
                  )}

                  <div>
                    <div className="spt-section-title">Quick help</div>
                    <div className="spt-topics">
                      {TOPICS.map(t => {
                        const Icon = t.icon;
                        return (
                          <button key={t.val} className={`spt-topic tone-${t.tone}`} onClick={() => startTicket(t.val)}>
                            <span className="spt-tile"><Icon /></span>
                            <b>{t.label}</b>
                            <small>{t.hint}</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="spt-section-title">
                      Your tickets {userTickets.length > 0 && <span className="spt-count">{userTickets.length}</span>}
                    </div>
                    {userTickets.length === 0 ? (
                      <div className="spt-empty">
                        <MessageSquare />
                        <span>No tickets yet. Your conversations with us will show here.</span>
                      </div>
                    ) : (
                      <div className="spt-tickets">
                        {userTickets.map(tck => {
                          const t = topicFor(tck.category);
                          const Icon = t.icon;
                          const msgs = tck.messages || [];
                          const lastMsg = msgs[msgs.length - 1];
                          return (
                            <button key={tck.id} className="spt-ticket" onClick={() => handleOpenChat(tck.id)}>
                              <span className={`spt-tile sm tone-${t.tone}`}><Icon /></span>
                              <span className="spt-ticket-main">
                                <span className="spt-ticket-top">
                                  <b>{tck.subject}</b>
                                  <time>{shortTime(tck.updatedAt)}</time>
                                </span>
                                {lastMsg?.text && (
                                  <span className="spt-ticket-last">
                                    {lastMsg.sender === 'admin' ? 'Support: ' : 'You: '}{lastMsg.text}
                                  </span>
                                )}
                                <span className="spt-ticket-meta">
                                  <StatusPill status={tck.status} />
                                  <span className="spt-ticket-id">#{tck.id}</span>
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="spt-trust">
                    <span><Zap /> Fast replies</span>
                    <span><ShieldCheck /> Secure</span>
                    <span><Clock /> 24/7</span>
                  </div>
                </div>
              )}

              {/* CREATE VIEW */}
              {view === 'create' && (
                <form onSubmit={handleCreateTicketSubmit} className="spt-form">
                  <div>
                    <label className="spt-label">What do you need help with?</label>
                    <div className="spt-cats">
                      {TOPICS.map(t => {
                        const Icon = t.icon;
                        const on = category === t.val;
                        return (
                          <button key={t.val} type="button" onClick={() => setCategory(t.val)} className={`spt-cat tone-${t.tone} ${on ? 'is-on' : ''}`}>
                            <span className="spt-tile sm"><Icon /></span>
                            <span>{t.label}</span>
                            {on && <span className="spt-cat-check"><Check strokeWidth={3.5} /></span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {userOrders && userOrders.length > 0 && (
                    <div>
                      <label className="spt-label">Related order <em>(optional)</em></label>
                      <select value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)} className="spt-field">
                        <option value="">No specific order</option>
                        {userOrders.map(o => <option key={o.id} value={o.id}>{o.id} · {o.gameName} ({o.packageName})</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="spt-label">Subject <em>(optional)</em></label>
                    <input type="text" placeholder="e.g. Free Fire diamonds not received" value={subject} onChange={e => setSubject(e.target.value)} className="spt-field" />
                  </div>
                  <div>
                    <label className="spt-label">Message</label>
                    <div className="spt-chips">
                      {QUICK_CHIPS.map(chip => (
                        <button key={chip.label} type="button" onClick={() => applyChip(chip, setInitialMessage, initialMessage)} className="spt-chip">
                          <Plus /> {chip.label}
                        </button>
                      ))}
                    </div>
                    <textarea rows={4} placeholder="Tell us what happened. Add your order ID or player ID if you have it." value={initialMessage} onChange={e => setInitialMessage(e.target.value)} required className="spt-field" />
                  </div>

                  {attachmentUrl ? (
                    <div className="spt-attached">
                      <button type="button" className="spt-thumb" onClick={() => setLightboxUrl(attachmentUrl)} aria-label="View screenshot">
                        <img src={attachmentUrl} alt="Attachment preview" />
                        <span><ZoomIn /></span>
                      </button>
                      <div>
                        <b>Screenshot attached</b>
                        <button type="button" onClick={() => setAttachmentUrl('')}>Remove</button>
                      </div>
                    </div>
                  ) : (
                    <label className={`spt-drop ${isUploading ? 'is-busy' : ''}`}>
                      <input type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                      <span className="spt-tile sm tone-blue">{isUploading ? <RefreshCw className="spt-spin" /> : <Image />}</span>
                      <span>
                        <b>{isUploading ? 'Uploading…' : 'Add a screenshot'}</b>
                        <small>Payment slip or error screen (optional)</small>
                      </span>
                    </label>
                  )}

                  <button type="submit" className="spt-submit" disabled={isUploading}>
                    <Send /> Send ticket
                  </button>
                </form>
              )}

              {/* CHAT VIEW */}
              {view === 'chat' && currentTicket && (
                <div className="spt-chat">
                  <div className="spt-chat-info">
                    <span className={`spt-tile sm tone-${topicFor(currentTicket.category).tone}`}>
                      {React.createElement(topicFor(currentTicket.category).icon)}
                    </span>
                    <span className="spt-chat-info-text">
                      <b>{currentTicket.category}</b>
                      {currentTicket.orderId && <small>Order {currentTicket.orderId}</small>}
                    </span>
                    <StatusPill status={currentTicket.status} />
                  </div>

                  <div className="spt-msgs">
                    {(currentTicket.messages || []).map(msg => {
                      const isAdmin = msg.sender === 'admin';
                      return (
                        <div key={msg.id} className={`spt-msg ${isAdmin ? 'from-admin' : 'from-me'}`}>
                          {isAdmin && <span className="spt-msg-avatar"><Headset /></span>}
                          <div className="spt-msg-col">
                            <div className="spt-bubble">
                              {msg.text && <p>{msg.text}</p>}
                              {msg.attachmentUrl && (
                                <button type="button" className="spt-msg-img" onClick={() => setLightboxUrl(msg.attachmentUrl)} aria-label="View full image">
                                  <img src={msg.attachmentUrl} alt="Attachment" />
                                  <span><ZoomIn /></span>
                                </button>
                              )}
                            </div>
                            <span className="spt-msg-meta">
                              {isAdmin ? (msg.senderName || 'MADS Support') : 'You'} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              )}

              {/* Ticket not found */}
              {view === 'chat' && !currentTicket && (
                <div className="spt-missing">
                  <span className="spt-tile tone-blue"><AlertCircle /></span>
                  <h4>Ticket not found</h4>
                  <p>This ticket could not be loaded or may have been closed.</p>
                  <button onClick={() => setView('list')} className="spt-submit">Back to tickets</button>
                </div>
              )}
            </div>

            {/* Chat composer */}
            {view === 'chat' && currentTicket && (
              <form onSubmit={handleSendReply} className="spt-composer">
                <div className="spt-chips">
                  {QUICK_CHIPS.map(chip => (
                    <button key={chip.label} type="button" onClick={() => applyChip(chip, setReplyText, replyText)} className="spt-chip">
                      {chip.label}
                    </button>
                  ))}
                </div>
                {attachmentUrl && (
                  <div className="spt-attach-note">
                    <span><Check /> Screenshot attached</span>
                    <button type="button" onClick={() => setAttachmentUrl('')}>Remove</button>
                  </div>
                )}
                <div className="spt-input-row">
                  <label className="spt-attach-btn" title="Attach screenshot">
                    {isUploading ? <RefreshCw className="spt-spin" /> : <Paperclip />}
                    <input type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                  </label>
                  <input type="text" placeholder={isUploading ? 'Uploading screenshot…' : 'Type a message…'} value={replyText} onChange={e => setReplyText(e.target.value)} />
                  <button type="submit" className="spt-send" disabled={!canSend} aria-label="Send">
                    <Send />
                  </button>
                </div>
              </form>
            )}

            {view !== 'chat' && (
              <div className="spt-foot">
                <ShieldCheck /> Secure support by MADS TOPUP
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen image lightbox */}
      {lightboxUrl && (
        <div className="spt-lightbox" onClick={() => setLightboxUrl(null)}>
          <button onClick={() => setLightboxUrl(null)} aria-label="Close preview" className="spt-icon-btn">
            <X />
          </button>
          <img src={lightboxUrl} alt="Full preview" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};
