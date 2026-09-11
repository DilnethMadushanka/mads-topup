import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Smile, CheckCircle2, Zap, Clock } from 'lucide-react';

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

export const StatsSection = () => {
  const { orders } = useApp();
  const realOrdersCount = (orders || []).length;

  const stats = [
    {
      target: 250 + realOrdersCount,
      suffix: '+',
      formatComma: true,
      label: 'Happy Customers',
      icon: Smile,
      iconBg: 'bg-[#cc040a]/15 text-[#cc040a]'
    },
    {
      target: 99,
      suffix: '%',
      formatComma: false,
      label: 'Success Rate',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-500/20 text-emerald-400'
    },
    {
      target: 25 + Math.floor(realOrdersCount * 0.8),
      suffix: '+',
      formatComma: false,
      label: 'Daily Avg TopUp',
      icon: Zap,
      iconBg: 'bg-[#3B2896]/30 text-purple-400'
    },
    {
      target: 2,
      suffix: 's',
      formatComma: false,
      label: 'Delivery (Seconds)',
      icon: Clock,
      iconBg: 'bg-[#cc040a]/15 text-[#cc040a]'
    }
  ];

  return (
    <section className="py-12 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div 
                key={idx}
                className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center text-center space-y-3 hover:border-[#cc040a]/40 hover:bg-white transition-all transform hover:-translate-y-1 duration-300"
              >
                <div className={`w-12 h-12 rounded-2xl ${stat.iconBg} flex items-center justify-center transition-transform hover:scale-110 duration-300`}>
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 font-heading tracking-tight">
                  <CountUpNumber 
                    target={stat.target} 
                    suffix={stat.suffix} 
                    formatComma={stat.formatComma} 
                  />
                </div>
                <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};


