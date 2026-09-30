import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ServicesSection } from './components/ServicesSection';
import { StatsSection } from './components/StatsSection';
import { GameGrid } from './components/GameGrid';
import { WhyChooseUs } from './components/WhyChooseUs';
import { HowItWorksSection } from './components/HowItWorksSection';
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
import { ScrollReveal } from './hooks/useScrollReveal';
import { Flame } from 'lucide-react';

const MainContent = () => {
  const { setIsAdminOpen, isUserProfileOpen, isWalletModalOpen, openUserProfilePage, isGameCatalogOpen, isReviewsPageOpen, isContactPageOpen, isReferralPageOpen, isResellerPageOpen, isResellerLoginPageOpen, isResellerDashboardOpen, openResellerPage, openContactPage, openPolicyModal, selectedGame, isBlogPageOpen, openBlogPage, isLeaderboardPageOpen } = useApp();

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

            {/* How It Works — fade up */}
            <ScrollReveal animation="fade-up" duration={700} delay={50}>
              <HowItWorksSection />
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
      {!selectedGame && !isUserProfileOpen && !isWalletModalOpen && !isResellerDashboardOpen && !isResellerLoginPageOpen && !isResellerPageOpen && !isReferralPageOpen && !isContactPageOpen && !isReviewsPageOpen && !isLeaderboardPageOpen && !isGameCatalogOpen && !isBlogPageOpen && (
      <footer className="relative overflow-hidden text-white border-t border-[#cc040a]/25" style={{ background: 'linear-gradient(180deg,#0d0a0b 0%,#0a0608 60%,#080408 100%)' }}>

        {/* Ambient glows + top accent line */}
        <div className="absolute top-0 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-[#cc040a] to-transparent pointer-events-none" />
        <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-[#cc040a]/[0.08] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-[320px] h-[320px] rounded-full bg-[#cc040a]/[0.06] blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'linear-gradient(to bottom, #000, transparent 70%)',
            WebkitMaskImage: 'linear-gradient(to bottom, #000, transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 pt-16 pb-14">

            {/* Brand */}
            <div className="md:col-span-5 lg:col-span-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#cc040a] to-[#ff4444] flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(204,4,10,0.6)] shrink-0">
                  <Flame size={22} color="#fff" />
                </div>
                <div className="leading-none">
                  <div className="font-heading font-extrabold text-xl tracking-tight">MADS TOPUP</div>
                  <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#cc040a]">Enterprise · Sri Lanka</div>
                </div>
              </div>

              <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/55">
                Premier automated game top-up platform in Sri Lanka. Instant delivery for PUBG Mobile, Free Fire, Mobile Legends, and more.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#cc040a]/10 border border-[#cc040a]/25 text-[11px] font-bold tracking-[0.1em] text-[#ff6b6b]">
                  🇱🇰 SRI LANKA OFFICIAL STORE
                </span>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-semibold text-white/60">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                    <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </span>
                  24 / 7 Automated
                </span>
              </div>
            </div>

            {/* Quick links */}
            <div className="md:col-span-3 lg:col-span-3">
              <h4 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#cc040a]">Quick Links</h4>
              <ul className="mt-5 flex flex-col gap-1">
                <li>
                  <button
                    type="button"
                    onClick={openResellerPage}
                    className="group inline-flex items-center gap-2 py-1.5 text-sm font-bold text-amber-400 hover:text-amber-200 transition-colors cursor-pointer"
                  >
                    <span>👑</span>
                    <span>Reseller Program</span>
                    <span className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">→</span>
                  </button>
                </li>
                {[
                  { label: 'About Us',         action: openContactPage },
                  { label: 'Contact',          action: openContactPage },
                  { label: 'My Orders',        action: openUserProfilePage },
                  { label: 'Refund Policy',    action: () => openPolicyModal('refund') },
                  { label: 'Privacy Policy',   action: () => openPolicyModal('privacy') },
                  { label: 'Terms of Service', action: () => openPolicyModal('terms') },
                ].map(({ label, action }) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={action}
                      className="group inline-flex items-center gap-2 py-1.5 text-sm font-medium text-white/55 hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="w-0 h-px bg-[#cc040a] group-hover:w-3 transition-all duration-200" />
                      <span>{label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="md:col-span-4 lg:col-span-4">
              <h4 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#cc040a]">Contact Us</h4>
              <div className="mt-5 flex flex-col gap-3">
                {[
                  { icon: '📞', label: 'WhatsApp', value: '+94 74 043 6276', href: 'https://wa.me/94740436276', highlight: true },
                  { icon: '✉️', label: 'Email',    value: 'info@trivextit.com', href: 'mailto:info@trivextit.com', highlight: true },
                  { icon: '📍', label: 'Address',  value: 'Colombo Fort, Sri Lanka', highlight: false },
                  { icon: '🕐', label: 'Hours',    value: '24 / 7 Automated', highlight: false },
                ].map(({ icon, label, value, href, highlight }) => {
                  const inner = (
                    <>
                      <span className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-base shrink-0 group-hover:bg-[#cc040a]/15 group-hover:border-[#cc040a]/30 transition-colors">
                        {icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">{label}</span>
                        <span className={`block mt-0.5 text-sm font-semibold truncate ${highlight ? 'text-[#ff6b6b]' : 'text-white/70'}`}>{value}</span>
                      </span>
                    </>
                  );
                  return href ? (
                    <a key={label} href={href} target="_blank" rel="noreferrer" className="group flex items-center gap-3.5 no-underline">
                      {inner}
                    </a>
                  ) : (
                    <div key={label} className="group flex items-center gap-3.5">
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ── Legal disclaimer ── */}
          <div id="legal-disclaimer" className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
            <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#cc040a]/90">
              ⚠️ Third-Party Reseller Disclaimer &amp; Trademark Notice
            </p>
            <p className="mt-3 text-[11.5px] leading-[1.85] text-white/40">
              <strong className="text-white/65 font-semibold">MADS TOPUP is an independent third-party digital top-up reseller and is NOT affiliated with, sponsored by, endorsed by, or officially connected to Garena, Tencent Games, Moonton, NetEase Games, TiMi Studio Group, or any other official game publisher.</strong>{' '}
              We do not collect any game account passwords or login credentials — only Player UIDs are required for top-up delivery. All top-ups are delivered via the official MooGold reseller API.
              All game titles, trademarks, logos, and artwork (including Free Fire®, PUBG Mobile®, Mobile Legends: Bang Bang®, Blood Strike®, Delta Force®, Garena Shells®) are registered trademarks of their respective copyright holders and are used strictly for product identification and digital top-up delivery purposes only.
              DMCA &amp; Copyright Contact:{' '}
              <a href="mailto:info@trivextit.com" className="text-[#ff6b6b] font-bold hover:underline">info@trivextit.com</a>.
            </p>
          </div>

          {/* ── Copyright bar ── */}
          <div className="py-7 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <p className="text-xs font-medium text-white/35">© 2026 MADS TOPUP. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#22c55e]" />
              <p className="text-[11px] font-semibold tracking-[0.08em] text-white/30">POWERED BY MADS AUTOMATED ENGINE</p>
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
