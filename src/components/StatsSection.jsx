import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
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


const ProgressRing = ({ percent = 99, size = 64, color = '#1677ff', track = '#dfecff' }) => {
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
      iconBg: 'bg-[#1677ff]/15 text-[#1677ff]'
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
      iconBg: 'bg-[#1677ff]/15 text-[#1677ff]'
    }
  ];

  const trust = [
    { icon: ShieldCheck, label: 'Secure Payments', color: 'emerald' },
    { icon: Zap, label: 'Instant Delivery', color: 'amber' },
    { icon: Headphones, label: '24/7 Support', color: 'sky' },
    { icon: BadgeCheck, label: 'Verified Service', color: 'violet' },
  ];

  const [customers, success, daily, delivery] = stats;
  const num = (st) => <CountUpNumber target={st.target} suffix={st.suffix} formatComma={st.formatComma} />;

  return (
    <section className="ns-section">
      <div className="ns-wrap">
        <div className="ns-head">
          <div>
            <span className="ns-kicker"><TrendingUp /> By the numbers</span>
            <h2 className="ns-title">Numbers that <span>speak</span></h2>
          </div>
          {realOrdersCount > 0 && (
            <span className="ns-live"><i />Live: {realOrdersCount.toLocaleString('en-US')} orders processed on this site</span>
          )}
        </div>

        <div className="ns-bento">
          <div className="ns-card is-hero">
            <Smile className="ns-hero-mark" aria-hidden="true" />
            <span className="ns-chip"><Smile /></span>
            <div className="ns-num">{num(customers)}</div>
            <div className="ns-label">{customers.label}</div>
            <p className="ns-desc">{customers.desc}</p>
            <div className="ns-faces" aria-hidden="true">
              <span className="ns-faces-stack">
                {GAMES_DATA.filter((g) => g && g.logo && g.packages && g.packages.length).slice(0, 5).map((g) => <img key={g.id} src={g.logo} alt="" loading="lazy" />)}
              </span>
              <small>Topping up their favourite games</small>
            </div>
          </div>

          <div className="ns-card is-green">
            <div className="ns-ring">
              <ProgressRing percent={success.ring} size={58} color="#10b981" track="rgba(16,185,129,.18)" />
              <CheckCircle2 />
            </div>
            <div className="ns-num">{num(success)}</div>
            <div className="ns-label">{success.label}</div>
            <p className="ns-desc">{success.desc}</p>
          </div>

          <div className="ns-card is-violet">
            <span className="ns-chip"><Zap /></span>
            <div className="ns-num">{num(daily)}</div>
            <div className="ns-label">{daily.label}</div>
            <p className="ns-desc">{daily.desc}</p>
          </div>

          <div className="ns-card is-amber is-wide">
            <span className="ns-chip"><Clock /></span>
            <div className="ns-wide-body">
              <div className="ns-num">{num(delivery)}</div>
              <div>
                <div className="ns-label">{delivery.label}</div>
                <p className="ns-desc">{delivery.desc}</p>
              </div>
            </div>
            <div className="ns-speed" aria-hidden="true"><span /></div>
          </div>
        </div>

        <ul className="ns-trust">
          {trust.map(({ icon: Icon, label, color }) => (
            <li key={label} className={`is-${color}`}><span><Icon /></span>{label}</li>
          ))}
        </ul>
      </div>
    </section>
  );
};
