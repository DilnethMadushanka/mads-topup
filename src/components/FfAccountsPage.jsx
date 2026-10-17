import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useSiteTheme } from '../hooks/useSiteTheme';
import { buyFfAccount } from '../services/ffAccountsService';
import { FF_ACCOUNT_PROMO, ffAccountPromoActive, ffAccountSalePrice } from '../data/ffAccountPromo';
import {
  ArrowLeft, ArrowRight, ShieldCheck, Wallet, MessageCircle, X, Crown, Star, BadgePercent,
  Image as ImageIcon, CheckCircle2, Loader2, ChevronLeft, ChevronRight, UserCheck
} from 'lucide-react';

const WHATSAPP = '94740436276';
const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
const lkr = (v) => `Rs. ${Math.round(Number(v) || 0).toLocaleString('en-US')}`;
const FALLBACK_ART = '/game_banners/freefire.webp';
const PROMO_PCT = Math.round(FF_ACCOUNT_PROMO.rate * 100);
const PROMO_LAST_DAY = new Date(Date.parse(FF_ACCOUNT_PROMO.endsAt) - 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'Asia/Colombo' });

// Struck-through price above the price the buyer pays: the listing's old
// price, or its listed price while the account sale runs.
const Price = ({ acc, className }) => {
  const pay = ffAccountSalePrice(acc.priceLkr);
  const was = pay < acc.priceLkr ? acc.priceLkr : (acc.oldPriceLkr > acc.priceLkr ? acc.oldPriceLkr : 0);
  return (
    <span className={className}>
      {was > 0 && <s>{lkr(was)}</s>}
      <b>{lkr(pay)}</b>
    </span>
  );
};

const STATUS_LABEL = { AVAILABLE: 'Available', RESERVED: 'Reserved', SOLD: 'Sold' };
const FILTERS = [
  { id: 'AVAILABLE', label: 'Available' },
  { id: 'ALL', label: 'All' },
  { id: 'SOLD', label: 'Sold' },
];
const SORTS = [
  { id: 'new', label: 'Newest' },
  { id: 'low', label: 'Price: low to high' },
  { id: 'high', label: 'Price: high to low' },
  { id: 'level', label: 'Highest level' },
];

const StatusPill = ({ status }) => (
  <span className={`ffa-status is-${status.toLowerCase()}`}>
    {status === 'AVAILABLE' && <span className="ffa-dot" />}
    {STATUS_LABEL[status] || status}
  </span>
);

const AccountCard = ({ acc, onOpen }) => {
  const cover = acc.images[0] || FALLBACK_ART;
  const sold = acc.status !== 'AVAILABLE';
  return (
    <button type="button" className={`ffa-card ${sold ? 'is-sold' : ''}`} onClick={() => onOpen(acc)}>
      <span className="ffa-cover">
        <img src={cover} alt="" loading="lazy" onError={(e) => { e.currentTarget.src = FALLBACK_ART; }} />
        <span className="ffa-cover-top">
          <StatusPill status={acc.status} />
          {acc.images.length > 1 && <span className="ffa-count"><ImageIcon />{acc.images.length}</span>}
        </span>
        {acc.featured && !sold && <span className="ffa-featured"><Star />Featured</span>}
        {!sold && ffAccountPromoActive() && <span className="ffa-off">-{PROMO_PCT}%</span>}
      </span>
      <span className="ffa-card-body">
        <span className="ffa-stats">
          {acc.level > 0 && <span className="ffa-chip is-blue">Lv. {acc.level}</span>}
          {acc.rank && <span className="ffa-chip is-gold"><Crown />{acc.rank}</span>}
          {acc.region && <span className="ffa-chip is-teal">{acc.region}</span>}
        </span>
        <span className="ffa-title">{acc.title}</span>
        {acc.highlights.length > 0 && (
          <span className="ffa-hl">
            {acc.highlights.slice(0, 3).map((h) => <span key={h}>{h}</span>)}
            {acc.highlights.length > 3 && <span className="is-more">+{acc.highlights.length - 3} more</span>}
          </span>
        )}
        <span className="ffa-card-foot">
          <Price acc={acc} className="ffa-price" />
          <span className="ffa-go"><ArrowRight /></span>
        </span>
      </span>
    </button>
  );
};

