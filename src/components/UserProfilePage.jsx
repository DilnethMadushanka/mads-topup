import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { 
  User, ShoppingBag, Bookmark, Wallet, RefreshCw, 
  CheckCircle2, Clock, Zap, Trash2, ArrowLeft, ShieldCheck,
  Camera, Users, FileText, ChevronUp, ChevronDown, Edit, Award, DollarSign, LogOut,
  Key, CreditCard, Shield, Coins, Copy, Download, Home, Sparkles
} from 'lucide-react';

export const UserProfilePage = () => {
  const { 
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
    openReferralPage,
    setSelectedGame,
    closeCatalog
  } = useApp();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'referrals' | 'reports' | 'ids'
  const [isRecentPurchasesOpen, setIsRecentPurchasesOpen] = useState(true);
  const [isMyCodesOpen, setIsMyCodesOpen] = useState(false);
  const [isManualPaymentsOpen, setIsManualPaymentsOpen] = useState(false);
  const [isWalletTopupsOpen, setIsWalletTopupsOpen] = useState(false);
  const [isSecurityLogOpen, setIsSecurityLogOpen] = useState(true);
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

  const goHome = () => {
    setIsUserProfileOpen(false);
    setSelectedGame(null);
    closeCatalog();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] pb-20 pt-6 animate-in fade-in duration-300 font-sans text-slate-900">
      
      {/* Top Breadcrumb Header Bar */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={goHome}
            className="inline-flex items-center gap-2 text-xs font-black text-slate-600 hover:text-[#cc040a] bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Store</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 font-mono">
            <span onClick={goHome} className="hover:underline cursor-pointer">Home</span>
            <span>/</span>
            <span className="text-[#cc040a] font-bold">My Account</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">

        {/* RICH RED THEME HEADER BANNER (Full Dedicated Page Version) */}
        <div className="bg-gradient-to-r from-[#cc040a] via-[#dc2626] to-[#990207] rounded-3xl p-6 sm:p-10 text-white relative text-center shadow-2xl overflow-hidden border border-red-600/30">
          
          {/* Background Glow Shapes */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-950/50 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Right Logout Button */}
          <button
            onClick={handleLogout}
            title="Logout"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 px-4 py-2 rounded-full bg-red-950/70 hover:bg-red-950 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md border border-white/20 shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Account</span>
          </button>

          {/* Avatar Circle */}
          <div className="relative z-10">
            <div className="w-28 h-28 rounded-full bg-slate-950 border-4 border-white flex items-center justify-center font-black text-4xl text-white shadow-2xl mx-auto relative group">
              {userProfile.avatar ? (
                <img src={userProfile.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{getInitials(userProfile.name)}</span>
              )}
              
              {/* Camera Edit Overlay */}
              <button 
                onClick={() => setIsEditMode(!isEditMode)}
                className="w-8 h-8 bg-white text-[#cc040a] rounded-full flex items-center justify-center shadow-lg absolute bottom-0 right-0 border border-red-100 cursor-pointer hover:scale-110 transition-transform"
                title="Edit Profile"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* User Name & Email */}
            <h1 className="text-3xl sm:text-4xl font-black font-heading mt-4 text-white tracking-tight">
              {userProfile.name || 'Gamer Account'}
            </h1>
            <p className="text-xs sm:text-sm text-red-100 font-medium mt-1">
              {userProfile.email || 'user@madstopup.com'}
            </p>

            {/* Account Linked Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-extrabold text-white mt-3 border border-white/30 shadow-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              </svg>
              <span>Account Linked & Secured</span>
            </div>
          </div>

          {/* 3 STAT / WALLET CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10 mt-8 pt-6 border-t border-white/20">
            {/* Stat 1: Lifetime Spend */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex items-center gap-3.5 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-300 shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-black text-red-100 uppercase tracking-wider block">LIFETIME SPEND</span>
                <span className="text-lg font-black text-white font-heading">{(totalSpentLkr || 0).toFixed(2)} LKR</span>
              </div>
            </div>

            {/* Stat 2: EZ Wallet */}
            <div 
              onClick={() => {
                setWalletActiveTab('ezcash');
                if (localStorage.getItem('mads_dont_show_notice') === 'true') {
                  setIsWalletModalOpen(true);
                } else {
                  setIsNoticeModalOpen(true);
                }
              }}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex items-center gap-3.5 cursor-pointer transition-all shadow-sm"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-400/20 flex items-center justify-center text-emerald-300 shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-black text-red-100 uppercase tracking-wider block">EZ WALLET</span>
                <span className="text-lg font-black text-white font-heading">{(userProfile?.walletBalance || 0).toFixed(2)} LKR</span>
              </div>
            </div>

            {/* Stat 3: Binance */}
            <div 
              onClick={() => {
                setWalletActiveTab('binance');
                if (localStorage.getItem('mads_dont_show_notice') === 'true') {
                  setIsWalletModalOpen(true);
                } else {
                  setIsNoticeModalOpen(true);
                }
              }}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex items-center gap-3.5 cursor-pointer transition-all shadow-sm"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-300 shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-black text-red-100 uppercase tracking-wider block">BINANCE</span>
                <span className="text-lg font-black text-white font-heading">{(userProfile?.walletUsdt || 0).toFixed(2)} USDT</span>
              </div>
            </div>
          </div>

        </div>

        {/* QUICK ACTION CARDS (Edit Profile, Referrals, Reports) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Edit Profile Tab */}
          <div 
            onClick={() => setIsEditMode(!isEditMode)}
            className={`bg-white rounded-3xl p-5 border border-slate-200/90 shadow-md hover:shadow-xl transition-all cursor-pointer flex items-center gap-4 group ${
              isEditMode ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20' : ''
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 font-heading">Edit Profile</h4>
              <p className="text-xs text-slate-500 font-medium">Update name, email & phone</p>
            </div>
          </div>

          {/* Referrals Tab */}
          <div 
            onClick={openReferralPage}
            className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-md hover:shadow-xl transition-all cursor-pointer flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 font-heading">Referrals</h4>
              <p className="text-xs text-slate-500 font-medium">Earn 1.5% cashback rewards</p>
            </div>
          </div>

          {/* Reports Tab */}
          <div 
            onClick={() => { setActiveTab(activeTab === 'reports' ? 'orders' : 'reports'); setIsEditMode(false); }}
            className={`bg-white rounded-3xl p-5 border border-slate-200/90 shadow-md hover:shadow-xl transition-all cursor-pointer flex items-center gap-4 group ${
              activeTab === 'reports' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/20' : ''
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 font-heading">Reports & Statements</h4>
              <p className="text-xs text-slate-500 font-medium">Download PDF & CSV logs</p>
            </div>
          </div>

        </div>

        {/* EDIT PROFILE FORM PANEL */}
        {isEditMode && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm animate-in fade-in">
            <h3 className="text-lg font-black text-slate-900 font-heading mb-4 flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              <span>Update Account Information</span>
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1.5">Full Name / Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1.5">Phone Number / WhatsApp</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-slate-900 focus:outline-none focus:border-blue-600 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white font-extrabold text-xs rounded-2xl hover:bg-blue-700 transition-colors shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className="px-6 py-3 bg-slate-100 text-slate-700 font-extrabold text-xs rounded-2xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* REPORTS CONTENT PANEL */}
        {activeTab === 'reports' && !isEditMode && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4 animate-in fade-in">
            <h3 className="text-lg font-black text-slate-900 font-heading flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#cc040a]" />
              <span>Top-Up Statements & Account Reports</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="font-extrabold text-slate-900 text-base block">Monthly Topup Statement</span>
                  <span className="text-slate-500 text-xs font-medium">Official PDF summary of all completed top-ups</span>
                </div>
                <button 
                  onClick={handleDownloadPDF}
                  className="px-5 py-3 bg-[#cc040a] hover:bg-[#b00308] text-white font-extrabold text-xs rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Statement</span>
                </button>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="font-extrabold text-slate-900 text-base block">Automated Dispatch Audit Log</span>
                  <span className="text-slate-500 text-xs font-medium">Raw CSV spreadsheet export of order timestamps & refs</span>
                </div>
                <button 
                  onClick={handleDownloadCSV}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV Audit Log</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY & ACTIVITY SECTION (Full Page Layout Matching Screenshot Format) */}
        <div className="space-y-6 pt-4">
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900 font-heading">
              History & Activity
            </h2>
            <div className="w-16 h-1 bg-[#cc040a] rounded-full mt-2 mx-auto"></div>
          </div>

          {/* ACCORDION 1: Recent Purchases */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div 
              onClick={() => setIsRecentPurchasesOpen(!isRecentPurchasesOpen)}
              className="p-5 bg-white flex items-center justify-between cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 text-blue-600 text-sm font-extrabold">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <span className="text-slate-900 font-black text-base">Recent Purchases ({userOrders.length})</span>
              </div>

              <div className="text-slate-400">
                {isRecentPurchasesOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>

            {/* Recent Purchases Content */}
            {isRecentPurchasesOpen && (
              <div className="p-5 bg-slate-50/50 space-y-3">
                {userOrders.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                    No recent purchases found.
                  </div>
                ) : (
                  userOrders.map((ord) => (
                    <div 
                      key={ord.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900">{ord.id}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            ord.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ord.status}
                          </span>
                        </div>
                        <div className="font-extrabold text-slate-900 text-base mt-1">
                          {ord.gameName} - {ord.packageName}
                        </div>
                        <div className="text-slate-500 font-medium text-xs mt-0.5">
                          Player ID: <strong className="text-slate-800 font-mono">{ord.playerId}</strong> ({ord.ign})
                        </div>
                      </div>

                      <div className="text-right sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        <div className="font-black text-[#cc040a] text-lg font-heading">{formatPrice(ord.priceLkr)}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{ord.paymentMethod}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ACCORDION 2: My Codes */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div 
              onClick={() => setIsMyCodesOpen(!isMyCodesOpen)}
              className="p-5 bg-white flex items-center justify-between cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 text-emerald-600 text-sm font-extrabold">
                <Key className="w-5 h-5 text-emerald-600" />
                <span className="text-slate-900 font-black text-base">My Codes</span>
              </div>

              <div className="text-slate-400">
                {isMyCodesOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>

            {/* My Codes Content */}
            {isMyCodesOpen && (
              <div className="p-5 bg-slate-50/50 space-y-3">
                <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                  No active digital codes or vouchers redeemed yet.
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 3: Manual Payments */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div 
              onClick={() => setIsManualPaymentsOpen(!isManualPaymentsOpen)}
              className="p-5 bg-white flex items-center justify-between cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 text-cyan-600 text-sm font-extrabold">
                <CreditCard className="w-5 h-5 text-cyan-600" />
                <span className="text-slate-900 font-black text-base">Manual Payments</span>
              </div>

              <div className="text-slate-400">
                {isManualPaymentsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>

            {/* Manual Payments Content */}
            {isManualPaymentsOpen && (
              <div className="p-5 bg-slate-50/50 space-y-3">
                <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                  No manual bank or eZ Cash payments submitted.
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 4: Wallet Top-Ups */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div 
              onClick={() => setIsWalletTopupsOpen(!isWalletTopupsOpen)}
              className="p-5 bg-white flex items-center justify-between cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 text-amber-500 text-sm font-extrabold">
                <Coins className="w-5 h-5 text-amber-500" />
                <span className="text-slate-900 font-black text-base">Wallet Top-Ups</span>
              </div>

              <div className="text-slate-400">
                {isWalletTopupsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>

            {/* Wallet Top-Ups Content */}
            {isWalletTopupsOpen && (
              <div className="p-5 bg-slate-50/50 space-y-3">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">Wallet Account Balance</div>
                    <div className="text-slate-400 text-xs">Instant eZ Cash & Binance Reload</div>
                  </div>
                  <div className="font-black text-emerald-600 text-base">
                    {(userProfile?.walletBalance || 0).toFixed(2)} LKR
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 5: Security Log (Matching Screenshot Table Format) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div 
              onClick={() => setIsSecurityLogOpen(!isSecurityLogOpen)}
              className="p-5 bg-white flex items-center justify-between cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 text-indigo-600 text-sm font-extrabold">
                <Shield className="w-5 h-5 text-indigo-600" />
                <span className="text-indigo-600 font-black text-base">Security Log</span>
              </div>

              <div className="text-indigo-600">
                {isSecurityLogOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>

            {/* Security Log Table Content */}
            {isSecurityLogOpen && (
              <div className="bg-white">
                <div className="grid grid-cols-2 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-wider">
                  <div>DEVICE</div>
                  <div>TIME</div>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  <div className="grid grid-cols-2 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors">
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm">Desktop</div>
                      <div className="text-slate-400 text-xs font-medium">Edge Browser</div>
                    </div>
                    <div className="text-slate-600 font-semibold text-xs">
                      Sep 11 12:50
                    </div>
                  </div>

                  <div className="grid grid-cols-2 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors">
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm">Desktop</div>
                      <div className="text-slate-400 text-xs font-medium">Edge Browser</div>
                    </div>
                    <div className="text-slate-600 font-semibold text-xs">
                      Sep 10 14:36
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 6: Saved Game IDs */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div 
              onClick={() => setIsSavedIdsOpen(!isSavedIdsOpen)}
              className="p-5 bg-white flex items-center justify-between cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 text-slate-700 text-sm font-extrabold">
                <Bookmark className="w-5 h-5 text-slate-600" />
                <span className="text-slate-900 font-black text-base">Saved Game IDs ({savedIds.length})</span>
              </div>

              <div className="text-slate-400">
                {isSavedIdsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>

            {/* Saved Game IDs List */}
            {isSavedIdsOpen && (
              <div className="p-5 bg-slate-50/50 space-y-3">
                {savedIds.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                    No saved game IDs yet.
                  </div>
                ) : (
                  savedIds.map((saved) => {
                    const game = GAMES_DATA.find(g => g.id === saved.gameId);
                    return (
                      <div 
                        key={saved.id}
                        className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-xs shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{game?.currencyIcon || '🎮'}</span>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">{saved.nickName}</div>
                            <div className="text-xs font-mono text-slate-500">
                              {saved.gameName} ID: <strong className="text-slate-900">{saved.playerId}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {game && (
                            <button
                              onClick={() => {
                                setIsUserProfileOpen(false);
                                openTopup(game);
                              }}
                              className="px-4 py-2 rounded-xl bg-[#cc040a] text-white font-extrabold text-xs hover:bg-[#990207] transition-colors shadow-xs"
                            >
                              Top Up
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSavedId(saved.id)}
                            className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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
  );
};
