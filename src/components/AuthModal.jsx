import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { loginWithGoogle } from '../services/firebaseAuth';
import { X, Eye, EyeOff, Shield, Zap, Clock, User, Mail, Phone, Lock, Check, Send, LogIn, ArrowRight, Loader2 } from 'lucide-react';

export const AuthModal = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, authMode, setAuthMode, showToast, setUserProfile } = useApp();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [pendingGoogleUser, setPendingGoogleUser] = useState(null);
  const [googleWhatsAppPhone, setGoogleWhatsAppPhone] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSendCode = () => {
    if (!email) {
      showToast('Please enter your email address first!', 'error');
      return;
    }
    setIsSendingCode(true);
    setTimeout(() => {
      setIsSendingCode(false);
      showToast(`Verification code sent to ${email}!`);
    }, 1200);
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!username) {
      showToast('Please enter your username or email!', 'error');
      return;
    }
    if (!password) {
      showToast('Please enter your password!', 'error');
      return;
    }
    setUserProfile(prev => ({
      ...prev,
      name: username || 'Verified Gamer',
      email: username.includes('@') ? username : prev.email
    }));
    showToast(`Welcome back, ${username}! Successfully logged in.`);
    setIsAuthModalOpen(false);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!username) {
      showToast('Please choose a username!', 'error');
      return;
    }
    if (!email) {
      showToast('Please enter your email address!', 'error');
      return;
    }
    if (!password) {
      showToast('Please create a password!', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match!', 'error');
      return;
    }
    setUserProfile(prev => ({
      ...prev,
      name: username,
      email: email,
      phone: phone ? `+94 ${phone}` : prev.phone
    }));
    showToast(`Account created successfully! Welcome ${username}.`);
    setIsAuthModalOpen(false);
  };

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    try {
      const res = await loginWithGoogle();
      if (res.success && res.user) {
        setPendingGoogleUser(res.user);
      }
    } catch (err) {
      showToast(err.message || 'Google Authentication failed', 'error');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleCompleteGoogleSetup = (e) => {
    e.preventDefault();
    if (!googleWhatsAppPhone) {
      showToast('Please enter your WhatsApp number!', 'error');
      return;
    }
    if (pendingGoogleUser) {
      setUserProfile(prev => ({
        ...prev,
        uid: pendingGoogleUser.uid || prev.uid,
        name: pendingGoogleUser.name || 'Verified Gamer',
        email: pendingGoogleUser.email || '',
        avatar: pendingGoogleUser.photoURL || prev.avatar,
        phone: `+94 ${googleWhatsAppPhone}`,
        provider: 'Google'
      }));
      showToast(`Registration completed! Welcome, ${pendingGoogleUser.name}.`);
      setPendingGoogleUser(null);
      setIsAuthModalOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {pendingGoogleUser ? (
        /* COMPLETE GOOGLE ACCOUNT SETUP CARD (Matching Screenshot) */
        <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200/90 text-center relative animate-in zoom-in-95 duration-200 my-auto">
          {/* Close Button */}
          <button
            onClick={() => { setPendingGoogleUser(null); setIsAuthModalOpen(false); }}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* User's Google Profile Picture at Top */}
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-900 flex items-center justify-center ring-2 ring-slate-200">
              {pendingGoogleUser.photoURL ? (
                <img src={pendingGoogleUser.photoURL} alt={pendingGoogleUser.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-white">{pendingGoogleUser.name?.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
          </div>

          {/* Welcome Title */}
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
            Welcome, {pendingGoogleUser.name}!
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1 mb-6">
            Just one more step to complete your account setup.
          </p>

          {/* WhatsApp Phone Form */}
          <form onSubmit={handleCompleteGoogleSetup} className="space-y-5 text-left">
            <div>
              <label className="block text-center text-xs sm:text-sm font-black text-slate-900 mb-2">
                Please provide your WhatsApp Number
              </label>

              <div className="flex items-center gap-2">
                <div className="px-3.5 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-black text-slate-700 shrink-0 flex items-center gap-1.5 shadow-xs">
                  <span>LK +94 (S</span>
                  <span className="text-[10px] text-slate-400">▼</span>
                </div>
                <input
                  type="tel"
                  placeholder="e.g., 771234567"
                  value={googleWhatsAppPhone}
                  onChange={(e) => setGoogleWhatsAppPhone(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#2A1B70] focus:ring-2 focus:ring-purple-500/20 transition-all shadow-xs"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-semibold text-center mt-1.5">
                This is required for order updates and support.
              </p>
            </div>

            {/* Complete Registration Button */}
            <button
              type="submit"
              className="w-full py-3.5 bg-[#2A1B70] hover:bg-[#1E1156] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center cursor-pointer mt-2"
            >
              COMPLETE REGISTRATION
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white text-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative border border-slate-100 max-h-[92vh]">
        
        {/* Close Button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT SECTION (Vibrant Blue Branding Side - Matching Screenshots) */}
        <div className="w-full md:w-5/12 bg-[#1E64E8] p-5 sm:p-8 text-white flex flex-col items-center justify-between relative overflow-hidden text-center shrink-0">
          
          {/* Subtle Background Blur Shapes */}
          <div className="absolute -top-10 -left-10 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-blue-300/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center my-auto">
            {/* App Logo Box */}
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-slate-950 shadow-xl flex items-center justify-center p-2 mb-3 sm:mb-6 border border-white/20 overflow-hidden">
              <img src="/mads-logo.jpg" alt="MADS TOPUP Logo" className="w-full h-full object-contain rounded-xl" />
            </div>

            <p className="text-xs sm:text-sm font-semibold text-white/95 leading-relaxed max-w-xs mb-3 sm:mb-8">
              Join thousands of users enjoying fast & secure top-ups
            </p>

            {/* Feature List Box (Hidden on small mobile to give priority to form) */}
            <div className="hidden md:block w-full bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-4 space-y-3.5 text-left shadow-inner">
              <div className="flex items-center gap-3 text-xs font-extrabold text-white">
                <div className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
                  <Zap className="w-4 h-4 fill-white" />
                </div>
                <span>Instant Transactions</span>
              </div>

              <div className="w-full h-px bg-white/10"></div>

              <div className="flex items-center gap-3 text-xs font-extrabold text-white">
                <div className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <span>Secure & Protected</span>
              </div>

              <div className="w-full h-px bg-white/10"></div>

              <div className="flex items-center gap-3 text-xs font-extrabold text-white">
                <div className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <span>24/7 Support</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-[10px] text-white/70 font-semibold mt-4">
            © 2026 MADS TOPUP • MADS ENGINE
          </div>
        </div>

        {/* RIGHT SECTION (Form Side - Matching Screenshots) */}
        <div className="w-full md:w-7/12 bg-white p-6 sm:p-10 flex flex-col justify-between overflow-y-auto">
          
          {authMode === 'login' ? (
            /* LOGIN MODE FORM (Screenshot 1) */
            <div className="space-y-6 my-auto">
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
                  Welcome Back!
                </h2>
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  Log in to continue to MADS Topup
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Username or Email */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Username or Email</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your username or email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#1E64E8] focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-10 bg-[#F8FAFC] border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#1E64E8] focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Checkbox & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 font-semibold text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={keepLoggedIn}
                      onChange={(e) => setKeepLoggedIn(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#1E64E8] focus:ring-[#1E64E8]"
                    />
                    <span>Keep me logged in</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => showToast('Password reset link sent to your email!')}
                    className="font-extrabold text-[#1E64E8] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Submit Login Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#1E64E8] hover:bg-[#1D4ED8] text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </button>
              </form>

              {/* Or Continue With Divider */}
              <div className="relative text-center my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <span className="relative bg-white px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  OR CONTINUE WITH
                </span>
              </div>

              {/* Sign in with Google */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isGoogleLoading}
                className="w-full py-3 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#1E64E8]" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}
                <span>{isGoogleLoading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
              </button>

              {/* Switch to Register */}
              <div className="text-center text-xs text-slate-500 font-medium pt-2">
                <span>Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="font-extrabold text-[#1E64E8] hover:underline cursor-pointer"
                >
                  Register here
                </button>
              </div>
            </div>
          ) : (
            /* REGISTER MODE FORM (Screenshot 2) */
            <div className="space-y-4 my-auto">
              <div className="text-center mb-2">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">
                  Create Account
                </h2>
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  Start your journey with us today
                </p>
              </div>

              {/* Sign up with Google */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isGoogleLoading}
                className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#1E64E8]" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}
                <span>{isGoogleLoading ? 'Connecting to Google...' : 'Sign up with Google'}</span>
              </button>

              {/* Or Continue With Email Divider */}
              <div className="relative text-center my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <span className="relative bg-white px-3 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                  OR CONTINUE WITH EMAIL
                </span>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                {/* Username */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Username</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#1E64E8] focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                {/* Email Address + Send Code */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Address</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#1E64E8] focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={isSendingCode}
                      className="bg-[#1E64E8] hover:bg-[#1D4ED8] text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-xs"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isSendingCode ? 'Sending...' : 'Send Code'}</span>
                    </button>
                  </div>
                </div>

                {/* WhatsApp Number */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>WhatsApp Number</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shrink-0">
                      LK +94
                    </div>
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#1E64E8] focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                    Enter your number without leading zero
                  </p>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-9 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#1E64E8] focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-slate-400" />
                    <span>Confirm Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-9 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#1E64E8] focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Create Account Button */}
                <button
                  type="submit"
                  className="w-full py-3 bg-[#1E64E8] hover:bg-[#1D4ED8] text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Switch to Login */}
              <div className="text-center text-xs text-slate-500 font-medium pt-1">
                <span>Already have an account? </span>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="font-extrabold text-[#1E64E8] hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
      )}
    </div>
  );
};
