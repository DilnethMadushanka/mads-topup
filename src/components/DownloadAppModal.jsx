import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X, Smartphone, ShieldCheck, Zap, ArrowRight, Share2,
  Sparkles, PlusSquare, MoreVertical, Download, Apple, Globe
} from 'lucide-react';

export const DownloadAppModal = () => {
  const { isDownloadAppModalOpen, setIsDownloadAppModalOpen, showToast } = useApp();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [activeTab, setActiveTab] = useState('ios');

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setActiveTab(isIOS ? 'ios' : 'android');

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  if (!isDownloadAppModalOpen) return null;

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') showToast('MADS TOPUP added to your Home Screen! 🎉');
      setDeferredPrompt(null);
    } else {
      showToast('Follow the step-by-step guide below to install 📱');
    }
  };

  const iosSteps = [
    {
      icon: <Share2 className="w-4 h-4 text-[#cc040a]" />,
      text: <>Tap the <strong>Share button</strong> <Share2 className="w-3.5 h-3.5 text-[#cc040a] inline mx-0.5" /> at the bottom of the Safari browser bar.</>
    },
    {
      icon: <PlusSquare className="w-4 h-4 text-[#cc040a]" />,
      text: <>Scroll down and tap <strong>"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 text-[#cc040a] inline mx-0.5" />.</>
    },
    {
      icon: <ShieldCheck className="w-4 h-4 text-[#cc040a]" />,
      text: <>Tap <strong>"Add"</strong> in the top-right. MADS TOPUP icon appears instantly on your iPhone! 🎉</>
    },
  ];

  const androidSteps = [
    {
      icon: <MoreVertical className="w-4 h-4 text-[#cc040a]" />,
      text: <>Tap the <strong>Browser Menu (⋮)</strong> — three dots in the top-right corner of Chrome.</>
    },
    {
      icon: <Download className="w-4 h-4 text-[#cc040a]" />,
      text: <>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</>
    },
    {
      icon: <Smartphone className="w-4 h-4 text-[#cc040a]" />,
      text: <>Confirm <strong>"Install"</strong>. MADS TOPUP appears as an app on your phone instantly! 🚀</>
    },
  ];

  const steps = activeTab === 'ios' ? iosSteps : androidSteps;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl shadow-slate-300/60 border border-slate-200/80 overflow-hidden relative"
        style={{ animation: 'modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        <style>{`
          @keyframes modalPop {
            from { opacity: 0; transform: scale(0.92) translateY(10px); }
            to   { opacity: 1; transform: scale(1)    translateY(0); }
          }
        `}</style>

        {/* ── RED HEADER BANNER ── */}
        <div className="relative bg-gradient-to-br from-[#cc040a] via-red-600 to-[#a00208] px-6 pt-8 pb-7 text-center overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />

          {/* Close button */}
          <button
            onClick={() => setIsDownloadAppModalOpen(false)}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* App Icon */}
          <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center mx-auto mb-4 border-4 border-white/30 overflow-hidden">
            <img src="/mads-logo.jpg" alt="MADS TOPUP" className="w-full h-full object-contain" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-heading text-white tracking-tight flex items-center justify-center gap-2 leading-tight">
            Add MADS TOPUP
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse shrink-0" />
          </h2>
          <p className="text-white font-black text-xl tracking-tight">to Home Screen</p>
          <p className="text-[12px] text-red-100 font-medium mt-1.5 leading-snug">
            Install instantly — no App Store needed, 0 MB storage
          </p>
        </div>

        {/* ── MODAL BODY ── */}
        <div className="p-5 sm:p-6 space-y-4 bg-white">

          {/* 1-Tap Install CTA */}
          <button
            onClick={handleInstallPwa}
            className="w-full p-4 bg-[#cc040a] hover:bg-[#b00308] text-white rounded-2xl font-black text-sm flex items-center justify-between transition-all shadow-lg shadow-red-600/25 cursor-pointer group active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-sm">Add App to Home Screen</div>
                <div className="text-[11px] text-red-200 font-medium">1-Tap Install • Fast & Light (0 MB)</div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-red-200 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          {/* OS Tab Selector */}
          <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer font-black ${
                activeTab === 'ios'
                  ? 'bg-[#cc040a] text-white shadow-md shadow-red-500/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Apple className="w-4 h-4" />
              <span>iPhone / iOS</span>
            </button>
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer font-black ${
                activeTab === 'android'
                  ? 'bg-[#cc040a] text-white shadow-md shadow-red-500/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Android / Chrome</span>
            </button>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            {/* Heading */}
            <div className="text-[11px] font-black text-[#cc040a] uppercase tracking-widest flex items-center gap-1.5">
              {activeTab === 'ios'
                ? <><Apple className="w-3.5 h-3.5" /> How to Add on iPhone / iPad (Safari)</>
                : <><Globe className="w-3.5 h-3.5" /> How to Add on Android (Chrome / Samsung)</>
              }
            </div>

            {/* Steps */}
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm"
                >
                  <div className="w-6 h-6 rounded-lg bg-red-50 border border-red-100 text-[#cc040a] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="text-xs text-slate-700 font-medium leading-relaxed">
                    {step.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Badges */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#cc040a] shrink-0" />
              <span className="text-xs font-black text-slate-800">Instant Access</span>
            </div>
            <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#cc040a] shrink-0" />
              <span className="text-xs font-black text-slate-800">100% Safe & Free</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
