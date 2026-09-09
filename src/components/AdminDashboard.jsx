import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA } from '../data/games';
import { dispatchMoongoldOrder } from '../services/moongoldApi';
import { 
  X, ShieldCheck, DollarSign, Activity, Settings, RefreshCw, 
  CheckCircle2, Clock, XCircle, Zap, Key, Server, Database, Save, Eye, EyeOff
} from 'lucide-react';

export const AdminDashboard = () => {
  const { 
    isAdminOpen, 
    setIsAdminOpen, 
    orders, 
    updateOrderStatus, 
    moongoldConfig, 
    updateMoongoldConfig, 
    formatPrice,
    showToast 
  } = useApp();

  const [adminTab, setAdminTab] = useState('orders'); // 'orders' | 'moongold' | 'packages'
  const [apiKeyInput, setApiKeyInput] = useState(moongoldConfig.apiKey);
  const [secretKeyInput, setSecretKeyInput] = useState(moongoldConfig.secretKey);
  const [baseUrlInput, setBaseUrlInput] = useState(moongoldConfig.baseUrl);
  const [autoFulfillInput, setAutoFulfillInput] = useState(moongoldConfig.autoFulfill);
  const [simModeInput, setSimModeInput] = useState(moongoldConfig.simulationMode);
  const [showSecret, setShowSecret] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [retryingOrderId, setRetryingOrderId] = useState(null);

  if (!isAdminOpen) return null;

  const totalRevenue = orders
    .filter(o => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + o.priceLkr, 0);

  const pendingCount = orders.filter(o => o.status === 'PROCESSING' || o.status === 'PENDING').length;

  const handleSaveMoongoldSettings = () => {
    updateMoongoldConfig({
      ...moongoldConfig,
      apiKey: apiKeyInput,
      secretKey: secretKeyInput,
      baseUrl: baseUrlInput,
      autoFulfill: autoFulfillInput,
      simulationMode: simModeInput
    });
  };

  const handleRetryMoongold = async (order) => {
    setRetryingOrderId(order.id);
    const game = GAMES_DATA.find(g => g.id === order.gameId);
    
    const result = await dispatchMoongoldOrder({
      game: game || { moongoldCode: 'GENERIC' },
      playerId: order.playerId,
      zoneId: order.zoneId,
      package: { id: order.packageName }
    });

    setRetryingOrderId(null);

    if (result.success) {
      updateOrderStatus(order.id, 'COMPLETED', result.moongoldRef);
      showToast(`Order ${order.id} synced with Moongold successfully!`);
    } else {
      showToast(`Moongold Sync Failed: ${result.message}`, 'error');
    }
  };

  const handleCheckBalance = async () => {
    setIsCheckingBalance(true);
    await new Promise(res => setTimeout(res, 800));
    setIsCheckingBalance(false);
    showToast(`Moongold Provider Balance: Rs. ${moongoldConfig.merchantBalanceLkr.toLocaleString()} ($${moongoldConfig.merchantBalanceUsd})`);
  };

  return (
    <div className="modal-overlay">
      <div className="bg-slate-950 text-white w-full max-w-5xl rounded-3xl shadow-2xl border border-red-500/20 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Admin Header */}
        <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-red-600/40">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black font-heading tracking-tight text-white">MADS TOPUP ADMIN PORTAL</h2>
                <span className="px-2 py-0.5 rounded bg-red-600/20 border border-red-500/40 text-red-400 text-[10px] font-mono font-bold">
                  v2.4 Pro
                </span>
              </div>
              <p className="text-xs text-slate-400">Order Dispatch, Package Prices & Moongold API Management</p>
            </div>
          </div>

          <button 
            onClick={() => setIsAdminOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-900/60 border-b border-slate-800/80">
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Revenue</span>
            <span className="text-xl font-black text-red-500 font-heading">{formatPrice(totalRevenue)}</span>
          </div>

          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Orders</span>
            <span className="text-xl font-black text-white font-heading">{orders.length}</span>
          </div>

          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Active Queue</span>
            <span className="text-xl font-black text-amber-400 font-heading">{pendingCount}</span>
          </div>

          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Moongold Status</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{moongoldConfig.simulationMode ? 'SIMULATION MODE' : 'LIVE API'}</span>
            </span>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setAdminTab('orders')}
            className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center gap-1.5 ${
              adminTab === 'orders'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Orders Management ({orders.length})</span>
          </button>

          <button
            onClick={() => setAdminTab('moongold')}
            className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center gap-1.5 ${
              adminTab === 'moongold'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Moongold API Config</span>
          </button>
        </div>

        {/* Admin Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: ORDERS MANAGEMENT */}
          {adminTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Live Top-Up Orders List
                </h3>
                <span className="text-xs text-slate-400">Click actions to complete or re-dispatch orders</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Game / Package</th>
                      <th className="p-3">Player ID</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-red-400">{ord.id}</td>
                        <td className="p-3">
                          <div className="font-bold text-white">{ord.gameName}</div>
                          <div className="text-[10px] text-slate-400">{ord.packageName}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          <div>{ord.playerId}</div>
                          <div className="text-[10px] text-slate-400 font-sans">{ord.ign}</div>
                        </td>
                        <td className="p-3 text-slate-300">{ord.paymentMethod}</td>
                        <td className="p-3 font-bold text-white font-heading">{formatPrice(ord.priceLkr)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            ord.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {ord.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1">
                          {ord.status !== 'COMPLETED' && (
                            <button
                              onClick={() => updateOrderStatus(ord.id, 'COMPLETED')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleRetryMoongold(ord)}
                            disabled={retryingOrderId === ord.id}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold border border-slate-700"
                          >
                            {retryingOrderId === ord.id ? 'Syncing...' : 'Retry Moongold'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: MOONGOLD API CONFIGURATION */}
          {adminTab === 'moongold' && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400" />
                      <span>Moongold API Credentials</span>
                    </h3>
                    <p className="text-xs text-slate-400">Configure your Moongold supplier API key and endpoint</p>
                  </div>

                  <button
                    onClick={handleCheckBalance}
                    disabled={isCheckingBalance}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBalance ? 'animate-spin' : ''}`} />
                    <span>Check Moongold Balance</span>
                  </button>
                </div>

                {/* API Form Fields */}
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Moongold API Key</label>
                    <input
                      type="text"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="e.g. mg_live_98a7c1b2d3..."
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Moongold Secret Key</label>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={secretKeyInput}
                        onChange={(e) => setSecretKeyInput(e.target.value)}
                        placeholder="e.g. sec_88192a0194..."
                        className="w-full pl-4 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-red-500"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-white"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">API Base URL</label>
                    <input
                      type="text"
                      value={baseUrlInput}
                      onChange={(e) => setBaseUrlInput(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoFulfillInput}
                        onChange={(e) => setAutoFulfillInput(e.target.checked)}
                        className="w-4 h-4 accent-red-600 rounded"
                      />
                      <span className="font-bold text-slate-200">Auto-fulfill top-ups on checkout</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={simModeInput}
                        onChange={(e) => setSimModeInput(e.target.checked)}
                        className="w-4 h-4 accent-red-600 rounded"
                      />
                      <span className="font-bold text-amber-400">Simulation Mode (Demo without real money)</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveMoongoldSettings}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Moongold Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
