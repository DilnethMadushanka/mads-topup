import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, User, Lock, ArrowLeft, LogIn, Crown } from 'lucide-react';

export const ResellerLoginPage = () => {
  const { openResellerPage, openAuth, showToast, setUserProfile, setIsLoggedIn, closeResellerLoginPage } = useApp();

  const [username, setUsername] = useState('S');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !username.trim()) {
      showToast('Please enter your reseller username!', 'error');
      return;
    }
    if (!password) {
      showToast('Please enter your password!', 'error');
      return;
    }

    setIsLoggedIn(true);
    setUserProfile(prev => ({
      ...prev,
      name: username.trim(),
      role: 'Reseller Partner',
      isReseller: true,
      email: username.includes('@') ? username : `${username}@madstopup.com`
    }));
    showToast(`Welcome back, Reseller ${username}! Logged into Reseller Portal.`);
    closeResellerLoginPage();
  };

  return (
    <div className="min-h-[85vh] bg-[#F4F6FB] py-12 px-4 sm:px-6 flex flex-col justify-center items-center relative overflow-hidden font-sans">
      
      {/* Background Decorative Blur Elements */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Navigation Bar / Back to Homepage Button */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between z-10">
        <button
          onClick={closeResellerLoginPage}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-4 py-2 rounded-full border border-slate-200 shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Homepage</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 border border-red-200 text-red-700 text-xs font-extrabold">
          <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>RESELLER PORTAL</span>
        </div>
      </div>

      {/* CENTERED RESELLER LOGIN CARD (Matching Screenshot Exactly) */}
      <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-200/90 text-center relative z-10 animate-in zoom-in-95 duration-200">
        
        {/* Header Title */}
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-heading mb-8 tracking-tight">
          Reseller Login
        </h1>

        {/* Reseller Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          
          {/* Reseller Username Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Reseller Username
            </label>
            <input
              type="text"
              placeholder="Enter your reseller username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-slate-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all shadow-xs"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder=""
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 pr-11 bg-white border border-slate-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-4 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="remember-me-page"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-600 cursor-pointer"
            />
            <label htmlFor="remember-me-page" className="text-xs text-slate-600 font-semibold cursor-pointer select-none">
              Remember me
            </label>
          </div>

          {/* LOGIN Action Button (Matching Screenshot - Pill Shape / Full Width) */}
          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm sm:text-base tracking-widest uppercase rounded-2xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer mt-3 active:scale-[0.99]"
          >
            <span>LOGIN</span>
          </button>

          {/* Horizontal Divider Line */}
          <div className="pt-2 border-t border-slate-200/90 mt-6"></div>

          {/* Footer Navigation Links (Matching Screenshot) */}
          <div className="space-y-2 text-center text-xs font-semibold pt-1">
            <div className="text-slate-600">
              <span>Not a reseller? </span>
              <button
                type="button"
                onClick={() => {
                  closeResellerLoginPage();
                  openAuth('login');
                }}
                className="text-blue-600 hover:underline font-bold cursor-pointer"
              >
                Login as a regular user
              </button>
            </div>

            <div className="text-slate-600">
              <span>Want to become a reseller? </span>
              <button
                type="button"
                onClick={() => openResellerPage()}
                className="text-blue-600 hover:underline font-bold cursor-pointer"
              >
                Apply Here
              </button>
            </div>
          </div>

        </form>
      </div>

    </div>
  );
};
