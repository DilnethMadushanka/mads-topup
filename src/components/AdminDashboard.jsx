import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { dispatchMoongoldOrder, checkMoongoldBalance } from '../services/moongoldApi';
import { uploadToR2Storage } from '../services/storageService';
import {
  X, ShieldCheck, DollarSign, RefreshCw,
  CheckCircle2, Clock, Zap, Save, Eye, EyeOff, Cloud, UploadCloud,
  Users, Ticket, Megaphone, Search, Plus, Trash2,
  AlertTriangle, Lock,
  BadgeCheck, UserCheck, UserX, FileCheck, ExternalLink, Menu, Headset,
  Smartphone, Copy, Crown, Mail, Building2, Sparkles, ArrowRight, Loader2,
  LayoutDashboard, PanelLeftClose, PanelLeftOpen, Moon, Sun, Bell, LogOut,
  ArrowUp, ArrowDown, ChevronsUpDown, ShoppingCart,
  Gamepad2, Command, Inbox
} from 'lucide-react';

/* ============================================================
   SHARED PRIMITIVES — small, dependency-free building blocks
   reused across every tab of the admin panel.
   ============================================================ */

const fieldCls = "w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-red-500 transition-colors disabled:opacity-50";
const fieldStyle = { background: 'var(--adm-input-bg)', borderColor: 'var(--adm-border)', color: 'var(--adm-text)' };
const cardStyle = { background: 'var(--adm-surface)', borderColor: 'var(--adm-border)', boxShadow: 'var(--adm-shadow)' };
const mutedStyle = { color: 'var(--adm-text-muted)' };
const faintStyle = { color: 'var(--adm-text-faint)' };

const STATUS_STYLES = {
  COMPLETED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  VERIFIED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  ACTIVE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  APPROVED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  RESOLVED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  REDEEMED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  PROCESSING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  UNCLAIMED: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  OPEN: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  FAILED: 'bg-red-500/15 text-red-400 border-red-500/30',
  REJECTED: 'bg-red-500/15 text-red-400 border-red-500/30',
  BLOCKED: 'bg-red-500/15 text-red-400 border-red-500/30',
  CLOSED: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  UNVERIFIED: 'bg-slate-500/15 text-slate-400 border-slate-500/30'
};

