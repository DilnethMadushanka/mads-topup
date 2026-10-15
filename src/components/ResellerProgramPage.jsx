import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import confetti from 'canvas-confetti';
import { useResellerStatus } from '../hooks/useResellerStatus';
import { RESELLER_MIN_DEPOSIT_LKR, RESELLER_TIERS } from '../data/resellerTiers';
import {
  UserPlus, LogIn, Crown, ShieldCheck, DollarSign, TrendingUp, Send,
  Smartphone, FileText, CheckCircle2, ArrowRight, ArrowLeft, Wallet, BadgeCheck, Store, Megaphone
} from 'lucide-react';

const BENEFITS = [
  { icon: DollarSign, tone: 'blue', title: 'Reseller prices', text: 'Every game at 3% to 8% off, depending on your tier.' },
  { icon: TrendingUp, tone: 'teal', title: 'Sales tracking', text: 'See your orders, turnover and savings in your dashboard.' },
  { icon: Send, tone: 'sky', title: 'Telegram bot', text: 'Top up Free Fire, MLBB, PUBG and more straight from Telegram.' },
  { icon: Smartphone, tone: 'violet', title: 'Your own web & app', text: 'Get your own store website and Android app for a small monthly fee.' },
  { icon: FileText, tone: 'gold', title: 'Order history', text: 'Every order with player ID, package and price, ready to share.' },
  { icon: Crown, tone: 'green', title: 'Priority support', text: 'Faster help, early access to new games and reseller-only features.' },
];

const RULES = [
  { title: 'Active presence', text: 'An active social media following, or a good order history on our site.' },
  { title: 'Verified deposit', text: `Rs. ${RESELLER_MIN_DEPOSIT_LKR.toLocaleString()} deposited and verified before approval. It stays in your wallet.` },
  { title: 'Monthly review', text: 'We review activity every month. Long inactivity may remove reseller access.' },
  { title: 'Grow your tier', text: 'Your discount rises automatically as your total sales grow.' },
];

