import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const STYLES = {
  success: { title: 'Success', Icon: CheckCircle2, accent: 'bg-emerald-500', iconWrap: 'bg-emerald-500/15 text-emerald-400', bar: 'bg-emerald-400' },
  error: { title: 'Error', Icon: AlertCircle, accent: 'bg-rose-500', iconWrap: 'bg-rose-500/15 text-rose-400', bar: 'bg-rose-400' },
  warning: { title: 'Heads up', Icon: AlertTriangle, accent: 'bg-amber-500', iconWrap: 'bg-amber-500/15 text-amber-400', bar: 'bg-amber-400' },
  info: { title: 'Info', Icon: Info, accent: 'bg-sky-500', iconWrap: 'bg-sky-500/15 text-sky-400', bar: 'bg-sky-400' },
};

const ToastItem = ({ toast, onDismiss }) => {
  const style = STYLES[toast.type] || STYLES.success;
  const duration = toast.type === 'error' ? 6000 : 4000;
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const remaining = useRef(duration);
  const startedAt = useRef(0);

  const close = () => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  // Countdown that pauses while hovered; remaining time carries over.
  useEffect(() => {
    if (paused || leaving) return undefined;
    startedAt.current = Date.now();
    const t = setTimeout(close, remaining.current);
    return () => {
      clearTimeout(t);
      remaining.current -= Date.now() - startedAt.current;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, leaving]);

  const { Icon } = style;
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`toast-card pointer-events-auto relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 text-white shadow-2xl shadow-black/40 backdrop-blur-md ${leaving ? 'toast-out' : 'toast-in'}`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${style.accent}`} />
      <div className="flex items-start gap-3 py-3 pl-4 pr-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.iconWrap}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-heading text-[13px] font-bold leading-tight">{style.title}</p>
          <p className="mt-0.5 break-words text-xs font-medium leading-snug text-slate-300">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close notification"
          className="-mr-1 rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <span
        className={`toast-progress absolute bottom-0 left-0 h-[3px] w-full origin-left ${style.bar} opacity-70`}
        style={{ animationDuration: `${duration}ms`, animationPlayState: paused || leaving ? 'paused' : 'running' }}
      />
    </div>
  );
};

export const ToastNotification = () => {
  const { toasts, dismissToast } = useApp();
  if (!toasts || toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-4 z-[99999] flex w-[calc(100%-32px)] -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-4 sm:top-20 sm:w-[380px] sm:translate-x-0"
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
      ))}
    </div>
  );
};
