import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X, Smartphone, ShieldCheck, Zap, ArrowRight, Share2,
  Sparkles, PlusSquare, MoreVertical, Download, Apple, Globe
} from 'lucide-react';

export const DownloadAppModal = () => {
  const { isDownloadAppModalOpen, setIsDownloadAppModalOpen, showToast } = useApp();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [activeTab, setActiveTab] = useState('ios');

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setActiveTab(isIOS ? 'ios' : 'android');

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  if (!isDownloadAppModalOpen) return null;

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') showToast('MADS TOPUP added to your Home Screen! 🎉');
      setDeferredPrompt(null);
    } else {
      showToast('Follow the step-by-step guide below to install 📱');
    }
  };

  const iosSteps = [
    { icon: Share2, title: 'Tap Share', text: <>Tap the <strong>Share</strong> button at the bottom of the Safari bar.</> },
    { icon: PlusSquare, title: 'Add to Home Screen', text: <>Scroll down and tap <strong>"Add to Home Screen"</strong>.</> },
    { icon: ShieldCheck, title: 'Tap Add', text: <>Tap <strong>"Add"</strong> at the top right. The MADS TOPUP icon appears on your iPhone.</> },
  ];

  const androidSteps = [
    { icon: MoreVertical, title: 'Open the menu', text: <>Tap the <strong>browser menu (⋮)</strong> at the top right of Chrome.</> },
    { icon: Download, title: 'Install app', text: <>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</> },
    { icon: Smartphone, title: 'Confirm', text: <>Tap <strong>"Install"</strong>. MADS TOPUP opens like an app from your phone.</> },
  ];

  const steps = activeTab === 'ios' ? iosSteps : androidSteps;

  return (
    <div className="dl-overlay" onClick={() => setIsDownloadAppModalOpen(false)}>
      <div className="dl-modal" role="dialog" aria-modal="true" aria-label="Add MADS TOPUP to Home Screen" onClick={(e) => e.stopPropagation()}>

        <div className="dl-head">
          <span className="dl-head-grid" aria-hidden="true" />
          <button onClick={() => setIsDownloadAppModalOpen(false)} className="dl-close" aria-label="Close">
            <X />
          </button>

          <div className="dl-app">
            <span className="dl-app-icon"><img src="/mads-icon.png" alt="MADS TOPUP" /></span>
            <span className="dl-app-meta">
              <span className="dl-app-tag"><Sparkles /> Web app</span>
              <span className="dl-app-name">MADS TOPUP</span>
              <span className="dl-app-sub">madstopup.com</span>
            </span>
          </div>

          <h2 className="dl-title">Add to your <span>home screen</span></h2>
          <p className="dl-lead">Install in seconds. No App Store, no storage used.</p>
        </div>

        <div className="dl-body">
          <button onClick={handleInstallPwa} className="dl-install">
            <span className="dl-install-ico"><Download /></span>
            <span className="dl-install-text">
              <strong>Install app</strong>
              <small>1-tap install · Fast and light</small>
            </span>
            <ArrowRight className="dl-install-arrow" />
          </button>

          <div className="dl-tabs" role="tablist">
            <button role="tab" aria-selected={activeTab === 'ios'} onClick={() => setActiveTab('ios')} className={`dl-tab${activeTab === 'ios' ? ' is-active' : ''}`}>
              <Apple /> iPhone / iOS
            </button>
            <button role="tab" aria-selected={activeTab === 'android'} onClick={() => setActiveTab('android')} className={`dl-tab${activeTab === 'android' ? ' is-active' : ''}`}>
              <Globe /> Android / Chrome
            </button>
          </div>

          <div className="dl-steps-head">
            {activeTab === 'ios' ? 'On iPhone / iPad (Safari)' : 'On Android (Chrome / Samsung)'}
          </div>
          <ol className="dl-steps">
            {steps.map(({ icon: Icon, title, text }, idx) => (
              <li key={title} className="dl-step">
                <span className="dl-step-ico"><Icon /><em>{idx + 1}</em></span>
                <span>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
              </li>
            ))}
          </ol>

          <ul className="dl-badges">
            <li className="is-blue"><Zap /> Instant access</li>
            <li className="is-green"><ShieldCheck /> 100% safe</li>
            <li className="is-gold"><Sparkles /> Free</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
