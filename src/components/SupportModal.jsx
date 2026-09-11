import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { uploadToR2Storage } from '../services/storageService';
import { 
  MessageSquare, X, Send, Paperclip, Plus, CheckCircle2, Clock, AlertCircle, 
  HelpCircle, ShieldCheck, ChevronLeft, RefreshCw, Image, ExternalLink, Headset,
  Tag, User, Sparkles, Filter
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

  // Active Ticket Object
  const currentTicket = (supportTickets || []).find(t => t.id === activeTicketId) || (supportTickets || [])[0];

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
    switch (status) {
      case 'OPEN':
        return <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full border border-amber-300">OPEN</span>;
      case 'IN_PROGRESS':
        return <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-full border border-blue-300">IN PROGRESS</span>;
      case 'RESOLVED':
        return <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">RESOLVED</span>;
      case 'CLOSED':
        return <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">CLOSED</span>;
      default:
        return <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  const userTickets = (supportTickets || []).filter(t => 
    !userProfile?.email || t.userEmail?.toLowerCase() === userProfile?.email?.toLowerCase() || t.userId === userProfile?.uid
  );

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        onClick={() => setIsSupportOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-5 z-40 bg-gradient-to-r from-red-600 to-[#cc040a] hover:from-red-700 hover:to-red-800 text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-2xl flex items-center gap-2.5 transition-all duration-300 hover:scale-105 group border border-white/20"
        title="24/7 Live Customer Support"
      >
        <div className="relative">
          <Headset className="w-6 h-6 text-white animate-bounce" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
        </div>
        <span className="hidden sm:inline-block font-black text-xs uppercase tracking-wider font-heading">
          24/7 Live Help
        </span>
      </button>

      {/* Main Support Drawer / Modal Overlay */}
      {isSupportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 w-full sm:max-w-md h-full sm:h-[88vh] sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            
            {/* Modal Top Header */}
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                {view !== 'list' && (
                  <button
                    onClick={() => setView('list')}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer mr-1"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center font-bold text-white shadow-md">
                  <Headset className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm font-heading flex items-center gap-1.5">
                    <span>MADS Customer Support</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                      24/7 Live
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Direct Live Chat with Support Desk</p>
                </div>
              </div>

              <button
                onClick={() => setIsSupportOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-Header Navigation */}
            <div className="bg-slate-100 px-4 py-2 flex items-center justify-between border-b border-slate-200 text-xs font-bold shrink-0">
              <span className="text-slate-600 font-mono text-[11px]">
                {view === 'list' && `My Tickets (${userTickets.length})`}
                {view === 'chat' && `Ticket ${currentTicket?.id || ''}`}
                {view === 'create' && 'Submit New Inquiry'}
              </span>

              {view === 'list' && (
                <button
                  onClick={() => setView('create')}
                  className="px-3 py-1 bg-[#cc040a] hover:bg-red-700 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Ticket</span>
                </button>
              )}
            </div>

            {/* Modal Body Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* VIEW 1: TICKETS LIST */}
              {view === 'list' && (
                <div className="space-y-3">
                  {!isLoggedIn && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs text-amber-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Log in to save and sync your tickets across devices!</span>
                      </div>
                      <button
                        onClick={() => openAuth('login')}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg shrink-0 cursor-pointer"
                      >
                        Log In
                      </button>
                    </div>
                  )}

                  {userTickets.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
                        <MessageSquare className="w-7 h-7" />
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-800">No Support Tickets Yet</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Need help with your topup order, payment confirmation, or account? Create a ticket below!
                      </p>
                      <button
                        onClick={() => setView('create')}
                        className="px-5 py-2 bg-[#cc040a] hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Open New Ticket</span>
                      </button>
                    </div>
                  ) : (
                    userTickets.map(tck => (
                      <div
                        key={tck.id}
                        onClick={() => handleOpenChat(tck.id)}
                        className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 p-3.5 rounded-2xl shadow-xs transition-all cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-slate-500">{tck.id}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-extrabold">
                              {tck.category}
                            </span>
                          </div>
                          {getStatusBadge(tck.status)}
                        </div>

                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {tck.subject}
                        </h4>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                          <span>{new Date(tck.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform">
                            View Conversation →
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* VIEW 2: CREATE NEW TICKET FORM */}
              {view === 'create' && (
                <form onSubmit={handleCreateTicketSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-extrabold text-slate-800 mb-1">Inquiry Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-red-500"
                    >
                      <option value="Order Issue">📦 Top-up / Order Issue</option>
                      <option value="Wallet Deposit">💰 Wallet Deposit / eZ Cash Verification</option>
                      <option value="Game ID Verification">🎮 Game UID / Server ID Inquiry</option>
                      <option value="General Inquiry">❓ General Inquiry & Feedback</option>
                    </select>
                  </div>

                  {orders && orders.length > 0 && (
                    <div>
                      <label className="block font-extrabold text-slate-800 mb-1">Link Related Order (Optional)</label>
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-mono font-semibold focus:outline-none focus:border-red-500"
                      >
                        <option value="">-- No specific order --</option>
                        {orders.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.id} - {o.gameName} ({o.packageName})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block font-extrabold text-slate-800 mb-1">Subject / Summary</label>
                    <input
                      type="text"
                      placeholder="e.g. Need help with my Free Fire diamonds order"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-800 mb-1">Detailed Message</label>
                    <textarea
                      rows={4}
                      placeholder="Explain your problem or inquiry in detail..."
                      value={initialMessage}
                      onChange={(e) => setInitialMessage(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Screenshot / Image Attachment */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="block font-bold text-slate-800 text-[11px]">
                      Attach Screenshot / Transfer Slip (Optional)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#cc040a] file:text-white cursor-pointer"
                      />
                      {isUploading && (
                        <span className="text-[11px] text-red-600 font-bold flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Uploading...
                        </span>
                      )}
                    </div>
                    {attachmentUrl && (
                      <div className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300 p-1.5 rounded-lg truncate font-mono">
                        ✔ Attached: {attachmentUrl}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#cc040a] hover:bg-red-700 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Ticket to Support</span>
                  </button>
                </form>
              )}

              {/* VIEW 3: LIVE CHAT MESSAGES THREAD */}
              {view === 'chat' && currentTicket && (
                <div className="flex flex-col h-full space-y-4">
                  {/* Ticket Summary Header Card */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900">{currentTicket.subject}</span>
                      {getStatusBadge(currentTicket.status)}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                      <span>ID: {currentTicket.id}</span>
                      <span>Category: {currentTicket.category}</span>
                      {currentTicket.orderId && <span className="text-blue-600 font-bold">Order: {currentTicket.orderId}</span>}
                    </div>
                  </div>

                  {/* Messages Bubble History */}
                  <div className="flex-1 space-y-3 pr-1">
                    {currentTicket.messages.map(msg => {
                      const isAdmin = msg.sender === 'admin';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-bold text-slate-500 font-mono">
                              {msg.senderName || (isAdmin ? 'MADS Support Desk' : 'You')}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div
                            className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium space-y-2 shadow-xs ${
                              isAdmin
                                ? 'bg-slate-900 text-white rounded-tl-xs'
                                : 'bg-red-600 text-white rounded-tr-xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                            
                            {msg.attachmentUrl && (
                              <a
                                href={msg.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block mt-2 rounded-xl overflow-hidden border border-white/20 hover:opacity-90 transition-opacity"
                              >
                                <img
                                  src={msg.attachmentUrl}
                                  alt="Attachment"
                                  className="w-full max-h-48 object-cover"
                                />
                                <span className="block p-1 text-[9px] bg-black/40 text-white text-center font-mono">
                                  Click to view full screenshot ↗
                                </span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Chat Reply Input Bar */}
                  <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-200 shrink-0 space-y-2">
                    {attachmentUrl && (
                      <div className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 p-1.5 rounded-lg flex items-center justify-between font-mono">
                        <span className="truncate max-w-[280px]">Attachment: {attachmentUrl}</span>
                        <button type="button" onClick={() => setAttachmentUrl('')} className="text-red-600 font-bold">Remove</button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <label className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors">
                        <Paperclip className="w-4 h-4" />
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>

                      <input
                        type="text"
                        placeholder="Type your reply to support..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-red-500"
                      />

                      <button
                        type="submit"
                        disabled={!replyText.trim() && !attachmentUrl}
                        className="p-2.5 rounded-xl bg-[#cc040a] hover:bg-red-700 disabled:opacity-50 text-white font-bold transition-all cursor-pointer shadow-xs"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div className="p-3 bg-slate-950 text-slate-400 border-t border-slate-800 text-[10px] text-center font-medium shrink-0 flex items-center justify-center gap-1.5 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>MADS TOPUP 24/7 ENCRYPTED SUPPORT DESK</span>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
