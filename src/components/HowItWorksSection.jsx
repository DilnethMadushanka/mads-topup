import React, { useState, useEffect } from "react";
import { Gamepad2, UserCheck, Wallet, Zap, ArrowRight, ShieldCheck, Check, Search, CreditCard, Smartphone, BadgeCheck, MousePointer2 } from "lucide-react";
import { useApp } from "../context/AppContext";

const STEP_MS = 4000;

const STEPS = [
  { number: "01", tone: "blue", icon: Gamepad2, title: "Choose your game", desc: "Tap the game you play: Free Fire, PUBG Mobile, Mobile Legends and more." },
  { number: "02", tone: "violet", icon: UserCheck, title: "Enter your player ID", desc: "Type your in-game ID. We show your player name so you know it's the right account. No password needed." },
  { number: "03", tone: "gold", icon: Wallet, title: "Pick a pack and pay", desc: "Choose how many diamonds or UC you want, then pay with your wallet, card or eZ Cash." },
  { number: "04", tone: "green", icon: Zap, title: "Get it in seconds", desc: "Delivery is automatic. The top-up lands in your game account, usually within a minute." },
];

const GAMES = [
  { name: "Free Fire", logo: "/game_logos/free_fire.webp" },
  { name: "PUBG Mobile", logo: "/game_logos/pubg.webp" },
  { name: "Mobile Legends", logo: "/game_logos/mobile_legends.jpg" },
  { name: "Blood Strike", logo: "/game_logos/blood_strike.webp" },
];

const PACKS = [
  { amount: "100", price: "Rs. 260" },
  { amount: "520", price: "Rs. 1,150", hot: true },
  { amount: "1,060", price: "Rs. 2,290" },
];

// Small mock of the store screen for each step, shown inside the phone frame.
const Screen = ({ step }) => {
  if (step === 0) {
    return (
      <div className="hw-scr">
        <div className="hw-scr-top"><b>All games</b></div>
        <div className="hw-scr-search"><Search /> Search games</div>
        <div className="hw-scr-games">
          {GAMES.map((g, i) => (
            <div key={g.name} className={`hw-scr-game${i === 0 ? " is-pick" : ""}`}>
              <img src={g.logo} alt="" loading="lazy" />
              <span>{g.name}</span>
              {i === 0 && <MousePointer2 className="hw-scr-tap" />}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="hw-scr">
        <div className="hw-scr-game-head">
          <img src={GAMES[0].logo} alt="" />
          <span><b>Free Fire</b><small>Diamonds top-up</small></span>
        </div>
        <label className="hw-scr-label">Player ID</label>
        <div className="hw-scr-input"><span className="hw-type">1234567890</span><i className="hw-caret" /></div>
        <div className="hw-scr-verified"><BadgeCheck /> <span><small>Player found</small><b>MadsGamer</b></span></div>
        <div className="hw-scr-hint"><ShieldCheck /> We never ask for your password</div>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="hw-scr">
        <label className="hw-scr-label">Select amount</label>
        <div className="hw-scr-packs">
          {PACKS.map((p) => (
            <div key={p.amount} className={`hw-scr-pack${p.hot ? " is-pick" : ""}`}>
              <span className="hw-scr-gem">💎</span>
              <b>{p.amount}</b>
              <small>{p.price}</small>
              {p.hot && <i><Check /></i>}
            </div>
          ))}
        </div>
        <label className="hw-scr-label">Pay with</label>
        <div className="hw-scr-pay">
          <span className="is-pick"><Wallet /> Wallet</span>
          <span><CreditCard /> Card</span>
          <span><Smartphone /> eZ Cash</span>
        </div>
        <div className="hw-scr-btn">Pay Rs. 1,150</div>
      </div>
    );
  }
  return (
    <div className="hw-scr is-done">
      <div className="hw-scr-check"><Check /></div>
      <b className="hw-scr-done-title">Top-up successful!</b>
      <span className="hw-scr-done-sub">520 💎 sent to <b>MadsGamer</b></span>
      <div className="hw-scr-receipt">
        <span><small>Game</small><b>Free Fire</b></span>
        <span><small>Paid</small><b>Rs. 1,150</b></span>
        <span><small>Delivered in</small><b className="is-green">8 seconds</b></span>
      </div>
    </div>
  );
};

export const HowItWorksSection = () => {
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
          <span className="hw-kicker"><Zap /> How to top up</span>
          <h2 className="hw-title">Top up in <span>4 easy steps</span></h2>
          <p className="hw-lead">No account password, no waiting for an agent. Here is exactly what you do on MADS TOPUP.</p>
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
            <div className="hw-phone" aria-label={`Step ${active + 1}: ${STEPS[active].title}`} role="img">
              <span className="hw-notch" aria-hidden="true" />
              <div className="hw-screen">
                <div className="hw-scr-status"><span>MADS TOPUP</span><span className="hw-scr-steps">{STEPS.map((s, i) => <i key={s.number} className={i <= active ? 'is-on' : ''} />)}</span></div>
                <div key={active} className="hw-scr-anim"><Screen step={active} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
