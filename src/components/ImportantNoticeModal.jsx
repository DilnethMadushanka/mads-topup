import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, Smartphone, Lock, Volume2 } from 'lucide-react';

export const ImportantNoticeModal = () => {
  const { isNoticeModalOpen, setIsNoticeModalOpen, showToast, setIsWalletModalOpen } = useApp();
  const [hasAgreed, setHasAgreed] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isNoticeModalOpen) return null;

  const handleContinue = () => {
    if (!hasAgreed) return;
    if (dontShowAgain) {
      localStorage.setItem('mads_dont_show_notice', 'true');
    }
    setIsNoticeModalOpen(false);
    setIsWalletModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-slate-100 max-h-[92vh]">
        
        {/* VIBRANT RED HEADER BANNER (Matching Screenshot 1) */}
        <div className="bg-gradient-to-r from-[#DC2626] to-[#B91C1C] p-5 text-white flex items-center justify-between relative shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <ShieldAlert className="w-6 h-6 text-white fill-white/30" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-white">
                Important Notice
              </h2>
              <p className="text-xs text-red-100 font-medium">
                Read before proceeding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white font-extrabold text-xs">
              EN
            </span>
            <button 
              onClick={() => showToast('Audio instructions playing')}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs transition-colors"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsNoticeModalOpen(false)}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SCROLLABLE RULES CONTENT BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* SECTION 1: EZ Cash Payment Rules */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-600 font-black text-sm">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <Smartphone className="w-4 h-4" />
              </div>
              <span>EZ Cash Payment Rules</span>
            </div>

            <div className="pl-4 space-y-3 border-l-2 border-red-100">
              <div className="flex items-start gap-2.5 text-slate-700 font-medium leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  After sending EZ Cash payment, you <strong className="text-slate-900 font-extrabold">must get the RN number</strong> from the confirmation SMS received from EZ Cash, or use the <strong className="text-slate-900 font-extrabold">Dialog Genie app ➔ EZ Cash Transaction History</strong> to find it.
                </span>
              </div>

              <div className="flex items-start gap-2.5 text-slate-700 font-medium leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Every RN number has <strong className="text-slate-900 font-extrabold">exactly 14 digits</strong> and normally starts with today's date. E.g: <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">20260910XXXXXX</span>
                </span>
              </div>

              <div className="flex items-start gap-2.5 text-slate-700 font-medium leading-relaxed bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/70">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  If sending from a <strong className="text-slate-900 font-extrabold">Communication Center</strong>, ask them <em>before paying</em>: "Will I get a 14-digit RN number?" — If not, <strong className="text-red-600 font-extrabold">do not send</strong>. You may lose your money.
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: Binance Payment Rules */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-emerald-700 font-black text-sm">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xs">
                🔶
              </div>
              <span>Binance Payment Rules</span>
            </div>

            <div className="pl-4 space-y-3 border-l-2 border-emerald-100">
              <div className="flex items-start gap-2.5 text-slate-700 font-medium leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900 font-extrabold">Always use your own Binance account</strong> to make payments. Third-party or shared accounts will not be accepted.
                </span>
              </div>

              <div className="flex items-start gap-2.5 text-slate-700 font-medium leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  After payment, go to <strong className="text-slate-900 font-extrabold">Binance Pay ➔ Payment History</strong> and copy the exact <strong className="text-slate-900 font-extrabold">Order ID</strong> for verification.
                </span>
              </div>

              <div className="flex items-start gap-2.5 text-slate-700 font-medium leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Enter your correct <strong className="text-slate-900 font-extrabold">Binance Pay ID</strong> so we can match the sender. Mismatched IDs will cause verification failure.
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* FOOTER CHECKBOXES & ACTION BUTTON (Matching Screenshot 1) */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-4">
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2.5 font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasAgreed}
                onChange={(e) => setHasAgreed(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <span>I have read and agree to these payment instructions</span>
            </label>

            <label className="flex items-center gap-2.5 font-semibold text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-slate-500 focus:ring-slate-400"
              />
              <span>Don't show this again on this device</span>
            </label>
          </div>

          <button
            onClick={handleContinue}
            disabled={!hasAgreed}
            className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              hasAgreed
                ? 'bg-[#cc040a] hover:bg-[#990207] text-white shadow-lg shadow-red-500/30'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {!hasAgreed && <Lock className="w-4 h-4" />}
            <span>{hasAgreed ? 'CONTINUE TO PAYMENT' : 'PLEASE AGREE TO CONTINUE'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
