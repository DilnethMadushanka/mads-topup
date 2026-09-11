import React from 'react';
import { 
  ArrowLeft, MessageSquare, Mail, Send, PhoneCall, ArrowRight, 
  HelpCircle, ShieldCheck, FileText, Info, Clock, CheckCircle2, 
  MapPin, Gamepad2, Zap, MessageCircle, ExternalLink, Headphones
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ContactPage = () => {
  const { closeContactPage, setIsSupportOpen, showToast } = useApp();

  return (
    <div className="min-h-screen bg-[#F8FAFF] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Back to Home Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={closeContactPage}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-100 hover:text-[#cc040a] transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>24/7 Automated Support Ready</span>
          </div>
        </div>

        {/* Hero Banner Box (Matching Screenshot 1) */}
        <div className="bg-gradient-to-br from-red-50/60 via-slate-50 to-red-100/40 rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm relative overflow-hidden text-center sm:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#cc040a]/10 border border-[#cc040a]/20 text-[#cc040a] text-xs font-black tracking-wider uppercase font-mono">
            <Headphones className="w-3.5 h-3.5" />
            <span>Support & Contact</span>
          </div>

          <div className="space-y-3 max-w-3xl">
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-heading leading-tight">
              We're Here to <span className="text-[#cc040a]">Help You</span>
            </h1>
            <p className="text-slate-600 text-sm sm:text-base font-semibold leading-relaxed">
              Get in touch with our team through any channel — we respond fast, every day. Whether it's a top-up issue, payment question, or anything else — we've got you.
            </p>
          </div>

          {/* 3 Status Pills (Matching Screenshot 1) */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-extrabold text-slate-800 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Chat — Always Active</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-extrabold text-slate-800 shadow-xs">
              <Zap className="w-3.5 h-3.5 text-[#cc040a]" />
              <span>Avg. Response &lt; 5 min</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-extrabold text-slate-800 shadow-xs">
              <Clock className="w-3.5 h-3.5 text-[#cc040a]" />
              <span>24 / 7 Support</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid (Two Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Contact Channels & Response Times (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="space-y-1">
              <span className="text-[11px] font-black text-[#cc040a] uppercase tracking-widest font-mono">
                CONTACT CHANNELS
              </span>
              <h2 className="text-xl font-black text-slate-900 font-heading">
                Choose How You Want to Reach Us
              </h2>
            </div>

            {/* CHANNEL 1: WhatsApp Support */}
            <a
              href="https://wa.me/94740436276"
              target="_blank"
              rel="noreferrer"
              className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-7 h-7 fill-emerald-500/20 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-emerald-600 transition-colors">
                    WhatsApp Support
                  </h3>
                  <p className="text-sm font-black text-[#cc040a] font-mono mt-0.5">
                    +94 74 043 6276
                  </p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Fastest response — tap to chat instantly
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </a>

            {/* CHANNEL 2: Live Chat */}
            <div
              onClick={() => setIsSupportOpen(true)}
              className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-amber-500/50 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-7 h-7 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-amber-600 transition-colors">
                    Live Chat
                  </h3>
                  <p className="text-xs font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Available on this website</span>
                  </p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Click the chat bubble or create a 24/7 support ticket
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </div>

            {/* CHANNEL 3: Telegram Channel */}
            <a
              href="https://t.me/madstopup"
              target="_blank"
              rel="noreferrer"
              className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-cyan-500/50 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Send className="w-7 h-7 text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-cyan-600 transition-colors">
                    Telegram Channel
                  </h3>
                  <p className="text-sm font-black text-cyan-600 font-mono mt-0.5">
                    @madstopup
                  </p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Join for updates, giveaways & quick support
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all" />
            </a>

            {/* CHANNEL 4: Email Support */}
            <a
              href="mailto:support@madstopup.com"
              className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-[#cc040a]/50 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#cc040a]/10 text-[#cc040a] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Mail className="w-7 h-7 text-[#cc040a]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-[#cc040a] transition-colors">
                    Email Support
                  </h3>
                  <p className="text-sm font-black text-slate-800 font-mono mt-0.5">
                    support@madstopup.com
                  </p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    We typically reply within 24 hours
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-[#cc040a] group-hover:translate-x-1 transition-all" />
            </a>

            {/* RESPONSE TIMES CARD (Matching Screenshot 2) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2 font-heading">
                <Clock className="w-5 h-5 text-[#cc040a]" />
                <span>Response Times</span>
              </h3>

              <div className="divide-y divide-slate-100 text-xs">
                {/* WhatsApp */}
                <div className="py-3 flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-500" />
                    WhatsApp
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-extrabold font-mono text-[11px]">
                    Usually &lt; 5 min
                  </span>
                </div>

                {/* Live Chat */}
                <div className="py-3 flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                    Live Chat
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-extrabold font-mono text-[11px]">
                    Real-time — 24/7
                  </span>
                </div>

                {/* Telegram */}
                <div className="py-3 flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 flex items-center gap-2">
                    <Send className="w-4 h-4 text-cyan-500" />
                    Telegram
                  </span>
                  <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 font-extrabold font-mono text-[11px]">
                    Same day
                  </span>
                </div>

                {/* Email */}
                <div className="py-3 flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#cc040a]" />
                    Email
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-extrabold font-mono text-[11px]">
                    Within 24 hrs
                  </span>
                </div>
              </div>
            </div>

            {/* FOLLOW US CARD (Matching Screenshot 2) */}
            <div className="bg-gradient-to-r from-red-50 via-slate-50 to-red-50 rounded-3xl p-6 sm:p-8 border border-slate-200/90 text-center space-y-4">
              <h3 className="font-black text-slate-900 text-lg font-heading">
                Follow Us
              </h3>
              <p className="text-xs text-slate-600 font-semibold max-w-md mx-auto">
                Stay updated with promo offers, giveaways, and gaming news.
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a 
                  href="https://wa.me/94740436276" target="_blank" rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-full hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  WhatsApp Channel
                </a>
                <a 
                  href="https://t.me/madstopup" target="_blank" rel="noreferrer"
                  className="px-4 py-2 bg-cyan-600 text-white font-extrabold text-xs rounded-full hover:bg-cyan-700 transition-colors shadow-xs"
                >
                  Telegram Group
                </a>
                <button 
                  onClick={() => showToast('Facebook page coming soon!')}
                  className="px-4 py-2 bg-blue-600 text-white font-extrabold text-xs rounded-full hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                >
                  Facebook
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* SUPPORT TIP BOX (Matching Screenshot 1 & 2) */}
            <div className="bg-[#cc040a] text-white rounded-3xl p-6 shadow-md border border-red-600 flex items-start gap-3 space-y-0">
              <ShieldCheck className="w-7 h-7 text-white shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs font-semibold leading-relaxed">
                <strong className="block text-sm font-black font-heading">Support Tip</strong>
                <p className="text-red-100">
                  Always have your <strong>Order ID</strong> and <strong>Player ID (UID)</strong> ready when contacting us — it helps us resolve your issue instantly.
                </p>
              </div>
            </div>

            {/* QUICK LINKS BOX (Matching Screenshot 1 & 2) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <span className="text-[11px] font-black text-[#cc040a] uppercase tracking-widest font-mono block">
                QUICK LINKS
              </span>

              <div className="space-y-2 text-xs font-bold text-slate-700">
                <button 
                  onClick={() => showToast('FAQ section opening...')}
                  className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-[#cc040a]" />
                    <span>FAQ — Common Questions</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>

                <button 
                  onClick={() => showToast('Refund Policy: 100% money back guarantee on unprocessed top-ups!')}
                  className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#cc040a]" />
                    <span>Refund & Privacy Policy</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>

                <button 
                  onClick={() => showToast('Terms of Service: Automated 24/7 instant dispatch system.')}
                  className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-[#cc040a]" />
                    <span>Terms & Conditions</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>

                <button 
                  onClick={() => showToast('About MADS TOPUP: Premier automated top-up portal in Sri Lanka.')}
                  className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Info className="w-4 h-4 text-[#cc040a]" />
                    <span>About MADS TOPUP</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* BEFORE YOU CONTACT US CARD (Matching Screenshot 2) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
              <span className="text-[11px] font-black text-[#cc040a] uppercase tracking-widest font-mono block">
                BEFORE YOU CONTACT US
              </span>

              <div className="space-y-4 text-xs font-semibold text-slate-700">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#cc040a] font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <p className="leading-relaxed pt-0.5">
                    <strong>Check the FAQ first</strong> — most common questions have instant answers there.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#cc040a] font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <p className="leading-relaxed pt-0.5">
                    <strong>Note your Order ID</strong> — found in your account order history or confirmation email.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#cc040a] font-black text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <p className="leading-relaxed pt-0.5">
                    <strong>Verify your Player ID (UID)</strong> — check it in-game before reporting a delivery issue.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#cc040a] font-black text-xs flex items-center justify-center shrink-0">
                    4
                  </span>
                  <p className="leading-relaxed pt-0.5">
                    <strong>Wait 2–3 minutes</strong> — automated deliveries occasionally take a moment to sync.
                  </p>
                </div>
              </div>
            </div>

            {/* ABOUT THIS BUSINESS CARD (Matching Screenshot 2) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-3">
              <span className="text-[11px] font-black text-[#cc040a] uppercase tracking-widest font-mono block">
                ABOUT THIS BUSINESS
              </span>

              <div className="space-y-2.5 text-xs font-extrabold text-slate-800">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-[#cc040a]" />
                  <span>Sri Lanka — Serving worldwide</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Gamepad2 className="w-4 h-4 text-[#cc040a]" />
                  <span>In the gaming community since 2018</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-[#cc040a]" />
                  <span>Powered by automated MADS API engine</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
