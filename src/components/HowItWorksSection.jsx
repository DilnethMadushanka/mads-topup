import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, Gamepad2, UserCheck, Zap } from "lucide-react";

/* ─── CONFIG ──────────────────────────────────────────────────────────────
   Drop your video file into the /public folder and set the name here.
   e.g.  public/how-it-works.mp4  →  VIDEO_SRC = "/how-it-works.mp4"
   ────────────────────────────────────────────────────────────────────────── */
const VIDEO_SRC = "/how-it-works.mp4";

const STEPS = [
  {
    number: "01",
    icon: Gamepad2,
    title: "Choose Your Game",
    desc: "Pick from PUBG Mobile, Free Fire, Mobile Legends, and more premium titles.",
    color: "#cc040a",
    bg: "rgba(204,4,10,0.08)",
    border: "rgba(204,4,10,0.18)",
  },
  {
    number: "02",
    icon: UserCheck,
    title: "Enter Your Player ID",
    desc: "No password needed — just your UID. We locate your account instantly.",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.08)",
    border: "rgba(124,58,237,0.18)",
  },
  {
    number: "03",
    icon: Zap,
    title: "Receive in Seconds",
    desc: "Automated delivery straight to your in-game inventory. No waiting.",
    color: "#059669",
    bg: "rgba(5,150,105,0.08)",
    border: "rgba(5,150,105,0.18)",
  },
];

