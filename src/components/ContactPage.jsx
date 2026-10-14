import React from 'react';
import {
  ArrowLeft, MessageSquare, Mail, Send, PhoneCall, ArrowRight,
  HelpCircle, ShieldCheck, FileText, Info, Clock, CheckCircle2,
  MapPin, Gamepad2, Zap, MessageCircle, ExternalLink, Headphones
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ContactPage = () => {
  const { closeContactPage, setIsSupportOpen, showToast, openPolicyModal } = useApp();

  // Same channels / links / copy as before — rendered through one shared card shell
  const channels = [
    {
      key: 'whatsapp', href: 'https://wa.me/94740436276', icon: MessageCircle, title: 'WhatsApp Support',
      detail: '+94 74 043 6276', note: 'Fastest response. Tap to chat instantly.', tag: 'Fastest', tone: 'is-green', time: 'Usually < 5 min',
    },
    {
      key: 'chat', onClick: () => setIsSupportOpen(true), icon: MessageSquare, title: 'Live Chat',
      live: 'Available on this website', note: 'Open the chat bubble or create a 24/7 support ticket.', tag: 'Live', tone: 'is-blue', time: 'Real-time, 24/7',
    },
    {
      key: 'telegram', href: 'https://t.me/madstopup', icon: Send, title: 'Telegram Channel',
      detail: '@madstopup', note: 'Join for updates, giveaways and quick support.', tone: 'is-teal', time: 'Same day',
    },
    {
      key: 'email', href: 'mailto:support@madstopup.com', icon: Mail, title: 'Email Support',
      detail: 'support@madstopup.com', note: 'We usually reply within 24 hours.', tone: 'is-gold', time: 'Within 24 hrs',
    },
  ];

  const renderChannel = (c) => {
    const Icon = c.icon;
    const inner = (
      <>
        <span className="cp-ch-top">
          <span className="cp-ch-ico"><Icon /></span>
          {c.tag && <span className="cp-ch-tag">{c.tag}</span>}
        </span>
        <span className="cp-ch-title">{c.title}</span>
        {c.detail && <span className="cp-ch-detail">{c.detail}</span>}
        {c.live && <span className="cp-ch-live"><i />{c.live}</span>}
        <span className="cp-ch-note">{c.note}</span>
        <span className="cp-ch-foot">
          <span className="cp-ch-time"><Clock />{c.time}</span>
          <span className="cp-ch-arrow"><ArrowRight /></span>
        </span>
      </>
    );
    return c.href ? (
      <a key={c.key} href={c.href} {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})} className={`cp-ch ${c.tone}`}>{inner}</a>
    ) : (
      <button type="button" key={c.key} onClick={c.onClick} className={`cp-ch ${c.tone}`}>{inner}</button>
    );
  };

  const quickLinks = [
    { icon: HelpCircle, label: 'FAQ: common questions', onClick: () => showToast('FAQ section opening...') },
    { icon: CheckCircle2, label: 'Refund & Privacy Policy', onClick: () => openPolicyModal('refund') },
    { icon: FileText, label: 'Terms & Conditions', onClick: () => openPolicyModal('terms') },
    { icon: Info, label: 'About MADS TOPUP', onClick: () => showToast('About MADS TOPUP: Premier automated top-up portal in Sri Lanka.') },
  ];

  const beforeSteps = [
    ['Check the FAQ first.', ' Most common questions have instant answers there.'],
    ['Note your Order ID.', ' It is in your order history or confirmation email.'],
    ['Verify your Player ID (UID).', ' Check it in-game before reporting a delivery issue.'],
    ['Wait 2–3 minutes.', ' Automated deliveries sometimes take a moment to sync.'],
  ];

  return (
    <div className="cp-page">
      <div className="cp-wrap">

        <div className="cp-nav">
          <button onClick={closeContactPage} className="cp-back">
            <ArrowLeft />
            <span>Back to home</span>
          </button>
          <span className="cp-status"><i />24/7 support ready</span>
        </div>

        {/* Hero */}
        <div className="cp-hero">
          <span className="cp-hero-grid" aria-hidden="true" />
          <Headphones className="cp-hero-mark" aria-hidden="true" />
          <div className="cp-hero-main">
            <span className="cp-kicker"><Headphones /> Support &amp; contact</span>
            <h1 className="cp-title">We're here to <span>help you</span></h1>
            <p className="cp-lead">
              Reach our team on any channel. We reply fast, every day, whether it's a top-up issue, a payment question or anything else.
            </p>
            <div className="cp-hero-ctas">
              <button onClick={() => setIsSupportOpen(true)} className="cp-btn is-white">
                <MessageSquare />
                Start live chat
              </button>
              <a href="https://wa.me/94740436276" target="_blank" rel="noreferrer" className="cp-btn is-green">
                <MessageCircle />
                WhatsApp us
              </a>
            </div>
          </div>

          <ul className="cp-hero-stats">
            {[
              { icon: null, label: 'Live chat', value: 'Always active' },
              { icon: Zap, label: 'Avg. response', value: '< 5 min' },
              { icon: Clock, label: 'Support', value: '24 / 7' },
            ].map(({ icon: Icon, label, value }) => (
              <li key={label}>
                <span className="cp-stat-ico">{Icon ? <Icon /> : <i />}</span>
                <span><small>{label}</small><strong>{value}</strong></span>
              </li>
            ))}
          </ul>
        </div>

        <div className="cp-grid">
          <div className="cp-main">
            <div className="cp-sec-head">
              <span className="cp-eyebrow">Contact channels</span>
              <h2 className="cp-sec-title">Choose how to <span>reach us</span></h2>
            </div>

            <div className="cp-channels">
              {channels.map(renderChannel)}
            </div>

            <div className="cp-follow">
              <div>
                <h3 className="cp-card-title">Follow us</h3>
                <p className="cp-card-desc">Promo offers, giveaways and gaming news first.</p>
              </div>
              <div className="cp-follow-btns">
                <a href="https://wa.me/94740436276" target="_blank" rel="noreferrer" className="cp-pill is-green">
                  <MessageCircle /> WhatsApp channel
                </a>
                <a href="https://t.me/madstopup" target="_blank" rel="noreferrer" className="cp-pill is-teal">
                  <Send /> Telegram group
                </a>
                <button onClick={() => showToast('Facebook page coming soon!')} className="cp-pill is-blue">
                  <ExternalLink /> Facebook
                </button>
              </div>
            </div>
          </div>

          <aside className="cp-side">
            <div className="cp-tip">
              <span className="cp-tip-ico"><ShieldCheck /></span>
              <div>
                <strong>Support tip</strong>
                <p>Keep your <b>Order ID</b> and <b>Player ID (UID)</b> ready when you contact us. It helps us fix your issue instantly.</p>
              </div>
            </div>

            <div className="cp-card">
              <span className="cp-eyebrow">Quick links</span>
              <div className="cp-links">
                {quickLinks.map(({ icon: Icon, label, onClick }) => (
                  <button key={label} onClick={onClick} className="cp-link">
                    <span className="cp-link-ico"><Icon /></span>
                    <span className="cp-link-label">{label}</span>
                    <ArrowRight className="cp-link-arrow" />
                  </button>
                ))}
              </div>
            </div>

            <div className="cp-card">
              <span className="cp-eyebrow">Before you contact us</span>
              <ol className="cp-steps">
                {beforeSteps.map(([bold, rest], i) => (
                  <li key={bold}>
                    <span className="cp-step-num">{i + 1}</span>
                    <p><strong>{bold}</strong>{rest}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="cp-card">
              <span className="cp-eyebrow">About this business</span>
              <ul className="cp-about">
                {[
                  [MapPin, 'Sri Lanka, serving worldwide'],
                  [Gamepad2, 'In the gaming community since 2018'],
                  [Zap, 'Powered by the automated MADS API engine'],
                ].map(([Icon, text]) => (
                  <li key={text}><span><Icon /></span>{text}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

      </div>
    </div>
  );
};
