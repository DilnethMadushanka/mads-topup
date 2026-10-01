import React from 'react';
import {
  ArrowLeft, MessageSquare, Mail, Send, PhoneCall, ArrowRight,
  HelpCircle, ShieldCheck, FileText, Info, Clock, CheckCircle2,
  MapPin, Gamepad2, Zap, MessageCircle, ExternalLink, Headphones
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ContactPage = () => {
  const { closeContactPage, setIsSupportOpen, showToast, openPolicyModal } = useApp();

  const eyebrow = 'text-[11px] font-black text-[#cc040a] uppercase tracking-widest font-mono';
  const channelCls = 'relative bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200 hover:border-[#cc040a]/50 shadow-sm hover:shadow-lg hover:shadow-red-600/10 transition-all flex items-center justify-between gap-4 group cursor-pointer overflow-hidden';

  // Same channels / links / copy as before — rendered through one shared card shell
  const channels = [
    {
      key: 'whatsapp', href: 'https://wa.me/94740436276', icon: MessageCircle, title: 'WhatsApp Support',
      detail: '+94 74 043 6276', detailCls: 'text-[#cc040a]', note: 'Fastest response — tap to chat instantly', tag: 'Fastest',
    },
    {
      key: 'chat', onClick: () => setIsSupportOpen(true), icon: MessageSquare, title: 'Live Chat',
      live: 'Available on this website', note: 'Click the chat bubble or create a 24/7 support ticket', tag: 'Live',
    },
    {
      key: 'telegram', href: 'https://t.me/madstopup', icon: Send, title: 'Telegram Channel',
      detail: '@madstopup', detailCls: 'text-slate-800', note: 'Join for updates, giveaways & quick support',
    },
    {
      key: 'email', href: 'mailto:support@madstopup.com', icon: Mail, title: 'Email Support',
      detail: 'support@madstopup.com', detailCls: 'text-slate-800', note: 'We typically reply within 24 hours',
    },
  ];

  const renderChannel = (c) => {
    const Icon = c.icon;
    const inner = (
      <>
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#cc040a] scale-y-0 group-hover:scale-y-100 origin-center transition-transform" />
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 group-hover:bg-[#cc040a] group-hover:text-white group-hover:shadow-lg group-hover:shadow-red-600/25 flex items-center justify-center shrink-0 transition-all">
            <Icon className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-slate-900 text-base font-heading">{c.title}</h3>
              {c.tag && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-[#cc040a] border border-red-100">{c.tag}</span>
              )}
            </div>
            {c.detail && <p className={`text-sm font-black font-mono mt-0.5 truncate ${c.detailCls}`}>{c.detail}</p>}
            {c.live && (
              <p className="text-xs font-bold text-emerald-600 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{c.live}</span>
              </p>
            )}
            <p className="text-xs text-slate-500 font-semibold mt-1">{c.note}</p>
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-[#cc040a] flex items-center justify-center shrink-0 transition-colors">
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
        </div>
      </>
    );
    return c.href ? (
      <a key={c.key} href={c.href} {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})} className={channelCls}>{inner}</a>
    ) : (
      <div key={c.key} onClick={c.onClick} className={channelCls}>{inner}</div>
    );
  };

  const responseTimes = [
    { icon: MessageCircle, label: 'WhatsApp', value: 'Usually < 5 min', good: true },
    { icon: MessageSquare, label: 'Live Chat', value: 'Real-time — 24/7', good: true },
    { icon: Send, label: 'Telegram', value: 'Same day', good: false },
    { icon: Mail, label: 'Email', value: 'Within 24 hrs', good: false },
  ];

  const quickLinks = [
    { icon: HelpCircle, label: 'FAQ — Common Questions', onClick: () => showToast('FAQ section opening...') },
    { icon: CheckCircle2, label: 'Refund & Privacy Policy', onClick: () => openPolicyModal('refund') },
    { icon: FileText, label: 'Terms & Conditions', onClick: () => openPolicyModal('terms') },
    { icon: Info, label: 'About MADS TOPUP', onClick: () => showToast('About MADS TOPUP: Premier automated top-up portal in Sri Lanka.') },
  ];

  const beforeSteps = [
    ['Check the FAQ first', ' — most common questions have instant answers there.'],
    ['Note your Order ID', ' — found in your account order history or confirmation email.'],
    ['Verify your Player ID (UID)', ' — check it in-game before reporting a delivery issue.'],
    ['Wait 2–3 minutes', ' — automated deliveries occasionally take a moment to sync.'],
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Back to Home Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={closeContactPage}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider hover:text-[#cc040a] hover:border-[#cc040a]/40 transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>24/7 Automated Support Ready</span>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#ef1c25] via-[#dc0b13] to-[#b8060d] text-white shadow-2xl shadow-red-600/25 overflow-hidden">
          <div className="absolute -top-28 -right-16 w-96 h-96 rounded-full bg-white/10 pointer-events-none"></div>
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-white/10 pointer-events-none"></div>
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '22px 22px' }}></div>

          <div className="relative z-10 p-7 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white text-xs font-black tracking-wider uppercase font-mono">
                <Headphones className="w-3.5 h-3.5" />
                <span>Support & Contact</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl sm:text-6xl font-black tracking-tight font-heading leading-[1.05]">
                  We're Here to <span className="underline decoration-white/40 decoration-4 underline-offset-8">Help You</span>
                </h1>
                <p className="text-red-50 text-sm sm:text-base font-semibold leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Get in touch with our team through any channel — we respond fast, every day. Whether it's a top-up issue, payment question, or anything else — we've got you.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
                <button
                  onClick={() => setIsSupportOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#cc040a] font-black text-sm shadow-xl shadow-black/15 hover:scale-[1.03] active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Start Live Chat</span>
                </button>
                <a
                  href="https://wa.me/94740436276" target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-black/20 hover:bg-black/30 border border-white/30 text-white font-black text-sm backdrop-blur-md transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Us</span>
                </a>
              </div>
            </div>

            {/* Status stack */}
            <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
              {[
                { icon: null, label: 'Live Chat — Always Active', dot: true },
                { icon: Zap, label: 'Avg. Response < 5 min' },
                { icon: Clock, label: '24 / 7 Support' },
              ].map(({ icon: Icon, label, dot }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-xs font-extrabold">
                  <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    {dot ? <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse"></span> : <Icon className="w-4 h-4" />}
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Grid (Two Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT COLUMN: Contact Channels & Response Times (8 Cols) */}
          <div className="lg:col-span-8 space-y-5">

            <div>
              <span className={eyebrow}>CONTACT CHANNELS</span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-heading mt-1">
                Choose How You Want to Reach Us
              </h2>
              <div className="w-12 h-1 bg-[#cc040a] rounded-full mt-2"></div>
            </div>

            {channels.map(renderChannel)}

            {/* RESPONSE TIMES CARD */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-sm space-y-5">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-3 font-heading">
                <span className="w-10 h-10 rounded-xl bg-[#cc040a] text-white flex items-center justify-center shadow-md shadow-red-600/25">
                  <Clock className="w-5 h-5" />
                </span>
                <span>Response Times</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {responseTimes.map(({ icon: Icon, label, value, good }) => (
                  <div key={label} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <span className="font-black text-slate-800 flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-[#cc040a] flex items-center justify-center"><Icon className="w-4 h-4" /></span>
                      {label}
                    </span>
                    <span className={`px-3 py-1 rounded-full font-extrabold font-mono text-[11px] whitespace-nowrap ${good ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600 border border-slate-200'}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* FOLLOW US CARD */}
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 border-2 border-dashed border-slate-300 text-center space-y-4 overflow-hidden">
              <h3 className="font-black text-slate-900 text-lg font-heading">Follow Us</h3>
              <div className="w-10 h-1 bg-[#cc040a] rounded-full mx-auto"></div>
              <p className="text-xs text-slate-600 font-semibold max-w-md mx-auto">
                Stay updated with promo offers, giveaways, and gaming news.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <a
                  href="https://wa.me/94740436276" target="_blank" rel="noreferrer"
                  className="px-5 py-2.5 bg-[#cc040a] text-white font-black text-xs rounded-xl hover:bg-[#b00308] transition-all shadow-lg shadow-red-600/25 flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp Channel
                </a>
                <a
                  href="https://t.me/madstopup" target="_blank" rel="noreferrer"
                  className="px-5 py-2.5 bg-white text-slate-800 border-2 border-slate-200 hover:border-[#cc040a] hover:text-[#cc040a] font-black text-xs rounded-xl transition-all flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Telegram Group
                </a>
                <button
                  onClick={() => showToast('Facebook page coming soon!')}
                  className="px-5 py-2.5 bg-white text-slate-800 border-2 border-slate-200 hover:border-[#cc040a] hover:text-[#cc040a] font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Facebook
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-5">

            {/* SUPPORT TIP BOX */}
            <div className="relative bg-gradient-to-br from-[#ef1c25] to-[#b8060d] text-white rounded-3xl p-6 shadow-lg shadow-red-600/25 flex items-start gap-4 overflow-hidden">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none"></div>
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 relative">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1 text-xs font-semibold leading-relaxed relative">
                <strong className="block text-sm font-black font-heading">Support Tip</strong>
                <p className="text-red-50">
                  Always have your <strong>Order ID</strong> and <strong>Player ID (UID)</strong> ready when contacting us — it helps us resolve your issue instantly.
                </p>
              </div>
            </div>

            {/* QUICK LINKS BOX */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200 shadow-sm space-y-4">
              <span className={eyebrow + ' block'}>QUICK LINKS</span>

              <div className="space-y-2 text-xs font-bold text-slate-700">
                {quickLinks.map(({ icon: Icon, label, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-red-50 border border-transparent hover:border-red-100 text-left flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 group-hover:bg-[#cc040a] group-hover:border-[#cc040a] flex items-center justify-center transition-colors">
                        <Icon className="w-4 h-4 text-[#cc040a] group-hover:text-white transition-colors" />
                      </span>
                      <span>{label}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#cc040a] group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>

            {/* BEFORE YOU CONTACT US CARD */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200 shadow-sm space-y-4">
              <span className={eyebrow + ' block'}>BEFORE YOU CONTACT US</span>

              <div className="text-xs font-semibold text-slate-700">
                {beforeSteps.map(([bold, rest], i, arr) => (
                  <div key={bold} className="flex items-start gap-3">
                    <div className="flex flex-col items-center self-stretch">
                      <span className="w-7 h-7 rounded-full bg-[#cc040a] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-red-600/25">
                        {i + 1}
                      </span>
                      {i < arr.length - 1 && <div className="w-0.5 flex-1 bg-red-100 my-1"></div>}
                    </div>
                    <p className={`leading-relaxed pt-1 ${i < arr.length - 1 ? 'pb-4' : ''}`}>
                      <strong className="text-slate-900">{bold}</strong>{rest}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ABOUT THIS BUSINESS CARD */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200 shadow-sm space-y-3">
              <span className={eyebrow + ' block'}>ABOUT THIS BUSINESS</span>

              <div className="space-y-2.5 text-xs font-extrabold text-slate-800">
                {[
                  [MapPin, 'Sri Lanka — Serving worldwide'],
                  [Gamepad2, 'In the gaming community since 2018'],
                  [Zap, 'Powered by automated MADS API engine'],
                ].map(([Icon, text]) => (
                  <div key={text} className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-[#cc040a]" /></span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
