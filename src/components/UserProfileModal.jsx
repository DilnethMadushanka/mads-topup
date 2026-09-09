import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { 
  X, User, ShoppingBag, Bookmark, Wallet, RefreshCw, 
  CheckCircle2, Clock, Zap, Trash2, ArrowRight, ShieldCheck
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
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'ids' | 'wallet'

  if (!isUserProfileOpen) return null;

  const completedOrders = orders.filter(o => o.status === 'COMPLETED');
  const totalSpentLkr = completedOrders.reduce((sum, o) => sum + o.priceLkr, 0);

  const handleDeleteSavedId = (id) => {
    setUserProfile(prev => ({
      ...prev,
      savedIds: prev.savedIds.filter(s => s.id !== id)
    }));
    showToast('Saved Player ID deleted.');
  };

  return (
    <div className="modal-overlay">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Banner */}
        <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center justify-between relative z-10 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-red-600/30">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black font-heading tracking-tight text-white">{userProfile.name}</h2>
                <p className="text-xs text-slate-300">{userProfile.email} • {userProfile.phone}</p>
              </div>
            </div>

            <button 
              onClick={() => setIsUserProfileOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3 relative z-10 pt-2 border-t border-slate-800">
            <div className="bg-white/5 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Top-Ups</span>
              <span className="text-lg font-black text-white font-heading">{orders.length}</span>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Spent</span>
              <span className="text-lg font-black text-red-400 font-heading">{formatPrice(totalSpentLkr)}</span>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Wallet Balance</span>
              <span className="text-lg font-black text-emerald-400 font-heading">Rs. {userProfile.walletBalance}</span>
            </div>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-4 pt-2 gap-2 text-xs font-extrabold">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-all flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-white border-slate-200 text-red-600 shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Order History ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ids')}
            className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-all flex items-center gap-1.5 ${
              activeTab === 'ids'
                ? 'bg-white border-slate-200 text-red-600 shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Saved Game IDs ({userProfile.savedIds.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              {orders.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm font-semibold">
                  No orders placed yet.
                </div>
              ) : (
                orders.map((ord) => (
                  <div 
                    key={ord.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-red-500/40 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-xs">{ord.id}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Order Status Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        ord.status === 'COMPLETED' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ord.status === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                        <span>{ord.status}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">{ord.gameName} - {ord.packageName}</div>
                        <div className="text-slate-500 font-medium mt-0.5">
                          ID: <span className="font-mono text-slate-800 font-bold">{ord.playerId}</span> ({ord.ign})
                        </div>
                        {ord.moongoldRef && (
                          <div className="text-[10px] text-red-600 font-mono font-semibold">
                            Moongold Ref: {ord.moongoldRef}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="font-black text-slate-900 text-base font-heading">{formatPrice(ord.priceLkr)}</div>
                        <div className="text-[10px] text-slate-400">{ord.paymentMethod}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SAVED IDs TAB */}
          {activeTab === 'ids' && (
            <div className="space-y-3">
              {userProfile.savedIds.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm font-semibold">
                  No saved Game IDs yet. You can save your ID when doing a top-up!
                </div>
              ) : (
                userProfile.savedIds.map((saved) => {
                  const game = GAMES_DATA.find(g => g.id === saved.gameId);
                  return (
                    <div 
                      key={saved.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{game?.currencyIcon || '🎮'}</span>
                        <div>
                          <div className="font-extrabold text-sm text-slate-900">{saved.nickName}</div>
                          <div className="text-xs font-mono text-slate-500 font-medium">
                            {saved.gameName} ID: <strong className="text-slate-800">{saved.playerId}</strong>
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
                            className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors flex items-center gap-1"
                          >
                            <span>Topup</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSavedId(saved.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
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
  );
};