export const ResellerProgramPage = () => {
  const { userProfile, isLoggedIn, openAuth, showToast, closeResellerPage, addResellerApplication, openResellerDashboard, resellerApplications, openWalletModal } = useApp();
  const resellerStatus = useResellerStatus(isLoggedIn ? userProfile : null);
  const isReseller = Boolean(userProfile?.isReseller || userProfile?.role === 'reseller');
  const depositLkr = resellerStatus?.approved ? RESELLER_MIN_DEPOSIT_LKR : (resellerStatus?.depositLkr || 0);
  const depositPct = Math.min(100, Math.round((depositLkr / RESELLER_MIN_DEPOSIT_LKR) * 100));
  const tiersLowFirst = [...RESELLER_TIERS].sort((a, b) => a.minSalesLkr - b.minSalesLkr);

  const [realName, setRealName] = useState(userProfile?.name || '');
  const [storeName, setStoreName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(userProfile?.phone || '');
  const [emailAddress, setEmailAddress] = useState(userProfile?.email || '');

  const [isRunningStore, setIsRunningStore] = useState(false);
  const [hasSocialReach, setHasSocialReach] = useState(false);
  const [dailySale, setDailySale] = useState('2,000 - 5,000 LKR');
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  const scrollToForm = () => {
    const formEl = document.getElementById('application-form-section');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmitApplication = (e) => {
    e.preventDefault();

    // Must be logged in to submit
    if (!isLoggedIn || !userProfile?.uid) {
      showToast('Please log in or register an account before submitting a reseller application!', 'error');
      openAuth('login');
      return;
    }

    if (!storeName.trim()) {
      showToast('Please enter your Store / Shop Name!', 'error');
      return;
    }

    if (!whatsappNumber.trim()) {
      showToast('Please enter your WhatsApp Contact Number!', 'error');
      return;
    }

    if (!agreedTerms) {
      showToast('Please agree to the reseller terms & conditions to proceed', 'error');
      return;
    }

    // Prevent duplicate applications
    const existingApp = (resellerApplications || []).find(app =>
      (userProfile?.uid && app.userId === userProfile.uid) ||
      (userProfile?.email && app.emailAddress?.toLowerCase() === userProfile.email.toLowerCase())
    );
    if (existingApp) {
      if (existingApp.status === 'APPROVED') {
        showToast('You are already an approved Reseller Partner! Open your Reseller Dashboard.', 'error');
      } else if (existingApp.status === 'PENDING') {
        showToast('You already have a pending application! Deposit to your wallet and we will review it.', 'error');
      } else {
        showToast('A previous application was found. Please contact support if you believe this is an error.', 'error');
      }
      return;
    }

    setIsSubmitting(true);

    const newApp = {
      id: 'APP-' + Math.floor(10000 + Math.random() * 90000),
      userId: userProfile?.uid,
      realName: realName || userProfile?.name || 'Partner Reseller',
      storeName: storeName.trim(),
      whatsappNumber: whatsappNumber.trim(),
      emailAddress: emailAddress.trim() || userProfile?.email || '',
      isRunningStore,
      hasSocialReach,
      dailySale,
      status: 'PENDING',
      submittedAt: new Date().toISOString()
    };

    setTimeout(() => {
      addResellerApplication(newApp);
      setIsSubmitting(false);
      setIsSubmittedSuccess(true);
      showToast(`Application sent! Next, deposit Rs. ${RESELLER_MIN_DEPOSIT_LKR.toLocaleString()} to your wallet.`);

      try {
        if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
          confetti({ particleCount: 110, spread: 90, origin: { y: 0.5 }, colors: ['#1677ff', '#5aa8ff', '#10b981', '#f59e0b'] });
        }
      } catch (err) {}

      scrollToForm();
    }, 800);
  };

  return (
    <div className="rp">
      <div className="rp-top">
        <button type="button" onClick={closeResellerPage} className="rp-back">
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <span className="rp-live"><span className="rp-live-dot" />Reseller network open</span>
      </div>

      {/* HERO */}
      <section className="rp-hero">
        <div className="rp-hero-copy">
          <span className="rp-pill">Partner program</span>
          <h1 className="rp-h1">Sell game top-ups at <span>reseller prices</span></h1>
          <p className="rp-lead">
            Join MADS TOPUP as a reseller and get 3% to 8% off every top-up, your own dashboard and an instant Telegram bot.
          </p>
          <div className="rp-hero-actions">
            {isReseller ? (
              <button type="button" className="rp-btn" onClick={openResellerDashboard}>
                <Crown className="w-4 h-4" /> Open reseller dashboard
              </button>
            ) : (
              <button type="button" className="rp-btn" onClick={scrollToForm}>
                <UserPlus className="w-4 h-4" /> Apply now
              </button>
            )}
            {!isReseller && (
              <button type="button" className="rp-btn rp-btn-ghost" onClick={() => openAuth('reseller')}>
                <LogIn className="w-4 h-4" /> Reseller login
              </button>
            )}
          </div>
        </div>
        <div className="rp-hero-stats">
          <div className="rp-stat">
            <span className="rp-stat-ic rp-tone-blue"><DollarSign className="w-5 h-5" /></span>
            <div><strong>3–8% off</strong><span>Every game, by tier</span></div>
          </div>
          <div className="rp-stat">
            <span className="rp-stat-ic rp-tone-gold"><Wallet className="w-5 h-5" /></span>
            <div><strong>Rs. {RESELLER_MIN_DEPOSIT_LKR.toLocaleString()} deposit</strong><span>Stays in your wallet</span></div>
          </div>
          <div className="rp-stat">
            <span className="rp-stat-ic rp-tone-teal"><Send className="w-5 h-5" /></span>
            <div><strong>Telegram bot</strong><span>Top up in seconds</span></div>
          </div>
        </div>
      </section>

      {/* HOW TO JOIN */}
      <section className="rp-card" aria-labelledby="rp-join-title">
        <div className="rp-head">
          <span className="rp-pill">How to join</span>
          <h2 id="rp-join-title" className="rp-h2">Three steps to reseller prices</h2>
        </div>
        <ol className="rp-steps">
          <li className="rp-step">
            <span className="rp-num">1</span>
            <div><h3>Apply</h3><p>Fill in the short form below with your store and WhatsApp.</p></div>
          </li>
          <li className="rp-step">
            <span className="rp-num">2</span>
            <div>
              <h3>Deposit Rs. {RESELLER_MIN_DEPOSIT_LKR.toLocaleString()}</h3>
              <p>Top up your wallet by bank, eZ Cash or Binance. Not a fee: you spend it on orders.</p>
            </div>
          </li>
          <li className="rp-step">
            <span className="rp-num">3</span>
            <div><h3>Get approved</h3><p>Once the deposit is verified you are approved and start at Bronze.</p></div>
          </li>
        </ol>

        {isLoggedIn && resellerStatus && !resellerStatus.approved && (
          <div className="rp-deposit">
            <div className="rp-deposit-row">
              <span>Your verified deposits</span>
              <strong>Rs. {depositLkr.toLocaleString()} / {RESELLER_MIN_DEPOSIT_LKR.toLocaleString()}</strong>
            </div>
            <div className="rp-bar"><span style={{ width: `${depositPct}%` }} /></div>
            {depositLkr < RESELLER_MIN_DEPOSIT_LKR ? (
              <button type="button" className="rp-btn rp-btn-sm" onClick={() => openWalletModal()}>
                Deposit Rs. {(RESELLER_MIN_DEPOSIT_LKR - depositLkr).toLocaleString()} more <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <p className="rp-ok"><CheckCircle2 className="w-4 h-4" /> Deposit done. We approve your application after review.</p>
            )}
          </div>
        )}
      </section>

      {/* TIERS */}
      <section className="rp-card" aria-labelledby="rp-tier-title">
        <div className="rp-head">
          <span className="rp-pill">Tiers</span>
          <h2 id="rp-tier-title" className="rp-h2">Sell more, pay less</h2>
          <p className="rp-sub">Your discount goes up on its own as your total sales grow.</p>
        </div>
        <div className="rp-tiers">
          {tiersLowFirst.map(t => (
            <div key={t.id} className={`rp-tier rp-tier-${t.id.toLowerCase()}`}>
              <span className="rp-tier-badge"><Crown className="w-5 h-5" /></span>
              <span className="rp-tier-name">{t.name}</span>
              <span className="rp-tier-rate">{Math.round(t.rate * 100)}%<small> off</small></span>
              <span className="rp-tier-min">{t.minSalesLkr ? `After Rs. ${t.minSalesLkr.toLocaleString()} in sales` : 'When you join'}</span>
            </div>
          ))}
        </div>
      </section>

      {/* APPLICATION FORM */}
      <section id="application-form-section" className="rp-card rp-form-card" aria-labelledby="rp-form-title">
        <div className="rp-head">
          <span className="rp-pill">Start here</span>
          <h2 id="rp-form-title" className="rp-h2">Application form</h2>
          <p className="rp-sub">Takes a minute. We reply on WhatsApp and email.</p>
        </div>

        {isSubmittedSuccess ? (
          <div className="rp-done">
            <span className="rp-done-ic"><CheckCircle2 className="w-8 h-8" /></span>
            <h3>Application sent</h3>
            <p>
              Next, deposit Rs. {RESELLER_MIN_DEPOSIT_LKR.toLocaleString()} to your wallet (it stays yours for orders).
              We approve you once it is verified and send your reseller details to your WhatsApp and email.
            </p>
            <button type="button" className="rp-btn" onClick={() => openWalletModal()}>
              <Wallet className="w-4 h-4" /> Deposit now
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitApplication} className="rp-form">
            <div className="rp-grid">
              <label className="rp-field">
                <span>Real name</span>
                <input type="text" placeholder="Your name" value={realName} onChange={(e) => setRealName(e.target.value)} className="rp-input" />
              </label>
              <label className="rp-field">
                <span>Store name *</span>
                <input type="text" placeholder="Your store name" value={storeName} onChange={(e) => setStoreName(e.target.value)} required className="rp-input" />
              </label>
              <label className="rp-field">
                <span>WhatsApp number *</span>
                <input type="tel" placeholder="+94 7X XXX XXXX" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} required className="rp-input" />
              </label>
              <label className="rp-field">
                <span>Email *</span>
                <input type="email" placeholder="you@example.com" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} required className="rp-input" />
              </label>
            </div>

            <div className="rp-field">
              <span>About you</span>
              <div className="rp-chips">
                <button type="button" className={`rp-chip ${isRunningStore ? 'is-on' : ''}`} aria-pressed={isRunningStore} onClick={() => setIsRunningStore(v => !v)}>
                  <Store className="w-4 h-4" /> I run a top-up store
                </button>
                <button type="button" className={`rp-chip ${hasSocialReach ? 'is-on' : ''}`} aria-pressed={hasSocialReach} onClick={() => setHasSocialReach(v => !v)}>
                  <Megaphone className="w-4 h-4" /> I have social media reach
                </button>
              </div>
            </div>

            <label className="rp-field">
              <span>Daily average sale (LKR)</span>
              <select value={dailySale} onChange={(e) => setDailySale(e.target.value)} className="rp-input">
                <option value="1,000 - 2,000 LKR">1,000 - 2,000 LKR</option>
                <option value="2,000 - 5,000 LKR">2,000 - 5,000 LKR</option>
                <option value="5,000 - 10,000 LKR">5,000 - 10,000 LKR</option>
                <option value="10,000+ LKR">10,000+ LKR</option>
              </select>
            </label>

            <label className="rp-terms">
              <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} />
              <span>I agree to the terms and conditions and understand that inactivity may lead to removal.</span>
            </label>

            <button type="submit" disabled={isSubmitting} className="rp-btn rp-btn-block">
              {isSubmitting ? 'Sending application…' : 'Submit application'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </section>

      {/* BENEFITS */}
      <section aria-labelledby="rp-ben-title">
        <div className="rp-head rp-head-center">
          <span className="rp-pill">Why join</span>
          <h2 id="rp-ben-title" className="rp-h2">Everything a reseller gets</h2>
        </div>
        <div className="rp-benefits">
          {BENEFITS.map(({ icon: Icon, tone, title, text }) => (
            <div key={title} className="rp-benefit">
              <span className={`rp-stat-ic rp-tone-${tone}`}><Icon className="w-5 h-5" /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RULES */}
      <section className="rp-card" aria-labelledby="rp-rules-title">
        <div className="rp-head">
          <span className="rp-pill"><ShieldCheck className="w-3.5 h-3.5" /> Rules</span>
          <h2 id="rp-rules-title" className="rp-h2">Eligibility and rules</h2>
        </div>
        <div className="rp-rules">
          {RULES.map((r, i) => (
            <div key={r.title} className="rp-rule">
              <span className="rp-rule-num">{String(i + 1).padStart(2, '0')}</span>
              <div><h3>{r.title}</h3><p>{r.text}</p></div>
            </div>
          ))}
        </div>
        <p className="rp-note"><BadgeCheck className="w-4 h-4" /> Reseller prices are checked by our server on every order.</p>
      </section>
    </div>
  );
};
