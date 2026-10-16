import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES_DATA, getVerifiedPackagePriceLkr } from '../data/games';
import { generateUniqueSecurityKey, ensureResellerCredentials, getResellerProfileByKeyAsync, updateUserProfileInFirestore } from '../services/firestoreService';
import { dispatchMoongoldOrder, checkPlayerIGN } from '../services/moongoldApi';
import { ResellerReceipt } from './ResellerReceipt';
import { orderBelongsToUser, sortOrdersNewestFirst } from '../utils/ownership';
import { useResellerStatus, resellerRateOf } from '../hooks/useResellerStatus';
import { resellerUnitPrice } from '../data/resellerTiers';
import { postServerApi, getUserAuthToken } from '../services/serverApi';
import confetti from 'canvas-confetti';
import { 
  Crown, Wallet, Zap, Copy, Check, ArrowLeft, Send, ShieldCheck, 
  TrendingUp, ShoppingBag, DollarSign, Clock, RefreshCw, CheckCircle2, 
  Search, Filter, Smartphone, Ticket, Award, Store, Edit3, Settings, HelpCircle, ArrowRight,
  Globe, Bot, Mail
} from 'lucide-react';

export const ResellerDashboard = () => {
  const { 
    userProfile, 
    setUserProfile,
    orders, 
    addOrder,
    formatPrice, 
    showToast, 
    closeResellerDashboard,
    openWalletModal,
    gamesCatalog
  } = useApp();


  const [activeTab, setActiveTab] = useState('dispatch'); // 'dispatch' | 'orders' | 'pricing' | 'bot' | 'settings'

  // Instant Topup Dispatch Form State
  const [selectedGameId, setSelectedGameId] = useState(GAMES_DATA[0]?.id || 'freefire');
  const [customerUid, setCustomerUid] = useState('');
  const [customerZoneId, setCustomerZoneId] = useState('');
  const [receipt, setReceipt] = useState(null); // details of the last successful order
  const [isCheckingIgn, setIsCheckingIgn] = useState(false);
  const [ignVerified, setIgnVerified] = useState(false);
  const [customerIgn, setCustomerIgn] = useState('');
  // Bug 4: Pre-select first package so wholesale price shows immediately
  const [selectedPackageId, setSelectedPackageId] = useState(GAMES_DATA[0]?.packages?.[0]?.id || '');
  const [isFulfilling, setIsFulfilling] = useState(false);

  // Search & Filter States
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderChannelFilter, setOrderChannelFilter] = useState('ALL'); // 'ALL' | 'TELEGRAM' | 'WEB'
  const [isCopiedId, setIsCopiedId] = useState(false);

  // Store Settings Form State
  const [storeName, setStoreName] = useState(userProfile?.storeName || `${userProfile?.name || 'Gamer'}'s TopUp Store`);
  const [whatsappContact, setWhatsappContact] = useState(userProfile?.phone || '');
  const [storeEmail, setStoreEmail] = useState(userProfile?.storeEmail || userProfile?.email || '');

  const profileWithCreds = ensureResellerCredentials(userProfile) || {};
  const resellerWalletId = profileWithCreds.resellerCode || userProfile?.resellerCode || 'RS-OFFICIAL';
  const resellerSecurityKey = profileWithCreds.securityKey || userProfile?.securityKey || 'MADS-SEC-OFFICIAL';
  const [isCopiedKey, setIsCopiedKey] = useState(false);

  // Bug 8 fix: persist generated credentials to Firestore if they weren't saved yet
  // This ensures the key in the dashboard matches the DB and the approval email
  useEffect(() => {
    if (!userProfile?.uid) return;
    const needsKeyUpdate = !userProfile.securityKey || userProfile.securityKey !== resellerSecurityKey;
    const needsCodeUpdate = !userProfile.resellerCode || userProfile.resellerCode !== resellerWalletId;
    if (needsKeyUpdate || needsCodeUpdate) {
      updateUserProfileInFirestore(userProfile.uid, {
        securityKey: resellerSecurityKey,
        resellerCode: resellerWalletId
      }).catch(e => console.warn('[ResellerDashboard] Key persist note:', e));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.uid]);

  // One-time code that links the Telegram bot without a password (works for
  // Google sign-in accounts too). Valid for 10 minutes, once.
  const [tgLink, setTgLink] = useState(null);
  const [tgLinkBusy, setTgLinkBusy] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const handleMakeTelegramLink = async () => {
    setTgLinkBusy(true);
    try {
      const token = await getUserAuthToken();
      if (!token) return showToast('Please log in again.', 'error');
      const { ok, data } = await postServerApi('/api/reseller/telegram-link', {}, token);
      if (!ok || !data?.code) return showToast(data?.error || 'Could not make a link code. Please try again.', 'error');
      setTgLink(data);
    } catch (e) {
      showToast('Could not make a link code. Please try again.', 'error');
    } finally {
      setTgLinkBusy(false);
    }
  };
  const handleCopyLinkCmd = () => {
    navigator.clipboard.writeText(`/auth ${tgLink.code}`);
    setIsCopiedLink(true);
    showToast('Link command copied. Paste it in the bot chat.');
    setTimeout(() => setIsCopiedLink(false), 2000);
  };

  const handleCopySecurityKey = () => {
    navigator.clipboard.writeText(resellerSecurityKey);
    setIsCopiedKey(true);
    showToast('Unique Security Key copied to clipboard!');
    setTimeout(() => setIsCopiedKey(false), 2000);
  };

  const currentGame = GAMES_DATA.find(g => g.id === selectedGameId) || GAMES_DATA[0];
  const selectedPackage = currentGame?.packages?.find(p => p.id === selectedPackageId) || currentGame?.packages?.[0];

  // Wholesale price at the reseller's tier discount (3/5/8%), as the server
  // reports and charges it, with Hardened Anti-Tamper Verification
  const resellerStatus = useResellerStatus(userProfile);
  const resellerRate = resellerRateOf(resellerStatus);
  const resellerPct = Math.round(resellerRate * 100);
  const tierName = resellerStatus?.tier?.name || '';
  const untamperedPackagePrice = getVerifiedPackagePriceLkr(currentGame?.id, selectedPackage);
  const calculateWholesalePrice = (priceLkr) => resellerUnitPrice(priceLkr, resellerRate);
  const currentWholesalePrice = untamperedPackagePrice ? calculateWholesalePrice(untamperedPackagePrice) : 0;
  const currentSavings = untamperedPackagePrice ? (untamperedPackagePrice - currentWholesalePrice) : 0;

  // Filter orders fulfilled by this reseller
  const resellerOrders = sortOrdersNewestFirst((orders || []).filter(o => {
    if (!userProfile) return false;
    const matchIdentity = orderBelongsToUser(o, userProfile);
    const matchCode = userProfile.resellerCode && (o.resellerCode === userProfile.resellerCode || o.paymentMethod?.includes(userProfile.resellerCode));
    const matchReseller = o.isResellerOrder || o.paymentMethod?.toLowerCase().includes('reseller');
    return (matchIdentity || matchCode) && matchReseller;
  }));

  const completedResellerOrders = resellerOrders.filter(o => o.status === 'COMPLETED' || o.status === 'DELIVERED');
  const totalWholesaleTurnover = resellerOrders.reduce((sum, o) => sum + (o.priceLkr || 0), 0);
  // True saving is originalPrice - wholesalePrice (the tier % of the ORIGINAL
  // catalog price), not a % of the already-discounted wholesale price.
  // originalPriceLkr is set at dispatch time (below); orders that predate
  // that field were all at the old flat 5%.
  const totalWholesaleSavings = resellerOrders.reduce((sum, o) => {
    const wholesale = o.priceLkr || 0;
    const original = o.originalPriceLkr || (wholesale / 0.95);
    return sum + Math.round(Math.max(0, original - wholesale));
  }, 0);

  const handleCopyResellerId = () => {
    navigator.clipboard.writeText(resellerWalletId);
    setIsCopiedId(true);
    showToast('Reseller Wallet ID copied to clipboard!');
    setTimeout(() => setIsCopiedId(false), 2000);
  };

  // Look up the customer's in-game name, as the customer top-up page does.
  const handleCheckIgn = async () => {
    if (!customerUid.trim()) {
      showToast('Enter the Player ID first.', 'error');
      return;
    }
    if (currentGame.requiresServer && !customerZoneId.trim()) {
      showToast('Enter the Zone / Server ID first.', 'error');
      return;
    }
    setIsCheckingIgn(true);
    try {
      const result = await checkPlayerIGN(currentGame.id, customerUid.trim(), customerZoneId.trim());
      if (result?.success && result.ign) {
        setCustomerIgn(result.ign);
        setIgnVerified(true);
        showToast(`Player found: ${result.ign}`);
      } else {
        setIgnVerified(false);
        showToast(result?.message || 'Player name not found. Check the ID and try again.', 'error');
      }
    } catch (err) {
      setIgnVerified(false);
      showToast('Name check is not available right now. Please try again.', 'error');
    } finally {
      setIsCheckingIgn(false);
    }
  };

  const handleFulfillOrder = async (e) => {
    e.preventDefault();

    const isVoucher = currentGame?.fulfilment === 'voucher';
    if (!isVoucher && !customerUid.trim()) {
      showToast('Please enter the customer Player ID (UID)!', 'error');
      return;
    }

    if (!isVoucher && currentGame.requiresServer && !customerZoneId.trim()) {
      showToast('Please enter the customer Zone / Server ID!', 'error');
      return;
    }

    if (!selectedPackage) {
      showToast('Please select a top-up package!', 'error');
      return;
    }

    // Guard: block dispatch for games that don't have moongoldProductId configured.
    // Without it, dispatchMoongoldOrder falls back to the MLBB product ID (215570)
    // which causes a server-side price mismatch rejection on every order.
    if (currentGame?.resellerDisabled) {
      showToast(`⚠️ ${currentGame.name} is not yet available for reseller dispatch. Please contact admin to enable it.`, 'error');
      return;
    }

    if (!isVoucher && !ignVerified && !window.confirm('The player name has not been checked. Send this top-up anyway?')) {
      return;
    }

    if (!resellerRate) {
      showToast('Loading your reseller tier price. Please try again in a moment.', 'error');
      return;
    }

    setIsFulfilling(true);

    // Live Database check for Reseller Wallet Balance before dispatching order.
    // This is only a fast UX pre-check — the server (deductUserWallet inside
    // /api/moogold order/create_order below) is the real, atomic gate; it
    // will reject the order if the balance has actually run out even if this
    // check passes on stale data.
    let availBalanceLkr = userProfile?.walletBalance || 0;
    const keyToQuery = userProfile?.securityKey || userProfile?.resellerCode || userProfile?.uid || userProfile?.email;
    if (keyToQuery) {
      try {
        const freshProfile = await getResellerProfileByKeyAsync(keyToQuery);
        if (freshProfile && freshProfile.walletBalance !== undefined) {
          availBalanceLkr = freshProfile.walletBalance;
        }
      } catch (err) {
        console.error('[Reseller Web Dispatch] Live Firestore balance query warning:', err);
      }
    }

    if (availBalanceLkr < currentWholesalePrice) {
      setIsFulfilling(false);
      showToast(`Insufficient Reseller Wallet Balance! Required: Rs. ${currentWholesalePrice.toLocaleString()} LKR. Available: Rs. ${availBalanceLkr.toLocaleString()} LKR. Please top up your wallet first!`, 'error');
      openWalletModal('ezcash');
      return;
    }

    // Real dispatch through the same secure /api/moogold proxy customer
    // top-ups use — the server atomically deducts the reseller's wallet
    // (using the wholesale priceLkr below, verified server-side against the
    // catalog price with a reseller-specific tolerance) and actually sends
    // the order to MooGold. The previous version of this flow never called
    // MooGold at all and never persisted the wallet deduction — it just
    // faked a delay and marked the order COMPLETED locally.
    const orderPayload = {
      game: currentGame,
      gameId: currentGame.id,
      playerId: customerUid.trim(),
      zoneId: customerZoneId.trim(),
      package: selectedPackage,
      priceLkr: currentWholesalePrice,
      ign: customerIgn.trim() || 'Reseller Customer',
      userId: userProfile?.uid || '',
      userEmail: userProfile?.email || '',
      userProfile,
      isResellerOrder: true
    };

    let moongoldResult;
    try {
      moongoldResult = await dispatchMoongoldOrder(orderPayload);
    } catch (err) {
      moongoldResult = { success: false, status: 'FAILED', message: err.message || 'Gateway connection error' };
    }

    if (!moongoldResult.success) {
      setIsFulfilling(false);
      if (moongoldResult.blocked) return;
      const failedOrder = {
        id: 'ORD-RS-' + Math.floor(10000 + Math.random() * 90000),
        userId: userProfile?.uid || 'usr-reseller',
        userEmail: userProfile?.email || 'reseller@madstopup.com',
        gameId: currentGame.id,
        gameName: currentGame.name,
        packageName: selectedPackage.name,
        amount: selectedPackage.amount || 1,
        playerId: customerUid.trim(),
        zoneId: customerZoneId.trim(),
        ign: customerIgn.trim() || 'Reseller Customer',
        paymentMethod: '👑 Reseller Partner Wallet',
        priceLkr: currentWholesalePrice,
        originalPriceLkr: selectedPackage.priceLkr,
        status: 'FAILED',
        isResellerOrder: true,
        moongoldRef: moongoldResult.moongoldRef || 'GATEWAY_FAILED',
        failureReason: moongoldResult.message || 'Provider dispatch failed',
        createdAt: new Date().toISOString()
      };
      addOrder(failedOrder);
      showToast(`❌ Dispatch Failed: ${moongoldResult.message || 'Provider error'}.`, 'error');
      return;
    }

    // Sync local profile with the exact server-deducted balance (prevents
    // double deduction — never compute the new balance client-side here).
    if (moongoldResult?.newBalanceLkr !== undefined) {
      setUserProfile(prev => ({
        ...prev,
        walletBalance: moongoldResult.newBalanceLkr,
        walletUsdt: moongoldResult.newBalanceUsdt !== undefined ? moongoldResult.newBalanceUsdt : prev.walletUsdt
      }));
    }

    const newOrder = {
      id: 'ORD-RS-' + Math.floor(10000 + Math.random() * 90000),
      userId: userProfile?.uid || 'usr-reseller',
      userEmail: userProfile?.email || 'reseller@madstopup.com',
      gameId: currentGame.id,
      gameName: currentGame.name,
      packageName: selectedPackage.name,
      amount: selectedPackage.amount || 1,
      playerId: customerUid.trim(),
      zoneId: customerZoneId.trim(),
      ign: customerIgn.trim() || 'Reseller Customer',
      paymentMethod: '👑 Reseller Partner Wallet',
      priceLkr: currentWholesalePrice,
      originalPriceLkr: selectedPackage.priceLkr,
      status: 'COMPLETED',
      isResellerOrder: true,
      moongoldRef: moongoldResult.moongoldRef,
      partnerOrderId: moongoldResult.partnerOrderId || null,
      createdAt: new Date().toISOString()
    };

    addOrder(newOrder);

    setIsFulfilling(false);
    // PIN codes are shown in the receipt only; they never go into the saved order.
    setReceipt({
      orderId: newOrder.id,
      createdAt: newOrder.createdAt,
      gameName: currentGame.name,
      packageName: selectedPackage.name,
      playerId: customerUid.trim(),
      zoneId: customerZoneId.trim(),
      ign: customerIgn.trim(),
      moongoldRef: moongoldResult.moongoldRef || '',
      isVoucher,
      codes: isVoucher ? (moongoldResult.voucherCodes || []) : [],
      retailLkr: untamperedPackagePrice || selectedPackage.priceLkr,
      paidLkr: currentWholesalePrice,
      tierLabel: `${tierName} ${resellerPct}%`,
      balanceLkr: moongoldResult?.newBalanceLkr,
      storeName,
      resellerCode: resellerWalletId,
    });
    showToast(isVoucher ? `${selectedPackage.name} PIN ready!` : `Top-up sent to ${customerIgn.trim() || customerUid.trim()}!`);

    try {
      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#1677ff', '#5aa8ff', '#10b981', '#f59e0b'] });
      }
    } catch (err) {}

    setCustomerUid('');
    setCustomerZoneId('');
    setCustomerIgn('');
    setIgnVerified(false);
  };

  const handleSaveStoreProfile = async (e) => {
    e.preventDefault();
    setUserProfile(prev => ({
      ...prev,
      storeName,
      phone: whatsappContact,
      storeEmail
    }));
    // Bug 6: Persist to Firestore so settings survive page refresh
    if (userProfile?.uid) {
      try {
        await updateUserProfileInFirestore(userProfile.uid, { storeName, phone: whatsappContact, storeEmail });
      } catch (err) {
        console.warn('[ResellerDashboard] Store profile DB save note:', err);
      }
    }
    showToast('Reseller Store profile saved successfully!');
  };

  const panelHead = (icon, title, subtitle, right) => {
    const Icon = icon;
    return (
      <div className="rd-panel-head">
        <div className="rd-panel-title">
          <span className="rp-stat-ic rp-tone-blue"><Icon className="w-5 h-5" /></span>
          <div className="min-w-0">
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
        </div>
        {right}
      </div>
    );
  };

  const stepHead = (n, text) => (
    <div className="rd-step-head"><span className="rp-num rd-num-sm">{n}</span><span>{text}</span></div>
  );

  const tiersLowFirst = resellerStatus?.tiers ? [...resellerStatus.tiers].sort((a, b) => a.minSalesLkr - b.minSalesLkr) : [];
  const nextPct = resellerStatus?.next ? Math.min(100, Math.round((resellerStatus.salesLkr / resellerStatus.next.minSalesLkr) * 100)) : 100;
  const tierCls = resellerStatus?.tier ? `rd-tier-${resellerStatus.tier.id.toLowerCase()}` : 'rd-tier-bronze';

  const kpis = [
    { icon: Wallet, tone: 'green', label: 'Wallet balance', value: `Rs. ${(userProfile?.walletBalance || 0).toLocaleString()}`, sub: `${(userProfile?.walletUsdt || 0).toFixed(2)} USDT` },
    { icon: ShoppingBag, tone: 'blue', label: 'Orders done', value: completedResellerOrders.length.toLocaleString(), sub: 'Delivered instantly' },
    { icon: TrendingUp, tone: 'teal', label: 'Turnover', value: `Rs. ${totalWholesaleTurnover.toLocaleString()}`, sub: 'Paid at your prices' },
    { icon: Award, tone: 'gold', label: 'Saved', value: `Rs. ${totalWholesaleSavings.toLocaleString()}`, sub: 'Versus retail prices' },
  ];

  const tabs = [
    { id: 'dispatch', label: 'Top up', icon: Zap },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, count: resellerOrders.length },
    { id: 'pricing', label: 'Price list', icon: Award },
    { id: 'bot', label: 'Telegram bot', icon: Send },
    { id: 'settings', label: 'Store', icon: Settings }
  ];

  return (
    <div className="rp rd">

      {/* TOP BAR */}
      <div className="rd-top">
        <button type="button" onClick={closeResellerDashboard} className="rp-back">
          <ArrowLeft className="w-4 h-4" />
          <span>Store</span>
        </button>
        <div className="rd-top-title">
          <h1>{storeName}</h1>
          <span className={`rd-tier-pill ${tierCls}`}><Crown className="w-3.5 h-3.5" /> {tierName ? `${tierName} partner` : 'Partner'}</span>
        </div>
        <button type="button" onClick={() => openWalletModal('ezcash')} className="rp-btn rp-btn-sm">
          <Wallet className="w-4 h-4" /> <span>Recharge</span>
        </button>
      </div>

      {/* HERO: tier + credentials */}
      <div className="rd-hero">
        <section className={`rd-tier-card ${tierCls}`} aria-label="Your reseller tier">
          <div className="rd-tier-top">
            <span className="rd-tier-badge"><Crown className="w-6 h-6" /></span>
            <div className="min-w-0">
              <span className="rp-pill rp-pill-light">Your tier</span>
              <h2>{resellerStatus?.approved ? `${tierName} · ${resellerPct}% off` : 'Loading your tier…'}</h2>
              <p>
                {resellerStatus?.next
                  ? <>Sell Rs. {resellerStatus.next.remainingLkr.toLocaleString()} more to reach {resellerStatus.next.name} ({Math.round(resellerStatus.next.rate * 100)}% off).</>
                  : resellerStatus?.approved ? <>You have the top discount on every game.</> : <>Your discount applies to every order.</>}
              </p>
            </div>
          </div>
          {resellerStatus?.approved && (
            <>
              <div className="rd-tier-bar" aria-label="Progress to next tier"><span style={{ width: `${nextPct}%` }} /></div>
              <div className="rd-tier-steps">
                {tiersLowFirst.map(t => (
                  <div key={t.id} className={`rd-tier-step ${resellerStatus.tier.id === t.id ? 'is-current' : ''} ${resellerStatus.salesLkr >= t.minSalesLkr || resellerStatus.tier.id === t.id ? 'is-reached' : ''}`}>
                    <strong>{t.name} {Math.round(t.rate * 100)}%</strong>
                    <span>{t.minSalesLkr ? `Rs. ${(t.minSalesLkr / 1000).toLocaleString()}k+` : 'Start'}</span>
                  </div>
                ))}
              </div>
              <p className="rd-tier-foot">Total sales: Rs. {resellerStatus.salesLkr.toLocaleString()}</p>
            </>
          )}
        </section>

        <section className="rd-cred" aria-label="Reseller credentials">
          <div className="rd-cred-row">
            <span>Reseller code</span>
            <div className="rd-copy">
              <code>{resellerWalletId}</code>
              <button type="button" onClick={handleCopyResellerId} aria-label="Copy reseller code">
                {isCopiedId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="rd-cred-row">
            <span>Telegram security key</span>
            <div className="rd-copy">
              <code>{resellerSecurityKey}</code>
              <button type="button" onClick={handleCopySecurityKey} aria-label="Copy security key">
                {isCopiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="rd-cred-note"><ShieldCheck className="w-4 h-4" /> Keep your key private. To link the Telegram bot, open the Telegram bot tab and tap "Link Telegram". The key alone can't link it.</p>
        </section>
      </div>

      {/* KPIs */}
      <div className="rd-kpis">
        {kpis.map(({ icon: Icon, tone, label, value, sub }) => (
          <div key={label} className="rd-kpi">
            <span className={`rp-stat-ic rp-tone-${tone}`}><Icon className="w-5 h-5" /></span>
            <span className="rd-kpi-label">{label}</span>
            <strong className="rd-kpi-value">{value}</strong>
            <span className="rd-kpi-sub">{sub}</span>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="rd-tabs" role="tablist">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`rd-tab ${activeTab === id ? 'is-on' : ''}`}>
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {count !== undefined && <span className="rd-tab-count">{count}</span>}
          </button>
        ))}
      </div>

      {/* TAB 1: TOP UP */}
      {activeTab === 'dispatch' && (
        <div className="rp-card rd-panel">
          {panelHead(Zap, 'Top up a customer', 'Pick a game, enter the player ID and send it from your wallet.',
            <span className="rd-tag">{resellerPct}% off applied</span>
          )}

          <form onSubmit={handleFulfillOrder} className="rd-form">
            <div>
              {stepHead(1, 'Game')}
              <div className="rd-games">
                {(gamesCatalog || GAMES_DATA).map((game) => {
                  const on = selectedGameId === game.id;
                  return (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => { setSelectedGameId(game.id); setSelectedPackageId(game.packages[0]?.id || ''); setIgnVerified(false); }}
                      className={`rd-game ${on ? 'is-on' : ''}`}
                      aria-pressed={on}
                    >
                      <span className="rd-game-img">
                        {game.logo || game.banner || game.image ? (
                          <img
                            src={game.logo || game.banner || game.image}
                            alt=""
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/mads-logo.jpg'; }}
                          />
                        ) : <span>{game.currencyIcon || '🎮'}</span>}
                      </span>
                      <span className="rd-game-text">
                        <strong>{game.name}</strong>
                        <span>{game.currencyName}</span>
                      </span>
                      {on && <span className="rd-check"><Check className="w-3 h-3" strokeWidth={3} /></span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              {stepHead(2, 'Customer')}
              <div className="rp-grid rd-grid-3">
                <label className="rp-field">
                  <span>{currentGame.fulfilment === 'voucher' ? 'Customer name / note (optional)' : `${currentGame.moongoldIdField === 'Riot Username' ? currentGame.idLabel || 'Player ID' : 'Player ID'} *`}</span>
                  <input
                    type="text"
                    required={currentGame.fulfilment !== 'voucher'}
                    placeholder={currentGame.idPlaceholder || 'e.g. 248901234'}
                    value={customerUid}
                    onChange={(e) => { setCustomerUid(e.target.value); setIgnVerified(false); }}
                    className="rp-input rd-mono"
                  />
                </label>
                {currentGame.requiresServer && (
                  <label className="rp-field">
                    <span>Zone / Server ID *</span>
                    <input type="text" required placeholder="e.g. 9821" value={customerZoneId} onChange={(e) => { setCustomerZoneId(e.target.value); setIgnVerified(false); }} className="rp-input rd-mono" />
                  </label>
                )}
                {currentGame.fulfilment === 'voucher' ? null : (
                  <div className="rp-field">
                    <span>Player name</span>
                    <div className="rd-ign">
                      <input
                        type="text"
                        placeholder="Check to fill it in"
                        value={customerIgn}
                        onChange={(e) => { setCustomerIgn(e.target.value); setIgnVerified(false); }}
                        className={`rp-input ${ignVerified ? 'is-verified' : ''}`}
                        aria-label="Player name"
                      />
                      <button type="button" className="rp-btn rp-btn-sm rd-ign-btn" onClick={handleCheckIgn} disabled={isCheckingIgn}>
                        {isCheckingIgn ? <RefreshCw className="w-4 h-4 rd-spin" /> : <Search className="w-4 h-4" />}
                        <span>{isCheckingIgn ? 'Checking' : 'Check'}</span>
                      </button>
                    </div>
                    {ignVerified && <span className="rd-ign-ok"><CheckCircle2 className="w-3.5 h-3.5" /> Verified player</span>}
                  </div>
                )}
              </div>
            </div>

            <div>
              {stepHead(3, `${currentGame.currencyName} package`)}
              <div className="rd-pkgs">
                {currentGame.packages.map((pkg) => {
                  const isSelected = selectedPackageId === pkg.id || (!selectedPackageId && pkg === currentGame.packages[0]);
                  const wholesalePrice = calculateWholesalePrice(pkg.priceLkr);
                  return (
                    <button key={pkg.id} type="button" onClick={() => setSelectedPackageId(pkg.id)} className={`rd-pkg ${isSelected ? 'is-on' : ''}`} aria-pressed={isSelected}>
                      {isSelected && <span className="rd-check"><Check className="w-3 h-3" strokeWidth={3} /></span>}
                      <strong>{pkg.name}</strong>
                      <span className="rd-pkg-bonus">{pkg.bonus || 'Instant delivery'}</span>
                      <span className="rd-pkg-price">Rs. {wholesalePrice.toLocaleString()}</span>
                      <span className="rd-pkg-old">Rs. {pkg.priceLkr.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rd-summary">
              <div>
                <span className="rd-kpi-label">Charged to your wallet</span>
                <div className="rd-summary-price">
                  <strong>Rs. {currentWholesalePrice.toLocaleString()}</strong>
                  <span className="rd-tag rd-tag-green">You save Rs. {currentSavings.toLocaleString()}</span>
                </div>
              </div>
              <button type="submit" disabled={isFulfilling} className="rp-btn">
                <Zap className="w-4 h-4" /> {isFulfilling ? 'Sending top-up…' : 'Send top-up'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* TAB 2: ORDERS */}
      {activeTab === 'orders' && (
        <div className="rp-card rd-panel">
          {panelHead(ShoppingBag, 'Order history', 'Every top-up sent from the website or the Telegram bot.',
            <div className="rd-filters">
              <select value={orderChannelFilter} onChange={(e) => setOrderChannelFilter(e.target.value)} className="rp-input">
                <option value="ALL">All channels</option>
                <option value="TELEGRAM">Telegram bot</option>
                <option value="WEB">Website</option>
              </select>
              <div className="rp-input-wrap">
                <Search className="w-4 h-4" />
                <input type="text" placeholder="Order ID, player ID or game" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="rp-input" />
              </div>
            </div>
          )}

          <div className="rd-orders">
            {(() => {
              const isTg = (o) => Boolean(o.viaTelegramBot || (o.id && String(o.id).startsWith('ORD-TG-')) || o.channel === 'Telegram Bot' || (o.paymentMethod && String(o.paymentMethod).toLowerCase().includes('telegram')));
              const filteredOrders = resellerOrders.filter(o => {
                if (!o) return false;
                const search = (orderSearch || '').toLowerCase();
                const matchesSearch = [o.id, o.playerId, o.gameName].some(v => String(v || '').toLowerCase().includes(search));
                const tg = isTg(o);
                const matchesChannel = orderChannelFilter === 'ALL' || (orderChannelFilter === 'TELEGRAM' && tg) || (orderChannelFilter === 'WEB' && !tg);
                return matchesSearch && matchesChannel;
              });

              if (filteredOrders.length === 0) {
                return (
                  <div className="rd-empty">
                    <span className="rp-stat-ic rp-tone-blue"><ShoppingBag className="w-5 h-5" /></span>
                    <strong>{orderSearch || orderChannelFilter !== 'ALL' ? 'No orders match' : 'No orders yet'}</strong>
                    <p>{orderSearch || orderChannelFilter !== 'ALL' ? 'Try another search or channel.' : 'Top-ups you send will show up here.'}</p>
                  </div>
                );
              }

              return filteredOrders.map((ord) => {
                const tg = isTg(ord);
                const done = ord.status === 'COMPLETED';
                return (
                  <div key={ord.id} className="rd-order">
                    <span className={`rp-stat-ic ${tg ? 'rp-tone-sky' : 'rp-tone-blue'}`}>{tg ? <Send className="w-5 h-5" /> : <Globe className="w-5 h-5" />}</span>
                    <div className="rd-order-main">
                      <strong>{ord.gameName} · {ord.packageName}</strong>
                      <span>
                        Player <b className="rd-mono">{ord.playerId}</b>{ord.zoneId ? ` (${ord.zoneId})` : ''}
                        {ord.ign && ord.ign !== 'Reseller Customer' ? ` · ${ord.ign}` : ''} · {tg ? 'Telegram' : 'Website'}
                      </span>
                      <span className="rd-order-id">{ord.id} · {new Date(ord.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="rd-order-side">
                      <strong>Rs. {(ord.priceLkr || 0).toLocaleString()}</strong>
                      <span className={`rd-status ${done ? 'is-done' : 'is-wait'}`}>{ord.status || 'COMPLETED'}</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* TAB 3: PRICE LIST */}
      {activeTab === 'pricing' && (
        <div className="rp-card rd-panel">
          {panelHead(Award, 'Your price list', `Retail prices and your ${tierName ? `${tierName} ` : ''}${resellerPct}% prices, with your profit on each.`)}
          <div className="rd-price-games">
            {GAMES_DATA.map((game) => (
              <div key={game.id} className="rd-price-game">
                <div className="rd-price-head">
                  <span className="rd-game-img"><img src={game.image} alt="" /></span>
                  <div><strong>{game.name}</strong><span>{game.packages.length} packages</span></div>
                </div>
                <div className="rd-price-rows">
                  {game.packages.map((pkg) => {
                    const wholesalePrice = calculateWholesalePrice(pkg.priceLkr);
                    return (
                      <div key={pkg.id} className="rd-price-row">
                        <div className="min-w-0"><strong>{pkg.name}</strong><span>Retail Rs. {pkg.priceLkr.toLocaleString()}</span></div>
                        <div className="rd-price-right"><strong>Rs. {wholesalePrice.toLocaleString()}</strong><span>+Rs. {(pkg.priceLkr - wholesalePrice).toLocaleString()}</span></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TELEGRAM BOT */}
      {activeTab === 'bot' && (
        <div className="rp-card rd-panel">
          {panelHead(Send, 'Telegram bot', 'Link the bot once, then top up from any Telegram chat, 24/7.',
            <a href="https://t.me/mads_shell_topup_bot" target="_blank" rel="noopener noreferrer" className="rp-btn rp-btn-sm">
              <Bot className="w-4 h-4" /> Open @mads_shell_topup_bot
            </a>
          )}
          <div className="rd-bot">
            <div className="rd-bot-step">
              {stepHead(1, 'Link your wallet')}
              {!tgLink ? (
                <>
                  <p>Tap the button to get a one-time link. It opens the bot and links this wallet. Works for Google sign-in too.</p>
                  <button type="button" onClick={handleMakeTelegramLink} disabled={tgLinkBusy} className="rp-btn rp-btn-sm">
                    <Send className="w-4 h-4" /> {tgLinkBusy ? 'Making link…' : 'Link Telegram'}
                  </button>
                </>
              ) : (
                <>
                  <p>Open the bot and press Start. The link works once and lasts 10 minutes.</p>
                  <div className="rd-link-actions">
                    <a href={tgLink.link} target="_blank" rel="noopener noreferrer" className="rp-btn rp-btn-sm">
                      <Send className="w-4 h-4" /> Open Telegram and link
                    </a>
                    <button type="button" onClick={handleMakeTelegramLink} disabled={tgLinkBusy} className="rp-btn rp-btn-sm rp-btn-ghost">
                      <RefreshCw className="w-4 h-4" /> New link
                    </button>
                  </div>
                  <p className="rd-link-or">Bot on another device? Send this message to it:</p>
                  <div className="rd-copy rd-copy-lg">
                    <code>/auth {tgLink.code}</code>
                    <button type="button" onClick={handleCopyLinkCmd} aria-label="Copy link command">
                      {isCopiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              )}
              <p className="rd-link-or">Password account? You can also send <code>/auth {resellerSecurityKey} YourWebsitePassword</code>.</p>
            </div>
            <div className="rd-bot-step">
              {stepHead(2, 'Send top-ups')}
              <p>The bot checks the player name and charges your tier price.</p>
              <div className="rd-cmds">
                {[
                  ['/topup ml 84218845 2168 86', 'Mobile Legends, 86 diamonds'],
                  ['/topup ff 248901234 100', 'Free Fire, 100 diamonds'],
                  ['/topup pubg 512345678 60', 'PUBG Mobile, 60 UC'],
                  ['/ml 84218845 2168', 'Check an MLBB name only'],
                  ['/packages ff', 'Your prices for a game'],
                ].map(([cmd, desc]) => (
                  <div key={cmd} className="rd-cmd"><code>{cmd}</code><span>{desc}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: STORE */}
      {activeTab === 'settings' && (
        <div className="rp-card rd-panel rd-narrow">
          {panelHead(Settings, 'Store profile', 'Your store name and contact details.')}
          <form onSubmit={handleSaveStoreProfile} className="rp-form">
            <label className="rp-field">
              <span>Store name</span>
              <div className="rp-input-wrap"><Store className="w-4 h-4" /><input type="text" required value={storeName} onChange={(e) => setStoreName(e.target.value)} className="rp-input" /></div>
            </label>
            <label className="rp-field">
              <span>WhatsApp number</span>
              <div className="rp-input-wrap"><Smartphone className="w-4 h-4" /><input type="tel" required value={whatsappContact} onChange={(e) => setWhatsappContact(e.target.value)} className="rp-input" /></div>
            </label>
            <label className="rp-field">
              <span>Store email</span>
              <div className="rp-input-wrap"><Mail className="w-4 h-4" /><input type="email" required value={storeEmail} onChange={(e) => setStoreEmail(e.target.value)} className="rp-input" /></div>
            </label>
            <button type="submit" className="rp-btn rp-btn-block">Save store profile</button>
          </form>
        </div>
      )}

      <ResellerReceipt receipt={receipt} onClose={() => setReceipt(null)} showToast={showToast} />
    </div>
  );
};
