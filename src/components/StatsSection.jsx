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

const ProgressRing = ({ percent = 99, size = 64 }) => {
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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fee2e2" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#cc040a" strokeWidth={stroke} strokeLinecap="round"
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

  const stats = [
    {
      target: 250 + realOrdersCount,
      suffix: '+',
      formatComma: true,
      label: 'Happy Customers',
      desc: 'Gamers who topped up with us',
      icon: Smile,
      iconBg: 'bg-[#cc040a]/15 text-[#cc040a]'
    },
    {
      target: 99,
      suffix: '%',
      formatComma: false,
      label: 'Success Rate',
      desc: 'Orders delivered successfully',
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
      icon: Zap,
      iconBg: 'bg-[#3B2896]/30 text-purple-400'
    },
    {
      target: 2,
      suffix: 's',
      formatComma: false,
      label: 'Delivery (Seconds)',
      desc: 'Average time to your account',
      icon: Clock,
      iconBg: 'bg-[#cc040a]/15 text-[#cc040a]'
    }
  ];

  const trust = [
    { icon: ShieldCheck, label: 'Secure Payments' },
    { icon: Zap, label: 'Instant Delivery' },
    { icon: Headphones, label: '24/7 Support' },
    { icon: BadgeCheck, label: 'Verified Service' },
  ];

  return (
    <section className="relative py-16 sm:py-20 overflow-hidden bg-white border-y border-slate-200/80">
      <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-red-50 pointer-events-none"></div>
      <div className="absolute -bottom-28 -left-24 w-80 h-80 rounded-full bg-red-50/70 pointer-events-none"></div>
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
          <div className="w-14 h-1 bg-[#cc040a] rounded-full mt-3 mx-auto"></div>
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
            return (
              <div
                key={idx}
                className="relative bg-white p-5 sm:p-7 rounded-3xl border-2 border-slate-200 shadow-sm flex flex-col items-center text-center space-y-3 hover:border-[#cc040a]/40 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-red-600/10 transition-all duration-300 group overflow-hidden"
              >
                <div className="absolute top-0 left-6 right-6 h-1 rounded-b-full bg-[#cc040a] opacity-80"></div>
                <span className="absolute top-3 right-4 text-[10px] font-black font-mono text-slate-300 group-hover:text-[#cc040a] transition-colors">0{idx + 1}</span>

                {stat.ring ? (
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <ProgressRing percent={stat.ring} size={64} />
                    <div className="absolute inset-0 flex items-center justify-center text-[#cc040a]">
                      <Icon className="w-6 h-6 stroke-[2.5]" />
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#cc040a] group-hover:bg-[#cc040a] group-hover:text-white group-hover:shadow-lg group-hover:shadow-red-600/25 group-hover:rotate-3 flex items-center justify-center transition-all duration-300">
                    <Icon className="w-7 h-7 stroke-[2.5]" />
                  </div>
                )}

                <div className="text-4xl sm:text-5xl font-black text-slate-900 font-heading tracking-tighter leading-none">
                  <CountUpNumber
                    target={stat.target}
                    suffix={stat.suffix}
                    formatComma={stat.formatComma}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-black text-[#cc040a] uppercase tracking-widest">
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
          {trust.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-red-50 hover:border-red-100 transition-colors">
              <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-[#cc040a] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-xs font-black text-slate-700">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