const AccountModal = ({ acc, onClose }) => {
  const { isLoggedIn, openAuth, userProfile, setUserProfile, openWalletModal, showToast } = useApp();
  const { isDark } = useSiteTheme();
  const [imgIdx, setImgIdx] = useState(0);
  const [step, setStep] = useState('view'); // view | confirm | done
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState('');

  const images = acc.images.length ? acc.images : [FALLBACK_ART];
  const balance = (Number(userProfile?.walletBalance) || 0) + (Number(userProfile?.walletUsdt) || 0) * 305;
  const pay = ffAccountSalePrice(acc.priceLkr);
  const short = balance < pay;
  const available = acc.status === 'AVAILABLE';

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
      if (e.key === 'ArrowRight') setImgIdx((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') setImgIdx((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [busy, images.length, onClose]);

  const startBuy = () => {
    setError('');
    // Username/password logins have no Firebase user, so go by the profile too (as the navbar does).
    if (!isLoggedIn && !userProfile?.uid && !userProfile?.email) { onClose(); openAuth('login'); showToast('Please log in to buy an account.', 'error'); return; }
    setStep('confirm');
  };

  const confirmBuy = async () => {
    setBusy(true);
    setError('');
    const res = await buyFfAccount(acc.id);
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOrderId(res.orderId);
    if (typeof res.newBalanceLkr === 'number') {
      setUserProfile((p) => ({ ...p, walletBalance: res.newBalanceLkr, walletUsdt: typeof res.newBalanceUsdt === 'number' ? res.newBalanceUsdt : p.walletUsdt }));
    }
    setStep('done');
  };

  const enquiry = waLink(`Hi MADS TOPUP, I'm interested in the Free Fire account "${acc.title}" (${lkr(pay)}). Ref: ${acc.id}`);
  const handover = waLink(`Hi MADS TOPUP, I bought the Free Fire account "${acc.title}". Order: ${orderId}. Please send the login details.`);

  // Portalled to <body>: the page wrapper is animated (transform), which would
  // pin a fixed overlay to the page instead of the screen.
  return createPortal(
    <div className={isDark ? 'home-dark' : ''}>
    <div className="ffa-overlay" role="dialog" aria-modal="true" aria-label={acc.title} onClick={() => !busy && onClose()}>
      <div className="ffa-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ffa-close" onClick={onClose} disabled={busy} aria-label="Close"><X /></button>

        <div className="ffa-gallery">
          <div className="ffa-main-img">
            <img src={images[imgIdx]} alt={acc.title} onError={(e) => { e.currentTarget.src = FALLBACK_ART; }} />
            {images.length > 1 && (
              <>
                <button type="button" className="ffa-nav is-prev" onClick={() => setImgIdx((imgIdx - 1 + images.length) % images.length)} aria-label="Previous picture"><ChevronLeft /></button>
                <button type="button" className="ffa-nav is-next" onClick={() => setImgIdx((imgIdx + 1) % images.length)} aria-label="Next picture"><ChevronRight /></button>
                <span className="ffa-img-n">{imgIdx + 1} / {images.length}</span>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="ffa-thumbs">
              {images.map((src, i) => (
                <button type="button" key={src + i} className={i === imgIdx ? 'is-on' : ''} onClick={() => setImgIdx(i)} aria-label={`Picture ${i + 1}`}>
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ffa-info">
          {step === 'done' ? (
            <div className="ffa-done">
              <span className="ffa-done-ico"><CheckCircle2 /></span>
              <h3>Account bought!</h3>
              <p>Order <b>{orderId}</b> is paid. Message us on WhatsApp and we'll hand over the login and help you change the binding.</p>
              <a className="ffa-btn is-wa" href={handover} target="_blank" rel="noreferrer"><MessageCircle />Get my login on WhatsApp</a>
              <button type="button" className="ffa-btn is-ghost" onClick={onClose}>Close</button>
            </div>
          ) : (
            <>
              <div className="ffa-info-top">
                <StatusPill status={acc.status} />
                <span className="ffa-ref">{acc.id}</span>
              </div>
              <h2 className="ffa-m-title">{acc.title}</h2>

              <div className="ffa-grid-stats">
                <div><span>Level</span><b>{acc.level > 0 ? acc.level : '—'}</b></div>
                <div><span>Rank</span><b>{acc.rank || '—'}</b></div>
                <div><span>Region</span><b>{acc.region || '—'}</b></div>
                <div><span>Login</span><b>{acc.loginType || '—'}</b></div>
              </div>

              {acc.highlights.length > 0 && (
                <div className="ffa-m-block">
                  <h4>Key items</h4>
                  <ul className="ffa-m-hl">
                    {acc.highlights.map((h) => <li key={h}><Star />{h}</li>)}
                  </ul>
                </div>
              )}
              {acc.description && (
                <div className="ffa-m-block">
                  <h4>About this account</h4>
                  <p className="ffa-m-desc">{acc.description}</p>
                </div>
              )}

              <div className="ffa-buybox">
                <div className="ffa-buy-price">
                  <span>Price</span>
                  <Price acc={acc} className="ffa-buy-amt" />
                </div>
                {available && pay < acc.priceLkr && <p className="ffa-promo-note"><BadgePercent />{PROMO_PCT}% account sale: you save {lkr(acc.priceLkr - pay)}. Ends {PROMO_LAST_DAY}.</p>}

                {step === 'confirm' ? (
                  <div className="ffa-confirm">
                    <p>Pay <b>{lkr(pay)}</b> from your MADS wallet? Your balance is <b>{lkr(balance)}</b>.</p>
                    {error && <p className="ffa-error">{error}</p>}
                    {short ? (
                      <button type="button" className="ffa-btn is-primary" onClick={() => { onClose(); openWalletModal('ezcash'); }}><Wallet />Add money to wallet</button>
                    ) : (
                      <button type="button" className="ffa-btn is-primary" onClick={confirmBuy} disabled={busy}>
                        {busy ? <Loader2 className="ffa-spin animate-spin" /> : <ShieldCheck />}{busy ? 'Paying…' : `Confirm & pay ${lkr(pay)}`}
                      </button>
                    )}
                    <button type="button" className="ffa-btn is-ghost" onClick={() => setStep('view')} disabled={busy}>Back</button>
                  </div>
                ) : available ? (
                  <div className="ffa-actions">
                    <button type="button" className="ffa-btn is-primary" onClick={startBuy}><Wallet />Buy with wallet</button>
                    <a className="ffa-btn is-wa" href={enquiry} target="_blank" rel="noreferrer"><MessageCircle />Ask on WhatsApp</a>
                  </div>
                ) : (
                  <div className="ffa-actions">
                    <p className="ffa-note">This account is {STATUS_LABEL[acc.status].toLowerCase()}. Ask us on WhatsApp for similar ones.</p>
                    <a className="ffa-btn is-wa" href={waLink("Hi MADS TOPUP, do you have Free Fire accounts like this one? Ref: " + acc.id)} target="_blank" rel="noreferrer"><MessageCircle />Ask for similar accounts</a>
                  </div>
                )}
                <p className="ffa-fine"><ShieldCheck />After payment we hand over the login on WhatsApp and help you change the binding.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </div>,
    document.body
  );
};

export const FfAccountsPage = () => {
  const { ffAccounts, closeFfAccountsPage } = useApp();
  const [filter, setFilter] = useState('AVAILABLE');
  const [sort, setSort] = useState('new');
  const [openId, setOpenId] = useState(null);

  const all = ffAccounts || [];
  const counts = useMemo(() => ({
    ALL: all.length,
    AVAILABLE: all.filter((a) => a.status === 'AVAILABLE').length,
    SOLD: all.filter((a) => a.status !== 'AVAILABLE').length,
  }), [all]);

  const shown = useMemo(() => {
    let list = filter === 'ALL' ? all : filter === 'SOLD' ? all.filter((a) => a.status !== 'AVAILABLE') : all.filter((a) => a.status === 'AVAILABLE');
    if (sort === 'low') list = [...list].sort((a, b) => a.priceLkr - b.priceLkr);
    if (sort === 'high') list = [...list].sort((a, b) => b.priceLkr - a.priceLkr);
    if (sort === 'level') list = [...list].sort((a, b) => b.level - a.level);
    return list;
  }, [all, filter, sort]);

  // The open listing follows live updates (e.g. it gets sold while open).
  const openAcc = openId ? all.find((a) => a.id === openId) : null;
  const closeModal = useCallback(() => setOpenId(null), []);

  return (
    <div className="ffa-page">
      <div className="ffa-wrap">
        <div className="ffa-topbar">
          <button type="button" className="ffa-back" onClick={closeFfAccountsPage}><ArrowLeft /><span>Back to Home</span></button>
          <span className="ffa-live"><span className="ffa-dot" />Checked by the MADS team</span>
        </div>

        <header className="ffa-hero">
          <span className="section-badge">— OTHER SERVICES —</span>
          <h1>Free Fire <span>Accounts</span></h1>
          <p>Ready accounts with rare bundles, guns and high levels. Pay from your wallet and get the login on WhatsApp.</p>
          {ffAccountPromoActive() && (
            <div className="ffa-promo">
              <span className="ffa-promo-ico"><BadgePercent /></span>
              <span><b>{PROMO_PCT}% off every account</b>Account sale ends {PROMO_LAST_DAY}. The discount is taken off when you pay.</span>
            </div>
          )}
          <div className="ffa-trust">
            <span><span className="ffa-t-ico is-blue"><UserCheck /></span>Checked accounts</span>
            <span><span className="ffa-t-ico is-gold"><Wallet /></span>Pay from wallet</span>
            <span><span className="ffa-t-ico is-teal"><MessageCircle /></span>Handover on WhatsApp</span>
          </div>
        </header>

        <div className="ffa-toolbar">
          <div className="ffa-tabs" role="tablist">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={filter === f.id ? 'is-on' : ''} onClick={() => setFilter(f.id)}>
                {f.label}<span>{counts[f.id]}</span>
              </button>
            ))}
          </div>
          <select className="ffa-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort accounts">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        {shown.length ? (
          <div className="ffa-grid">
            {shown.map((acc) => <AccountCard key={acc.id} acc={acc} onOpen={(a) => setOpenId(a.id)} />)}
          </div>
        ) : (
          <div className="ffa-empty">
            <span className="ffa-t-ico is-blue"><UserCheck /></span>
            <h3>{all.length ? 'Nothing here right now' : 'New accounts coming soon'}</h3>
            <p>{all.length ? 'Try another filter, or tell us what you are looking for.' : 'Tell us the level, rank or bundles you want and we will find one for you.'}</p>
            <a className="ffa-btn is-wa" href={waLink('Hi MADS TOPUP, I want to buy a Free Fire account.')} target="_blank" rel="noreferrer"><MessageCircle />Ask on WhatsApp</a>
          </div>
        )}

        <section className="ffa-steps" aria-label="How buying works">
          {[
            ['1', 'Pick an account', 'Check the pictures, level and key items.'],
            ['2', 'Pay from wallet', 'The account is locked for you the moment you pay.'],
            ['3', 'Get the login', 'We send the login on WhatsApp and help you rebind it.'],
          ].map(([n, t, d]) => (
            <div key={n} className="ffa-step"><span className="ffa-step-n">{n}</span><div><b>{t}</b><p>{d}</p></div></div>
          ))}
        </section>
      </div>

      {openAcc && <AccountModal key={openAcc.id} acc={openAcc} onClose={closeModal} />}
    </div>
  );
};
