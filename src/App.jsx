import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ServicesSection } from './components/ServicesSection';
import { StatsSection } from './components/StatsSection';
import { GameGrid } from './components/GameGrid';
import { WhyChooseUs } from './components/WhyChooseUs';
import { ReviewsSection } from './components/ReviewsSection';
import { PromoSection } from './components/PromoSection';
import { BlogSection } from './components/BlogSection';
import { GameTopupPage } from './components/GameTopupPage';
import { AuthModal } from './components/AuthModal';
import { UserProfilePage } from './components/UserProfilePage';
import { WalletPage } from './components/WalletPage';
import { AdminDashboard } from './components/AdminDashboard';
import { ImportantNoticeModal } from './components/ImportantNoticeModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SupportModal } from './components/SupportModal';
import { DownloadAppModal } from './components/DownloadAppModal';
import { ReviewsPage } from './components/ReviewsPage';
import { ContactPage } from './components/ContactPage';
import { ReferralProgramPage } from './components/ReferralProgramPage';
import { ResellerProgramPage } from './components/ResellerProgramPage';
import { ResellerLoginPage } from './components/ResellerLoginPage';
import { ResellerDashboard } from './components/ResellerDashboard';
import { ResellerBannerSection } from './components/ResellerBannerSection';
import { PopupAdModal } from './components/PopupAdModal';
import { PolicyModal } from './components/PolicyModal';
import { ToastNotification } from './components/ToastNotification';
import { BlogPage } from './components/BlogPage';
import { LeaderboardPage } from './components/LeaderboardPage';
import { FreefireCheckerPage } from './components/FreefireCheckerPage';
import { ScrollReveal } from './hooks/useScrollReveal';
import { Flame } from 'lucide-react';

