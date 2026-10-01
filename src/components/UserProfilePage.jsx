import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { filterUserOrders } from '../utils/ownership';
import { 
  User, ShoppingBag, Bookmark, Wallet, RefreshCw, 
  CheckCircle2, Clock, Zap, Trash2, ArrowLeft, ShieldCheck,
  Camera, Users, FileText, ChevronUp, ChevronDown, Edit, Award, DollarSign, LogOut,
  Key, CreditCard, Shield, Coins, Copy, Download, Home, Sparkles,
  Monitor, Mail, Phone, ChevronRight
} from 'lucide-react';

export const UserProfilePage = () => {
  const { 
    setIsUserProfileOpen, 
    userProfile, 
    setUserProfile, 
    orders, 
    formatPrice,
    formatLkr,
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
  const userOrders = filterUserOrders(orders, userProfile);

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
    setUserProfile(prev => {
      const updated = (prev.savedIds || []).filter(s => s.id !== id);
      // Persist removal to database so it syncs across devices
      if (prev.uid) {
        import('../services/firestoreService').then(({ updateUserProfileInFirestore }) => {
          updateUserProfileInFirestore(prev.uid, { savedIds: updated }).catch(() => {});
        });
      }
      return { ...prev, savedIds: updated };
    });
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

  const openWalletTab = (tab) => {
    setWalletActiveTab(tab);
    if (localStorage.getItem('mads_dont_show_notice') === 'true') {
      setIsWalletModalOpen(true);
    } else {
      setIsNoticeModalOpen(true);
    }
  };

  const inputCls = 'w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-sm placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:border-[#cc040a] focus:ring-4 focus:ring-[#cc040a]/10 transition-all';

  // Shared accordion shell — keeps every section visually identical
  const section = ({ icon: Icon, title, count, open, toggle, children }) => (
    <div className={`bg-white rounded-3xl border-2 shadow-sm overflow-hidden transition-colors ${open ? 'border-[#cc040a]/25' : 'border-slate-200/90'}`}>
      <div
        onClick={toggle}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-red-50/30 transition-colors"
      >
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${open ? 'bg-[#cc040a] text-white shadow-md shadow-red-600/25' : 'bg-slate-100 text-slate-600'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-slate-900 font-black text-base font-heading">{title}</span>
            {count !== undefined && (
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-red-50 text-[#cc040a] border border-red-100">{count}</span>
            )}
          </div>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${open ? 'bg-red-50 text-[#cc040a]' : 'bg-slate-100 text-slate-500'}`}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
      {open && <div className="border-t border-slate-100">{children}</div>}
    </div>
  );

  const emptyState = (emoji, text) => (
    <div className="text-center py-10 m-5 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
      <div className="text-3xl mb-2">{emoji}</div>
      <div className="text-xs font-bold text-slate-400">{text}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-6 animate-in fade-in duration-300 font-sans text-slate-900">

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

          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400 font-mono">
            <span onClick={goHome} className="hover:underline cursor-pointer hover:text-[#cc040a] transition-colors">Home</span>
            <span>/</span>
            <span className="text-[#cc040a] font-bold">My Account</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">

        {/* PROFILE HERO */}
        <div className="relative rounded-3xl bg-white text-slate-900 border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ef1c25] via-[#cc040a] to-[#990207]"></div>
          <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-red-50 pointer-events-none"></div>
          <div className="absolute -bottom-28 -left-16 w-72 h-72 rounded-full bg-red-50/70 pointer-events-none"></div>
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #cc040a 1px, transparent 1px)', backgroundSize: '22px 22px' }}></div>

          <div className="relative z-10 p-6 sm:p-9 flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative shrink-0 self-center sm:self-auto">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1.5 bg-gradient-to-br from-[#ef1c25] to-[#990207] shadow-xl shadow-red-600/20">
                <div className="w-full h-full rounded-full bg-white border-4 border-white flex items-center justify-center font-black text-4xl text-[#cc040a] overflow-hidden">
                  {userProfile.avatar ? (
                    <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(userProfile.name)}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className="w-9 h-9 bg-white text-[#cc040a] rounded-full flex items-center justify-center shadow-lg absolute bottom-1 right-1 border-2 border-red-100 cursor-pointer hover:scale-110 transition-transform"
                title="Edit Profile"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 bg-red-50 text-[#cc040a] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100 mb-2.5">
                <Sparkles className="w-3 h-3" />
                <span>Verified Member</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black font-heading tracking-tight truncate">
                {userProfile.name || 'Gamer Account'}
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-1 truncate">
                {userProfile.email || 'user@madstopup.com'}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3.5">
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-extrabold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Account Linked & Secured
                </span>
                {userProfile.phone && (
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1 rounded-full text-[11px] font-extrabold">
                    <Phone className="w-3.5 h-3.5" />
                    {userProfile.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Logout"
              className="self-center sm:self-start px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-slate-700 hover:text-[#cc040a] text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border-2 border-slate-200 hover:border-[#cc040a]/40 shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* STAT TILES */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 -mt-2">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#cc040a] flex items-center justify-center"><Award className="w-5 h-5" /></div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Lifetime Spend</span>
              <span className="text-lg font-black text-slate-900 font-heading leading-tight block">{(totalSpentLkr || 0).toFixed(2)} <span className="text-xs text-slate-400">LKR</span></span>
            </div>
          </div>

          <div
            onClick={() => openWalletTab('ezcash')}
            className="bg-white hover:border-[#cc040a]/50 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md p-4 flex flex-col gap-3 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-red-50 group-hover:bg-[#cc040a] text-[#cc040a] group-hover:text-white flex items-center justify-center transition-colors"><Wallet className="w-5 h-5" /></div>
              <span className="text-[10px] font-black text-[#cc040a] bg-red-50 px-2 py-0.5 rounded-full">+ Recharge</span>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">EZ Wallet</span>
              <span className="text-lg font-black text-slate-900 font-heading leading-tight block">{(userProfile?.walletBalance || 0).toFixed(2)} <span className="text-xs text-slate-400">LKR</span></span>
            </div>
          </div>

          <div
            onClick={() => openWalletTab('binance')}
            className="bg-white hover:border-[#cc040a]/50 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md p-4 flex flex-col gap-3 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-red-50 group-hover:bg-[#cc040a] text-[#cc040a] group-hover:text-white flex items-center justify-center transition-colors"><DollarSign className="w-5 h-5" /></div>
              <span className="text-[10px] font-black text-[#cc040a] bg-red-50 px-2 py-0.5 rounded-full">+ Recharge</span>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Binance</span>
              <span className="text-lg font-black text-slate-900 font-heading leading-tight block">{(userProfile?.walletUsdt || 0).toFixed(2)} <span className="text-xs text-slate-400">USDT</span></span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#cc040a] flex items-center justify-center"><ShoppingBag className="w-5 h-5" /></div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Orders</span>
              <span className="text-lg font-black text-slate-900 font-heading leading-tight block">{userOrders.length} <span className="text-xs text-slate-400">({completedOrders.length} done)</span></span>
            </div>
          </div>
        </div>

        {/* QUICK ACTION CARDS (Edit Profile, Referrals, Reports) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { key: 'edit', icon: User, title: 'Edit Profile', sub: 'Update name, email & phone', active: isEditMode, onClick: () => setIsEditMode(!isEditMode) },
            { key: 'ref', icon: Users, title: 'Referrals', sub: 'Earn 1.5% cashback rewards', active: false, onClick: openReferralPage },
            { key: 'rep', icon: FileText, title: 'Reports & Statements', sub: 'Download PDF & CSV logs', active: activeTab === 'reports', onClick: () => { setActiveTab(activeTab === 'reports' ? 'orders' : 'reports'); setIsEditMode(false); } },
          ].map(({ key, icon: Icon, title, sub, active, onClick }) => (
            <div
              key={key}
              onClick={onClick}
              className={`rounded-2xl p-4 border-2 cursor-pointer transition-all flex items-center gap-4 group ${
                active ? 'bg-red-50/60 border-[#cc040a] shadow-md shadow-red-600/10' : 'bg-white border-slate-200 hover:border-[#cc040a]/40 hover:shadow-md'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                active ? 'bg-[#cc040a] text-white shadow-md shadow-red-600/25' : 'bg-slate-100 text-slate-600 group-hover:bg-[#cc040a] group-hover:text-white'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-black text-slate-900 font-heading">{title}</h4>
                <p className="text-xs text-slate-500 font-medium">{sub}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#cc040a] group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          ))}
        </div>

        {/* EDIT PROFILE FORM PANEL */}
        {isEditMode && (
          <div className="bg-white rounded-3xl border-2 border-[#cc040a]/25 p-6 sm:p-8 shadow-lg shadow-red-600/5 animate-in fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-[#cc040a] text-white flex items-center justify-center shadow-md shadow-red-600/25">
                <Edit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 font-heading leading-none">Update Account Information</h3>
                <div className="w-10 h-1 bg-[#cc040a] rounded-full mt-1.5"></div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">Full Name / Display Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">Phone Number / WhatsApp</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="px-7 py-3 bg-[#cc040a] text-white font-black text-xs rounded-xl hover:bg-[#b00308] transition-all shadow-lg shadow-red-600/25 cursor-pointer active:scale-[0.98]"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className="px-7 py-3 bg-slate-100 text-slate-700 font-black text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* REPORTS CONTENT PANEL */}
        {activeTab === 'reports' && !isEditMode && (
          <div className="bg-white rounded-3xl border-2 border-[#cc040a]/25 p-6 sm:p-8 shadow-lg shadow-red-600/5 space-y-5 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#cc040a] text-white flex items-center justify-center shadow-md shadow-red-600/25">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 font-heading leading-none">Top-Up Statements & Reports</h3>
                <div className="w-10 h-1 bg-[#cc040a] rounded-full mt-1.5"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between gap-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-[#cc040a] flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
                  <div>
                    <span className="font-black text-slate-900 text-sm block font-heading">Monthly Topup Statement</span>
                    <span className="text-slate-500 text-xs font-medium">Official PDF summary of all completed top-ups</span>
                  </div>
                </div>
                <button
                  onClick={handleDownloadPDF}
                  className="w-full px-5 py-3 bg-[#cc040a] hover:bg-[#b00308] text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Statement</span>
                </button>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between gap-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0"><Download className="w-5 h-5" /></div>
                  <div>
                    <span className="font-black text-slate-900 text-sm block font-heading">Automated Dispatch Audit Log</span>
                    <span className="text-slate-500 text-xs font-medium">Raw CSV spreadsheet export of order timestamps & refs</span>
                  </div>
                </div>
                <button
                  onClick={handleDownloadCSV}
                  className="w-full px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV Audit Log</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY & ACTIVITY SECTION */}
        <div className="space-y-4 pt-4">
          <div className="text-center mb-2">
            <h2 className="text-2xl font-black text-slate-900 font-heading">History & Activity</h2>
            <div className="w-16 h-1 bg-[#cc040a] rounded-full mt-2 mx-auto"></div>
          </div>

          {/* Recent Purchases */}
          {section({
            icon: ShoppingBag, title: 'Recent Purchases', count: userOrders.length,
            open: isRecentPurchasesOpen, toggle: () => setIsRecentPurchasesOpen(!isRecentPurchasesOpen),
            children: (
              <div className="p-4 sm:p-5 bg-slate-50/60 space-y-3">
                {userOrders.length === 0 ? (
                  emptyState('🛍️', 'No recent purchases found.')
                ) : (
                  userOrders.map((ord) => {
                    const done = ord.status === 'COMPLETED';
                    return (
                      <div
                        key={ord.id}
                        className={`p-4 rounded-2xl bg-white border border-slate-200 border-l-4 ${done ? 'border-l-emerald-500' : 'border-l-amber-400'} shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-slate-900">{ord.id}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                              {ord.status}
                            </span>
                          </div>
                          <div className="font-black text-slate-900 text-sm sm:text-base mt-1 font-heading">
                            {ord.gameName} - {ord.packageName}
                          </div>
                          <div className="text-slate-500 font-medium text-xs mt-0.5">
                            Player ID: <strong className="text-slate-800 font-mono">{ord.playerId}</strong> ({ord.ign})
                          </div>
                        </div>

                        <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 shrink-0">
                          <div className="font-black text-[#cc040a] text-lg font-heading">{formatLkr(ord.priceLkr)}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{ord.paymentMethod}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )
          })}

          {/* My Codes */}
          {section({
            icon: Key, title: 'My Codes',
            open: isMyCodesOpen, toggle: () => setIsMyCodesOpen(!isMyCodesOpen),
            children: emptyState('🔑', 'No active digital codes or vouchers redeemed yet.')
          })}

          {/* Manual Payments */}
          {section({
            icon: CreditCard, title: 'Manual Payments',
            open: isManualPaymentsOpen, toggle: () => setIsManualPaymentsOpen(!isManualPaymentsOpen),
            children: emptyState('🏦', 'No manual bank or eZ Cash payments submitted.')
          })}

          {/* Wallet Top-Ups */}
          {section({
            icon: Coins, title: 'Wallet Top-Ups',
            open: isWalletTopupsOpen, toggle: () => setIsWalletTopupsOpen(!isWalletTopupsOpen),
            children: (
              <div className="p-4 sm:p-5 bg-slate-50/60">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex justify-between items-center text-xs gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-[#cc040a] flex items-center justify-center shrink-0"><Wallet className="w-5 h-5" /></div>
                    <div>
                      <div className="font-black text-slate-900 text-sm font-heading">Wallet Account Balance</div>
                      <div className="text-slate-400 text-xs">Instant eZ Cash & Binance Reload</div>
                    </div>
                  </div>
                  <div className="font-black text-emerald-600 text-lg font-heading shrink-0">
                    {(userProfile?.walletBalance || 0).toFixed(2)} LKR
                  </div>
                </div>
              </div>
            )
          })}

          {/* Security Log */}
          {section({
            icon: Shield, title: 'Security Log',
            open: isSecurityLogOpen, toggle: () => setIsSecurityLogOpen(!isSecurityLogOpen),
            children: (
              <div className="bg-white">
                <div className="grid grid-cols-2 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <div>Device</div>
                  <div>Time</div>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {[['Sep 11 12:50', true], ['Sep 10 14:36', false]].map(([time, latest]) => (
                    <div key={time} className="grid grid-cols-2 px-6 py-4 items-center hover:bg-red-50/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><Monitor className="w-4 h-4" /></div>
                        <div>
                          <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                            Desktop
                            {latest && <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Latest</span>}
                          </div>
                          <div className="text-slate-400 text-xs font-medium">Edge Browser</div>
                        </div>
                      </div>
                      <div className="text-slate-600 font-bold text-xs font-mono">{time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Saved Game IDs */}
          {section({
            icon: Bookmark, title: 'Saved Game IDs', count: savedIds.length,
            open: isSavedIdsOpen, toggle: () => setIsSavedIdsOpen(!isSavedIdsOpen),
            children: (
              <div className="p-4 sm:p-5 bg-slate-50/60 space-y-3">
                {savedIds.length === 0 ? (
                  emptyState('🎮', 'No saved game IDs yet.')
                ) : (
                  savedIds.map((saved) => {
                    const game = GAMES_DATA.find(g => g.id === saved.gameId);
                    return (
                      <div
                        key={saved.id}
                        className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center text-2xl shrink-0">{game?.currencyIcon || '🎮'}</div>
                          <div className="min-w-0">
                            <div className="font-black text-slate-900 text-sm font-heading truncate">{saved.nickName}</div>
                            <div className="text-xs font-mono text-slate-500 truncate">
                              {saved.gameName} ID: <strong className="text-slate-900">{saved.playerId}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {game && (
                            <button
                              onClick={() => {
                                setIsUserProfileOpen(false);
                                openTopup(game);
                              }}
                              className="px-4 py-2 rounded-xl bg-[#cc040a] text-white font-black text-xs hover:bg-[#b00308] transition-colors shadow-md shadow-red-600/20 cursor-pointer"
                            >
                              Top Up
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSavedId(saved.id)}
                            className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )
          })}

        </div>

      </div>
    </div>
  );
};
