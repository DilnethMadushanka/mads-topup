import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Smile, CheckCircle2, Zap, Clock, ShieldCheck, Headphones, BadgeCheck, TrendingUp } from 'lucide-react';

const CountUpNumber = ({ target, suffix = '', formatComma = false, duration = 1800 }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated) return;

    let startTime = null;
    let frameId;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      
      // Smooth easeOutCubic transition
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.floor(easeProgress * target);

      setCount(currentVal);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [hasAnimated, target, duration]);

  const displayVal = formatComma ? count.toLocaleString('en-US') : count;

  return <span ref={ref}>{displayVal}{suffix}</span>;
};

const PALETTE = {
  red:     { hex: '#ff3b45', track: 'rgba(225,29,40,0.2)', bar: 'bg-[#cc040a]',  tile: 'bg-red-50 text-[#cc040a]',       tileHover: 'group-hover:bg-[#cc040a] group-hover:shadow-red-600/30',   label: 'text-[#cc040a]',  card: 'hover:border-red-300 hover:shadow-red-600/15',     blob: 'bg-red-50',     idx: 'group-hover:text-[#cc040a]' },
  emerald: { hex: '#34d399', track: 'rgba(16,185,129,0.2)', bar: 'bg-emerald-500', tile: 'bg-emerald-50 text-emerald-600', tileHover: 'group-hover:bg-emerald-600 group-hover:shadow-emerald-600/30', label: 'text-emerald-600', card: 'hover:border-emerald-300 hover:shadow-emerald-600/15', blob: 'bg-emerald-50', idx: 'group-hover:text-emerald-600' },
  violet:  { hex: '#7c3aed', track: 'rgba(139,92,246,0.22)', bar: 'bg-violet-500',  tile: 'bg-violet-50 text-violet-600',   tileHover: 'group-hover:bg-violet-600 group-hover:shadow-violet-600/30',  label: 'text-violet-600',  card: 'hover:border-violet-300 hover:shadow-violet-600/15',  blob: 'bg-violet-50',  idx: 'group-hover:text-violet-600' },
  amber:   { hex: '#d97706', track: 'rgba(245,158,11,0.2)', bar: 'bg-amber-500',   tile: 'bg-amber-50 text-amber-600',     tileHover: 'group-hover:bg-amber-500 group-hover:shadow-amber-500/30',   label: 'text-amber-600',   card: 'hover:border-amber-300 hover:shadow-amber-500/15',    blob: 'bg-amber-50',   idx: 'group-hover:text-amber-600' },
  sky:     { hex: '#0284c7', track: 'rgba(14,165,233,0.2)', bar: 'bg-sky-500',     tile: 'bg-sky-50 text-sky-600',         tileHover: 'group-hover:bg-sky-600 group-hover:shadow-sky-600/30',       label: 'text-sky-600',     card: 'hover:border-sky-300 hover:shadow-sky-600/15',        blob: 'bg-sky-50',     idx: 'group-hover:text-sky-600' },
};

const ProgressRing = ({ percent = 99, size = 64, color = '#cc040a', track = '#fee2e2' }) => {
  const [on, setOn] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setOn(true); }, { threshold: 0.3 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={on ? c * (1 - percent / 100) : c}
        style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(0.22,1,0.36,1)' }}
      />
    </svg>
  );
};