const MainContent = () => {
  const { setIsAdminOpen, isUserProfileOpen, isWalletModalOpen, openUserProfilePage, isGameCatalogOpen, isReviewsPageOpen, isContactPageOpen, isReferralPageOpen, isResellerPageOpen, isResellerLoginPageOpen, isResellerDashboardOpen, openResellerPage, openContactPage, openPolicyModal, selectedGame, isBlogPageOpen, openBlogPage, isLeaderboardPageOpen, isFreefireCheckerOpen } = useApp();

  // Security: Prevent Right-Click Inspect Element & DevTools Keyboard Shortcuts
  React.useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e) => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (
          e.key === 'I' || e.key === 'i' ||
          e.key === 'J' || e.key === 'j' ||
          e.key === 'C' || e.key === 'c' ||
          e.key === 'K' || e.key === 'k'
        )) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.key === 'S' || e.key === 's'))
      ) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col justify-between pb-0 font-sans text-[#0f172a] overflow-x-hidden">
      <div>
        <Navbar />
        {selectedGame ? (
          <GameTopupPage />
        ) : isUserProfileOpen ? (
          <UserProfilePage />
        ) : isWalletModalOpen ? (
          <WalletPage />
        ) : isResellerDashboardOpen ? (
          <ResellerDashboard />
        ) : isResellerLoginPageOpen ? (
          <ResellerLoginPage />
        ) : isResellerPageOpen ? (
          <ResellerProgramPage />
        ) : isReferralPageOpen ? (
          <ReferralProgramPage />
        ) : isContactPageOpen ? (
          <ContactPage />
        ) : isReviewsPageOpen ? (
          <ReviewsPage />
        ) : isLeaderboardPageOpen ? (
          <LeaderboardPage />
        ) : isFreefireCheckerOpen ? (
          <FreefireCheckerPage />
        ) : isBlogPageOpen ? (
          <BlogPage />
        ) : isGameCatalogOpen ? (
          <GameGrid />
        ) : (
          <>
            {/* Hero — no scroll animation (above fold) */}
            <HeroSection />

            {/* Services — fade up */}
            <ScrollReveal animation="fade-up" duration={700}>
              <ServicesSection />
            </ScrollReveal>

            {/* Stats — scale in */}
            <ScrollReveal animation="scale-in" duration={600} delay={80}>
              <StatsSection />
            </ScrollReveal>

            {/* Why Choose Us — fade up slower */}
            <ScrollReveal animation="fade-up" duration={750} delay={60}>
              <WhyChooseUs />
            </ScrollReveal>

            {/* Reviews — fade in */}
            <ScrollReveal animation="fade-in" duration={800}>
              <ReviewsSection />
            </ScrollReveal>

            {/* Blog — fade up */}
            <ScrollReveal animation="fade-up" duration={650} delay={40}>
              <BlogSection />
            </ScrollReveal>

            {/* Promo — zoom up */}
            <ScrollReveal animation="zoom-up" duration={700} delay={60}>
              <PromoSection />
            </ScrollReveal>

            {/* Reseller Banner — fade left */}
            <ScrollReveal animation="fade-left" duration={700} delay={80}>
              <ResellerBannerSection />
            </ScrollReveal>
          </>
        )}
      </div>

      {/* Footer: Only visible on the main home page, not on sub-pages */}
      {!selectedGame && !isUserProfileOpen && !isWalletModalOpen && !isResellerDashboardOpen && !isResellerLoginPageOpen && !isResellerPageOpen && !isReferralPageOpen && !isContactPageOpen && !isReviewsPageOpen && !isLeaderboardPageOpen && !isGameCatalogOpen && !isBlogPageOpen && !isFreefireCheckerOpen && (
      <footer style={{ background: 'linear-gradient(180deg,#0d0a0b 0%,#0a0608 60%,#080408 100%)', color: '#fff', borderTop: '1px solid rgba(204,4,10,0.25)', position: 'relative', overflow: 'hidden' }}>

        {/* Red top glow line */}
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(204,4,10,0.8),transparent)' }} />
        {/* Subtle red radial glow top-right */}
        <div style={{ position: 'absolute', top: -120, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle,rgba(204,4,10,0.07) 0%,transparent 70%)', pointerEvents: 'none' }} />
        {/* Subtle red radial glow bottom-left */}
        <div style={{ position: 'absolute', bottom: -80, left: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(204,4,10,0.05) 0%,transparent 70%)', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ position: 'relative', zIndex: 1 }}>

          {/* ── Top brand bar ─────────────────────────────── */}
          <div style={{ padding: '48px 0 36px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start', justifyContent: 'space-between' }}>

            {/* Brand block */}
            <div style={{ maxWidth: 300 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#cc040a,#ff4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 18px rgba(204,4,10,0.5)', flexShrink: 0 }}>
                  <Flame size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: '-0.2px', color: '#fff' }}>MADS TOPUP</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#cc040a', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Enterprise · Sri Lanka</div>
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, fontWeight: 500, margin: '0 0 14px' }}>
                Premier automated game top-up platform in Sri Lanka. Instant delivery for PUBG Mobile, Free Fire, Mobile Legends, and more.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'rgba(204,4,10,0.1)', border: '1px solid rgba(204,4,10,0.25)', fontSize: 9, fontWeight: 800, color: '#cc040a', letterSpacing: '0.12em' }}>
                🇱🇰 SRI LANKA OFFICIAL STORE
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 style={{ margin: '0 0 16px', fontSize: 10, fontWeight: 900, color: '#cc040a', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Quick Links</h4>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <li onClick={openResellerPage} style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', cursor: 'pointer', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#fde68a'} onMouseLeave={e => e.currentTarget.style.color='#fbbf24'}>
                  👑 Reseller Program
                </li>
                {[
                  { label: 'About Us',        action: openContactPage },
                  { label: 'Contact',         action: openContactPage },
                  { label: 'My Orders',       action: openUserProfilePage },
                  { label: 'Refund Policy',   action: () => openPolicyModal('refund') },
                  { label: 'Privacy Policy',  action: () => openPolicyModal('privacy') },
                  { label: 'Terms of Service',action: () => openPolicyModal('terms') },
                ].map(({ label, action }) => (
                  <li key={label} onClick={action}
                    style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color='#cc040a'}
                    onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.5)'}>
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 style={{ margin: '0 0 16px', fontSize: 10, fontWeight: 900, color: '#cc040a', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Contact Us</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: '📞', label: 'WhatsApp', value: '+94 74 043 6276', href: 'https://wa.me/94740436276', highlight: true },
                  { icon: '✉️', label: 'Email',    value: 'info@trivextit.com', href: 'mailto:info@trivextit.com', highlight: true },
                  { icon: '📍', label: 'Address',  value: 'Colombo Fort, Sri Lanka', highlight: false },
                  { icon: '🕐', label: 'Hours',    value: '24 / 7 Automated', highlight: false },
                ].map(({ icon, label, value, href, highlight }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                    <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 1 }}>{label}</div>
                      {href
                        ? <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, color: highlight ? '#ff6b6b' : 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration='underline'}
                            onMouseLeave={e => e.currentTarget.style.textDecoration='none'}>{value}</a>
                        : <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{value}</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Legal disclaimer ──────────────────────────── */}
          <div id="legal-disclaimer" style={{ padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', borderTop: '1px solid rgba(204,4,10,0.15)' }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(204,4,10,0.9)', textTransform: 'uppercase', letterSpacing: '0.14em', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              ⚠️ Third-Party Reseller Disclaimer &amp; Trademark Notice
            </p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.8, margin: 0, fontWeight: 500 }}>
              <strong style={{ color: 'rgba(255,255,255,0.6)' }}>MADS TOPUP is an independent third-party digital top-up reseller and is NOT affiliated with, sponsored by, endorsed by, or officially connected to Garena, Tencent Games, Moonton, NetEase Games, TiMi Studio Group, or any other official game publisher.</strong>{' '}
              We do not collect any game account passwords or login credentials — only Player UIDs are required for top-up delivery. All top-ups are delivered via the official MooGold reseller API.
              All game titles, trademarks, logos, and artwork (including Free Fire®, PUBG Mobile®, Mobile Legends: Bang Bang®, Blood Strike®, Delta Force®, Garena Shells®) are registered trademarks of their respective copyright holders and are used strictly for product identification and digital top-up delivery purposes only.
              DMCA &amp; Copyright Contact:{' '}
              <a href="mailto:info@trivextit.com" style={{ color: '#ff6b6b', fontWeight: 700 }}>info@trivextit.com</a>.
            </p>
          </div>

          {/* ── Copyright bar ─────────────────────────────── */}
          <div style={{ padding: '16px 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>© 2026 MADS TOPUP. All rights reserved.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.04em' }}>POWERED BY MADS AUTOMATED ENGINE</p>
            </div>
          </div>

        </div>
      </footer>
      )}


      {/* Modals & Popups */}
      <PopupAdModal />
      <PolicyModal />
      <AuthModal />
      <AdminDashboard />
      <ImportantNoticeModal />
      <SupportModal />
      <DownloadAppModal />
      <MobileBottomNav />
      <ToastNotification />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
