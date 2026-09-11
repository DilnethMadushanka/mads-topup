import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { 
  X, User, ShoppingBag, Bookmark, Wallet, RefreshCw, 
  CheckCircle2, Clock, Zap, Trash2, ArrowRight, ShieldCheck,
  Camera, Users, FileText, ChevronUp, ChevronDown, Edit, Award, DollarSign, LogOut,
  Key, CreditCard, Shield, Coins, Copy, Laptop, Smartphone, Download
} from 'lucide-react';

export const UserProfileModal = () => {
  const { 
    isUserProfileOpen, 
    setIsUserProfileOpen, 
    userProfile, 
    setUserProfile, 
    orders, 
    formatPrice,
    openTopup,
    showToast,
    handleLogout,
    setWalletActiveTab,
    setIsWalletModalOpen,
    setIsNoticeModalOpen,
    openReferralPage
  } = useApp();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'referrals' | 'reports' | 'ids'
  const [isRecentPurchasesOpen, setIsRecentPurchasesOpen] = useState(false);
  const [isMyCodesOpen, setIsMyCodesOpen] = useState(false);
  const [isManualPaymentsOpen, setIsManualPaymentsOpen] = useState(false);
  const [isWalletTopupsOpen, setIsWalletTopupsOpen] = useState(false);
  const [isSecurityLogOpen, setIsSecurityLogOpen] = useState(true); // Open by default matching screenshot!
  const [isSavedIdsOpen, setIsSavedIdsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Edit profile form state
  const [editName, setEditName] = useState(userProfile?.name || '');
  const [editEmail, setEditEmail] = useState(userProfile?.email || '');
  const [editPhone, setEditPhone] = useState(userProfile?.phone || '');

  useEffect(() => {
    if (userProfile) {
      setEditName(userProfile.name || '');
      setEditEmail(userProfile.email || '');
      setEditPhone(userProfile.phone || '');
    }
  }, [userProfile]);

  if (!isUserProfileOpen) return null;

  const savedIds = userProfile?.savedIds || [];

  // Filter orders strictly belonging to the logged-in user
  const userOrders = (orders || []).filter(o => {
    if (!userProfile || (!userProfile.uid && !userProfile.email)) return false;
    const matchUid = userProfile.uid && o.userId && o.userId === userProfile.uid;
    const matchEmail = userProfile.email && o.userEmail && o.userEmail.toLowerCase() === userProfile.email.toLowerCase();
    return matchUid || matchEmail;
  });

  const completedOrders = userOrders.filter(o => o.status === 'COMPLETED');
  const totalSpentLkr = completedOrders.reduce((sum, o) => sum + (o.priceLkr || 0), 0);

  // Derive initials for avatar
  const getInitials = (name) => {
    if (!name) return 'DM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setUserProfile(prev => ({
      ...prev,
      name: editName,
      email: editEmail,
      phone: editPhone
    }));
    setIsEditMode(false);
    showToast('Profile updated successfully!');
  };

  const handleDeleteSavedId = (id) => {
    setUserProfile(prev => ({
      ...prev,
      savedIds: (prev.savedIds || []).filter(s => s.id !== id)
    }));
    showToast('Saved Player ID deleted.');
  };

  const handleDownloadPDF = () => {
    const reportText = `
MADS TOPUP - OFFICIAL STATEMENT
=================================
Customer Name: ${userProfile.name || 'Gamer'}
Email: ${userProfile.email || 'N/A'}
Date Generated: ${new Date().toLocaleString()}

RECENT TRANSACTIONS:
---------------------------------
${(userOrders || []).map(o => `${o.createdAt ? o.createdAt.split('T')[0] : '2026-09-12'} | Order ID: ${o.id} | Game: ${o.gameName} | Package: ${o.packageName} | Amount: LKR ${o.priceLkr} | Status: ${o.status}`).join('\n')}

Total Lifetime Spend: LKR ${(totalSpentLkr || 0).toFixed(2)}
=================================
Thank you for using MADS TOPUP Sri Lanka!
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MADS_Topup_Statement_${(userProfile.name || 'User').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Statement downloaded as PDF / Report file!');
  };

  const handleDownloadCSV = () => {
    const csvRows = [
      ['Order ID', 'Game Name', 'Package', 'Player ID', 'Price (LKR)', 'Payment Method', 'Status', 'Date'],
      ...(userOrders || []).map(o => [
        o.id,
        `"${o.gameName}"`,
        `"${o.packageName}"`,
        `"${o.playerId}"`,
        o.priceLkr || 0,
        `"${o.paymentMethod}"`,
        o.status,
        o.createdAt ? o.createdAt.split('T')[0] : '2026-09-12'
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MADS_Topup_Audit_Log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Audit Log CSV downloaded successfully!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#F8FAFF] w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] relative">
        
        {/* Header Action Buttons */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            onClick={handleLogout}
            title="Logout"
            className="px-3 py-1.5 rounded-full bg-red-600/85 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer backdrop-blur-md shadow-md"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
          <button
            onClick={() => setIsUserProfileOpen(false)}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors cursor-pointer backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">

          {/* RICH RED THEME HEADER BANNER (Matching Web Theme) */}
          <div className="bg-gradient-to-r from-[#cc040a] via-[#dc2626] to-[#990207] rounded-3xl p-6 sm:p-8 text-white relative text-center shadow-2xl overflow-hidden border border-red-600/30">
            {/* Background Glow Shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-950/40 rounded-full blur-3xl pointer-events-none"></div>

            {/* Avatar Circle */}
            <div className="relative z-10">
              <div className="w-24 h-24 rounded-full bg-slate-950 border-4 border-white flex items-center justify-center font-black text-3xl text-white shadow-2xl mx-auto relative group">
                <span>{getInitials(userProfile.name)}</span>
                
                {/* Camera Edit Overlay */}
                <button 
                  onClick={() => setIsEditMode(!isEditMode)}
                  className="w-7 h-7 bg-white text-[#cc040a] rounded-full flex items-center justify-center shadow-md absolute bottom-0 right-0 border border-red-100 cursor-pointer hover:scale-110 transition-transform"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* User Name & Email */}
              <h2 className="text-2xl sm:text-3xl font-black font-heading mt-3 text-white tracking-tight">
                {userProfile.name}
              </h2>
              <p className="text-xs text-red-100 font-medium mt-0.5">
                {userProfile.email}
              </p>

              {/* Account Linked Badge */}
              <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-extrabold text-white mt-2.5 border border-white/30 shadow-sm">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                </svg>
                <span>Account Linked</span>
              </div>
            </div>

            {/* 3 STAT / WALLET PILL CARDS (Matching Web Red Theme) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10 mt-6 pt-5 border-t border-white/15">
              {/* Stat 1: Lifetime Spend */}
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-300 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-[9px] font-black text-red-100 uppercase tracking-wider block">LIFETIME SPEND</span>
                  <span className="text-base font-black text-white font-heading">{(totalSpentLkr || 0).toFixed(2)} LKR</span>
                </div>
              </div>

              {/* Stat 2: EZ Wallet */}
              <div 
                onClick={() => {
                  setIsUserProfileOpen(false);
                  setWalletActiveTab('ezcash');
                  if (localStorage.getItem('mads_dont_show_notice') === 'true') {
                    setIsWalletModalOpen(true);
                  } else {
                    setIsNoticeModalOpen(true);
                  }
                }}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 flex items-center gap-3 cursor-pointer transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-400/20 flex items-center justify-center text-emerald-300 shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-[9px] font-black text-red-100 uppercase tracking-wider block">EZ WALLET</span>
                  <span className="text-base font-black text-white font-heading">{(userProfile?.walletBalance || 0).toFixed(2)} LKR</span>
                </div>
              </div>

              {/* Stat 3: Binance */}
              <div 
                onClick={() => {
                  setIsUserProfileOpen(false);
                  setWalletActiveTab('binance');
                  if (localStorage.getItem('mads_dont_show_notice') === 'true') {
                    setIsWalletModalOpen(true);
                  } else {
                    setIsNoticeModalOpen(true);
                  }
                }}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 flex items-center gap-3 cursor-pointer transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-300 shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-[9px] font-black text-red-100 uppercase tracking-wider block">BINANCE</span>
                  <span className="text-base font-black text-white font-heading">{(userProfile?.walletUsdt || 0).toFixed(2)} USDT</span>
                </div>
              </div>
            </div>

          </div>

          {/* QUICK ACTION TABS (Floating White Cards Overlapping Header - Matching Screenshot) */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xl mx-auto -mt-10 relative z-10">
            {/* Edit Profile Tab */}
            <div 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`bg-white rounded-2xl p-4 border border-slate-200/90 shadow-md hover:shadow-lg transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2 group ${
                isEditMode ? 'ring-2 ring-blue-500 border-blue-500' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <User className="w-5 h-5" />
              </div>
              <span className="text-xs font-black text-slate-800 font-heading">Edit Profile</span>
            </div>

            {/* Referrals Tab */}
            <div 
              onClick={() => { 
                setIsUserProfileOpen(false); 
                openReferralPage(); 
              }}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-md hover:shadow-lg transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-black text-slate-800 font-heading">Referrals</span>
            </div>

            {/* Reports Tab */}
            <div 
              onClick={() => { setActiveTab('reports'); setIsEditMode(false); }}
              className={`bg-white rounded-2xl p-4 border border-slate-200/90 shadow-md hover:shadow-lg transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2 group ${
                activeTab === 'reports' ? 'ring-2 ring-amber-500 border-amber-500' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-black text-slate-800 font-heading">Reports</span>
            </div>
          </div>

          {/* EDIT PROFILE MODAL / FORM PANEL */}
          {isEditMode && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-in fade-in">
              <h3 className="text-base font-black text-slate-900 font-heading mb-4 flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-600" />
                <span>Update Account Information</span>
              </h3>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Full Name / Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Phone Number / WhatsApp</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* REFERRALS CONTENT PANEL */}
          {activeTab === 'referrals' && !isEditMode && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 animate-in fade-in">
              <h3 className="text-base font-black text-slate-900 font-heading flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>Referral Program & Earnings</span>
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Share your referral link with friends and earn 2% cashback on every top-up they make!
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Your Referral Code</span>
                  <span className="font-mono font-black text-sm text-emerald-600">MADS-REF-9821</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://madstopup.com/ref/MADS-REF-9821');
                    showToast('Referral link copied to clipboard!');
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  Copy Link
                </button>
              </div>
            </div>
          )}

          {/* REPORTS CONTENT PANEL */}
          {activeTab === 'reports' && !isEditMode && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 animate-in fade-in">
              <h3 className="text-base font-black text-slate-900 font-heading flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#cc040a]" />
                <span>Top-Up Statements & Account Reports</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm block">Monthly Topup Statement</span>
                    <span className="text-slate-500 text-xs font-medium">Official PDF summary of all completed top-ups</span>
                  </div>
                  <button 
                    onClick={handleDownloadPDF}
                    className="px-4 py-2.5 bg-[#cc040a] hover:bg-[#b00308] text-white font-extrabold text-xs rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer border-0 outline-none focus:outline-none focus:ring-0 active:scale-95 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm block">Automated Dispatch Audit Log</span>
                    <span className="text-slate-500 text-xs font-medium">Raw CSV spreadsheet export of order timestamps & refs</span>
                  </div>
                  <button 
                    onClick={handleDownloadCSV}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer border-0 outline-none focus:outline-none focus:ring-0 active:scale-95 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY & ACTIVITY SECTION (Matching Screenshot) */}
          <div className="space-y-4 pt-2">
            <div className="text-center">
              <h3 className="text-xl font-black text-slate-900 font-heading">
                History & Activity
              </h3>
              <div className="w-12 h-1 bg-[#cc040a] rounded-full mt-1.5 mx-auto"></div>
            </div>

            {/* ACCORDION 1: Recent Purchases */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div 
                onClick={() => setIsRecentPurchasesOpen(!isRecentPurchasesOpen)}
                className="p-4 bg-white flex items-center justify-between cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-blue-600 text-xs font-extrabold">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  <span className="text-slate-900 font-bold text-sm">Recent Purchases</span>
                </div>

                <div className="text-slate-400">
                  {isRecentPurchasesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Recent Purchases Content */}
              {isRecentPurchasesOpen && (
                <div className="p-4 bg-slate-50/50 space-y-3">
                  {userOrders.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                      No recent purchases found.
                    </div>
                  ) : (
                    userOrders.map((ord) => (
                      <div 
                        key={ord.id}
                        className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900">{ord.id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              ord.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {ord.status}
                            </span>
                          </div>
                          <div className="font-extrabold text-slate-900 text-sm mt-1">
                            {ord.gameName} - {ord.packageName}
                          </div>
                          <div className="text-slate-500 font-medium text-[11px]">
                            ID: <strong className="text-slate-800">{ord.playerId}</strong> ({ord.ign})
                          </div>
                        </div>

                        <div className="text-right sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                          <div className="font-black text-[#cc040a] text-base font-heading">{formatPrice(ord.priceLkr)}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{ord.paymentMethod}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ACCORDION 2: My Codes (Matching Screenshot) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div 
                onClick={() => setIsMyCodesOpen(!isMyCodesOpen)}
                className="p-4 bg-white flex items-center justify-between cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-emerald-600 text-xs font-extrabold">
                  <Key className="w-4 h-4 text-emerald-600" />
                  <span className="text-slate-900 font-bold text-sm">My Codes</span>
                </div>

                <div className="text-slate-400">
                  {isMyCodesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* My Codes Content */}
              {isMyCodesOpen && (
                <div className="p-4 bg-slate-50/50 space-y-3">
                  <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                    No active digital codes or vouchers redeemed yet.
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 3: Manual Payments (Matching Screenshot) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div 
                onClick={() => setIsManualPaymentsOpen(!isManualPaymentsOpen)}
                className="p-4 bg-white flex items-center justify-between cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-cyan-600 text-xs font-extrabold">
                  <CreditCard className="w-4 h-4 text-cyan-600" />
                  <span className="text-slate-900 font-bold text-sm">Manual Payments</span>
                </div>

                <div className="text-slate-400">
                  {isManualPaymentsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Manual Payments Content */}
              {isManualPaymentsOpen && (
                <div className="p-4 bg-slate-50/50 space-y-3">
                  <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                    No manual bank or eZ Cash payments submitted.
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 4: Wallet Top-Ups (Matching Screenshot) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div 
                onClick={() => setIsWalletTopupsOpen(!isWalletTopupsOpen)}
                className="p-4 bg-white flex items-center justify-between cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-amber-500 text-xs font-extrabold">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="text-slate-900 font-bold text-sm">Wallet Top-Ups</span>
                </div>

                <div className="text-slate-400">
                  {isWalletTopupsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Wallet Top-Ups Content */}
              {isWalletTopupsOpen && (
                <div className="p-4 bg-slate-50/50 space-y-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-extrabold text-slate-900">Wallet Account Balance</div>
                      <div className="text-slate-400 text-[11px]">Instant eZ Cash & Binance Reload</div>
                    </div>
                    <div className="font-black text-emerald-600 text-sm">
                      {(userProfile?.walletBalance || 0).toFixed(2)} LKR
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 5: Security Log (Matching Screenshot Table Format) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div 
                onClick={() => setIsSecurityLogOpen(!isSecurityLogOpen)}
                className="p-4 bg-white flex items-center justify-between cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-indigo-600 text-xs font-extrabold">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span className="text-indigo-600 font-bold text-sm">Security Log</span>
                </div>

                <div className="text-indigo-600">
                  {isSecurityLogOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Security Log Table Content */}
              {isSecurityLogOpen && (
                <div className="bg-white">
                  <div className="grid grid-cols-2 px-6 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <div>DEVICE</div>
                    <div>TIME</div>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="grid grid-cols-2 px-6 py-3.5 items-center hover:bg-slate-50/50 transition-colors">
                      <div>
                        <div className="font-extrabold text-slate-800">Desktop</div>
                        <div className="text-slate-400 text-[11px] font-medium">Edge</div>
                      </div>
                      <div className="text-slate-500 font-medium text-xs">
                        Sep 11 12:50
                      </div>
                    </div>

                    <div className="grid grid-cols-2 px-6 py-3.5 items-center hover:bg-slate-50/50 transition-colors">
                      <div>
                        <div className="font-extrabold text-slate-800">Desktop</div>
                        <div className="text-slate-400 text-[11px] font-medium">Edge</div>
                      </div>
                      <div className="text-slate-500 font-medium text-xs">
                        Sep 10 14:36
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 6: Saved Game IDs */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div 
                onClick={() => setIsSavedIdsOpen(!isSavedIdsOpen)}
                className="p-4 bg-white flex items-center justify-between cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-slate-700 text-xs font-extrabold">
                  <Bookmark className="w-4 h-4 text-slate-600" />
                  <span className="text-slate-900 font-bold text-sm">Saved Game IDs ({savedIds.length})</span>
                </div>

                <div className="text-slate-400">
                  {isSavedIdsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Saved Game IDs List */}
              {isSavedIdsOpen && (
                <div className="p-4 bg-slate-50/50 space-y-2">
                  {savedIds.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                      No saved game IDs yet.
                    </div>
                  ) : (
                    savedIds.map((saved) => {
                      const game = GAMES_DATA.find(g => g.id === saved.gameId);
                      return (
                        <div 
                          key={saved.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{game?.currencyIcon || '🎮'}</span>
                            <div>
                              <div className="font-extrabold text-slate-900">{saved.nickName}</div>
                              <div className="text-[11px] font-mono text-slate-500">
                                {saved.gameName} ID: <strong>{saved.playerId}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {game && (
                              <button
                                onClick={() => {
                                  setIsUserProfileOpen(false);
                                  openTopup(game);
                                }}
                                className="px-3 py-1 rounded-lg bg-[#cc040a] text-white font-bold text-[11px] hover:bg-[#990207] transition-colors"
                              >
                                Top Up
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSavedId(saved.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
