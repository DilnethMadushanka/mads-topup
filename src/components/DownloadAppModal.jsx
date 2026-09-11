import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Download, Smartphone, ShieldCheck, Zap, QrCode, CheckCircle2, ArrowRight, Share2, Sparkles } from 'lucide-react';

export const DownloadAppModal = () => {
  const { isDownloadAppModalOpen, setIsDownloadAppModalOpen, showToast } = useApp();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDownloadingApk, setIsDownloadingApk] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
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
        showToast('Thank you for installing MADS TOPUP App! 🎉');
      }
      setDeferredPrompt(null);
    } else {
      showToast('To install: Tap Browser Menu (⋮ or Share) -> "Add to Home Screen" 📱');
    }
  };

  const handleDownloadApk = () => {
    setIsDownloadingApk(true);
    setDownloadProgress(10);

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloadingApk(false);
          
          // Trigger file download
          const link = document.createElement('a');
          link.href = '#';
          link.setAttribute('download', 'mads-topup-v2.4.apk');
          document.body.appendChild(link);
          
          showToast('MADS TOPUP Official Android APK download started! 🚀');
          return 100;
        }
        return prev + 20;
      });
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#0f172a] text-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative animate-in zoom-in-95 duration-200 my-auto">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-[#cc040a] via-red-600 to-[#990207] p-6 text-center relative overflow-hidden">
          <button
            onClick={() => setIsDownloadAppModalOpen(false)}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-slate-950 shadow-xl flex items-center justify-center mx-auto mb-3 border border-white/20 p-2 overflow-hidden">
            <img src="/mads-logo.jpg" alt="MADS TOPUP App" className="w-full h-full object-contain rounded-xl" />
          </div>

          <h2 className="text-2xl font-black font-heading text-white tracking-tight flex items-center justify-center gap-2">
            <span>Download MADS TOPUP App</span>
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          </h2>
          <p className="text-xs text-red-100 font-semibold mt-1">
            Get the fastest diamond top-ups right on your phone screen
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          
          {/* Main Download Options */}
          <div className="space-y-3">
            {/* Option 1: Direct APK Download */}
            <button
              onClick={handleDownloadApk}
              disabled={isDownloadingApk}
              className="w-full p-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-sm flex items-center justify-between transition-all shadow-lg shadow-emerald-600/20 cursor-pointer group disabled:opacity-75"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 group-hover:bounce" />
                </div>
                <div>
                  <div className="font-extrabold text-sm">Download Android APK</div>
                  <div className="text-[11px] text-emerald-100 font-medium">v2.4.0 • Fast & Secure Direct APK (28 MB)</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-200 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* APK Progress Bar */}
            {isDownloadingApk && (
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5 animate-in fade-in">
                <div className="flex justify-between text-xs font-bold text-emerald-400">
                  <span>Downloading APK Package...</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-200 rounded-full"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Option 2: PWA Install Web App */}
            <button
              onClick={handleInstallPwa}
              className="w-full p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm flex items-center justify-between border border-slate-800 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm">Install Web App (PWA)</div>
                  <div className="text-[11px] text-slate-400 font-medium">Instant Add to Home Screen (No Download Needed)</div>
                </div>
              </div>
              <Share2 className="w-4 h-4 text-slate-400 group-hover:text-white" />
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800/80 flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-extrabold text-slate-200">1-Tap Topups</span>
            </div>
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800/80 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-extrabold text-slate-200">100% Verified</span>
            </div>
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800/80 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-xs font-extrabold text-slate-200">Live Order Track</span>
            </div>
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800/80 flex items-center gap-2.5">
              <QrCode className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs font-extrabold text-slate-200">Mobile Optimized</span>
            </div>
          </div>

          {/* iOS Instructions Note */}
          <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <span className="text-red-500 font-black shrink-0">iOS / iPhone:</span>
            <span>Open in Safari → Tap Share Button <Share2 className="w-3 h-3 inline" /> → Tap <strong>"Add to Home Screen"</strong></span>
          </div>

        </div>

      </div>
    </div>
  );
};