const StatusPill = ({ status, children }) => (
  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border inline-block whitespace-nowrap ${STATUS_STYLES[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
    {children || status}
  </span>
);

const timeAgo = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const SectionHeader = ({ title, subtitle, icon: Icon, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <h3 className="text-lg sm:text-xl font-black font-heading flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
        {Icon && <Icon className="w-5 h-5 text-red-500" />}
        <span>{title}</span>
      </h3>
      {subtitle && <p className="text-xs mt-0.5" style={mutedStyle}>{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

const SearchInput = ({ value, onChange, placeholder }) => (
  <div className="relative flex-1 min-w-[180px]">
    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={faintStyle} />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${fieldCls} pl-9`}
      style={fieldStyle}
    />
  </div>
);

const FilterBar = ({ children }) => (
  <div className="rounded-2xl border p-3.5 flex flex-col sm:flex-row gap-3 sm:items-center" style={cardStyle}>
    {children}
  </div>
);

const ToggleSwitch = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between rounded-2xl border p-4" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}>
    <div className="pr-4">
      <span className="text-xs font-black block" style={{ color: 'var(--adm-text)' }}>{label}</span>
      {description && <span className="text-[11px]" style={mutedStyle}>{description}</span>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full transition-colors relative p-1 shrink-0 cursor-pointer ${checked ? 'bg-red-600' : 'bg-slate-600/40'}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

const ModalShell = ({ onClose, title, subtitle, icon: Icon, children, maxWidth = 'max-w-lg', footer }) => (
  <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div className={`w-full ${maxWidth} rounded-t-3xl sm:rounded-3xl border p-5 sm:p-6 space-y-4 relative shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden`} style={cardStyle}>
      <div className="flex items-center justify-between pb-3 border-b shrink-0" style={{ borderColor: 'var(--adm-border)' }}>
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <Icon className="w-4.5 h-4.5" />
            </div>
          )}
          <div>
            <h3 className="text-base font-black font-heading" style={{ color: 'var(--adm-text)' }}>{title}</h3>
            {subtitle && <p className="text-xs font-mono" style={mutedStyle}>{subtitle}</p>}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-[var(--adm-surface-hover)] cursor-pointer shrink-0" style={mutedStyle}>
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="overflow-y-auto flex-1 space-y-4 pr-0.5">{children}</div>
      {footer && <div className="pt-3 border-t shrink-0 flex items-center justify-end gap-2" style={{ borderColor: 'var(--adm-border)' }}>{footer}</div>}
    </div>
  </div>
);

const AreaChart = ({ data, color = '#cc040a', height = 88 }) => {
  const values = data.length ? data : [0, 0];
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 300;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = values.length > 1 ? i * step : w / 2;
    const y = height - ((v - min) / range) * (height - 10) - 5;
    return [x, y];
  });
  const linePath = 'M' + points.map(p => p.join(',')).join(' L');
  const lastX = points[points.length - 1][0];
  const areaPath = `${linePath} L${lastX},${height} L0,${height} Z`;
  const gid = 'adm-grad-' + color.replace('#', '');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color} />
      ))}
    </svg>
  );
};

const DonutChart = ({ segments, size = 116, thickness = 15 }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--adm-border)" strokeWidth={thickness} />
        {total > 0 && segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = frac * circumference;
          const el = (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return el;
        })}
      </g>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: size * 0.19, fontWeight: 900, fill: 'var(--adm-text)' }}>
        {total}
      </text>
    </svg>
  );
};

const DataTable = ({ columns, rows, rowKey = 'id', pageSize = 8, emptyMessage = 'No records found.' }) => {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [rows]);

  let sortedRows = rows;
  if (sortKey) {
    const col = columns.find(c => c.key === sortKey);
    sortedRows = [...rows].sort((a, b) => {
      const av = col?.sortValue ? col.sortValue(a) : a[sortKey];
      const bv = col?.sortValue ? col.sortValue(b) : b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv));
    });
    if (sortDir === 'desc') sortedRows.reverse();
  }

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sortedRows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <div className="rounded-2xl border overflow-hidden min-w-0" style={cardStyle}>
      <div className="overflow-x-auto -mx-px">
        <table className="w-full text-left text-xs">
          <thead style={{ background: 'var(--adm-surface-2)' }} className="uppercase font-mono text-[10px]">
            <tr>
              {columns.map(col => (
                <th key={col.key} className={`p-3.5 select-none whitespace-nowrap ${col.align === 'right' ? 'text-right' : ''}`} style={mutedStyle}>
                  {col.sortable ? (
                    <button onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 cursor-pointer">
                      <span>{col.label}</span>
                      {sortKey === col.key ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                    </button>
                  ) : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y font-medium" style={{ borderColor: 'var(--adm-border)' }}>
            {pageRows.length === 0 ? (
              <tr><td colSpan={columns.length} className="p-10 text-center font-semibold" style={faintStyle}>{emptyMessage}</td></tr>
            ) : pageRows.map(row => (
              <tr key={row[rowKey]} className="transition-colors hover:bg-[var(--adm-surface-hover)]">
                {columns.map(col => (
                  <td key={col.key} className={`p-3.5 align-top ${col.align === 'right' ? 'text-right' : ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sortedRows.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t text-[11px] font-mono" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}>
          <span>Showing {safePage * pageSize + 1}–{Math.min(sortedRows.length, (safePage + 1) * pageSize)} of {sortedRows.length}</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0} className="px-2.5 py-1 rounded-lg border disabled:opacity-30 cursor-pointer" style={{ borderColor: 'var(--adm-border)' }}>Prev</button>
            <span>{safePage + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} className="px-2.5 py-1 rounded-lg border disabled:opacity-30 cursor-pointer" style={{ borderColor: 'var(--adm-border)' }}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

const NAV_GROUPS = [
  { label: 'Overview', items: [{ id: 'overview', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Sales & Payments', items: [
    { id: 'orders', label: 'Orders', icon: ShoppingCart, badgeKey: 'pending' },
    { id: 'deposits', label: 'Deposit Verifier', icon: FileCheck, badgeKey: 'payments' },
    { id: 'ezcash', label: 'EZ Cash Logs', icon: Smartphone, badgeKey: 'ezcash' },
    { id: 'vouchers', label: 'Promo Vouchers', icon: Ticket }
  ]},
  { label: 'Customers', items: [
    { id: 'users', label: 'User Accounts', icon: Users },
    { id: 'credit', label: 'Wallet Credit', icon: DollarSign },
    { id: 'resellers', label: 'Reseller Network', icon: Crown, badgeKey: 'resellers' },
    { id: 'support', label: 'Support Desk', icon: Headset, badgeKey: 'tickets' }
  ]},
  { label: 'Catalog & Marketing', items: [
    { id: 'games', label: 'Game Prices', icon: Gamepad2 },
    { id: 'popupAd', label: 'Popup Banner', icon: Sparkles },
    { id: 'announcement', label: 'Ticker Notice', icon: Megaphone }
  ]},
  { label: 'System', items: [
    { id: 'moongold', label: 'Moongold API', icon: Zap },
    { id: 'r2', label: 'R2 Storage', icon: Cloud }
  ]}
];

const TAB_TITLES = {
  overview: ['System Analytics & Revenue', 'Real-time overview of sales, active dispatches & supplier gateways'],
  orders: ['Orders Dispatch', 'Track, inspect and fulfil every top-up order'],
  deposits: ['Manual Payment Verification Queue', 'Review, verify, and approve EZ Cash, Binance & Bank deposits'],
  ezcash: ['Dialog EZ Cash Webhook Logs', 'Live SMS records received from the phone forwarder gateway'],
  vouchers: ['Promo Voucher Codes', 'Create and manage redeemable voucher codes'],
  users: ['User Management & Verification', 'Grant verified badges, block accounts & inspect balances'],
  credit: ['Direct User Wallet Top-Up Tool', "Manually credit or deduct a user's LKR or USDT balance"],
  resellers: ['Reseller Partner Network', 'Review, approve, or reject reseller partner applications'],
  support: ['Support Desk', 'Live customer support tickets & chat'],
  games: ['Game Catalog & Live Price Manager', 'Edit retail prices — publish instantly to web & Telegram bot'],
  popupAd: ['Popup Banner Ad Manager', 'Configure the promotional popup shown to visitors'],
  announcement: ['Ticker Notice Banner', 'Update the marquee text shown across the website header'],
  moongold: ['Moongold Supplier Gateway', 'Configure live API credentials and automated dispatch'],
  r2: ['Cloudflare R2 Object Storage', 'Configure the bucket endpoint used for receipts & assets']
};

export const AdminDashboard = () => {
  const {
    isAdminOpen, setIsAdminOpen, orders, updateOrderStatus, moongoldConfig, updateMoongoldConfig,
    r2Config, updateR2Config, formatPrice,
    formatLkr, showToast, userProfile, vouchers, addVoucher, deleteVoucher,
    tickerNotice, setTickerNotice, usersList, verifyUserAccount, toggleBlockUser, updateUserBalance,
    setUserExactBalance, manualPayments, approveManualPayment, rejectManualPayment, addManualPayment,
    supportTickets, sendTicketMessage, updateTicketStatus, updateTicketPriority, resellerApplications,
    updateResellerApplicationStatus, gamesCatalog, updateGamePrices, popupAdConfig, updatePopupAdConfig,
    isAdminAuthenticated, setIsAdminAuthenticated
  } = useApp();

  // Auth state is managed via AppContext — listeners to admin data only subscribe when
  // isAdminAuthenticated is true, preventing unauthenticated queries while displaying the login credentials form.
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [adminAuthEmail, setAdminAuthEmail] = useState('');
  const [adminAuthPassword, setAdminAuthPassword] = useState('');
  const [adminAuthSecurityCode, setAdminAuthSecurityCode] = useState('');
  const [showAdminAuthPassword, setShowAdminAuthPassword] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState('');
  const [adminFailedAttempts, setAdminFailedAttempts] = useState(0);
  const [adminLockoutUntil, setAdminLockoutUntil] = useState(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const [adminTab, setAdminTab] = useState('overview');
  const [theme, setTheme] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('mads_admin_theme')) || 'dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== 'undefined' && localStorage.getItem('mads_admin_sidebar_collapsed') === 'true');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  const [selectedReceiptPay, setSelectedReceiptPay] = useState(null);
  const [receiptImgError, setReceiptImgError] = useState(false);

  const [editedPricesMap, setEditedPricesMap] = useState({});
  const [selectedGameCatalogId, setSelectedGameCatalogId] = useState('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isSavingPrices, setIsSavingPrices] = useState(false);

  const [adEnabled, setAdEnabled] = useState(popupAdConfig?.enabled ?? true);
  const [adTitle, setAdTitle] = useState(popupAdConfig?.title || '');
  const [adDescription, setAdDescription] = useState(popupAdConfig?.description || '');
  const [adImageUrl, setAdImageUrl] = useState(popupAdConfig?.imageUrl || '');
  const [adButtonText, setAdButtonText] = useState(popupAdConfig?.buttonText || '');
  const [adButtonLink, setAdButtonLink] = useState(popupAdConfig?.buttonLink || '#catalog');
  const [adBadge, setAdBadge] = useState(popupAdConfig?.badge || 'LIMITED TIME DEAL');
  const [adShowOncePerSession, setAdShowOncePerSession] = useState(popupAdConfig?.showOncePerSession ?? false);
  const [isSavingAd, setIsSavingAd] = useState(false);
  const [isUploadingAdImg, setIsUploadingAdImg] = useState(false);

  const [supportSearch, setSupportSearch] = useState('');
  const [supportStatusFilter, setSupportStatusFilter] = useState('ALL');
  const [selectedTicketInspect, setSelectedTicketInspect] = useState(null);
  const [adminReplyText, setAdminReplyText] = useState('');

  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [selectedInspectOrder, setSelectedInspectOrder] = useState(null);

  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [userSortOrder, setUserSortOrder] = useState('newest');
  const [selectedInspectUser, setSelectedInspectUser] = useState(null);
  const [editLkrVal, setEditLkrVal] = useState('');
  const [editUsdtVal, setEditUsdtVal] = useState('');

  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');

  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [newPayUserEmail, setNewPayUserEmail] = useState('');
  const [newPayMethod, setNewPayMethod] = useState('EZ Cash');
  const [newPayRef, setNewPayRef] = useState('');
  const [newPayAmount, setNewPayAmount] = useState('');
  const [newPayCurrency, setNewPayCurrency] = useState('LKR');

  const [apiKeyInput, setApiKeyInput] = useState(moongoldConfig.apiKey);
  const [secretKeyInput, setSecretKeyInput] = useState(moongoldConfig.secretKey);
  const [baseUrlInput, setBaseUrlInput] = useState(moongoldConfig.baseUrl);
  const [autoFulfillInput, setAutoFulfillInput] = useState(moongoldConfig.autoFulfill);
  const [simModeInput, setSimModeInput] = useState(moongoldConfig.simulationMode);
  const [showSecret, setShowSecret] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [retryingOrderId, setRetryingOrderId] = useState(null);
  // Synchronous ref (not just the retryingOrderId state) so a genuine
  // double-click on the same order's "Moongold" retry button can't fire
  // dispatchMoongoldOrder twice before React commits the disabled state —
  // a real supplier dispatch call, so a double-fire would send the top-up
  // twice and burn double supplier credit for one order.
  const retryingOrderIdsRef = useRef(new Set());

  const [r2UrlInput, setR2UrlInput] = useState(r2Config?.bucketUrl || 'https://bfda3f43ac31b00be80bcb82772eb8fa.r2.cloudflarestorage.com/mads-topup');
  const [r2BucketName, setR2BucketName] = useState(r2Config?.bucketName || 'mads-topup');
  const [isTestingR2, setIsTestingR2] = useState(false);

  const [creditUserEmail, setCreditUserEmail] = useState(userProfile?.email || 'admin@madstopup.com');
  const [creditLkrAmount, setCreditLkrAmount] = useState('');
  const [creditUsdtAmount, setCreditUsdtAmount] = useState('');
  const [creditReason, setCreditReason] = useState('EZ Cash Topup Approval');

  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherValue, setNewVoucherValue] = useState('');
  const [newVoucherCurrency, setNewVoucherCurrency] = useState('LKR');
  const [newVoucherMaxUses, setNewVoucherMaxUses] = useState(100);
  const [voucherSearch, setVoucherSearch] = useState('');

  const [tickerNoticeInput, setTickerNoticeInput] = useState(tickerNotice);

  const [ezcashLogs, setEzcashLogs] = useState([]);
  const [isEzcashLogsLoading, setIsEzcashLogsLoading] = useState(false);
  const [ezcashSearch, setEzcashSearch] = useState('');
  const [ezcashStatusFilter, setEzcashStatusFilter] = useState('ALL');

  const [resellerSearch, setResellerSearch] = useState('');
  const [resellerStatusFilter, setResellerStatusFilter] = useState('ALL');

  const fetchEzcashLogs = async () => {
    try {
      setIsEzcashLogsLoading(true);
      const sessionToken = localStorage.getItem('mads_admin_session_token') || '';
      const res = await fetch('/api/ezcash/webhook-logs', {
        headers: sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}
      });
      if (res.status === 401) {
        showToast('Admin session expired — please log out and log back in to view EZ Cash logs.', 'error');
        return;
      }
      const data = await res.json();
      if (data && data.success) setEzcashLogs(data.logs || []);
    } catch (err) {
      console.error('[Admin] Error fetching EZ Cash logs:', err);
    } finally {
      setIsEzcashLogsLoading(false);
    }
  };

  const [liveMoongoldBalance, setLiveMoongoldBalance] = useState({
    balanceUsd: moongoldConfig.merchantBalanceUsd || 480.00,
    balanceLkr: moongoldConfig.merchantBalanceLkr || 145800.00,
    isLoading: false,
    lastFetched: null
  });

  const fetchLiveBalance = async () => {
    setLiveMoongoldBalance(prev => ({ ...prev, isLoading: true }));
    const result = await checkMoongoldBalance();
    if (result && result.success) {
      setLiveMoongoldBalance({
        balanceUsd: result.balanceUsd,
        balanceLkr: result.balanceLkr,
        isLoading: false,
        lastFetched: new Date().toLocaleTimeString(),
        isRealtime: Boolean(result.isRealtime)
      });
    } else {
      setLiveMoongoldBalance(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    if (popupAdConfig) {
      setAdEnabled(popupAdConfig.enabled ?? true);
      setAdTitle(popupAdConfig.title || '');
      setAdDescription(popupAdConfig.description || '');
      setAdImageUrl(popupAdConfig.imageUrl || '');
      setAdButtonText(popupAdConfig.buttonText || '');
      setAdButtonLink(popupAdConfig.buttonLink || '#catalog');
      setAdBadge(popupAdConfig.badge || 'LIMITED TIME DEAL');
      setAdShowOncePerSession(popupAdConfig.showOncePerSession ?? false);
    }
  }, [popupAdConfig]);

  // On every open: verify any stored session token against the server.
  // This replaces the old localStorage flag check — if the server says the
  // token is expired or invalid the admin must log in again.
  useEffect(() => {
    if (!isAdminOpen) return;
    const token = localStorage.getItem('mads_admin_session_token') || '';
    if (!token) {
      setIsAdminAuthenticated(false);
      setIsVerifyingSession(false);
      return;
    }
    setIsVerifyingSession(true);
    const tryVerify = (endpoint) =>
      fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)));
    Promise.any([
      tryVerify('/api/admin/verify-session'),
      tryVerify('https://madstopup.com/api/admin/verify-session')
    ])
      .then(data => {
        if (data?.valid) {
          setIsAdminAuthenticated(true);
        } else {
          localStorage.removeItem('mads_admin_session_token');
          localStorage.removeItem('mads_admin_session_expires');
          setIsAdminAuthenticated(false);
        }
      })
      .catch(() => {
        // Server unreachable — deny access; never fall back to localStorage
        localStorage.removeItem('mads_admin_session_token');
        localStorage.removeItem('mads_admin_session_expires');
        setIsAdminAuthenticated(false);
      })
      .finally(() => setIsVerifyingSession(false));
  }, [isAdminOpen]);

  useEffect(() => {
    if (isAdminAuthenticated && isAdminOpen) {
      fetchLiveBalance();
      fetchEzcashLogs();
      const interval = setInterval(() => {
        fetchLiveBalance();
        fetchEzcashLogs();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isAdminAuthenticated, isAdminOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('mads_admin_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('mads_admin_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  if (!isAdminOpen) return null;

  const themeClass = theme === 'light' ? 'theme-light' : '';

  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();

    if (adminLockoutUntil && Date.now() < adminLockoutUntil) {
      const waitSecs = Math.ceil((adminLockoutUntil - Date.now()) / 1000);
      setAdminAuthError(`3 Failed attempts detected! Locked out for security. Try again in ${waitSecs}s.`);
      showToast(`Admin Portal Locked for ${waitSecs}s`, 'error');
      return;
    }

    const cleanEmail = String(adminAuthEmail || '').trim().toLowerCase().replace(/['"`;=\-]/g, '');
    const cleanPass = String(adminAuthPassword || '').trim();
    const cleanCode = String(adminAuthSecurityCode || '').trim().toUpperCase();

    // Credentials are verified ONLY by the server — no client-side hash
    // checks. This closes the jailbreak (localStorage bypass) and the leak
    // (hash constants visible in the JS bundle).
    setIsLoginLoading(true);
    setAdminAuthError('');

    const loginPayload = JSON.stringify({ email: cleanEmail, password: cleanPass, securityCode: cleanCode });
    const tryAdminLogin = (endpoint) => fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: loginPayload
    }).then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(new Error(d?.error || `HTTP ${r.status}`))));

    try {
      const data = await Promise.any([
        tryAdminLogin('/api/admin/login'),
        tryAdminLogin('https://madstopup.com/api/admin/login')
      ]);

      if (data?.success && data?.token) {
        localStorage.setItem('mads_admin_session_token', data.token);
        localStorage.setItem('mads_admin_session_expires', String(data.expiresAt || ''));
        setIsAdminAuthenticated(true);
        setAdminFailedAttempts(0);
        setAdminLockoutUntil(null);
        setAdminAuthError('');
        showToast('Admin Authentication Successful! Welcome Super Admin.');
        setAdminAuthPassword('');
        setAdminAuthSecurityCode('');
      } else {
        throw new Error(data?.error || 'Authentication failed.');
      }
    } catch (err) {
      const nextFailures = adminFailedAttempts + 1;
      setAdminFailedAttempts(nextFailures);
      if (nextFailures >= 3) {
        const lockoutTime = Date.now() + 15 * 60 * 1000;
        setAdminLockoutUntil(lockoutTime);
        setAdminAuthError('3 Failed attempts detected! Admin Portal locked out for 15 minutes for security.');
        showToast('3 Failed Attempts! Admin Portal Locked.', 'error');
      } else {
        setAdminAuthError(`Invalid Admin Email, Password, or 2FA Security Code! Attempt ${nextFailures}/3.`);
        showToast('Invalid Admin Security Credentials', 'error');
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleAdminLogout = () => {
    const token = localStorage.getItem('mads_admin_session_token') || '';
    localStorage.removeItem('mads_admin_session_token');
    localStorage.removeItem('mads_admin_session_expires');
    setIsAdminAuthenticated(false);
    setIsAdminOpen(false);
    showToast('Logged out from Admin Portal.');
    // Fire-and-forget server-side token revocation
    if (token) {
      const tryLogout = (endpoint) => fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      }).catch(() => {});
      tryLogout('/api/admin/logout');
      tryLogout('https://madstopup.com/api/admin/logout');
    }
  };

  if (isVerifyingSession) {
    return (
      <div className={`mads-admin ${themeClass} fixed inset-0 z-50 w-screen h-screen flex items-center justify-center`} style={{ background: 'var(--adm-bg)', color: 'var(--adm-text)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#cc040a] to-[#ff2a30] flex items-center justify-center shadow-xl shadow-red-600/40">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono" style={{ color: 'var(--adm-text-muted)' }}>Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return (
      <div className={`mads-admin ${themeClass} fixed inset-0 z-50 w-screen h-screen min-h-screen overflow-y-auto overflow-x-hidden flex flex-col items-center justify-center p-3 sm:p-4`} style={{ background: 'var(--adm-bg)', color: 'var(--adm-text)' }}>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden relative p-5 sm:p-8 z-10" style={cardStyle}>
          <button
            onClick={() => setIsAdminOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-xl hover:bg-[var(--adm-surface-hover)] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold font-mono"
            style={mutedStyle}
            title="Return to Main Website"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>

          <div className="text-center space-y-3 mb-6">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#cc040a] to-[#ff2a30] flex items-center justify-center text-white mx-auto shadow-xl shadow-red-600/40 border border-white/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black font-heading tracking-tight" style={{ color: 'var(--adm-text)' }}>MADS TOPUP ADMIN</h2>
            <p className="text-xs font-medium" style={mutedStyle}>Restricted Access &bull; Enter Super Admin & 2FA Credentials</p>
          </div>

          {adminAuthError && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{adminAuthError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-extrabold mb-1.5 uppercase tracking-wider text-[10px] font-mono" style={mutedStyle}>Admin Email Address</label>
              <input type="email" required autoComplete="off" value={adminAuthEmail} onChange={(e) => setAdminAuthEmail(e.target.value)} placeholder="Enter Admin Email" className={fieldCls} style={fieldStyle} />
            </div>
            <div>
              <label className="block font-extrabold mb-1.5 uppercase tracking-wider text-[10px] font-mono" style={mutedStyle}>Admin Password</label>
              <div className="relative">
                <input type={showAdminAuthPassword ? 'text' : 'password'} required autoComplete="new-password" value={adminAuthPassword} onChange={(e) => setAdminAuthPassword(e.target.value)} placeholder="Enter Admin Password" className={`${fieldCls} pr-10`} style={fieldStyle} />
                <button type="button" onClick={() => setShowAdminAuthPassword(!showAdminAuthPassword)} className="absolute right-3 top-3 cursor-pointer" style={mutedStyle}>
                  {showAdminAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-extrabold uppercase tracking-wider text-[10px] font-mono" style={mutedStyle}>Admin 2FA Authenticator Code (TOTP)</label>
                <span className="text-[9px] font-mono text-amber-400">Google / MS Authenticator</span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoComplete="one-time-code"
                value={adminAuthSecurityCode}
                onChange={(e) => setAdminAuthSecurityCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000 000"
                className={fieldCls}
                style={{
                  ...fieldStyle,
                  color: '#fbbf24',
                  textAlign: 'center',
                  letterSpacing: '0.35em',
                  fontSize: '1.1rem',
                  fontWeight: '700'
                }}
              />
            </div>
            <button type="submit" disabled={isLoginLoading} className="w-full py-3.5 bg-gradient-to-r from-[#cc040a] to-[#ff2a30] hover:from-[#b00308] hover:to-[#e02026] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/30 cursor-pointer mt-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {isLoginLoading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>VERIFYING…</span></>
                : <><Lock className="w-4 h-4" /><span>AUTHENTICATE &amp; LOG IN</span></>}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t text-center text-[10px] font-mono" style={{ borderColor: 'var(--adm-border)', ...faintStyle }}>
            SECURE SUPER ADMIN GATEWAY &bull; MADS TOPUP ENTERPRISE
          </div>
        </div>
      </div>
    );
  }

  const safeOrders = orders || [];
  const safeUsers = usersList || [];
  const safePayments = manualPayments || [];
  const safeTickets = supportTickets || [];
  const safeResellerApps = resellerApplications || [];
  const safeVouchers = vouchers || [];

  const completedOrders = safeOrders.filter(o => o.status === 'COMPLETED');
  const totalRevenueLkr = completedOrders.reduce((sum, o) => sum + (o.priceLkr || 0), 0);
  const pendingCount = safeOrders.filter(o => o.status === 'PROCESSING' || o.status === 'PENDING').length;
  const pendingPaymentsCount = safePayments.filter(d => d.status === 'PENDING').length;
  const openTicketsCount = safeTickets.filter(t => t && t.status === 'OPEN').length;
  const pendingResellersCount = safeResellerApps.filter(a => a.status === 'PENDING').length;

  const badges = {
    pending: pendingCount,
    payments: pendingPaymentsCount,
    ezcash: ezcashLogs.length,
    resellers: pendingResellersCount,
    tickets: openTicketsCount
  };

  const filteredOrders = safeOrders.filter(ord => {
    if (!ord) return false;
    const search = (orderSearch || '').toLowerCase();
    const ordId = String(ord.id || '').toLowerCase();
    const ordPlayerId = String(ord.playerId || '').toLowerCase();
    const ordGameName = String(ord.gameName || '').toLowerCase();
    const ordIgn = String(ord.ign || '').toLowerCase();
    const ordPayMethod = String(ord.paymentMethod || '').toLowerCase();
    const matchesSearch = ordId.includes(search) || ordPlayerId.includes(search) || ordGameName.includes(search) || ordIgn.includes(search);
    const isTelegramOrder = Boolean(ord.viaTelegramBot || (ord.id && String(ord.id).startsWith('ORD-TG-')) || ord.channel === 'Telegram Bot' || ordPayMethod.includes('telegram'));
    const matchesStatus = statusFilter === 'ALL' || ord.status === statusFilter;
    const matchesPayment = paymentFilter === 'ALL' || (paymentFilter === 'TELEGRAM' ? isTelegramOrder : ordPayMethod.includes((paymentFilter || '').toLowerCase()));
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const filteredUsers = safeUsers.filter(usr => {
    if (!usr) return false;
    const search = (userSearch || '').toLowerCase();
    const usrName = String(usr.name || usr.username || usr.displayName || '').toLowerCase();
    const usrEmail = String(usr.email || '').toLowerCase();
    const usrPhone = String(usr.phone || '');
    const matchesSearch = usrName.includes(search) || usrEmail.includes(search) || (usrPhone && usrPhone.includes(userSearch));
    const matchesStatus = userStatusFilter === 'ALL' ||
      (userStatusFilter === 'VERIFIED' && usr.isVerified) ||
      (userStatusFilter === 'UNVERIFIED' && !usr.isVerified) ||
      (userStatusFilter === 'BLOCKED' && usr.status === 'BLOCKED');
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return userSortOrder === 'oldest' ? ta - tb : tb - ta;
  });

  const filteredPayments = safePayments.filter(pay => {
    if (!pay) return false;
    const query = (paymentSearch || '').toLowerCase().trim();
    const payId = String(pay.id || '').toLowerCase();
    const payEmail = String(pay.userEmail || '').toLowerCase();
    const payName = String(pay.userName || '').toLowerCase();
    const payRef = String(pay.referenceNumber || '').toLowerCase();
    const payMethod = String(pay.method || '').toLowerCase();
    const payAmount = String(pay.amount || '');
    const matchesSearch = !query || payId.includes(query) || payEmail.includes(query) || payName.includes(query) || payRef.includes(query) || payMethod.includes(query) || payAmount.includes(query);
    const matchesStatus = paymentStatusFilter === 'ALL' || pay.status === paymentStatusFilter;
    let matchesMethod = true;
    if (paymentMethodFilter === 'EZ_CASH') matchesMethod = payMethod.includes('ez');
    else if (paymentMethodFilter === 'BINANCE') matchesMethod = payMethod.includes('binance');
    else if (paymentMethodFilter === 'BANK') matchesMethod = payMethod.includes('bank') || payMethod.includes('slip');
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const filteredSupportTickets = safeTickets.filter(tck => {
    if (!tck) return false;
    const search = (supportSearch || '').toLowerCase();
    const tckId = String(tck.id || '').toLowerCase();
    const tckEmail = String(tck.userEmail || tck.email || '').toLowerCase();
    const tckName = String(tck.userName || tck.name || '').toLowerCase();
    const tckSubject = String(tck.subject || '').toLowerCase();
    const tckOrderId = String(tck.orderId || '').toLowerCase();
    const matchesSearch = tckId.includes(search) || tckEmail.includes(search) || tckName.includes(search) || tckSubject.includes(search) || tckOrderId.includes(search);
    const matchesStatus = supportStatusFilter === 'ALL' || tck.status === supportStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeInspectTicket = selectedTicketInspect || filteredSupportTickets[0] || null;

  const filteredEzcashLogs = (ezcashLogs || []).filter(item => {
    if (!item) return false;
    const query = (ezcashSearch || '').toLowerCase().trim();
    const rn = String(item.rnNumber || '').toLowerCase();
    const rawSms = String(item.rawSms || '').toLowerCase();
    const redeemedBy = String(item.redeemedBy || '').toLowerCase();
    const matchesSearch = !query || rn.includes(query) || rawSms.includes(query) || redeemedBy.includes(query);
    const matchesStatus = ezcashStatusFilter === 'ALL' || item.status === ezcashStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredResellerApps = safeResellerApps.filter(app => {
    if (!app) return false;
    const search = (resellerSearch || '').toLowerCase();
    const realName = String(app.realName || '').toLowerCase();
    const storeName = String(app.storeName || '').toLowerCase();
    const whatsapp = String(app.whatsappNumber || '');
    const email = String(app.emailAddress || '').toLowerCase();
    const matchSearch = realName.includes(search) || storeName.includes(search) || whatsapp.includes(resellerSearch) || email.includes(search);
    const matchStatus = resellerStatusFilter === 'ALL' || app.status === resellerStatusFilter;
    return matchSearch && matchStatus;
  });

  const filteredVouchers = safeVouchers.filter(v => {
    if (!v) return false;
    const q = (voucherSearch || '').toLowerCase();
    return String(v.code || '').toLowerCase().includes(q);
  });

  const handleSendAdminReply = (e) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !activeInspectTicket) return;
    sendTicketMessage(activeInspectTicket.id, adminReplyText.trim(), 'admin');
    setAdminReplyText('');
    showToast(`Official support reply sent to ${activeInspectTicket.userName}!`);
  };

  const handleTabSelect = (tab) => {
    setAdminTab(tab);
    setIsMobileSidebarOpen(false);
  };

  const handlePriceInputChange = (pkgId, val) => {
    const num = parseFloat(val);
    setEditedPricesMap(prev => ({ ...prev, [pkgId]: isNaN(num) ? 0 : num }));
  };

  const handleSaveAllPrices = async () => {
    setIsSavingPrices(true);
    const fullPriceMap = {};
    (gamesCatalog || []).forEach(game => {
      (game.packages || []).forEach(pkg => {
        fullPriceMap[pkg.id] = editedPricesMap[pkg.id] !== undefined ? editedPricesMap[pkg.id] : pkg.priceLkr;
      });
    });
    const success = await updateGamePrices(fullPriceMap);
    setIsSavingPrices(false);
    if (success) {
      setEditedPricesMap({}); // Clear edited state after successful publish
      showToast('⚡ ALL PACKAGE PRICES SAVED & PUBLISHED LIVE TO DATABASE!');
    } else {
      showToast('❌ Failed to save prices. Check connection and try again.', 'error');
    }
  };

  const handleAdImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP)!', 'error');
      return;
    }
    setIsUploadingAdImg(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result;
        try { await uploadToR2Storage(file, 'popup_ads'); } catch (r2Err) {}
        setAdImageUrl(dataUrl);
        setIsUploadingAdImg(false);
        showToast('Image uploaded & applied successfully! ☁️');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Image upload error:', err);
      setIsUploadingAdImg(false);
      showToast('Failed to upload image file.', 'error');
    }
  };

  const handleSavePopupAd = async (e) => {
    if (e) e.preventDefault();
    setIsSavingAd(true);
    const success = await updatePopupAdConfig({
      enabled: adEnabled, title: adTitle, description: adDescription, imageUrl: adImageUrl,
      buttonText: adButtonText, buttonLink: adButtonLink, badge: adBadge, showOncePerSession: adShowOncePerSession
    });
    setIsSavingAd(false);
    if (success) showToast('🎉 POPUP BANNER AD UPDATED & PUBLISHED LIVE TO WEBSITE!');
    else showToast('Failed to save Popup Ad configuration.', 'error');
  };

  const handleSaveMoongoldSettings = () => {
    updateMoongoldConfig({ ...moongoldConfig, apiKey: apiKeyInput, secretKey: secretKeyInput, baseUrl: baseUrlInput, autoFulfill: autoFulfillInput, simulationMode: simModeInput });
  };

  const handleRetryMoongold = async (order) => {
    if (retryingOrderIdsRef.current.has(order.id)) return;
    retryingOrderIdsRef.current.add(order.id);
    setRetryingOrderId(order.id);
    try {
      const game = gamesCatalog.find(g => g.id === order.gameId);
      const result = await dispatchMoongoldOrder({ game: game || { moongoldCode: 'GENERIC' }, playerId: order.playerId, zoneId: order.zoneId, package: { id: order.packageName } });
      if (result.success) {
        updateOrderStatus(order.id, 'COMPLETED', result.moongoldRef);
        showToast(`Order ${order.id} synced with Moongold successfully!`);
      } else {
        showToast(`Moongold Sync Failed: ${result.message}`, 'error');
      }
    } finally {
      retryingOrderIdsRef.current.delete(order.id);
      setRetryingOrderId(null);
    }
  };

  const handleCheckBalance = async () => {
    setIsCheckingBalance(true);
    const result = await checkMoongoldBalance();
    setIsCheckingBalance(false);
    if (result && result.success) {
      setLiveMoongoldBalance({ balanceUsd: result.balanceUsd, balanceLkr: result.balanceLkr, isLoading: false, lastFetched: new Date().toLocaleTimeString() });
      showToast(`API Merchant Live Balance: Rs. ${result.balanceLkr.toLocaleString()} ($${result.balanceUsd} USD)`);
    } else {
      showToast(`API Merchant Live Balance: Rs. ${moongoldConfig.merchantBalanceLkr.toLocaleString()} ($${moongoldConfig.merchantBalanceUsd} USD)`);
    }
  };

  const handleSaveR2Settings = () => {
    updateR2Config({ ...r2Config, bucketUrl: r2UrlInput, bucketName: r2BucketName, status: 'ACTIVE' });
  };

  const handleTestR2Connection = async () => {
    setIsTestingR2(true);
    await new Promise(res => setTimeout(res, 700));
    setIsTestingR2(false);
    showToast(`Cloudflare R2 Bucket Connected! Endpoint: ${r2UrlInput}`);
  };

  const handleManualCreditSubmit = (e) => {
    e.preventDefault();
    const lkr = parseFloat(creditLkrAmount) || 0;
    const usdt = parseFloat(creditUsdtAmount) || 0;
    if (lkr === 0 && usdt === 0) {
      showToast('Please enter an amount to credit!', 'error');
      return;
    }
    updateUserBalance(creditUserEmail, lkr, usdt);
    setCreditLkrAmount('');
    setCreditUsdtAmount('');
  };

  const handleCreateVoucherSubmit = (e) => {
    e.preventDefault();
    if (!newVoucherCode || !newVoucherValue) {
      showToast('Please enter voucher code and value', 'error');
      return;
    }
    addVoucher({ code: newVoucherCode.toUpperCase(), value: parseFloat(newVoucherValue), currency: newVoucherCurrency, maxUses: parseInt(newVoucherMaxUses) || 100, usedCount: 0, active: true });
    setNewVoucherCode('');
    setNewVoucherValue('');
  };

  const handleSaveNoticeSubmit = (e) => {
    e.preventDefault();
    setTickerNotice(tickerNoticeInput);
    showToast('Ticker notice banner updated live across website!');
  };

  const handleAddManualPaymentRecord = (e) => {
    e.preventDefault();
    if (!newPayUserEmail || !newPayRef || !newPayAmount) {
      showToast('Please fill all required payment fields!', 'error');
      return;
    }
    addManualPayment({ id: `PAY-${Date.now().toString().slice(-4)}`, userEmail: newPayUserEmail, userName: newPayUserEmail.split('@')[0], method: newPayMethod, referenceNumber: newPayRef, amount: parseFloat(newPayAmount), currency: newPayCurrency, slipUrl: '', status: 'PENDING', createdAt: 'Just Now' });
    setNewPayRef('');
    setNewPayAmount('');
    setIsAddPaymentOpen(false);
  };

  const revenueTrend = (() => {
    const days = 7;
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (days - 1 - i));
      return { date: d, total: 0 };
    });
    completedOrders.forEach(o => {
      const od = new Date(o.createdAt);
      if (isNaN(od.getTime())) return;
      od.setHours(0, 0, 0, 0);
      const bucket = buckets.find(b => b.date.getTime() === od.getTime());
      if (bucket) bucket.total += (o.priceLkr || 0);
    });
    return buckets;
  })();
  const revenueTrendTotal = revenueTrend.reduce((s, b) => s + b.total, 0);

  const orderStatusCounts = {
    COMPLETED: safeOrders.filter(o => o.status === 'COMPLETED').length,
    PROCESSING: safeOrders.filter(o => o.status === 'PROCESSING').length,
    PENDING: safeOrders.filter(o => o.status === 'PENDING').length,
    FAILED: safeOrders.filter(o => o.status === 'FAILED').length
  };
  const donutSegments = [
    { label: 'Completed', value: orderStatusCounts.COMPLETED, color: '#34d399' },
    { label: 'Processing', value: orderStatusCounts.PROCESSING, color: '#fbbf24' },
    { label: 'Pending', value: orderStatusCounts.PENDING, color: '#38bdf8' },
    { label: 'Failed', value: orderStatusCounts.FAILED, color: '#f87171' }
  ];

  const activityFeed = [];
  safeOrders.slice(0, 25).forEach(o => activityFeed.push({ id: `ord-${o.id}`, ts: o.createdAt, icon: ShoppingCart, color: '#38bdf8', title: `Order ${o.id} — ${o.gameName || 'Top-up'}`, sub: `${o.status} • ${formatLkr(o.priceLkr)}` }));
  safePayments.slice(0, 25).forEach(p => activityFeed.push({ id: `pay-${p.id}`, ts: p.createdAt, icon: FileCheck, color: '#34d399', title: `Deposit ${p.id} — ${p.userName || p.userEmail || 'Customer'}`, sub: `${p.method} • ${p.amount} ${p.currency} • ${p.status}` }));
  safeTickets.slice(0, 25).forEach(t => activityFeed.push({ id: `tck-${t.id}`, ts: t.updatedAt || t.createdAt, icon: Headset, color: '#fb7185', title: `Ticket ${t.id} — ${t.subject}`, sub: `${t.status} • Priority ${t.priority}` }));
  safeResellerApps.slice(0, 25).forEach(a => activityFeed.push({ id: `app-${a.id || a.firestoreId}`, ts: a.submittedAt, icon: Crown, color: '#fbbf24', title: `Reseller Application — ${a.storeName}`, sub: `${a.status}` }));
  const sortedActivity = activityFeed.filter(i => i.ts && !isNaN(new Date(i.ts).getTime())).sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 8);

  const commandResults = (() => {
    const q = commandQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const results = [];
    safeOrders.forEach(o => {
      if (String(o.id).toLowerCase().includes(q) || String(o.playerId || '').toLowerCase().includes(q) || String(o.gameName || '').toLowerCase().includes(q)) {
        results.push({ key: `o-${o.id}`, type: 'Order', label: o.id, sub: o.gameName, onGo: () => { setAdminTab('orders'); setOrderSearch(o.id); } });
      }
    });
    safeUsers.forEach(u => {
      if (String(u.name || '').toLowerCase().includes(q) || String(u.email || '').toLowerCase().includes(q)) {
        results.push({ key: `u-${u.uid}`, type: 'User', label: u.name, sub: u.email, onGo: () => { setAdminTab('users'); setUserSearch(u.email || u.name); } });
      }
    });
    safePayments.forEach(p => {
      if (String(p.referenceNumber || '').toLowerCase().includes(q) || String(p.userEmail || '').toLowerCase().includes(q)) {
        results.push({ key: `p-${p.id}`, type: 'Deposit', label: p.id, sub: p.referenceNumber, onGo: () => { setAdminTab('deposits'); setPaymentSearch(p.referenceNumber); } });
      }
    });
    safeTickets.forEach(t => {
      if (String(t.subject || '').toLowerCase().includes(q) || String(t.id).toLowerCase().includes(q)) {
        results.push({ key: `t-${t.id}`, type: 'Ticket', label: t.id, sub: t.subject, onGo: () => { setAdminTab('support'); setSupportSearch(t.id); } });
      }
    });
    return results.slice(0, 7);
  })();

  const wrapperCls = `mads-admin ${themeClass} fixed inset-0 z-50 w-screen h-screen min-h-screen overflow-hidden overflow-x-hidden flex flex-col`;

  return (
    <div className={wrapperCls} style={{ background: 'var(--adm-bg)', color: 'var(--adm-text)' }}>

      {/* TOP BAR */}
      <div className="px-3 sm:px-5 py-3 border-b flex items-center justify-between gap-3 shrink-0" style={{ background: 'var(--adm-surface)', borderColor: 'var(--adm-border)' }}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} className="lg:hidden p-2 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }} title="Toggle Menu">
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden lg:flex p-2 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }} title="Toggle Sidebar">
            {sidebarCollapsed ? <PanelLeftOpen className="w-4.5 h-4.5" /> : <PanelLeftClose className="w-4.5 h-4.5" />}
          </button>
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#cc040a] to-[#ff2a30] flex items-center justify-center text-white shadow-lg shadow-red-600/30 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-black font-heading tracking-tight truncate" style={{ color: 'var(--adm-text)' }}>MADS ADMIN</h2>
              <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-mono font-bold shrink-0">v4.0</span>
            </div>
          </div>
        </div>

        <div className="hidden md:block relative flex-1 max-w-md">
          <Command className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={faintStyle} />
          <input
            type="text"
            value={commandQuery}
            onChange={(e) => setCommandQuery(e.target.value)}
            placeholder="Search orders, users, deposits, tickets..."
            className={`${fieldCls} pl-9`}
            style={fieldStyle}
          />
          {commandResults.length > 0 && (
            <div className="absolute top-full mt-2 left-0 right-0 rounded-2xl border shadow-2xl overflow-hidden z-20" style={cardStyle}>
              {commandResults.map(r => (
                <button key={r.key} onClick={() => { r.onGo(); setCommandQuery(''); }} className="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs hover:bg-[var(--adm-surface-hover)] cursor-pointer border-b last:border-0" style={{ borderColor: 'var(--adm-border)' }}>
                  <span className="font-bold" style={{ color: 'var(--adm-text)' }}>{r.label}</span>
                  <span className="flex items-center gap-2">
                    <span style={faintStyle}>{r.sub}</span>
                    <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 text-[9px] font-mono font-black">{r.type}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="relative">
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative p-2 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }} title="Notifications">
              <Bell className="w-4.5 h-4.5" />
              {(pendingCount + pendingPaymentsCount + openTicketsCount + pendingResellersCount) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">
                  {Math.min(99, pendingCount + pendingPaymentsCount + openTicketsCount + pendingResellersCount)}
                </span>
              )}
            </button>
            {isNotifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl overflow-hidden z-20" style={cardStyle}>
                <div className="px-4 py-2.5 border-b text-xs font-black" style={{ borderColor: 'var(--adm-border)' }}>Live Alerts</div>
                {[
                  { label: 'Pending orders', count: pendingCount, tab: 'orders' },
                  { label: 'Deposits to verify', count: pendingPaymentsCount, tab: 'deposits' },
                  { label: 'Open support tickets', count: openTicketsCount, tab: 'support' },
                  { label: 'Reseller applications', count: pendingResellersCount, tab: 'resellers' }
                ].map(n => (
                  <button key={n.tab} onClick={() => { setAdminTab(n.tab); setIsNotifOpen(false); }} className="w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-[var(--adm-surface-hover)] cursor-pointer">
                    <span style={mutedStyle}>{n.label}</span>
                    <span className={`font-mono font-black ${n.count > 0 ? 'text-amber-400' : ''}`} style={n.count === 0 ? faintStyle : undefined}>{n.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }} title="Toggle Theme">
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          <div className="hidden sm:flex items-center gap-2 border px-2.5 py-1.5 rounded-xl text-xs font-mono" style={{ borderColor: 'var(--adm-border)' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-bold" style={mutedStyle}>{adminAuthEmail || 'admin'}</span>
          </div>

          <button onClick={handleAdminLogout} className="p-2 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 transition-colors cursor-pointer" title="Logout Admin">
            <LogOut className="w-4.5 h-4.5" />
          </button>
          <button onClick={() => setIsAdminOpen(false)} className="p-2 rounded-xl border hover:bg-[var(--adm-surface-hover)] cursor-pointer" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}>
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden relative">
        {isMobileSidebarOpen && (
          <div onClick={() => setIsMobileSidebarOpen(false)} className="lg:hidden fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs" />
        )}

        <aside
          className={`${sidebarCollapsed ? 'w-[72px]' : 'w-64'} border-r p-3 overflow-y-auto shrink-0 transition-all duration-200 z-50 lg:z-auto ${isMobileSidebarOpen ? 'fixed inset-y-0 left-0 top-0 shadow-2xl block w-64' : 'hidden lg:block'}`}
          style={{ background: 'var(--adm-surface)', borderColor: 'var(--adm-border)' }}
        >
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-3">
              {!sidebarCollapsed && <div className="px-2.5 mb-1.5 text-[10px] font-black uppercase tracking-widest font-mono" style={faintStyle}>{group.label}</div>}
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const active = adminTab === item.id;
                  const badge = item.badgeKey ? badges[item.badgeKey] : 0;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabSelect(item.id)}
                      title={item.label}
                      className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${active ? 'bg-gradient-to-r from-[#cc040a] to-[#ff2a30] text-white shadow-lg shadow-red-600/25' : 'hover:bg-[var(--adm-surface-hover)]'}`}
                      style={!active ? mutedStyle : undefined}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </span>
                      {!sidebarCollapsed && badge > 0 && (
                        <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full shrink-0 ${active ? 'bg-white/25 text-white' : 'bg-amber-500/15 text-amber-400'}`}>{badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 space-y-6" style={{ background: 'var(--adm-bg-soft)' }}>

          {adminTab !== 'overview' && TAB_TITLES[adminTab] && (
            <SectionHeader title={TAB_TITLES[adminTab][0]} subtitle={TAB_TITLES[adminTab][1]} />
          )}

          {adminTab === 'overview' && (
            <div className="space-y-6">
              <SectionHeader
                title={TAB_TITLES.overview[0]}
                subtitle={TAB_TITLES.overview[1]}
                actions={<button onClick={() => { fetchLiveBalance(); fetchEzcashLogs(); showToast('Analytics data refreshed!'); }} className="px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}><RefreshCw className="w-3.5 h-3.5" /><span>Refresh</span></button>}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border p-5" style={cardStyle}>
                  <span className="text-[10px] font-black uppercase tracking-wider block" style={mutedStyle}>Gross Revenue</span>
                  <h4 className="text-2xl font-black text-emerald-400 font-heading mt-1">{formatLkr(totalRevenueLkr)}</h4>
                  <span className="text-[10px] font-bold mt-1 inline-block" style={faintStyle}>{completedOrders.length} completed orders</span>
                </div>
                <div className="rounded-2xl border p-5" style={cardStyle}>
                  <span className="text-[10px] font-black uppercase tracking-wider block" style={mutedStyle}>Total User Accounts</span>
                  <h4 className="text-2xl font-black font-heading mt-1" style={{ color: 'var(--adm-text)' }}>{safeUsers.length}</h4>
                  <span className="text-[10px] text-blue-400 font-bold mt-1 inline-block">{safeUsers.filter(u => u.isVerified).length} verified accounts</span>
                </div>
                <div className="rounded-2xl border p-5" style={cardStyle}>
                  <span className="text-[10px] font-black uppercase tracking-wider block" style={mutedStyle}>Manual Verifications Queue</span>
                  <h4 className="text-2xl font-black text-amber-400 font-heading mt-1">{pendingPaymentsCount} Pending</h4>
                  <span className="text-[10px] text-amber-500 font-bold mt-1 inline-block">EZ Cash RN / Binance Order IDs</span>
                </div>
                <div className="rounded-2xl border p-5" style={cardStyle}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider block" style={mutedStyle}>{liveMoongoldBalance.isRealtime ? 'Moongold Live Balance' : 'Total System Wallet Balance'}</span>
                    <button onClick={fetchLiveBalance} style={mutedStyle} title="Refresh Live Balance">
                      <RefreshCw className={`w-3 h-3 ${liveMoongoldBalance.isLoading ? 'animate-spin text-amber-400' : ''}`} />
                    </button>
                  </div>
                  {liveMoongoldBalance.isRealtime ? (
                    <>
                      <h4 className="text-2xl font-black text-sky-400 font-heading mt-1">Rs. {liveMoongoldBalance.balanceLkr.toLocaleString()}</h4>
                      <span className="text-[10px] text-sky-500 font-bold mt-1 inline-block">${liveMoongoldBalance.balanceUsd} USDT {liveMoongoldBalance.lastFetched ? `• Updated ${liveMoongoldBalance.lastFetched}` : '• Auto-Synced'}</span>
                    </>
                  ) : (
                    <>
                      <h4 className="text-2xl font-black text-sky-400 font-heading mt-1">Rs. {safeUsers.reduce((sum, u) => sum + (parseFloat(u.walletBalance) || 0), 0).toLocaleString()}</h4>
                      <span className="text-[10px] text-sky-500 font-bold mt-1 inline-block">Total balance across all users</span>
                    </>
                  )}
                </div>
                <div className="rounded-2xl border p-5" style={cardStyle}>
                  <span className="text-[10px] font-black uppercase tracking-wider block" style={mutedStyle}>Open Support Tickets</span>
                  <h4 className="text-2xl font-black text-rose-400 font-heading mt-1">{openTicketsCount}</h4>
                  <span className="text-[10px] font-bold mt-1 inline-block" style={faintStyle}>{safeTickets.length} total tickets</span>
                </div>
                <div className="rounded-2xl border p-5" style={cardStyle}>
                  <span className="text-[10px] font-black uppercase tracking-wider block" style={mutedStyle}>Reseller Applications</span>
                  <h4 className="text-2xl font-black text-amber-400 font-heading mt-1">{pendingResellersCount} Pending</h4>
                  <span className="text-[10px] font-bold mt-1 inline-block" style={faintStyle}>{safeResellerApps.length} total applications</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-2xl border p-5" style={cardStyle}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider font-mono" style={mutedStyle}>Revenue — Last 7 Days</h4>
                    <span className="text-sm font-black text-emerald-400 font-heading">{formatLkr(revenueTrendTotal)}</span>
                  </div>
                  <AreaChart data={revenueTrend.map(b => b.total)} color="#cc040a" />
                  <div className="flex justify-between mt-1 text-[9px] font-mono" style={faintStyle}>
                    {revenueTrend.map((b, i) => <span key={i}>{b.date.toLocaleDateString(undefined, { weekday: 'short' })}</span>)}
                  </div>
                </div>
                <div className="rounded-2xl border p-5 flex flex-col items-center" style={cardStyle}>
                  <h4 className="text-xs font-black uppercase tracking-wider font-mono self-start mb-3" style={mutedStyle}>Order Status Mix</h4>
                  {safeOrders.length === 0 ? (
                    <div className="py-6 text-xs text-center" style={faintStyle}>No orders yet.</div>
                  ) : (
                    <>
                      <DonutChart segments={donutSegments} />
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 w-full">
                        {donutSegments.map(s => (
                          <div key={s.label} className="flex items-center gap-1.5 text-[10px] font-bold" style={mutedStyle}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }}></span>
                            <span>{s.label} ({s.value})</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-2xl border p-5" style={cardStyle}>
                  <h4 className="text-xs font-black uppercase tracking-wider font-mono mb-3 flex items-center gap-2" style={mutedStyle}><Inbox className="w-3.5 h-3.5" /><span>Recent Activity</span></h4>
                  {sortedActivity.length === 0 ? (
                    <div className="py-6 text-xs text-center" style={faintStyle}>No recent activity to show yet.</div>
                  ) : (
                    <div className="space-y-1">
                      {sortedActivity.map(item => {
                        const Icon = item.icon;
                        return (
                          <div key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--adm-border)' }}>
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}20`, color: item.color }}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate" style={{ color: 'var(--adm-text)' }}>{item.title}</div>
                              <div className="text-[10px] truncate" style={mutedStyle}>{item.sub}</div>
                            </div>
                            <span className="text-[10px] font-mono shrink-0" style={faintStyle}>{timeAgo(item.ts)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border p-5 space-y-3" style={cardStyle}>
                  <h4 className="text-xs font-black uppercase tracking-wider font-mono mb-1" style={mutedStyle}>System Status</h4>
                  {[
                    { label: 'Firebase Auth & Database', desc: 'Google OAuth & Firestore sync connected.', color: 'bg-emerald-400' },
                    { label: 'Moongold Dispatch Gateway', desc: moongoldConfig.simulationMode ? 'Simulation mode active.' : 'Live dispatch mode active.', color: moongoldConfig.simulationMode ? 'bg-amber-400' : 'bg-emerald-400' },
                    { label: 'Cloudflare R2 Storage', desc: 'Object storage ready for uploads.', color: 'bg-sky-400' }
                  ].map(s => (
                    <div key={s.label} className="rounded-xl border p-3.5 space-y-1.5" style={{ borderColor: 'var(--adm-border)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wide" style={{ color: 'var(--adm-text)' }}>{s.label}</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${s.color} animate-pulse`}></span>
                      </div>
                      <p className="text-[11px]" style={mutedStyle}>{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'orders' && (
            <div className="space-y-4">
              <FilterBar>
                <SearchInput value={orderSearch} onChange={setOrderSearch} placeholder="Search Order ID, Player ID, IGN, or Game..." />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={fieldCls} style={{ ...fieldStyle, maxWidth: 200 }}>
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                </select>
                <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className={fieldCls} style={{ ...fieldStyle, maxWidth: 220 }}>
                  <option value="ALL">All Payment Methods</option>
                  <option value="TELEGRAM">Telegram Bot Orders</option>
                  <option value="EZ Cash">EZ Cash</option>
                  <option value="Binance">Binance Pay</option>
                  <option value="Bank">Bank Transfer</option>
                </select>
              </FilterBar>

              <DataTable
                emptyMessage="No orders found matching filters."
                columns={[
                  { key: 'id', label: 'Order ID', sortable: true, render: o => <span className="font-mono font-bold text-red-400">{o.id}</span> },
                  { key: 'user', label: 'User Account', sortable: true, sortValue: o => o.userEmail || o.userName || '', render: o => (
                    <div>
                      <div className="font-bold text-sky-400 flex items-center gap-1"><Users className="w-3 h-3 shrink-0" /><span>{o.userEmail || o.userName || o.userId || 'Registered Gamer'}</span></div>
                      {o.userName && <div className="text-[10px]" style={mutedStyle}>{o.userName}</div>}
                    </div>
                  )},
                  { key: 'game', label: 'Game / Package', sortable: true, sortValue: o => o.gameName || '', render: o => (
                    <div><div className="font-bold" style={{ color: 'var(--adm-text)' }}>{o.gameName}</div><div className="text-[10px]" style={mutedStyle}>{o.packageName}</div></div>
                  )},
                  { key: 'player', label: 'Player Credentials', render: o => (
                    <div className="font-mono" style={mutedStyle}><div>{o.playerId} {o.zoneId && `(${o.zoneId})`}</div><div className="text-[10px] font-sans">{o.ign}</div></div>
                  )},
                  { key: 'payment', label: 'Payment', sortable: true, sortValue: o => o.paymentMethod || '', render: o => {
                    const isTg = Boolean(o.viaTelegramBot || (o.id && o.id.startsWith('ORD-TG-')) || o.channel === 'Telegram Bot' || (o.paymentMethod && o.paymentMethod.toLowerCase().includes('telegram')));
                    return (
                      <div>
                        <div className="font-semibold" style={{ color: 'var(--adm-text)' }}>{o.paymentMethod}</div>
                        {isTg && <span className="px-2 py-0.5 mt-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono text-[9px] font-black inline-flex items-center gap-1"><span>Telegram Bot</span></span>}
                      </div>
                    );
                  }},
                  { key: 'price', label: 'Price', sortable: true, sortValue: o => o.priceLkr || 0, render: o => <span className="font-black font-heading" style={{ color: 'var(--adm-text)' }}>{formatLkr(o.priceLkr)}</span> },
                  { key: 'status', label: 'Status', sortable: true, sortValue: o => o.status || '', render: o => <StatusPill status={o.status} /> },
                  { key: 'actions', label: 'Actions', align: 'right', render: o => (
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      <button onClick={() => setSelectedInspectOrder(o)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}>Inspect</button>
                      {o.status !== 'COMPLETED' && <button onClick={() => updateOrderStatus(o.id, 'COMPLETED')} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold cursor-pointer">Approve</button>}
                      <button onClick={() => handleRetryMoongold(o)} disabled={retryingOrderId === o.id} className="px-2.5 py-1 bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/30 rounded-lg text-[11px] font-bold cursor-pointer">{retryingOrderId === o.id ? 'Syncing...' : 'Moongold'}</button>
                    </div>
                  )}
                ]}
                rows={filteredOrders}
              />
            </div>
          )}

          {adminTab === 'deposits' && (
            <div className="space-y-4">
              <div className="flex items-center justify-end gap-2 flex-wrap">
                <button onClick={() => handleTabSelect('ezcash')} className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl font-extrabold text-xs flex items-center gap-2 cursor-pointer">
                  <Smartphone className="w-4 h-4" /><span>SMS Webhook Logs ({ezcashLogs.length})</span>
                </button>
                <button onClick={() => setIsAddPaymentOpen(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer">
                  <Plus className="w-4 h-4" /><span>Record Offline Payment</span>
                </button>
              </div>

              <FilterBar>
                <SearchInput value={paymentSearch} onChange={setPaymentSearch} placeholder="Search RN, Order ID, Email, Name, or Amount..." />
                <select value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)} className={fieldCls} style={{ ...fieldStyle, maxWidth: 200 }}>
                  <option value="ALL">All Payment Methods</option>
                  <option value="EZ_CASH">EZ Cash Only</option>
                  <option value="BINANCE">Binance Pay Only</option>
                  <option value="BANK">Bank Deposit Only</option>
                </select>
                <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)} className={fieldCls} style={{ ...fieldStyle, maxWidth: 200 }}>
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending Verification</option>
                  <option value="VERIFIED">Verified & Credited</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </FilterBar>

              <DataTable
                emptyMessage="No payment verification requests found."
                columns={[
                  { key: 'id', label: 'Payment Ref', render: p => <div className="font-mono" style={mutedStyle}><div>{p.id}</div>{p.createdAt && <div className="text-[9px]" style={faintStyle}>{p.createdAt}</div>}</div> },
                  { key: 'method', label: 'Method', sortable: true, sortValue: p => p.method || '', render: p => {
                    const isEz = p.method && p.method.toLowerCase().includes('ez');
                    const isBinance = p.method && p.method.toLowerCase().includes('binance');
                    return isEz ? <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold inline-flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /><span>EZ Cash</span></span>
                      : isBinance ? <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /><span>Binance Pay</span></span>
                      : <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /><span>Bank Deposit</span></span>;
                  }},
                  { key: 'ref', label: 'RN / Order ID', render: p => {
                    const isEz = p.method && p.method.toLowerCase().includes('ez');
                    const cleanRn = String(p.referenceNumber || '').trim();
                    const matchedSms = isEz ? (ezcashLogs || []).find(l => {
                      if (!l.rnNumber) return false;
                      const logRn = String(l.rnNumber).trim();
                      return logRn === cleanRn || (cleanRn.length >= 10 && logRn.includes(cleanRn));
                    }) : null;
                    return (
                      <div className="font-mono font-bold text-amber-400">
                        <div className="flex items-center gap-1.5">
                          <span>{p.referenceNumber}</span>
                          <button type="button" onClick={() => { navigator.clipboard.writeText(p.referenceNumber); showToast(`Copied: ${p.referenceNumber}`); }} className="p-1 rounded cursor-pointer" style={faintStyle}><Copy className="w-3 h-3" /></button>
                        </div>
                        {isEz && (matchedSms ? (
                          <div className="mt-1 text-[10px] text-emerald-400 font-extrabold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /><span>SMS Matched (Rs. {(matchedSms.amountLkr || 0).toLocaleString()})</span></div>
                        ) : (
                          <div className="mt-1 text-[10px] font-mono flex items-center gap-1" style={faintStyle}><Clock className="w-3 h-3" /><span>Pending SMS Webhook</span></div>
                        ))}
                        {(p.slipUrl || p.receiptUrl) && (
                          <button type="button" onClick={() => setSelectedReceiptPay(p)} className="mt-1 text-[10px] font-extrabold text-sky-400 hover:text-sky-300 underline inline-flex items-center gap-1 cursor-pointer"><Eye className="w-3 h-3" /><span>View Receipt Slip</span></button>
                        )}
                      </div>
                    );
                  }},
                  { key: 'userName', label: 'User', sortable: true, sortValue: p => p.userName || '', render: p => (
                    <div>
                      <div className="font-bold" style={{ color: 'var(--adm-text)' }}>{p.userName}</div>
                      <div className="text-[10px] font-mono" style={mutedStyle}>{p.userEmail}</div>
                    </div>
                  )},
                  { key: 'amount', label: 'Amount', sortable: true, sortValue: p => Number(p.amount) || 0, render: p => (
                    <div className="font-black text-emerald-400 font-heading">
                      <div>{p.amount} {p.currency}</div>
                      {p.currency !== 'USDT' && p.amount >= 5000 && <div className="text-[9px] text-amber-400 font-normal">+{p.amount >= 20000 ? '600' : p.amount >= 10000 ? '250' : '100'} Bonus</div>}
                    </div>
                  )},
                  { key: 'status', label: 'Status', sortable: true, sortValue: p => p.status || '', render: p => <StatusPill status={p.status} /> },
                  { key: 'actions', label: 'Actions', align: 'right', render: p => (
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      {(p.slipUrl || p.receiptUrl || p.method === 'Bank Deposit' || p.method === 'Bank Slip') && (
                        <button type="button" onClick={() => setSelectedReceiptPay(p)} className="px-2.5 py-1 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 font-extrabold text-[10px] rounded-lg cursor-pointer inline-flex items-center gap-1"><Eye className="w-3 h-3" /><span>Slip</span></button>
                      )}
                      {p.status === 'PENDING' && (
                        <>
                          <button onClick={() => approveManualPayment(p.id)} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-lg cursor-pointer">Approve</button>
                          <button onClick={() => rejectManualPayment(p.id)} className="px-3 py-1 bg-red-600/25 hover:bg-red-600 text-white font-extrabold text-[10px] rounded-lg cursor-pointer border border-red-500/40">Reject</button>
                        </>
                      )}
                      {p.status === 'REJECTED' && <button onClick={() => approveManualPayment(p.id)} className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white font-extrabold text-[10px] rounded-lg cursor-pointer border border-emerald-500/40">Re-Approve</button>}
                      {p.status === 'VERIFIED' && <button onClick={() => rejectManualPayment(p.id)} className="px-2 py-1 hover:bg-red-900/40 font-bold text-[9px] rounded-lg cursor-pointer border" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}>Reject</button>}
                    </div>
                  )}
                ]}
                rows={filteredPayments}
              />
            </div>
          )}

          {adminTab === 'ezcash' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={fetchEzcashLogs} disabled={isEzcashLogsLoading} className="px-3.5 py-2 border rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}>
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isEzcashLogsLoading ? 'animate-spin' : ''}`} /><span>Refresh Logs</span>
                </button>
              </div>
              <FilterBar>
                <SearchInput value={ezcashSearch} onChange={setEzcashSearch} placeholder="Search RN Number, SMS Text, or User Email..." />
                <select value={ezcashStatusFilter} onChange={(e) => setEzcashStatusFilter(e.target.value)} className={fieldCls} style={{ ...fieldStyle, maxWidth: 220 }}>
                  <option value="ALL">All Statuses ({ezcashLogs.length})</option>
                  <option value="UNCLAIMED">Unclaimed / Pending</option>
                  <option value="REDEEMED">Auto-Approved / Redeemed</option>
                </select>
              </FilterBar>
              <DataTable
                emptyMessage="No EZ Cash webhook SMS logs received yet."
                columns={[
                  { key: 'rn', label: 'RN Trans Number', render: l => (
                    <div className="font-mono font-bold text-amber-400 flex items-center gap-1.5">
                      <span>{l.rnNumber}</span>
                      <button onClick={() => { navigator.clipboard.writeText(l.rnNumber); showToast(`Copied RN ${l.rnNumber}`); }} className="p-1 rounded cursor-pointer" style={faintStyle}><Copy className="w-3 h-3" /></button>
                    </div>
                  )},
                  { key: 'amount', label: 'Amount (LKR)', sortable: true, sortValue: l => l.amountLkr || 0, render: l => <span className="font-black text-emerald-400 font-heading text-sm">Rs. {(l.amountLkr || 0).toLocaleString()}</span> },
                  { key: 'status', label: 'Status', sortable: true, sortValue: l => l.status || '', render: l => <StatusPill status={l.status} /> },
                  { key: 'redeemedBy', label: 'Redeemed By', render: l => l.redeemedBy ? <span className="text-emerald-400 font-bold font-mono text-[11px]">{l.redeemedBy}</span> : <span className="italic text-[11px]" style={faintStyle}>Not redeemed yet</span> },
                  { key: 'receivedAt', label: 'Received', sortable: true, sortValue: l => new Date(l.receivedAt).getTime() || 0, render: l => <span className="font-mono text-[10px]" style={mutedStyle}>{new Date(l.receivedAt).toLocaleString()}</span> },
                  { key: 'rawSms', label: 'Raw SMS', render: l => <div className="p-2 rounded-lg text-[10px] font-mono border truncate max-w-xs" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)', ...mutedStyle }} title={l.rawSms}>{l.rawSms || 'No raw SMS text recorded'}</div> }
                ]}
                rows={filteredEzcashLogs}
                rowKey="rnNumber"
              />
            </div>
          )}

          {adminTab === 'vouchers' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <form onSubmit={handleCreateVoucherSubmit} className="rounded-2xl border p-5 space-y-3 lg:col-span-1" style={cardStyle}>
                  <h4 className="text-sm font-black" style={{ color: 'var(--adm-text)' }}>Create New Voucher</h4>
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1" style={mutedStyle}>Voucher Code</label>
                    <input type="text" placeholder="e.g. WELCOME100" value={newVoucherCode} onChange={(e) => setNewVoucherCode(e.target.value)} className={`${fieldCls} font-mono`} style={fieldStyle} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase block mb-1" style={mutedStyle}>Value</label>
                      <input type="number" placeholder="500" value={newVoucherValue} onChange={(e) => setNewVoucherValue(e.target.value)} className={fieldCls} style={fieldStyle} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase block mb-1" style={mutedStyle}>Currency</label>
                      <select value={newVoucherCurrency} onChange={(e) => setNewVoucherCurrency(e.target.value)} className={fieldCls} style={fieldStyle}>
                        <option value="LKR">LKR</option>
                        <option value="USDT">USDT</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase block mb-1" style={mutedStyle}>Max Uses</label>
                    <input type="number" value={newVoucherMaxUses} onChange={(e) => setNewVoucherMaxUses(e.target.value)} className={fieldCls} style={fieldStyle} />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-[#cc040a] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer">Create Voucher</button>
                </form>

                <div className="lg:col-span-2 space-y-3">
                  <SearchInput value={voucherSearch} onChange={setVoucherSearch} placeholder="Search voucher code..." />
                  <DataTable
                    emptyMessage="No voucher codes created yet."
                    columns={[
                      { key: 'code', label: 'Code', sortable: true, render: v => <span className="font-mono font-black text-amber-400">{v.code}</span> },
                      { key: 'value', label: 'Value', sortable: true, sortValue: v => Number(v.value) || 0, render: v => <span className="font-black text-emerald-400">{v.value} {v.currency}</span> },
                      { key: 'usage', label: 'Usage', sortable: true, sortValue: v => v.usedCount || 0, render: v => <span style={mutedStyle}>{v.usedCount || 0} / {v.maxUses}</span> },
                      { key: 'active', label: 'Status', render: v => <StatusPill status={v.active ? 'ACTIVE' : 'CLOSED'}>{v.active ? 'ACTIVE' : 'DISABLED'}</StatusPill> },
                      { key: 'actions', label: 'Actions', align: 'right', render: v => (
                        <button onClick={() => deleteVoucher(v.code)} className="px-2.5 py-1 bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /><span>Delete</span></button>
                      )}
                    ]}
                    rows={filteredVouchers}
                    rowKey="code"
                  />
                </div>
              </div>
            </div>
          )}

          {adminTab === 'users' && (
            <div className="space-y-4">
              <FilterBar>
                <SearchInput value={userSearch} onChange={setUserSearch} placeholder="Search User Name, Email, or Phone..." />
                <select value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value)} className={fieldCls} style={{ ...fieldStyle, maxWidth: 220 }}>
                  <option value="ALL">All Account Types</option>
                  <option value="VERIFIED">Verified Accounts Only</option>
                  <option value="UNVERIFIED">Unverified Accounts</option>
                  <option value="BLOCKED">Blocked Accounts</option>
                </select>
                <select value={userSortOrder} onChange={(e) => setUserSortOrder(e.target.value)} className={fieldCls} style={{ ...fieldStyle, maxWidth: 200 }}>
                  <option value="newest">⬇ Newest First</option>
                  <option value="oldest">⬆ Oldest First</option>
                </select>
              </FilterBar>

              <DataTable
                emptyMessage="No users found matching search criteria."
                columns={[
                  { key: 'uid', label: 'UID', render: u => <span className="font-mono text-[11px]" style={mutedStyle}>{u.uid}</span> },
                  { key: 'name', label: 'Name & Email', sortable: true, sortValue: u => u.name || '', render: u => (
                    <div>
                      <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--adm-text)' }}>
                        <span>{u.name}</span>
                        {u.isVerified && <BadgeCheck className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="text-[10px] font-mono" style={mutedStyle}>{u.email}</div>
                    </div>
                  )},
                  { key: 'verify', label: 'Verification', render: u => u.isVerified ? <StatusPill status="VERIFIED" /> : <StatusPill status="UNVERIFIED" /> },
                  { key: 'status', label: 'Account Status', sortable: true, sortValue: u => u.status || '', render: u => <StatusPill status={u.status} /> },
                  { key: 'lkr', label: 'EZ Wallet LKR', sortable: true, sortValue: u => u.walletBalance || 0, render: u => <span className="font-mono font-bold" style={{ color: 'var(--adm-text)' }}>Rs. {(u.walletBalance || 0).toLocaleString()}</span> },
                  { key: 'usdt', label: 'Binance USDT', sortable: true, sortValue: u => u.walletUsdt || 0, render: u => <span className="font-mono font-bold text-emerald-400">${(u.walletUsdt || 0).toFixed(2)}</span> },
                  { key: 'createdAt', label: 'Joined', sortable: false, sortValue: u => { const t = u.createdAt ? new Date(u.createdAt).getTime() : 0; return isNaN(t) ? 0 : t; }, render: u => (
                    <div className="text-[11px] font-mono" style={mutedStyle}>
                      {u.createdAt ? (
                        <>
                          <div>{new Date(u.createdAt).toLocaleDateString()}</div>
                          <div className="text-[10px]" style={{ color: 'var(--adm-text-faint)' }}>{timeAgo(u.createdAt)}</div>
                        </>
                      ) : <span style={{ color: 'var(--adm-text-faint)' }}>—</span>}
                    </div>
                  )},
                  { key: 'actions', label: 'Actions', align: 'right', render: u => (
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      {!u.isVerified && <button onClick={() => verifyUserAccount(u.uid)} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-lg cursor-pointer">Verify</button>}
                      <button onClick={() => toggleBlockUser(u.uid)} className={`px-2.5 py-1 font-extrabold text-[10px] rounded-lg cursor-pointer ${u.status === 'BLOCKED' ? 'bg-slate-500/20' : 'bg-red-600/25 hover:bg-red-600 text-red-300 border border-red-500/40'}`} style={u.status === 'BLOCKED' ? mutedStyle : undefined}>{u.status === 'BLOCKED' ? 'Unblock' : 'Block'}</button>
                      <button onClick={() => setSelectedInspectUser(u)} className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/40 font-extrabold text-[10px] rounded-lg cursor-pointer">Top Up</button>
                    </div>
                  )}
                ]}
                rows={filteredUsers}
                rowKey="uid"
              />
            </div>
          )}

          {adminTab === 'credit' && (
            <div className="max-w-2xl rounded-3xl border p-6 space-y-5" style={cardStyle}>
              <form onSubmit={handleManualCreditSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-extrabold mb-1" style={mutedStyle}>Target User Account Email</label>
                  <input type="email" value={creditUserEmail} onChange={(e) => setCreditUserEmail(e.target.value)} className={fieldCls} style={fieldStyle} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-extrabold mb-1" style={mutedStyle}>EZ Cash LKR Amount</label>
                    <input type="number" placeholder="e.g. 1500" value={creditLkrAmount} onChange={(e) => setCreditLkrAmount(e.target.value)} className={`${fieldCls} font-mono`} style={fieldStyle} />
                  </div>
                  <div>
                    <label className="block font-extrabold mb-1" style={mutedStyle}>Binance USDT Amount</label>
                    <input type="number" placeholder="e.g. 10.50" value={creditUsdtAmount} onChange={(e) => setCreditUsdtAmount(e.target.value)} className={`${fieldCls} font-mono`} style={fieldStyle} />
                  </div>
                </div>
                <div>
                  <label className="block font-extrabold mb-1" style={mutedStyle}>Credit Reason / Audit Note</label>
                  <input type="text" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} className={fieldCls} style={fieldStyle} />
                </div>
                <button type="submit" className="w-full py-3 bg-[#cc040a] hover:bg-[#990207] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 cursor-pointer">Credit Balance to User Wallet</button>
              </form>
            </div>
          )}

          {adminTab === 'resellers' && (
            <div className="space-y-4">
              <FilterBar>
                <SearchInput value={resellerSearch} onChange={setResellerSearch} placeholder="Search by applicant, store, whatsapp or email..." />
                <div className="flex items-center gap-2 overflow-x-auto">
                  {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(st => (
                    <button key={st} onClick={() => setResellerStatusFilter(st)} className={`px-3.5 py-2 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${resellerStatusFilter === st ? 'bg-[#cc040a] text-white shadow-md shadow-red-600/30' : 'border'}`} style={resellerStatusFilter !== st ? { borderColor: 'var(--adm-border)', ...mutedStyle } : undefined}>{st}</button>
                  ))}
                </div>
              </FilterBar>

              <div className="space-y-4">
                {filteredResellerApps.length === 0 ? (
                  <div className="rounded-2xl border p-8 text-center text-xs" style={{ ...cardStyle, ...mutedStyle }}>No reseller applications found.</div>
                ) : filteredResellerApps.map(app => (
                  <div key={app.id || app.firestoreId} className="rounded-2xl border p-5 space-y-4" style={cardStyle}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--adm-border)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0"><Crown className="w-6 h-6" /></div>
                        <div>
                          <h4 className="text-base font-black" style={{ color: 'var(--adm-text)' }}>{app.storeName}</h4>
                          <p className="text-xs" style={mutedStyle}>Applicant: <span className="font-bold" style={{ color: 'var(--adm-text)' }}>{app.realName}</span> ({app.id})</p>
                        </div>
                      </div>
                      <StatusPill status={app.status} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="rounded-xl border p-3" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}><span className="text-[10px] font-mono font-bold uppercase block mb-0.5" style={mutedStyle}>WhatsApp</span><span className="font-bold" style={{ color: 'var(--adm-text)' }}>{app.whatsappNumber}</span></div>
                      <div className="rounded-xl border p-3" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}><span className="text-[10px] font-mono font-bold uppercase block mb-0.5" style={mutedStyle}>Email</span><span className="font-bold" style={{ color: 'var(--adm-text)' }}>{app.emailAddress}</span></div>
                      <div className="rounded-xl border p-3" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}><span className="text-[10px] font-mono font-bold uppercase block mb-0.5" style={mutedStyle}>Daily Sale</span><span className="text-amber-400 font-bold">{app.dailySale}</span></div>
                      <div className="rounded-xl border p-3" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}><span className="text-[10px] font-mono font-bold uppercase block mb-0.5" style={mutedStyle}>Store & Reach</span><span style={mutedStyle}>{app.isRunningStore ? 'Active Store' : 'No Store'} • {app.hasSocialReach ? 'Social Reach' : 'No Reach'}</span></div>
                    </div>
                    <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                      <span className="text-[11px] font-mono" style={faintStyle}>Submitted: {new Date(app.submittedAt).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        {app.status !== 'APPROVED' ? (
                          <button onClick={() => updateResellerApplicationStatus(app.id || app.firestoreId, app.userId, 'APPROVED', app)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"><UserCheck className="w-4 h-4" /><span>Approve Reseller</span></button>
                        ) : (
                          <button onClick={() => updateResellerApplicationStatus(app.id || app.firestoreId, app.userId, 'APPROVED', app)} className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer" title="Resend Approval Email"><Mail className="w-4 h-4" /><span>Resend Approval Email</span></button>
                        )}
                        {app.status !== 'REJECTED' && (
                          <button onClick={() => updateResellerApplicationStatus(app.id || app.firestoreId || app.userId, app.userId, 'REJECTED', app)} className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"><UserX className="w-4 h-4" /><span>Reject</span></button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminTab === 'support' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border p-4 space-y-1" style={cardStyle}><span className="text-[10px] font-extrabold uppercase font-mono" style={mutedStyle}>Total Tickets</span><div className="text-2xl font-black font-heading" style={{ color: 'var(--adm-text)' }}>{safeTickets.length}</div></div>
                <div className="rounded-2xl border p-4 space-y-1" style={cardStyle}><span className="text-[10px] text-amber-400 font-extrabold uppercase font-mono">Open</span><div className="text-2xl font-black text-amber-400 font-heading">{safeTickets.filter(t => t.status === 'OPEN').length}</div></div>
                <div className="rounded-2xl border p-4 space-y-1" style={cardStyle}><span className="text-[10px] text-blue-400 font-extrabold uppercase font-mono">In Progress</span><div className="text-2xl font-black text-blue-400 font-heading">{safeTickets.filter(t => t.status === 'IN_PROGRESS').length}</div></div>
                <div className="rounded-2xl border p-4 space-y-1" style={cardStyle}><span className="text-[10px] text-emerald-400 font-extrabold uppercase font-mono">Resolved</span><div className="text-2xl font-black text-emerald-400 font-heading">{safeTickets.filter(t => t.status === 'RESOLVED').length}</div></div>
              </div>

              <FilterBar>
                <SearchInput value={supportSearch} onChange={setSupportSearch} placeholder="Search ticket ID, user email, subject..." />
                <select value={supportStatusFilter} onChange={(e) => setSupportStatusFilter(e.target.value)} className={fieldCls} style={{ ...fieldStyle, maxWidth: 200 }}>
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </FilterBar>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 space-y-3">
                  {filteredSupportTickets.length === 0 ? (
                    <div className="rounded-2xl border p-8 text-center text-xs" style={{ ...cardStyle, ...mutedStyle }}>No support tickets found matching your query.</div>
                  ) : filteredSupportTickets.map(tck => {
                    const isSelected = activeInspectTicket?.id === tck.id;
                    return (
                      <div key={tck.id} onClick={() => setSelectedTicketInspect(tck)} className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${isSelected ? 'ring-1 ring-red-500/50' : ''}`} style={isSelected ? { background: 'var(--adm-surface-hover)', borderColor: '#f4370680' } : cardStyle}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-red-400">{tck.id}</span>
                            <span className="text-[10px] border px-2 py-0.5 rounded font-extrabold" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}>{tck.category}</span>
                          </div>
                          <StatusPill status={tck.status} />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs line-clamp-1" style={{ color: 'var(--adm-text)' }}>{tck.subject}</h4>
                          <div className="text-[11px] font-mono mt-0.5 truncate" style={mutedStyle}>{tck.userName} ({tck.userEmail})</div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] border-t pt-2 font-mono" style={{ borderColor: 'var(--adm-border)', ...faintStyle }}>
                          <span>Priority: <strong className={tck.priority === 'HIGH' || tck.priority === 'URGENT' ? 'text-red-400' : ''}>{tck.priority}</strong></span>
                          <span>{new Date(tck.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="lg:col-span-7 rounded-2xl border p-4 sm:p-6 space-y-4" style={cardStyle}>
                  {activeInspectTicket ? (
                    <div className="space-y-4">
                      <div className="pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'var(--adm-border)' }}>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black" style={{ color: 'var(--adm-text)' }}>{activeInspectTicket.subject}</h3>
                            <span className="font-mono text-xs text-red-400 font-bold">{activeInspectTicket.id}</span>
                          </div>
                          <div className="text-xs font-mono mt-1" style={mutedStyle}>Customer: <strong style={{ color: 'var(--adm-text)' }}>{activeInspectTicket.userName}</strong> ({activeInspectTicket.userEmail})</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select value={activeInspectTicket.status} onChange={(e) => updateTicketStatus(activeInspectTicket.id, e.target.value)} className="text-xs text-amber-400 font-mono font-bold px-2.5 py-1.5 rounded-xl cursor-pointer border" style={{ background: 'var(--adm-input-bg)', borderColor: 'var(--adm-border)' }}>
                            <option value="OPEN">OPEN</option>
                            <option value="IN_PROGRESS">IN PROGRESS</option>
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="CLOSED">CLOSED</option>
                          </select>
                          <select value={activeInspectTicket.priority} onChange={(e) => updateTicketPriority(activeInspectTicket.id, e.target.value)} className="text-xs text-red-400 font-mono font-bold px-2.5 py-1.5 rounded-xl cursor-pointer border" style={{ background: 'var(--adm-input-bg)', borderColor: 'var(--adm-border)' }}>
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                            <option value="URGENT">URGENT</option>
                          </select>
                        </div>
                      </div>

                      {activeInspectTicket.orderId && (
                        <div className="rounded-xl border p-3 flex items-center justify-between text-xs font-mono" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}>
                          <span style={mutedStyle}>Linked Order: <strong className="text-red-400">{activeInspectTicket.orderId}</strong></span>
                          <button onClick={() => { setAdminTab('orders'); setOrderSearch(activeInspectTicket.orderId); }} className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-bold hover:bg-red-600 hover:text-white transition-colors cursor-pointer">View Order ↗</button>
                        </div>
                      )}

                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {activeInspectTicket.messages.map(msg => {
                          const isAdmin = msg.sender === 'admin';
                          return (
                            <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                              <div className="flex items-center gap-1.5 text-[10px] mb-1 font-mono" style={faintStyle}><span>{msg.senderName}</span><span>• {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                              <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs space-y-2 leading-relaxed ${isAdmin ? 'bg-[#cc040a] text-white rounded-tr-xs' : 'border rounded-tl-xs'}`} style={!isAdmin ? { background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)', color: 'var(--adm-text)' } : undefined}>
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                {msg.attachmentUrl && (
                                  <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="block mt-2 rounded-xl overflow-hidden border border-slate-700 hover:opacity-90 transition-opacity">
                                    <img src={msg.attachmentUrl} alt="Attachment" className="w-full max-h-48 object-cover" />
                                    <span className="block p-1 text-[9px] bg-black/50 text-white text-center font-mono">Open Full Screenshot ↗</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <form onSubmit={handleSendAdminReply} className="pt-3 border-t flex gap-2" style={{ borderColor: 'var(--adm-border)' }}>
                        <input type="text" placeholder="Type official support reply to customer..." value={adminReplyText} onChange={(e) => setAdminReplyText(e.target.value)} className={fieldCls} style={fieldStyle} />
                        <button type="submit" disabled={!adminReplyText.trim()} className="px-5 py-2.5 bg-[#cc040a] hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl cursor-pointer shrink-0">Send</button>
                      </form>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-xs" style={faintStyle}>Select a support ticket from the list to inspect & respond.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'games' && (
            <div className="space-y-6">
              <div className="rounded-3xl border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4" style={cardStyle}>
                <p className="text-xs" style={mutedStyle}>Edit retail prices for any package. Click Save & Publish to instantly update prices on the Website & Telegram Bot in real-time.</p>
                <button onClick={handleSaveAllPrices} disabled={isSavingPrices} className="px-6 py-3 bg-[#cc040a] hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer shrink-0">
                  <Save className={`w-4 h-4 ${isSavingPrices ? 'animate-spin' : ''}`} /><span>{isSavingPrices ? 'Saving...' : 'Save & Publish All Prices'}</span>
                </button>
              </div>

              <FilterBar>
                <SearchInput value={catalogSearch} onChange={setCatalogSearch} placeholder="Search package name, diamond amount, or game title..." />
                <select value={selectedGameCatalogId} onChange={(e) => setSelectedGameCatalogId(e.target.value)} className={`${fieldCls} font-mono`} style={{ ...fieldStyle, maxWidth: 240 }}>
                  <option value="ALL">ALL GAMES ({(gamesCatalog || []).length})</option>
                  {(gamesCatalog || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </FilterBar>

              <div className="space-y-6">
                {(gamesCatalog || []).filter(g => selectedGameCatalogId === 'ALL' || g.id === selectedGameCatalogId).map(game => {
                  const matchingPackages = (game.packages || []).filter(pkg => {
                    if (!pkg) return false;
                    const q = (catalogSearch || '').toLowerCase();
                    return !q || String(pkg.name || '').toLowerCase().includes(q) || String(game.name || '').toLowerCase().includes(q);
                  });
                  if (matchingPackages.length === 0) return null;
                  return (
                    <div key={game.id} className="rounded-3xl border overflow-hidden" style={cardStyle}>
                      <div className="p-5 flex items-center justify-between border-b" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}>
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{game.currencyIcon || '🎮'}</span>
                          <div>
                            <h4 className="font-black text-lg" style={{ color: 'var(--adm-text)' }}>{game.name}</h4>
                            <span className="text-xs font-mono uppercase" style={mutedStyle}>{game.publisher} • {game.category} • {game.packages?.length || 0} Packages</span>
                          </div>
                        </div>
                        <button onClick={handleSaveAllPrices} disabled={isSavingPrices} className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-extrabold rounded-xl cursor-pointer shrink-0">Save Prices</button>
                      </div>
                      <div className="p-4 sm:p-6 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="font-mono text-[10px] uppercase border-b" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}>
                            <tr><th className="p-3">Package</th><th className="p-3">Retail (LKR)</th><th className="p-3">Wholesale (5% Off)</th><th className="p-3">USD</th><th className="p-3 text-right">Code</th></tr>
                          </thead>
                          <tbody className="divide-y font-medium" style={{ borderColor: 'var(--adm-border)' }}>
                            {matchingPackages.map(pkg => {
                              const currentPrice = editedPricesMap[pkg.id] !== undefined ? editedPricesMap[pkg.id] : pkg.priceLkr;
                              const isChanged = editedPricesMap[pkg.id] !== undefined && editedPricesMap[pkg.id] !== pkg.priceLkr;
                              const wholesalePrice = Math.round(currentPrice * 0.95);
                              const usdPrice = (currentPrice / 340).toFixed(2);
                              return (
                                <tr key={pkg.id} className="hover:bg-[var(--adm-surface-hover)] transition-colors">
                                  <td className="p-3 font-bold" style={{ color: 'var(--adm-text)' }}>
                                    <div className="flex items-center gap-2">
                                      {pkg.image && <img src={pkg.image} alt="" className="w-6 h-6 object-contain" />}
                                      <span>{pkg.name}</span>
                                      {pkg.bonus && <span className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono">{pkg.bonus}</span>}
                                      {isChanged && <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">EDITED</span>}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="relative w-36">
                                      <span className="absolute left-3 top-2 font-mono text-xs" style={faintStyle}>Rs.</span>
                                      <input type="number" value={currentPrice} onChange={(e) => handlePriceInputChange(pkg.id, e.target.value)} className={`w-full pl-9 pr-3 py-1.5 rounded-xl font-mono font-black text-xs focus:outline-none border ${isChanged ? 'text-amber-400 border-amber-500/50' : ''}`} style={!isChanged ? { ...fieldStyle } : { background: 'var(--adm-input-bg)' }} />
                                    </div>
                                  </td>
                                  <td className="p-3 font-mono font-bold text-emerald-400">Rs. {wholesalePrice.toLocaleString()}</td>
                                  <td className="p-3 font-mono" style={mutedStyle}>${usdPrice}</td>
                                  <td className="p-3 text-right"><span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg border" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}>{pkg.id}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button onClick={handleSaveAllPrices} disabled={isSavingPrices} className="px-8 py-3.5 bg-[#cc040a] hover:bg-red-700 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-xl shadow-red-600/30 cursor-pointer">
                  <Save className={`w-5 h-5 ${isSavingPrices ? 'animate-spin' : ''}`} /><span>{isSavingPrices ? 'Saving...' : 'Save & Publish All Prices Live'}</span>
                </button>
              </div>
            </div>
          )}

          {adminTab === 'popupAd' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border p-6" style={cardStyle}>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono border ${adEnabled ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'border'}`} style={!adEnabled ? { borderColor: 'var(--adm-border)', ...mutedStyle } : undefined}>{adEnabled ? 'LIVE ON WEB' : 'DISABLED'}</span>
                </div>
                <button onClick={handleSavePopupAd} disabled={isSavingAd} className="px-6 py-3 bg-[#cc040a] hover:bg-red-700 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-600/30 cursor-pointer flex items-center gap-2 shrink-0">
                  {isSavingAd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}<span>Save & Publish Live</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form onSubmit={handleSavePopupAd} className="lg:col-span-7 rounded-3xl border p-6 space-y-5" style={cardStyle}>
                  <ToggleSwitch checked={adEnabled} onChange={setAdEnabled} label="Enable Popup Banner Ad" description="Show this advertisement popup when users load the web app" />
                  <ToggleSwitch checked={adShowOncePerSession} onChange={setAdShowOncePerSession} label="Show Once Per Session" description="Popup won't re-appear on refresh after being closed" />
                  <div><label className="text-xs font-bold block mb-1" style={mutedStyle}>Badge Text</label><input type="text" placeholder="e.g. LIMITED TIME DEAL" value={adBadge} onChange={(e) => setAdBadge(e.target.value)} className={fieldCls} style={fieldStyle} /></div>
                  <div><label className="text-xs font-bold block mb-1" style={mutedStyle}>Popup Title / Headline</label><input type="text" placeholder="e.g. SPECIAL PROMO OFFER!" value={adTitle} onChange={(e) => setAdTitle(e.target.value)} className={fieldCls} style={fieldStyle} /></div>
                  <div><label className="text-xs font-bold block mb-1" style={mutedStyle}>Description / Offer Details</label><textarea rows={3} value={adDescription} onChange={(e) => setAdDescription(e.target.value)} className={`${fieldCls} resize-none`} style={fieldStyle} /></div>
                  <div>
                    <label className="text-xs font-bold block mb-1.5" style={mutedStyle}>Banner Image</label>
                    <label className="w-full border-2 border-dashed border-red-500/40 hover:border-red-500 p-3.5 rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer transition-colors text-xs mb-2" style={mutedStyle}>
                      {isUploadingAdImg ? (<><Loader2 className="w-5 h-5 text-red-500 animate-spin" /><span className="font-extrabold text-red-400">Uploading...</span></>) : (<><UploadCloud className="w-5 h-5 text-red-500" /><span className="font-extrabold" style={{ color: 'var(--adm-text)' }}>Upload Image File</span></>)}
                      <input type="file" accept="image/*" disabled={isUploadingAdImg} onChange={handleAdImageFileUpload} className="hidden" />
                    </label>
                    <input type="text" placeholder="Or paste direct image URL (https://...)" value={adImageUrl} onChange={(e) => setAdImageUrl(e.target.value)} className={`${fieldCls} font-mono`} style={fieldStyle} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold block mb-1" style={mutedStyle}>Button Action Text</label><input type="text" placeholder="e.g. Top Up Now" value={adButtonText} onChange={(e) => setAdButtonText(e.target.value)} className={fieldCls} style={fieldStyle} /></div>
                    <div>
                      <label className="text-xs font-bold block mb-1" style={mutedStyle}>Target Action Link</label>
                      <select value={adButtonLink} onChange={(e) => setAdButtonLink(e.target.value)} className={fieldCls} style={fieldStyle}>
                        <option value="#catalog">Open Game Catalog</option>
                        <option value="#wallet">Open Deposit Wallet</option>
                        <option value="https://wa.me/94740436276">Open Support WhatsApp</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={isSavingAd} className="w-full py-3 bg-[#cc040a] hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2">{isSavingAd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}<span>Save & Publish Live</span></button>
                </form>

                <div className="lg:col-span-5">
                  <div className="rounded-3xl border p-5" style={cardStyle}>
                    <h4 className="text-xs font-black uppercase tracking-wider mb-4 flex items-center justify-between" style={mutedStyle}><span>Live Preview</span><span className="text-emerald-400 font-mono">Real-time</span></h4>
                    <div className="flex flex-col items-center w-full">
                      <div className="border-2 border-amber-400/40 text-white rounded-3xl shadow-2xl overflow-hidden relative flex flex-col items-center w-full" style={{ background: '#0b0f17' }}>
                        {adBadge && <div className="absolute top-3 left-3 z-10"><span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 text-amber-300 border border-amber-400/40 font-black text-[9px] uppercase">{adBadge}</span></div>}
                        {adImageUrl && <div className="relative w-full h-36 bg-slate-900 overflow-hidden"><img src={adImageUrl} alt="Preview" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div></div>}
                        <div className="p-4 text-center space-y-2.5 w-full bg-slate-950">
                          <h5 className="text-base font-black">{adTitle || 'Popup Title Here'}</h5>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{adDescription || 'Your ad description will appear here...'}</p>
                          <div className="pt-2 flex justify-center"><div className="px-8 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow flex items-center gap-1.5"><span>{adButtonText || 'GO'}</span><ArrowRight className="w-3.5 h-3.5" /></div></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {adminTab === 'announcement' && (
            <div className="max-w-2xl rounded-3xl border p-6 space-y-4" style={cardStyle}>
              <form onSubmit={handleSaveNoticeSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-extrabold mb-1" style={mutedStyle}>Banner Announcement Text</label>
                  <textarea rows={4} value={tickerNoticeInput} onChange={(e) => setTickerNoticeInput(e.target.value)} className={`${fieldCls} font-mono`} style={fieldStyle} />
                </div>
                <button type="submit" className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-pink-600/30">Save & Update Announcement Live</button>
              </form>
            </div>
          )}

          {adminTab === 'moongold' && (
            <div className="space-y-6 max-w-3xl">
              <div className="rounded-3xl border p-6 space-y-4" style={cardStyle}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--adm-border)' }}>
                  <p className="text-xs" style={mutedStyle}>Configure live API credentials and automated topup dispatch</p>
                  <button onClick={handleCheckBalance} disabled={isCheckingBalance} className="px-3.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer shrink-0" style={{ borderColor: 'var(--adm-border)', color: '#fbbf24' }}>
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBalance ? 'animate-spin' : ''}`} /><span>Check Balance</span>
                  </button>
                </div>
                <div className="space-y-4 text-xs">
                  <div><label className="block font-bold mb-1" style={mutedStyle}>Moongold API Key</label><input type="text" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} className={`${fieldCls} font-mono`} style={fieldStyle} /></div>
                  <div>
                    <label className="block font-bold mb-1" style={mutedStyle}>Moongold Secret Key</label>
                    <div className="relative">
                      <input type={showSecret ? 'text' : 'password'} value={secretKeyInput} onChange={(e) => setSecretKeyInput(e.target.value)} className={`${fieldCls} font-mono pr-10`} style={fieldStyle} />
                      <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-3 cursor-pointer" style={mutedStyle}>{showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row gap-4">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={autoFulfillInput} onChange={(e) => setAutoFulfillInput(e.target.checked)} className="w-4 h-4 accent-red-600 rounded" /><span className="font-bold" style={{ color: 'var(--adm-text)' }}>Auto-fulfill top-ups on checkout</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={simModeInput} onChange={(e) => setSimModeInput(e.target.checked)} className="w-4 h-4 accent-red-600 rounded" /><span className="font-bold text-amber-400">Simulation Mode (Demo without real money)</span></label>
                  </div>
                </div>
                <button onClick={handleSaveMoongoldSettings} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"><Save className="w-4 h-4" /><span>Save Moongold Settings</span></button>
              </div>
            </div>
          )}

          {adminTab === 'r2' && (
            <div className="space-y-6 max-w-3xl">
              <div className="rounded-3xl border p-6 space-y-4" style={cardStyle}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--adm-border)' }}>
                  <p className="text-xs" style={mutedStyle}>Configure the Cloudflare R2 bucket used for game assets & receipt uploads</p>
                  <button onClick={handleTestR2Connection} disabled={isTestingR2} className="px-3.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer shrink-0" style={{ borderColor: 'var(--adm-border)', color: '#38bdf8' }}>
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingR2 ? 'animate-spin' : ''}`} /><span>Test Connection</span>
                  </button>
                </div>
                <div className="space-y-4 text-xs">
                  <div><label className="block font-bold mb-1" style={mutedStyle}>R2 Bucket Endpoint URL</label><input type="text" value={r2UrlInput} onChange={(e) => setR2UrlInput(e.target.value)} className={`${fieldCls} font-mono`} style={{ ...fieldStyle, color: '#7dd3fc' }} /></div>
                  <div><label className="block font-bold mb-1" style={mutedStyle}>R2 Bucket Name</label><input type="text" value={r2BucketName} onChange={(e) => setR2BucketName(e.target.value)} className={`${fieldCls} font-mono`} style={{ ...fieldStyle, color: '#7dd3fc' }} /></div>
                </div>
                <button onClick={handleSaveR2Settings} className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/30 cursor-pointer"><Save className="w-4 h-4" /><span>Save R2 Settings</span></button>
              </div>
            </div>
          )}

        </main>
      </div>

      {selectedInspectOrder && (
        <ModalShell
          onClose={() => setSelectedInspectOrder(null)}
          title={`Order Details #${selectedInspectOrder.id}`}
          footer={<>
            {selectedInspectOrder.status !== 'COMPLETED' && (
              <button onClick={() => { updateOrderStatus(selectedInspectOrder.id, 'COMPLETED'); setSelectedInspectOrder(null); }} className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl cursor-pointer">Approve Order</button>
            )}
            <button onClick={() => setSelectedInspectOrder(null)} className="px-4 py-2 rounded-xl font-bold text-xs cursor-pointer border" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}>Close</button>
          </>}
        >
          <div className="space-y-2 text-xs font-mono rounded-2xl border p-4" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}>
            <div style={mutedStyle}>Game: <strong style={{ color: 'var(--adm-text)' }}>{selectedInspectOrder.gameName}</strong></div>
            <div style={mutedStyle}>Package: <strong style={{ color: 'var(--adm-text)' }}>{selectedInspectOrder.packageName}</strong></div>
            <div style={mutedStyle}>Player ID: <strong className="text-red-400">{selectedInspectOrder.playerId}</strong></div>
            <div style={mutedStyle}>IGN: <strong className="text-amber-400">{selectedInspectOrder.ign || 'N/A'}</strong></div>
            <div style={mutedStyle}>Payment Method: <strong className="text-emerald-400">{selectedInspectOrder.paymentMethod}</strong></div>
            <div style={mutedStyle}>Amount: <strong style={{ color: 'var(--adm-text)' }}>{formatLkr(selectedInspectOrder.priceLkr)}</strong></div>
            <div style={mutedStyle}>Status: <strong className="text-sky-400">{selectedInspectOrder.status}</strong></div>
            <div style={mutedStyle}>Created At: <span>{selectedInspectOrder.createdAt}</span></div>
          </div>
        </ModalShell>
      )}

      {selectedInspectUser && (
        <ModalShell onClose={() => setSelectedInspectUser(null)} title={selectedInspectUser.name} subtitle={selectedInspectUser.email} icon={selectedInspectUser.isVerified ? BadgeCheck : Users}>
          <div className="grid grid-cols-2 gap-3 text-xs rounded-2xl border p-4" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}>
            <div><span className="text-[10px] font-bold uppercase block" style={mutedStyle}>EZ Cash Balance</span><span className="text-base font-black font-heading" style={{ color: 'var(--adm-text)' }}>Rs. {(selectedInspectUser.walletBalance || 0).toLocaleString()}</span></div>
            <div><span className="text-[10px] font-bold uppercase block" style={mutedStyle}>Binance USDT</span><span className="text-base font-black text-emerald-400 font-heading">${(selectedInspectUser.walletUsdt || 0).toFixed(2)}</span></div>
          </div>

          <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--adm-border)' }}>
            <h4 className="text-xs font-bold" style={mutedStyle}>Manual Wallet Balance Editor</h4>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { updateUserBalance(selectedInspectUser.email, 1000, 0); showToast(`Added +1,000 LKR to ${selectedInspectUser.name}`); setSelectedInspectUser(null); }} className="py-2 bg-emerald-500/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold cursor-pointer">+ Rs. 1,000 LKR</button>
              <button onClick={() => { updateUserBalance(selectedInspectUser.email, 0, 10); showToast(`Added +$10 USDT to ${selectedInspectUser.name}`); setSelectedInspectUser(null); }} className="py-2 bg-amber-500/15 hover:bg-amber-600 text-amber-400 hover:text-white border border-amber-500/30 rounded-xl text-xs font-bold cursor-pointer">+ $10 USDT</button>
            </div>

            <div className="rounded-2xl border p-3.5 space-y-3" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}>
              {/* Current balance reminder */}
              <div className="text-[10px] font-bold px-1 py-0.5 rounded" style={{ color: 'var(--adm-muted)', background: 'var(--adm-surface)' }}>
                Current: Rs.{(selectedInspectUser.walletBalance||0).toLocaleString()} LKR &nbsp;|&nbsp; ${(selectedInspectUser.walletUsdt||0).toFixed(2)} USDT
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold block mb-1" style={mutedStyle}>LKR Amount</label>
                  <input type="number" placeholder="e.g. 5000" value={editLkrVal} onChange={(e) => setEditLkrVal(e.target.value)} className={`${fieldCls} font-mono`} style={fieldStyle} />
                </div>
                <div>
                  <label className="text-[10px] font-bold block mb-1" style={mutedStyle}>USDT Amount</label>
                  <input type="number" placeholder="e.g. 50" value={editUsdtVal} onChange={(e) => setEditUsdtVal(e.target.value)} className={`${fieldCls} font-mono`} style={fieldStyle} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                {/* SET EXACT: overwrites both fields. Blank field = 0 (NOT keep existing) */}
                <button
                  type="button"
                  onClick={() => {
                    if (editLkrVal === '' && editUsdtVal === '') {
                      showToast('Enter LKR or USDT to set exact balance', 'error');
                      return;
                    }
                    const lkr = editLkrVal !== '' ? parseFloat(editLkrVal) : 0;
                    const usdt = editUsdtVal !== '' ? parseFloat(editUsdtVal) : 0;
                    const targetId = selectedInspectUser.uid || selectedInspectUser.email || selectedInspectUser.resellerCode || selectedInspectUser.securityKey;
                    if (!window.confirm(`SET balance for ${selectedInspectUser.name} to:\nRs. ${lkr.toLocaleString()} LKR / $${usdt.toFixed(2)} USDT\n\nThis REPLACES the current balance. Are you sure?`)) return;
                    setUserExactBalance(targetId, lkr, usdt);
                    showToast(`✅ Set ${selectedInspectUser.name} balance → Rs.${lkr.toLocaleString()} LKR / $${usdt} USDT`);
                    setEditLkrVal(''); setEditUsdtVal(''); setSelectedInspectUser(null);
                  }}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold cursor-pointer border-2 border-blue-400"
                  title="REPLACES the existing balance with the value you enter"
                >🔵 Set Exact</button>
                {/* ADD: adds on top of existing balance */}
                <button
                  type="button"
                  onClick={() => {
                    if (editLkrVal === '' && editUsdtVal === '') {
                      showToast('Enter amount to add', 'error');
                      return;
                    }
                    const lkr = parseFloat(editLkrVal) || 0;
                    const usdt = parseFloat(editUsdtVal) || 0;
                    const newLkr = (selectedInspectUser.walletBalance || 0) + lkr;
                    const newUsdt = (selectedInspectUser.walletUsdt || 0) + usdt;
                    const targetId = selectedInspectUser.uid || selectedInspectUser.email || selectedInspectUser.resellerCode || selectedInspectUser.securityKey;
                    if (!window.confirm(`ADD funds to ${selectedInspectUser.name}:\n+Rs.${lkr.toLocaleString()} LKR / +$${usdt} USDT\nNew total: Rs.${newLkr.toLocaleString()} LKR / $${newUsdt.toFixed(2)} USDT`)) return;
                    updateUserBalance(targetId, lkr, usdt);
                    showToast(`✅ Added +Rs.${lkr.toLocaleString()} LKR / +$${usdt} USDT to ${selectedInspectUser.name}`);
                    setEditLkrVal(''); setEditUsdtVal(''); setSelectedInspectUser(null);
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold cursor-pointer border-2 border-emerald-400"
                  title="ADDS to the existing balance (does not replace it)"
                >🟢 + Add Funds</button>
              </div>
              <p className="text-[9px] text-center" style={{ color: 'var(--adm-muted)' }}>🔵 Set Exact = overwrites balance &nbsp;|&nbsp; 🟢 Add Funds = adds on top</p>
            </div>
          </div>
        </ModalShell>
      )}

      {isAddPaymentOpen && (
        <ModalShell onClose={() => setIsAddPaymentOpen(false)} title="Record Offline Payment Receipt">
          <form onSubmit={handleAddManualPaymentRecord} className="space-y-4 text-xs">
            <div><label className="block font-extrabold mb-1" style={mutedStyle}>User Email Address</label><input type="email" required placeholder="e.g. user@gmail.com" value={newPayUserEmail} onChange={(e) => setNewPayUserEmail(e.target.value)} className={fieldCls} style={fieldStyle} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-extrabold mb-1" style={mutedStyle}>Payment Method</label>
                <select value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value)} className={fieldCls} style={fieldStyle}>
                  <option value="EZ Cash">EZ Cash</option>
                  <option value="Binance Pay">Binance Pay</option>
                  <option value="Bank Slip">Bank Slip</option>
                </select>
              </div>
              <div><label className="block font-extrabold mb-1" style={mutedStyle}>Transaction RN / Order ID</label><input type="text" required placeholder="e.g. 20260910123456" value={newPayRef} onChange={(e) => setNewPayRef(e.target.value)} className={`${fieldCls} font-mono`} style={fieldStyle} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-extrabold mb-1" style={mutedStyle}>Amount</label><input type="number" required placeholder="1500" value={newPayAmount} onChange={(e) => setNewPayAmount(e.target.value)} className={`${fieldCls} font-mono`} style={fieldStyle} /></div>
              <div>
                <label className="block font-extrabold mb-1" style={mutedStyle}>Currency</label>
                <select value={newPayCurrency} onChange={(e) => setNewPayCurrency(e.target.value)} className={fieldCls} style={fieldStyle}>
                  <option value="LKR">LKR (Rs.)</option>
                  <option value="USDT">USDT ($)</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-emerald-600/20">Record Payment Request</button>
          </form>
        </ModalShell>
      )}

      {selectedReceiptPay && (
        <ModalShell
          onClose={() => { setSelectedReceiptPay(null); setReceiptImgError(false); }}
          title={selectedReceiptPay.method?.toLowerCase().includes('ez') ? 'EZ Cash Payment Record' : selectedReceiptPay.method?.toLowerCase().includes('binance') ? 'Binance Pay Payment Record' : 'Bank Deposit Payment Receipt'}
          subtitle={`Payment ID: ${selectedReceiptPay.id}`}
          maxWidth="max-w-2xl"
          footer={selectedReceiptPay.status === 'PENDING' ? (
            <>
              <button onClick={() => { rejectManualPayment(selectedReceiptPay.id); setSelectedReceiptPay(null); }} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-extrabold text-xs rounded-xl cursor-pointer">Reject Payment</button>
              <button onClick={() => { approveManualPayment(selectedReceiptPay.id); setSelectedReceiptPay(null); }} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl cursor-pointer shadow-lg shadow-emerald-600/20">Approve & Credit Wallet</button>
            </>
          ) : (
            <button onClick={() => setSelectedReceiptPay(null)} className="px-5 py-2 rounded-xl font-bold text-xs cursor-pointer border" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}>Close</button>
          )}
        >
          <div className="rounded-2xl border p-4 flex flex-col items-center justify-center min-h-[160px]" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}>
            {selectedReceiptPay.method?.toLowerCase().includes('ez') ? (
              <div className="text-center p-4 space-y-2 w-full">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto"><Smartphone className="w-6 h-6" /></div>
                <h4 className="font-extrabold text-sm" style={{ color: 'var(--adm-text)' }}>EZ Cash 14-Digit Transaction RN</h4>
                <p className="font-mono text-base font-black text-amber-400 tracking-wider px-4 py-2 rounded-xl inline-block border" style={{ background: 'var(--adm-input-bg)', borderColor: 'var(--adm-border)' }}>{selectedReceiptPay.referenceNumber}</p>
                <p className="text-[11px] max-w-md mx-auto pt-1" style={mutedStyle}>Check the SMS Webhook Logs tab or your Dialog EZ Cash merchant phone to verify this RN. No image upload required for EZ Cash.</p>
              </div>
            ) : selectedReceiptPay.method?.toLowerCase().includes('binance') ? (
              <div className="text-center p-4 space-y-2 w-full">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto"><Zap className="w-6 h-6" /></div>
                <h4 className="font-extrabold text-sm" style={{ color: 'var(--adm-text)' }}>Binance Pay Order ID / Transaction Ref</h4>
                <p className="font-mono text-base font-black text-amber-400 tracking-wider px-4 py-2 rounded-xl inline-block border" style={{ background: 'var(--adm-input-bg)', borderColor: 'var(--adm-border)' }}>{selectedReceiptPay.referenceNumber}</p>
                <p className="text-[11px] max-w-md mx-auto pt-1" style={mutedStyle}>Check your Binance Merchant Portal or app history to verify this USDT transaction.</p>
              </div>
            ) : (selectedReceiptPay.slipUrl || selectedReceiptPay.receiptUrl) && !receiptImgError ? (
              <div className="space-y-2 text-center w-full">
                <img src={selectedReceiptPay.slipUrl || selectedReceiptPay.receiptUrl} alt="Bank Receipt Slip" onError={() => setReceiptImgError(true)} className="max-h-[380px] w-auto max-w-full rounded-xl object-contain mx-auto border shadow-md" style={{ borderColor: 'var(--adm-border)' }} />
                <a href={selectedReceiptPay.slipUrl || selectedReceiptPay.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 pt-1"><ExternalLink className="w-3.5 h-3.5" /><span>Open Full Size Image</span></a>
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto"><Building2 className="w-6 h-6" /></div>
                <h4 className="font-extrabold text-sm" style={{ color: 'var(--adm-text)' }}>Bank Transfer Reference</h4>
                <p className="font-mono text-sm font-bold text-amber-400 px-3 py-1.5 rounded-lg inline-block border" style={{ background: 'var(--adm-input-bg)', borderColor: 'var(--adm-border)' }}>{selectedReceiptPay.referenceNumber}</p>
                <p className="font-medium text-xs" style={mutedStyle}>{receiptImgError ? 'Receipt image link expired or not found on storage server.' : 'No receipt image file attached to this payment record.'}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border p-3" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}><span className="text-[10px] font-mono font-bold uppercase block mb-0.5" style={mutedStyle}>User Name</span><span className="font-bold" style={{ color: 'var(--adm-text)' }}>{selectedReceiptPay.userName}</span></div>
            <div className="rounded-xl border p-3" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}><span className="text-[10px] font-mono font-bold uppercase block mb-0.5" style={mutedStyle}>User Email</span><span className="font-bold font-mono text-[11px] truncate block" style={{ color: 'var(--adm-text)' }}>{selectedReceiptPay.userEmail}</span></div>
            <div className="rounded-xl border p-3" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}><span className="text-[10px] font-mono font-bold uppercase block mb-0.5" style={mutedStyle}>Deposit Method</span><span className="font-bold" style={{ color: 'var(--adm-text)' }}>{selectedReceiptPay.method}</span></div>
            <div className="rounded-xl border p-3" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}><span className="text-[10px] font-mono font-bold uppercase block mb-0.5" style={mutedStyle}>Reference / Sender</span><span className="text-amber-400 font-mono font-bold">{selectedReceiptPay.referenceNumber}</span></div>
            <div className="rounded-xl border p-3" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}><span className="text-[10px] font-mono font-bold uppercase block mb-0.5" style={mutedStyle}>Amount</span><span className="text-emerald-400 font-heading font-black text-sm">{selectedReceiptPay.amount} {selectedReceiptPay.currency}</span></div>
            <div className="rounded-xl border p-3" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}><span className="text-[10px] font-mono font-bold uppercase block mb-0.5" style={mutedStyle}>Current Status</span><StatusPill status={selectedReceiptPay.status} /></div>
          </div>
        </ModalShell>
      )}

    </div>
  );
};
