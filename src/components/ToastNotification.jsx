import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const ToastNotification = () => {
  const { toast } = useApp();

  if (!toast) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className={`px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md flex items-center gap-3 text-xs font-extrabold ${
        toast.type === 'error'
          ? 'bg-rose-900/90 text-white border-rose-700 shadow-rose-950/40'
          : 'bg-slate-900/90 text-white border-red-500/40 shadow-red-950/40'
      }`}>
        {toast.type === 'error' ? (
          <AlertCircle className="w-4 h-4 text-rose-400" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-red-500" />
        )}
        <span>{toast.message}</span>
      </div>
    </div>
  );
};
