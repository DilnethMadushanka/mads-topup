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
      style={{
        background: "linear-gradient(180deg, #f8faff 0%, #ffffff 60%, #f1f5ff 100%)",
        borderTop: "1px solid rgba(203,213,225,0.6)",
        borderBottom: "1px solid rgba(203,213,225,0.6)",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 20px" }}>

        {/* Section Header */}
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "rgba(204,4,10,0.07)", border: "1px solid rgba(204,4,10,0.2)",
            borderRadius: 99, padding: "5px 16px",
            fontSize: 10, fontWeight: 900, color: "#cc040a",
            letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 18,
          }}>
            <Play size={10} fill="#cc040a" />
            HOW IT WORKS
          </span>
          <h2 style={{
            fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 900,
            color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1.15,
            margin: "0 0 14px", fontFamily: "inherit",
          }}>
            Top-Up in Under&nbsp;
            <span style={{
              background: "linear-gradient(135deg, #cc040a 0%, #ff4444 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              60 Seconds
            </span>
          </h2>
          <p style={{ fontSize: 14, color: "#64748b", fontWeight: 500, maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
            Watch how easy it is to top-up any game on MADS TOPUP — fully automated, no middleman.
          </p>
        </div>

        {/* Video Player */}
        <div
          data-hiw-player
          tabIndex={0}
          style={{
            position: "relative", borderRadius: 24, overflow: "hidden",
            background: "#0a0a0f",
            boxShadow: "0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.06)",
            maxWidth: 380, margin: "0 auto 56px", outline: "none",
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
                background: "linear-gradient(135deg, rgba(10,5,8,0.55) 0%, rgba(20,5,10,0.35) 100%)",
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
                color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 700,
                letterSpacing: "0.06em", textTransform: "uppercase", margin: 0,
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

        {/* Steps */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                style={{
                  background: "#fff", border: `1px solid ${step.border}`,
                  borderRadius: 20, padding: "28px 24px",
                  display: "flex", flexDirection: "column", gap: 14,
                  boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
                  transition: "transform 0.25s, box-shadow 0.25s", cursor: "default",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,0.10), 0 0 0 1px ${step.border}`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.05)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: step.bg, border: `1px solid ${step.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={22} color={step.color} />
                  </div>
                  <span style={{ fontSize: 36, fontWeight: 900, color: "rgba(0,0,0,0.06)", letterSpacing: "-0.04em", lineHeight: 1 }}>
                    {step.number}
                  </span>
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 12.5, color: "#64748b", fontWeight: 500, lineHeight: 1.65, margin: 0 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
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
