import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ServicesSection } from './components/ServicesSection';
import { StatsSection } from './components/StatsSection';
import { TickerBanner } from './components/TickerBanner';
import { GameGrid } from './components/GameGrid';
import { WhyChooseUs } from './components/WhyChooseUs';
import { ReviewsSection } from './components/ReviewsSection';
import { PromoSection } from './components/PromoSection';
import { TopupModal } from './components/TopupModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AdminDashboard } from './components/AdminDashboard';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ToastNotification } from './components/ToastNotification';
import { Flame } from 'lucide-react';

const MainContent = () => {
  const { setIsAdminOpen, setIsUserProfileOpen } = useApp();

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between pb-16 md:pb-0 font-sans text-white">
      <div>
        <Navbar />
        <HeroSection />
        <ServicesSection />
        <StatsSection />
        <TickerBanner />
        <GameGrid />
        <WhyChooseUs />
        <ReviewsSection />
        <PromoSection />
      </div>

      {/* Footer Matching Reference Screenshot */}
      <footer className="bg-slate-950 text-white border-t border-red-600/20 pt-16 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-12 border-b border-slate-900/80">
            
            {/* Col 1: About Us */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-sm text-white uppercase tracking-wider font-heading">About Us</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                MADS TOPUP IS THE PREMIER AUTOMATED PLATFORM IN SRI LANKA FOR INSTANT TOP-UP FOR POPULAR GAMES STRIKE, GARENA SHELLS, AND MORE. WE ARE COMMITTED TO PROVIDING THE BEST SERVICE FOR OUR PARTNERS.
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs font-bold text-slate-300 font-mono">
                <span>🇱🇰</span>
                <span>MADS TOPUP ENTERPRISE SRI LANKA</span>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div>
              <h4 className="font-extrabold text-sm text-white uppercase tracking-wider mb-4 font-heading">Quick Links</h4>
              <ul className="space-y-2.5 text-xs text-slate-400 font-bold uppercase tracking-wide font-mono">
                <li onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-red-400 cursor-pointer transition-colors">ABOUT US</li>
                <li onClick={() => scrollToSection('why-choose-us')} className="hover:text-red-400 cursor-pointer transition-colors">CONTACT</li>
                <li onClick={() => setIsUserProfileOpen(true)} className="hover:text-red-400 cursor-pointer transition-colors">MY ORDERS</li>
                <li onClick={() => setIsAdminOpen(true)} className="hover:text-red-400 cursor-pointer transition-colors">ADMIN PORTAL</li>
                <li className="hover:text-red-400 cursor-pointer transition-colors">TERMS OF SERVICE</li>
                <li className="hover:text-red-400 cursor-pointer transition-colors">PRIVACY POLICY</li>
              </ul>
            </div>

            {/* Col 3: Contact Us */}
            <div>
              <h4 className="font-extrabold text-sm text-white uppercase tracking-wider mb-4 font-heading">Contact Us</h4>
              <div className="space-y-2 text-xs text-slate-400 font-semibold">
                <p>Support Hotline: +94 77 123 4567</p>
                <p>Email: support@madstopup.com</p>
                <p>Address: Colombo Fort, Sri Lanka</p>
                <p>Operating Hours: 24 Hours / 7 Days Automated</p>
              </div>
            </div>

          </div>

          {/* Bottom Copyright Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500 font-semibold">
            <p>© 2026 MADS TOPUP. All rights reserved.</p>
            <p className="text-slate-600">POWERED BY MOONGOLD API ENGINE • SRI LANKA OFFICIAL STORE</p>
          </div>
        </div>
      </footer>

      {/* Modals & Popups */}
      <TopupModal />
      <UserProfileModal />
      <AdminDashboard />
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
