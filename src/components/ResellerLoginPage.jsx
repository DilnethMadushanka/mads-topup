import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getResellerProfileByKeyAsync, verifyUserLoginAsync } from '../services/firestoreService';
import { Eye, EyeOff, User, Lock, ArrowLeft, LogIn, Crown, Send, DollarSign, TrendingUp } from 'lucide-react';

export const ResellerLoginPage = () => {
  const { openResellerPage, openAuth, showToast, setUserProfile, setIsLoggedIn, closeResellerLoginPage, openResellerDashboard } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !username.trim()) {
      showToast('Please enter your reseller username, email or security key!', 'error');
      return;
    }
    if (!password) {
      showToast('Please enter your password!', 'error');
      return;
    }

    const cleanInput = username.trim();
    setIsBusy(true);
    try {
      const verifyRes = await verifyUserLoginAsync(cleanInput, password, rememberMe);
      if (!verifyRes.success) {
        showToast(verifyRes.message || 'Incorrect password! Please enter your updated password.', 'error');
        return;
      }

      const resellerProfile = await getResellerProfileByKeyAsync(cleanInput);

      if (!resellerProfile || !resellerProfile.isReseller || resellerProfile.resellerStatus !== 'APPROVED') {
        showToast('Reseller account not found or pending Admin approval! Please submit a reseller application or wait for Admin approval.', 'error');
        return;
      }

      setIsLoggedIn(true);
      setUserProfile(prev => ({ ...prev, ...resellerProfile }));
      showToast(`Welcome back, ${resellerProfile.name}!`);
      openResellerDashboard();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="rp rp-login">
      <div className="rp-top">
        <button type="button" onClick={closeResellerLoginPage} className="rp-back">
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <span className="rp-pill"><Crown className="w-3.5 h-3.5" /> Reseller portal</span>
      </div>

      <div className="rpl-wrap">
        <aside className="rpl-side">
          <span className="rp-pill rp-pill-light">MADS TOPUP Partners</span>
          <h2>Your reseller desk</h2>
          <p>Top up for your customers at your tier price, track every order and use the Telegram bot.</p>
          <ul>
            <li><DollarSign className="w-4 h-4" /> 3% to 8% off every game</li>
            <li><TrendingUp className="w-4 h-4" /> Orders, turnover and tier progress</li>
            <li><Send className="w-4 h-4" /> Instant Telegram top-ups</li>
          </ul>
        </aside>

        <div className="rpl-card">
          <span className="rp-stat-ic rp-tone-blue rpl-ic"><LogIn className="w-5 h-5" /></span>
          <h1 className="rp-h2">Reseller login</h1>
          <p className="rp-sub">Use your username, email or security key.</p>

          <form onSubmit={handleSubmit} className="rp-form">
            <label className="rp-field">
              <span>Username, email or security key</span>
              <div className="rp-input-wrap">
                <User className="w-4 h-4" />
                <input type="text" autoComplete="username" placeholder="MADS-SEC-XXXXXX" value={username} onChange={(e) => setUsername(e.target.value)} className="rp-input" />
              </div>
            </label>

            <label className="rp-field">
              <span>Password</span>
              <div className="rp-input-wrap">
                <Lock className="w-4 h-4" />
                <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="rp-input" />
                <button type="button" className="rp-eye" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            <label className="rp-terms">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              <span>Remember me</span>
            </label>

            <button type="submit" disabled={isBusy} className="rp-btn rp-btn-block">
              {isBusy ? 'Logging in…' : 'Log in'} <LogIn className="w-4 h-4" />
            </button>
          </form>

          <div className="rpl-links">
            <p>Not a reseller? <button type="button" onClick={() => { closeResellerLoginPage(); openAuth('login'); }}>Log in as a customer</button></p>
            <p>Want to join? <button type="button" onClick={() => openResellerPage()}>Apply here</button></p>
          </div>
        </div>
      </div>
    </div>
  );
};
