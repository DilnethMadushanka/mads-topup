import React, { useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight } from 'lucide-react';

/* ─────────────────────────────────────────────
   Electric Lightning Canvas Card
   On mouse-enter: fires red zigzag bolts across
   the card continuously while hovered.
───────────────────────────────────────────── */
const ElectricCard = ({ children, className, onClick, style }) => {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const hovering  = useRef(false);

  /* Generate a random zigzag lightning bolt path */
  const makeBolt = useCallback((w, h) => {
    const points = [];
    const segs = 8 + Math.floor(Math.random() * 7);
    const startY = h * (0.1 + Math.random() * 0.8);
    const endY   = h * (0.1 + Math.random() * 0.8);
    points.push([0, startY]);
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const baseY = startY + (endY - startY) * t;
      const jitter = (Math.random() - 0.5) * h * 0.55;
      points.push([(w / segs) * i, baseY + jitter]);
    }
    points.push([w, endY]);
    return points;
  }, []);

  /* Draw one bolt with outer glow + inner core */
  const drawBolt = useCallback((ctx, pts, alpha) => {
    // outer red glow
    ctx.globalAlpha = alpha * 0.75;
    ctx.shadowBlur  = 22;
    ctx.shadowColor = '#cc040a';
    ctx.strokeStyle = '#cc040a';
    ctx.lineWidth   = 3.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.stroke();

    // mid pink glow
    ctx.globalAlpha = alpha * 0.85;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#ff4444';
    ctx.strokeStyle = '#ff6666';
    ctx.lineWidth   = 1.8;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.stroke();

    // white hot core
    ctx.globalAlpha = alpha;
    ctx.shadowBlur  = 4;
    ctx.shadowColor = '#ffffff';
    ctx.strokeStyle = 'rgba(255,230,230,0.95)';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.stroke();

    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
  }, []);

  /* Animation loop */
  const startAnim = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    let frame = 0;
    let bolts = [makeBolt(w, h)];

    const loop = () => {
      if (!hovering.current) {
        ctx.clearRect(0, 0, w, h);
        return;
      }

      frame++;

      // Flicker: regenerate bolt every 5-8 frames
      if (frame % (5 + Math.floor(Math.random() * 4)) === 0) {
        const num = 1 + (Math.random() > 0.55 ? 1 : 0);
        bolts = Array.from({ length: num }, () => makeBolt(w, h));
      }

      // Fade out over 20 frames, then restart
      const cycleLen = 20;
      const cyclePos = frame % cycleLen;
      const alpha    = cyclePos < 5
        ? cyclePos / 5            // fade in
        : 1 - (cyclePos - 5) / 15; // fade out

      ctx.clearRect(0, 0, w, h);
      bolts.forEach(pts => drawBolt(ctx, pts, Math.max(0, alpha)));

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [makeBolt, drawBolt]);

  const handleEnter = useCallback(() => {
    hovering.current = true;
    // Sync canvas size each time (handles layout shifts)
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width  = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
    }
    startAnim();
  }, [startAnim]);

  const handleLeave = useCallback(() => {
    hovering.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      className={className}
      style={style}
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Electric canvas layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20 rounded-3xl"
      />
      {children}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Services Section
───────────────────────────────────────────── */
export const ServicesSection = () => {
  const { openCatalog } = useApp();

  const services = [
    {
      id: 'topup',
      title: 'Game TopUp',
      description: 'Instant in-game currency delivered to your account at unbeatable prices',
      buttonText: 'SHOP NOW',
      image: '/uploads/index_page/game_topup.png',
      action: openCatalog
    },
    {
      id: 'cards',
      title: 'Cards',
      description: 'Garena Shells, Bot Recharge Codes & premium gift cards for gamers',
      buttonText: 'SHOP NOW',
      image: '/uploads/index_page/gift_cards.png',
      action: openCatalog
    },
    {
      id: 'other',
      title: 'Other Services',
      description: 'Explore our growing catalog of free & premium digital services',
      buttonText: 'VIEW MORE',
      image: '/uploads/index_page/other_service.png',
      action: openCatalog,
      comingSoon: true
    }
  ];

  return (
    <section id="services-section" className="pt-8 pb-24 bg-white border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

        {/* Header */}
        <div className="section-header space-y-3 text-center">
          <span className="section-badge">— WHAT WE OFFER —</span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 font-heading tracking-tight leading-tight">
            Our Premium <span className="text-[#cc040a]">Services</span>
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-medium max-w-lg mx-auto leading-relaxed">
            Elevate your gaming experience with our top-tier digital services
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {services.map((service) => (
            <ElectricCard
              key={service.id}
              onClick={service.comingSoon ? undefined : service.action}
              className={`bg-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between items-center text-center border border-slate-200/80 shadow-md hover:shadow-2xl hover:shadow-red-500/15 hover:border-[#cc040a]/40 hover:-translate-y-2.5 transition-all duration-300 group min-h-[390px] relative overflow-hidden reveal reveal-${service.id === 'topup' ? '1' : service.id === 'cards' ? '2' : '3'} ${service.comingSoon ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
            >
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#cc040a] rounded-t-3xl opacity-0 group-hover:opacity-100 transition-all duration-300" />

              {/* Coming Soon Badge */}
              {service.comingSoon && (
                <div className="absolute top-4 right-4 z-30 flex items-center gap-1 bg-[#cc040a] text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md shadow-red-600/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                  Coming Soon
                </div>
              )}

              {/* Icon */}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 my-3 flex items-center justify-center z-10">
                <img
                  src={service.image}
                  alt={service.title}
                  className={`w-full h-full object-contain filter drop-shadow-xl group-hover:scale-108 transition-transform duration-300 rounded-3xl ${service.comingSoon ? 'grayscale-[20%]' : ''}`}
                />
              </div>

              {/* Title & Description */}
              <div className="space-y-2 mb-6 relative z-10 flex-1 flex flex-col justify-center">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 font-heading tracking-tight group-hover:text-[#cc040a] transition-colors duration-300">
                  {service.title}
                </h3>
                <p className="text-slate-500 text-xs sm:text-[13px] leading-relaxed font-medium max-w-[210px] mx-auto">
                  {service.description}
                </p>
              </div>

              {/* Button */}
              <button
                type="button"
                disabled={service.comingSoon}
                onClick={(e) => { e.stopPropagation(); if (!service.comingSoon) service.action(); }}
                className={`btn-cyan-pill px-7 py-2.5 sm:py-3 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 group-hover:shadow-lg group-hover:shadow-red-600/40 group-hover:scale-105 active:scale-95 transition-all duration-200 relative z-10 border-0 outline-none ${service.comingSoon ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
              >
                <span>{service.comingSoon ? 'Coming Soon' : service.buttonText}</span>
                {!service.comingSoon && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </ElectricCard>
          ))}
        </div>

      </div>
    </section>
  );
};
