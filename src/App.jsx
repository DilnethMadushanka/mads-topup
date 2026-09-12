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
import { ToastNotification } from './components/ToastNotification';
import { Flame } from 'lucide-react';

const MainContent = () => {
  const { setIsAdminOpen, isUserProfileOpen, isWalletModalOpen, openUserProfilePage, isGameCatalogOpen, isReviewsPageOpen, isContactPageOpen, isReferralPageOpen, isResellerPageOpen, openResellerPage, openContactPage, selectedGame } = useApp();

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col justify-between pb-0 font-sans text-slate-900">
      <div>
        <Navbar />
        {selectedGame ? (
          <GameTopupPage />
        ) : isUserProfileOpen ? (
          <UserProfilePage />
        ) : isWalletModalOpen ? (
          <WalletPage />
        ) : isResellerPageOpen ? (
          <ResellerProgramPage />
        ) : isReferralPageOpen ? (
          <ReferralProgramPage />
        ) : isContactPageOpen ? (
          <ContactPage />
        ) : isReviewsPageOpen ? (
          <ReviewsPage />
        ) : isGameCatalogOpen ? (
          <GameGrid />
        ) : (
          <>
            <HeroSection />
            <ServicesSection />
            <StatsSection />
            <WhyChooseUs />
            <ReviewsSection />
            <BlogSection />
            <PromoSection />
          </>
        )}
      </div>

      {/* Footer Matching Clean Minimalist Screenshot */}
      <footer className="bg-gray-950 text-[#ffffff] border-t border-gray-800 pt-16 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-12 border-b border-gray-800">
            
            {/* Col 1: About Us */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-sm text-white uppercase tracking-wider font-heading">About Us</h4>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                MADS TOPUP IS THE PREMIER AUTOMATED PLATFORM IN SRI LANKA FOR INSTANT TOP-UP FOR POPULAR GAMES STRIKE, GARENA SHELLS, AND MORE. WE ARE COMMITTED TO PROVIDING THE BEST SERVICE FOR OUR PARTNERS.
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs font-bold text-gray-300 font-mono">
                <span>🇱🇰</span>
                <span>MADS TOPUP ENTERPRISE SRI LANKA</span>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div>
              <h4 className="font-extrabold text-sm text-white uppercase tracking-wider mb-4 font-heading">Quick Links</h4>
              <ul className="space-y-2.5 text-xs text-slate-400 font-bold uppercase tracking-wide font-mono">
                <li onClick={openResellerPage} className="hover:text-cyan-400 cursor-pointer transition-colors text-cyan-400 font-black flex items-center gap-1">RESELLER PROGRAM 👑</li>
                <li onClick={openContactPage} className="hover:text-[#cc040a] cursor-pointer transition-colors">ABOUT US</li>
                <li onClick={openContactPage} className="hover:text-[#cc040a] cursor-pointer transition-colors">CONTACT</li>
                <li onClick={openUserProfilePage} className="hover:text-[#cc040a] cursor-pointer transition-colors">MY ORDERS</li>
                <li onClick={openContactPage} className="hover:text-[#cc040a] cursor-pointer transition-colors">TERMS OF SERVICE</li>
                <li onClick={openContactPage} className="hover:text-[#cc040a] cursor-pointer transition-colors">PRIVACY POLICY</li>
              </ul>
            </div>

            {/* Col 3: Contact Us */}
            <div>
              <h4 className="font-extrabold text-sm text-[#ffffff] uppercase tracking-wider mb-4 font-heading">Contact Us</h4>
              <div className="space-y-2 text-xs text-gray-400 font-medium">
                <p>Support Hotline / WhatsApp: <a href="https://wa.me/94740436276" target="_blank" rel="noreferrer" className="text-red-400 font-bold hover:underline">+94 74 043 6276</a></p>
                <p>Email: support@madstopup.com</p>
                <p>Address: Colombo Fort, Sri Lanka</p>
                <p>Operating Hours: 24 Hours / 7 Days Automated</p>
              </div>
            </div>

          </div>

          {/* Bottom Copyright Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500 font-semibold">
            <p>© 2026 MADS TOPUP. All rights reserved.</p>
            <p className="text-gray-500">POWERED BY MADS AUTOMATED ENGINE • SRI LANKA OFFICIAL STORE</p>
          </div>
        </div>
      </footer>

      {/* Modals & Popups */}
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