function formatTime(secs) {
  if (!secs || isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const HowItWorksSection = () => {
  const videoRef = useRef(null);
  const progressRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [videoError, setVideoError] = useState(false);

  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setPlaying(true);
      setStarted(true);
    } else {
      vid.pause();
      setPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setMuted(vid.muted);
  }, []);

  const handleFullscreen = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.requestFullscreen) vid.requestFullscreen();
    else if (vid.webkitRequestFullscreen) vid.webkitRequestFullscreen();
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    setCurrentTime(vid.currentTime);
    setProgress(vid.duration ? (vid.currentTime / vid.duration) * 100 : 0);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const vid = videoRef.current;
    if (vid) setDuration(vid.duration);
  }, []);

  const handleEnded = useCallback(() => setPlaying(false), []);

  const handleProgressClick = useCallback((e) => {
    const bar = progressRef.current;
    const vid = videoRef.current;
    if (!bar || !vid) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    vid.currentTime = ratio * vid.duration;
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" && document.activeElement?.closest?.("[data-hiw-player]")) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);

  return (
    <section
      id="how-it-works-section"
      className="relative overflow-hidden border-y border-slate-200/70"
      style={{ background: "linear-gradient(180deg, #f8faff 0%, #ffffff 55%, #f4f6ff 100%)" }}
    >
      {/* soft background accents */}
      <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-[#cc040a]/[0.06] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-24 w-[460px] h-[460px] rounded-full bg-violet-500/[0.07] blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="grid lg:grid-cols-12 gap-14 lg:gap-12 items-center">

          {/* ── LEFT: heading + steps timeline ── */}
          <div className="lg:col-span-7">
            <span className="section-badge">
              <Play size={10} fill="#cc040a" />
              HOW IT WORKS
            </span>
            <h2 className="mt-2 font-heading font-extrabold text-slate-900 tracking-tight leading-[1.08] text-4xl sm:text-5xl">
              Top-Up in Under{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #cc040a 0%, #ff4444 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                60 Seconds
              </span>
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-500 font-medium">
              Watch how easy it is to top-up any game on MADS TOPUP. Fully automated, no middleman.
            </p>

            {/* Timeline */}
            <ol className="mt-10 relative">
              {/* connector line */}
              <span
                aria-hidden="true"
                className="absolute left-[27px] top-8 bottom-8 w-px bg-gradient-to-b from-[#cc040a]/40 via-violet-500/30 to-emerald-500/40"
              />
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <li key={i} className="relative flex gap-5 pb-5 last:pb-0">
                    <div
                      className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-white"
                      style={{ border: `1px solid ${step.border}`, boxShadow: `0 8px 20px -10px ${step.color}` }}
                    >
                      <span className="absolute inset-0 rounded-2xl" style={{ background: step.bg }} />
                      <Icon size={22} color={step.color} className="relative" />
                    </div>

                    <div
                      className="group flex-1 rounded-2xl bg-white border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.25)]"
                      style={{ borderColor: step.border }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: step.color }}>
                            Step {step.number}
                          </div>
                          <h3 className="mt-1 font-heading text-lg font-bold text-slate-900 tracking-tight">
                            {step.title}
                          </h3>
                        </div>
                        <span className="font-heading text-4xl font-extrabold leading-none text-slate-900/[0.06] select-none">
                          {step.number}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-500 font-medium">
                        {step.desc}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* ── RIGHT: phone-framed video ── */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[340px]">
              {/* glow */}
              <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-[#cc040a]/25 via-transparent to-violet-500/25 blur-3xl pointer-events-none" />

              {/* floating chips */}
              <div className="hidden sm:flex absolute -left-10 top-16 z-20 items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-slate-200 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.3)] text-xs font-bold text-slate-800">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Zap size={13} /></span>
                Delivered in seconds
              </div>
              <div className="hidden sm:flex absolute -right-8 bottom-28 z-20 items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-slate-200 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.3)] text-xs font-bold text-slate-800">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center"><UserCheck size={13} /></span>
                UID only
              </div>

              {/* phone bezel */}
              <div className="relative rounded-[2.6rem] p-2.5 bg-slate-950 shadow-[0_40px_80px_-30px_rgba(2,6,23,0.6)] ring-1 ring-white/10">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-20 h-5 rounded-full bg-black" />

                <div
                  data-hiw-player
                  tabIndex={0}
                  style={{
                    position: "relative", borderRadius: 32, overflow: "hidden",
                    background: "#0a0a0f", outline: "none",
                  }}
                >
                  <video
                    ref={videoRef}
                    src={VIDEO_SRC}
                    style={{ display: "block", width: "100%", aspectRatio: "9/16", objectFit: "cover" }}
                    preload="metadata"
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    onError={() => setVideoError(true)}
                  />

                  {/* Error fallback */}
                  {videoError && (
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 12,
                      background: "linear-gradient(135deg, #0f0a0b 0%, #1a0d12 100%)",
                    }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: "50%",
                        background: "rgba(204,4,10,0.15)", border: "2px solid rgba(204,4,10,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Play size={28} color="#cc040a" fill="rgba(204,4,10,0.4)" />
                      </div>
                      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, textAlign: "center", margin: 0, padding: "0 24px" }}>
                        Video not found. Place your MP4 in <code style={{ color: "#ff6b6b" }}>/public/how-it-works.mp4</code>
                      </p>
                    </div>
                  )}

                  {/* Big play overlay */}
                  {!started && !videoError && (
                    <div
                      onClick={togglePlay}
                      style={{
                        position: "absolute", inset: 0, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "linear-gradient(180deg, rgba(10,5,8,0.35) 0%, rgba(20,5,10,0.6) 100%)",
                        backdropFilter: "blur(2px)",
                      }}
                    >
                      <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{
                          position: "absolute", width: 100, height: 100, borderRadius: "50%",
                          border: "2px solid rgba(204,4,10,0.4)",
                          animation: "hiw-pulse 2s ease-out infinite",
                        }} />
                        <div style={{
                          position: "absolute", width: 120, height: 120, borderRadius: "50%",
                          border: "2px solid rgba(204,4,10,0.2)",
                          animation: "hiw-pulse 2s ease-out infinite 0.4s",
                        }} />
                        <div
                          style={{
                            width: 76, height: 76, borderRadius: "50%", cursor: "pointer",
                            background: "linear-gradient(135deg, #cc040a 0%, #ff2a30 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 8px 32px rgba(204,4,10,0.55)",
                            transition: "transform 0.2s", zIndex: 1,
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
                          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                        >
                          <Play size={30} color="#fff" fill="#fff" style={{ marginLeft: 4 }} />
                        </div>
                      </div>
                      <p style={{
                        position: "absolute", bottom: 32,
                        color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 700,
                        letterSpacing: "0.08em", textTransform: "uppercase", margin: 0,
                      }}>
                        Watch Demo
                      </p>
                    </div>
                  )}

                  {/* Controls bar */}
                  {!videoError && (
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%)",
                      padding: "32px 16px 14px",
                      display: "flex", flexDirection: "column", gap: 8,
                      opacity: started ? 1 : 0,
                      transition: "opacity 0.3s",
                      pointerEvents: started ? "auto" : "none",
                    }}>
                      <div
                        ref={progressRef}
                        onClick={handleProgressClick}
                        style={{
                          height: 4, borderRadius: 99, background: "rgba(255,255,255,0.2)",
                          cursor: "pointer", position: "relative",
                        }}
                      >
                        <div style={{
                          height: "100%", borderRadius: 99, width: `${progress}%`,
                          background: "linear-gradient(90deg, #cc040a, #ff4444)",
                          transition: "width 0.1s linear", position: "relative",
                        }}>
                          <div style={{
                            position: "absolute", right: -6, top: "50%", transform: "translateY(-50%)",
                            width: 12, height: 12, borderRadius: "50%",
                            background: "#fff", boxShadow: "0 0 6px rgba(204,4,10,0.6)",
                          }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button onClick={togglePlay} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#fff", display: "flex", alignItems: "center" }} title={playing ? "Pause" : "Play"}>
                          {playing ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" style={{ marginLeft: 2 }} />}
                        </button>
                        <button onClick={toggleMute} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#fff", display: "flex", alignItems: "center" }} title={muted ? "Unmute" : "Mute"}>
                          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 600, fontFamily: "monospace", flex: 1 }}>
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                        <button onClick={handleFullscreen} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#fff", display: "flex", alignItems: "center" }} title="Fullscreen">
                          <Maximize2 size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes hiw-pulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </section>
  );
};
