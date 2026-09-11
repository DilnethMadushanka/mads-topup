import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Smartphone, ShieldCheck, Zap, PlusSquare, CheckCircle2, ArrowRight, Share2, Sparkles, Apple, Compass } from 'lucide-react';

export const DownloadAppModal = () => {
  const { isDownloadAppModalOpen, setIsDownloadAppModalOpen, showToast } = useApp();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [activeTab, setActiveTab] = useState('ios'); // 'ios' | 'android'

  useEffect(() => {
    // Detect OS automatically
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }

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
      if (outcome === 'accepted') {
        showToast('Thank you for adding MADS TOPUP to your Home Screen! 🎉');
      }
      setDeferredPrompt(null);
    } else {
      showToast('Follow the step-by-step guide below to add to your Home Screen 📱');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#0f172a] text-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative animate-in zoom-in-95 duration-200 my-auto">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-[#cc040a] via-red-600 to-[#990207] p-6 text-center relative overflow-hidden">
          <button
            onClick={() => setIsDownloadAppModalOpen(false)}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-slate-950 shadow-xl flex items-center justify-center mx-auto mb-3 border border-white/20 p-2 overflow-hidden ring-4 ring-white/10">
            <img src="/mads-logo.jpg" alt="MADS TOPUP App" className="w-full h-full object-contain rounded-xl" />
          </div>

          <h2 className="text-2xl font-black font-heading text-white tracking-tight flex items-center justify-center gap-2">
            <span>Add MADS TOPUP to Home Screen</span>
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          </h2>
          <p className="text-xs text-red-100 font-semibold mt-1">
            Install the web app for instant 1-tap topups without app store downloads
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* Main 1-Tap Install Button */}
          <button
            onClick={handleInstallPwa}
            className="w-full p-4 bg-gradient-to-r from-[#cc040a] via-red-600 to-red-700 hover:from-red-600 hover:to-red-800 text-white rounded-2xl font-black text-sm flex items-center justify-between transition-all shadow-xl shadow-red-600/25 cursor-pointer group"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-sm">Add App to Home Screen</div>
                <div className="text-[11px] text-red-100 font-medium">1-Tap Install • Fast & Light (0 MB Storage)</div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-red-200 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* OS Tab Selector (iPhone vs Android) */}
          <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 flex gap-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'ios' ? 'bg-[#cc040a] text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Apple className="w-4 h-4" />
              <span>iPhone / iOS Safari</span>
            </button>
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'android' ? 'bg-[#cc040a] text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Android / Chrome</span>
            </button>
          </div>

          {/* Step-by-Step Instructions Card */}
          {activeTab === 'ios' ? (
            /* iPhone Safari Steps */
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3.5 animate-in fade-in">
              <div className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
                <Apple className="w-4 h-4" />
                <span>How to Add on iPhone / iPad (Safari Browser):</span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300 font-medium">
                <div className="flex items-start gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 font-black text-xs flex items-center justify-center shrink-0">1</div>
                  <div>
                    Tap the <strong>Share Button</strong> <Share2 className="w-3.5 h-3.5 text-sky-400 inline mx-1" /> at the bottom of Safari browser bar.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 font-black text-xs flex items-center justify-center shrink-0">2</div>
                  <div>
                    Scroll down the options menu and tap <strong>"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline mx-1" />.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 font-black text-xs flex items-center justify-center shrink-0">3</div>
                  <div>
                    Tap <strong>"Add"</strong> in the top-right corner. The MADS TOPUP App icon will appear on your iPhone screen! 🎉
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Android Chrome Steps */
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3.5 animate-in fade-in">
              <div className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                <span>How to Add on Android (Chrome / Samsung Internet):</span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300 font-medium">
                <div className="flex items-start gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">1</div>
                  <div>
                    Tap the <strong>Browser Menu (⋮)</strong> three dots in top-right of Chrome.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">2</div>
                  <div>
                    Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">3</div>
                  <div>
                    Confirm <strong>"Install"</strong>. MADS TOPUP will instantly appear as an app icon on your phone! 🚀
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Key Advantages Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold text-slate-300">Instant Access</span>
            </div>
            <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-slate-300">100% Safe & Fast</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