export const StatsSection = () => {
  const { orders } = useApp();
  const realOrdersCount = (orders || []).length;
  const [registeredUsers, setRegisteredUsers] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public-stats')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!cancelled && d && Number.isFinite(d.users)) setRegisteredUsers(d.users);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const stats = [
    {
      target: registeredUsers ?? 250 + realOrdersCount,
      suffix: '+',
      formatComma: true,
      label: 'Happy Customers',
      desc: 'Gamers who topped up with us',
      color: 'red',
      icon: Smile,
      iconBg: 'bg-[#cc040a]/15 text-[#cc040a]'
    },
    {
      target: 99,
      suffix: '%',
      formatComma: false,
      label: 'Success Rate',
      desc: 'Orders delivered successfully',
      color: 'emerald',
      ring: 99,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-500/20 text-emerald-400'
    },
    {
      target: 30 + realOrdersCount,
      suffix: '+',
      formatComma: false,
      label: 'Daily Avg TopUp',
      desc: 'Top-ups processed every day',
      color: 'violet',
      icon: Zap,
      iconBg: 'bg-[#3B2896]/30 text-purple-400'
    },
    {
      target: 2,
      suffix: 's',
      formatComma: false,
      label: 'Delivery (Seconds)',
      desc: 'Average time to your account',
      color: 'amber',
      icon: Clock,
      iconBg: 'bg-[#cc040a]/15 text-[#cc040a]'
    }
  ];

  const trust = [
    { icon: ShieldCheck, label: 'Secure Payments', color: 'emerald' },
    { icon: Zap, label: 'Instant Delivery', color: 'amber' },
    { icon: Headphones, label: '24/7 Support', color: 'sky' },
    { icon: BadgeCheck, label: 'Verified Service', color: 'violet' },
  ];

  return (
    <section className="relative py-16 sm:py-20 overflow-hidden bg-white border-y border-slate-200/80">
      <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-red-50 pointer-events-none dark:hidden"></div>
      <div className="absolute top-1/3 -left-28 w-72 h-72 rounded-full bg-violet-50 pointer-events-none dark:hidden"></div>
      <div className="absolute -bottom-28 right-1/4 w-80 h-80 rounded-full bg-emerald-50/80 pointer-events-none dark:hidden"></div>
      <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-amber-50 pointer-events-none dark:hidden"></div>
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #cc040a 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100 text-[#cc040a] text-[11px] font-black uppercase tracking-widest font-mono">
            <TrendingUp className="w-3.5 h-3.5" />
            By The Numbers
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-heading tracking-tight mt-4">
            Numbers That <span className="text-[#cc040a]">Speak</span>
          </h2>
          <div className="flex items-center justify-center gap-1 mt-3">
            <span className="w-8 h-1 rounded-full bg-[#cc040a]"></span>
            <span className="w-4 h-1 rounded-full bg-violet-500"></span>
            <span className="w-4 h-1 rounded-full bg-emerald-500"></span>
            <span className="w-4 h-1 rounded-full bg-amber-500"></span>
          </div>
          {realOrdersCount > 0 && (
            <div className="inline-flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-full bg-white border-2 border-slate-200 text-xs font-extrabold text-slate-700 shadow-sm">
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping"></span>
                <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </span>
              <span>Live — {realOrdersCount.toLocaleString('en-US')} orders processed on this site</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            const c = PALETTE[stat.color] || PALETTE.red;
            return (
              <div
                key={idx}
                className={`relative bg-white p-5 sm:p-7 rounded-3xl border-2 border-slate-200 shadow-sm flex flex-col items-center text-center space-y-3 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 group overflow-hidden ${c.card}`}
              >
                <div className={`absolute top-0 left-6 right-6 h-1 rounded-b-full opacity-90 ${c.bar}`}></div>
                <div className={`absolute -bottom-10 -right-10 w-28 h-28 rounded-full opacity-70 group-hover:scale-125 transition-transform duration-500 pointer-events-none ${c.blob}`}></div>
                <span className={`absolute top-3 right-4 text-[10px] font-black font-mono text-slate-300 transition-colors ${c.idx}`}>0{idx + 1}</span>

                {stat.ring ? (
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <ProgressRing percent={stat.ring} size={64} color={c.hex} track={c.track} />
                    <div className={`absolute inset-0 flex items-center justify-center ${c.label}`}>
                      <Icon className="w-6 h-6 stroke-[2.5]" />
                    </div>
                  </div>
                ) : (
                  <div className={`w-16 h-16 rounded-2xl group-hover:text-white group-hover:shadow-lg group-hover:rotate-3 flex items-center justify-center transition-all duration-300 ${c.tile} ${c.tileHover}`}>
                    <Icon className="w-7 h-7 stroke-[2.5]" />
                  </div>
                )}

                <div className="relative text-4xl sm:text-5xl font-black text-slate-900 font-heading tracking-tighter leading-none">
                  <CountUpNumber
                    target={stat.target}
                    suffix={stat.suffix}
                    formatComma={stat.formatComma}
                  />
                </div>
                <div className="space-y-1">
                  <div className={`text-[11px] font-black uppercase tracking-widest ${c.label}`}>
                    {stat.label}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium leading-snug">
                    {stat.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust strip */}
        <div className="mt-8 sm:mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {trust.map(({ icon: Icon, label, color }) => {
            const c = PALETTE[color];
            return (
            <div key={label} className={`flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-white border-2 border-slate-200 hover:-translate-y-0.5 hover:shadow-md transition-all ${c.card}`}>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.tile}`}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-xs font-black text-slate-700">{label}</span>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
