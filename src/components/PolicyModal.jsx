import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, RefreshCw, FileText, CheckCircle2, Lock, 
  AlertCircle, HelpCircle, PhoneCall, Zap, ArrowRight, Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const PolicyModal = () => {
  const { isPolicyModalOpen, closePolicyModal, activePolicyTab, setActivePolicyTab } = useApp();

  const [activeTab, setActiveTab] = useState(activePolicyTab || 'refund');

  useEffect(() => {
    if (activePolicyTab) {
      setActiveTab(activePolicyTab);
    }
  }, [activePolicyTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPolicyModalOpen) {
        closePolicyModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPolicyModalOpen, closePolicyModal]);

  if (!isPolicyModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#cc040a]/20 border border-[#cc040a]/40 flex items-center justify-center text-[#cc040a] font-black">
              <ShieldCheck className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight font-heading flex items-center gap-2">
                MADS TOPUP <span className="text-red-500 font-mono text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">Official Policies</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">Refund, Privacy & Terms of Service Center</p>
            </div>
          </div>

          <button
            onClick={closePolicyModal}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-2 sm:p-3 flex flex-wrap sm:flex-nowrap gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('refund')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-2xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'refund'
                ? 'bg-[#cc040a] text-white shadow-md shadow-red-500/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refund Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-2xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-[#cc040a] text-white shadow-md shadow-red-500/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-2xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-[#cc040a] text-white shadow-md shadow-red-500/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Service</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-sm text-slate-600 leading-relaxed font-sans">
          
          {/* TAB 1: REFUND & CANCELLATION POLICY */}
          {activeTab === 'refund' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Top Banner Notice */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-emerald-900 text-sm font-heading">
                    100% Money-Back Guarantee on Unprocessed Orders
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1 font-medium">
                    If an order cannot be processed or fails due to system error or item out of stock, your funds will be 100% refunded immediately to your account wallet or payment source.
                  </p>
                </div>
              </div>

              {/* Clause 1 */}
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#cc040a] font-mono text-xs flex items-center justify-center">1</span>
                  Eligibility for Refund
                </h3>
                <p className="pl-8 text-xs sm:text-sm font-medium text-slate-600">
                  Refunds are issued under the following circumstances:
                </p>
                <ul className="pl-12 space-y-1.5 text-xs sm:text-sm text-slate-700 font-medium list-disc">
                  <li><strong>Failed / Unfulfilled Orders:</strong> If your top-up order failed to deliver within 24 hours.</li>
                  <li><strong>Out of Stock Digital Items:</strong> If game packages or codes become unavailable post-payment.</li>
                  <li><strong>Duplicate Payment / Overcharge:</strong> If your account was charged twice for a single transaction.</li>
                  <li><strong>System Error / Timeout:</strong> Automated system failure to connect with the game provider gateway.</li>
                </ul>
              </div>

              {/* Clause 2 */}
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#cc040a] font-mono text-xs flex items-center justify-center">2</span>
                  Non-Refundable Circumstances (Completed Digital Delivery)
                </h3>
                <div className="pl-8 space-y-2 text-xs sm:text-sm text-slate-600">
                  <p className="font-medium">
                    Due to the instant, irreversible nature of digital gaming assets (UC, Diamonds, Shells, Vouchers, In-Game Items):
                  </p>
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-medium text-xs leading-normal">
                    ⚠️ <strong>Successful Deliveries:</strong> Once game credits or diamonds have been successfully credited to the specified Player ID (UID), orders are <strong>final and non-refundable</strong>.
                  </div>
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 font-medium text-xs leading-normal">
                    ⚠️ <strong>Incorrect Player ID (UID) Provided by User:</strong> Please double-check your Player ID / IGN before placing an order. MADS TOPUP is not responsible for credits sent to an incorrect UID entered by the buyer.
                  </div>
                </div>
              </div>

              {/* Clause 3 */}
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#cc040a] font-mono text-xs flex items-center justify-center">3</span>
                  Refund Request & Processing Timeframe
                </h3>
                <p className="pl-8 text-xs sm:text-sm text-slate-600 font-medium">
                  • Wallet Refunds: Instant credit back to your MADS TOPUP user or reseller wallet.<br />
                  • eZ Cash / Bank Transfer Refunds: Processed within <strong>1–24 hours</strong> of request confirmation.<br />
                  To initiate a refund claim, please contact our 24/7 hotline via WhatsApp at <a href="https://wa.me/94740436276" target="_blank" rel="noreferrer" className="text-[#cc040a] font-bold underline">+94 74 043 6276</a> with your Order ID and transaction receipt slip.
                </p>
              </div>

            </div>
          )}

          {/* TAB 2: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between border border-slate-800">
                <div className="flex items-center gap-3">
                  <Lock className="w-6 h-6 text-red-500 shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-sm font-heading">Bank-Grade 256-Bit Data Security</h4>
                    <p className="text-xs text-slate-400 font-medium">Your account privacy and transaction records are 100% protected.</p>
                  </div>
                </div>
              </div>

              {/* Privacy Clause 1 */}
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-900 font-mono text-xs flex items-center justify-center">1</span>
                  Information We Collect
                </h3>
                <p className="pl-8 text-xs sm:text-sm text-slate-600 font-medium">
                  We collect essential information strictly required to process your automated game top-ups:
                </p>
                <ul className="pl-12 space-y-1 text-xs sm:text-sm text-slate-700 font-medium list-disc">
                  <li><strong>Account Information:</strong> Email address, User Display Name, Reseller Security Key.</li>
                  <li><strong>Gaming Identifiers:</strong> Game Player ID (UID), In-Game Name (IGN) for player verification.</li>
                  <li><strong>Transaction Details:</strong> Payment method selected (eZ Cash / Binance Pay), reference numbers, transaction receipts.</li>
                </ul>
              </div>

              {/* Privacy Clause 2 */}
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-900 font-mono text-xs flex items-center justify-center">2</span>
                  How We Protect & Use Your Data
                </h3>
                <p className="pl-8 text-xs sm:text-sm text-slate-600 font-medium">
                  • <strong>No Data Sharing:</strong> MADS TOPUP never sells, rents, or distributes personal data to any third-party advertisers or external organizations.<br />
                  • <strong>Secure Cloud Storage:</strong> Data is encrypted and stored using Google Firebase Firestore and Cloudflare R2 bucket infrastructure.<br />
                  • <strong>Automated Verification:</strong> Player IDs are verified in real-time solely to prevent misdirected top-up credits.
                </p>
              </div>

              {/* Privacy Clause 3 */}
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-900 font-mono text-xs flex items-center justify-center">3</span>
                  Account Security & Password Hashing
                </h3>
                <p className="pl-8 text-xs sm:text-sm text-slate-600 font-medium">
                  All login credentials and OTP verifications are protected using industry-standard cryptographic hashing. Staff members cannot view your plain-text account passwords.
                </p>
              </div>

            </div>
          )}

          {/* TAB 3: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3.5">
                <Zap className="w-6 h-6 text-[#cc040a] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-[#cc040a] text-sm font-heading">
                    24/7 Automated Engine Terms of Service
                  </h4>
                  <p className="text-xs text-red-950 mt-1 font-medium">
                    By accessing or making purchases on MADS TOPUP, you agree to comply with our platform terms and operating policies.
                  </p>
                </div>
              </div>

              {/* Terms Clause 1 */}
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#cc040a] font-mono text-xs flex items-center justify-center">1</span>
                  Platform Usage & User Obligations
                </h3>
                <ul className="pl-8 space-y-1.5 text-xs sm:text-sm text-slate-700 font-medium list-disc">
                  <li>Users must provide accurate Player ID (UID) information when placing top-up orders.</li>
                  <li>Fraudulent payment submissions, fake transaction reference numbers, or forged payment slips will result in immediate permanent account suspension.</li>
                  <li>Submitting false chargebacks or dispute claims on valid fulfilled orders will terminate reseller status.</li>
                </ul>
              </div>

              {/* Terms Clause 2 */}
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#cc040a] font-mono text-xs flex items-center justify-center">2</span>
                  Reseller Partner Terms
                </h3>
                <p className="pl-8 text-xs sm:text-sm text-slate-600 font-medium">
                  • Wholesale rates (5% wholesale discount) apply exclusively to approved reseller accounts.<br />
                  • Reseller balance deposits must be verified through official eZ Cash RN numbers or Binance Pay transaction IDs.<br />
                  • Pending reseller applications remain restricted until verified and approved by MADS TOPUP administration.
                </p>
              </div>

              {/* Terms Clause 3 */}
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-[#cc040a] font-mono text-xs flex items-center justify-center">3</span>
                  Service Availability & Maintenance
                </h3>
                <p className="pl-8 text-xs sm:text-sm text-slate-600 font-medium">
                  While our automated engine operates 24/7/365, occasional game server maintenance by official publishers (Garena, Tencent, Moonton) may temporarily delay delivery until server connections resume.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Footer Support Info */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-600 font-semibold">
            <HelpCircle className="w-4 h-4 text-[#cc040a]" />
            <span>Have questions about our policies? Contact our 24/7 hotline.</span>
          </div>

          <a
            href="https://wa.me/94740436276"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>WhatsApp Support (+94 74 043 6276)</span>
          </a>
        </div>

      </div>
    </div>
  );
};
