import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, Gamepad2, UserCheck, Zap, ArrowRight, ShieldCheck } from "lucide-react";
import { useApp } from "../context/AppContext";

/* ─── CONFIG ──────────────────────────────────────────────────────────────
   Drop your video file into the /public folder and set the name here.
   e.g.  public/how-it-works.mp4  →  VIDEO_SRC = "/how-it-works.mp4"
   ────────────────────────────────────────────────────────────────────────── */
const VIDEO_SRC = "/how-it-works.mp4";
const STEP_MS = 3500;

const STEPS = [
  {
    number: "01",
    tone: "blue",
    icon: Gamepad2,
    title: "Choose Your Game",
    desc: "Pick from PUBG Mobile, Free Fire, Mobile Legends, and more premium titles.",
    color: "#1677ff",
    bg: "rgba(22,119,255,0.08)",
    border: "rgba(22,119,255,0.18)",
  },
  {
    number: "02",
    tone: "violet",
    icon: UserCheck,
    title: "Enter Your Player ID",
    desc: "No password needed — just your UID. We locate your account instantly.",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.08)",
    border: "rgba(124,58,237,0.18)",
  },
  {
    number: "03",
    tone: "green",
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

  const { openCatalog } = useApp();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  // Walk through the steps on a loop until the visitor picks one.
  useEffect(() => {
    if (!auto) return undefined;
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined; } catch (e) { /* ignore */ }
    const t = setInterval(() => setActive((i) => (i + 1) % STEPS.length), STEP_MS);
    return () => clearInterval(t);
  }, [auto]);

  return (
    <section id="how-it-works-section" className="hw-section">
      <div className="hw-wrap">
        <div className="hw-head">
          <span className="hw-kicker"><Play /> How it works</span>
          <h2 className="hw-title">Top-up in under <span>60 seconds</span></h2>
          <p className="hw-lead">Watch how easy it is to top-up any game on MADS TOPUP. Fully automated, no middleman.</p>
        </div>

        <div className="hw-grid">
          <div className="hw-left">
            <ol className="hw-steps">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const on = i === active;
                return (
                  <li key={step.number}>
                    <button
                      type="button"
                      className={`hw-step is-${step.tone}${on ? ' is-on' : ''}`}
                      onClick={() => { setActive(i); setAuto(false); }}
                      aria-current={on ? 'step' : undefined}
                    >
                      <span className="hw-step-ico"><Icon /></span>
                      <span className="hw-step-body">
                        <span className="hw-step-num">Step {step.number}</span>
                        <span className="hw-step-title">{step.title}</span>
                        <span className="hw-step-desc">{step.desc}</span>
                      </span>
                      <span className="hw-step-big" aria-hidden="true">{step.number}</span>
                      {on && auto && <span className="hw-step-bar" aria-hidden="true"><i key={active} style={{ animationDuration: `${STEP_MS}ms` }} /></span>}
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="hw-cta-row">
              <button type="button" className="hw-cta" onClick={() => openCatalog && openCatalog()}>
                Start your top-up <ArrowRight />
              </button>
              <span className="hw-cta-note"><ShieldCheck /> No password needed, just your player ID</span>
            </div>
          </div>

          <div className="hw-media">
            <div className="hw-glow" aria-hidden="true" />
            <span className="hw-chip is-top"><i><Zap /></i>Delivered in seconds</span>
            <span className="hw-chip is-bottom"><i className="is-violet"><UserCheck /></i>UID only</span>
            <div className="hw-phone">
              <span className="hw-notch" aria-hidden="true" />
                <div
                  data-hiw-player
                  tabIndex={0}
                  style={{
                    position: "relative", borderRadius: 32, overflow: "hidden",
                    background: "#061030", outline: "none",
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
                      background: "linear-gradient(135deg, #151a28 0%, #151a2b 100%)",
                    }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: "50%",
                        background: "rgba(22,119,255,0.15)", border: "2px solid rgba(22,119,255,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Play size={28} color="#1677ff" fill="rgba(22,119,255,0.4)" />
                      </div>
                      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, textAlign: "center", margin: 0, padding: "0 24px" }}>
                        Video not found. Place your MP4 in <code style={{ color: "#6db4ff" }}>/public/how-it-works.mp4</code>
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
                          border: "2px solid rgba(22,119,255,0.4)",
                          animation: "hiw-pulse 2s ease-out infinite",
                        }} />
                        <div style={{
                          position: "absolute", width: 120, height: 120, borderRadius: "50%",
                          border: "2px solid rgba(22,119,255,0.2)",
                          animation: "hiw-pulse 2s ease-out infinite 0.4s",
                        }} />
                        <div
                          style={{
                            width: 76, height: 76, borderRadius: "50%", cursor: "pointer",
                            background: "linear-gradient(135deg, #1677ff 0%, #3591ff 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 8px 32px rgba(22,119,255,0.55)",
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
                          background: "linear-gradient(90deg, #1677ff, #4a9cff)",
                          transition: "width 0.1s linear", position: "relative",
                        }}>
                          <div style={{
                            position: "absolute", right: -6, top: "50%", transform: "translateY(-50%)",
                            width: 12, height: 12, borderRadius: "50%",
                            background: "#fff", boxShadow: "0 0 6px rgba(22,119,255,0.6)",
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

      <style>{`
        @keyframes hiw-pulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </section>
  );
};
