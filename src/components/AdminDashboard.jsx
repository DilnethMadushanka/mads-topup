import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { checkMoongoldBalance } from '../services/moongoldApi';
import { uploadToR2Storage } from '../services/storageService';
import { SupportDesk, SupportDeskStats } from './admin/SupportDesk';
import { FfAccountsAdmin } from './admin/FfAccountsAdmin';
import { ProfitReport } from './admin/ProfitReport';
import { OrdersDesk, OrderDetail, orderNeedsAction } from './admin/OrdersDesk';
import { DepositsDesk, DepositDetail, RecordDepositSheet } from './admin/DepositsDesk';
import { UsersDesk, UserDetail, WalletCreditPage } from './admin/UsersDesk';
import { VouchersDesk, VoucherDetail } from './admin/VouchersDesk';
import { ResellersDesk, ResellerDetail } from './admin/ResellersDesk';
import { sortOrdersNewestFirst } from '../utils/ownership';
import { newUsersToday, sriLankaTime, signupTime } from '../utils/newUsersToday';
import { getAllPopupBanners, emptyPopupBanner, MAX_POPUP_BANNERS } from '../utils/popupBanners';
import {
  X, ShieldCheck, DollarSign, RefreshCw,
  CheckCircle2, Clock, Zap, Save, Eye, EyeOff, Cloud, UploadCloud,
  Users, Ticket, Megaphone, Search, Plus, Trash2,
  AlertTriangle, Lock,
  BadgeCheck, UserCheck, UserX, FileCheck, ExternalLink, Menu, Headset,
  Smartphone, Copy, Crown, Mail, Building2, Sparkles, ArrowRight, Loader2,
  LayoutDashboard, PanelLeftClose, PanelLeftOpen, Moon, Sun, Bell, LogOut,
  ArrowUp, ArrowDown, ChevronsUpDown, ShoppingCart,
  Gamepad2, Command, Inbox, LayoutGrid, Star, TrendingUp
} from 'lucide-react';

/* ============================================================
   SHARED PRIMITIVES — small, dependency-free building blocks
   reused across every tab of the admin panel.
   ============================================================ */

const fieldCls = "w-full px-4 py-2.5 rounded-xl border-2 text-xs font-bold focus:outline-none focus:border-[#1677ff] transition-all disabled:opacity-50";
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
  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border inline-flex items-center gap-1.5 whitespace-nowrap ${STATUS_STYLES[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current" />
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
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-1.5 self-stretch min-h-[40px] rounded-full bg-gradient-to-b from-[#3b8cff] to-[#0b5ed7] shrink-0" />
      <div className="min-w-0">
        <h3 className="text-lg sm:text-xl font-black font-heading flex items-center gap-2" style={{ color: 'var(--adm-text)' }}>
          {Icon && <Icon className="w-5 h-5 text-red-500" />}
          <span>{title}</span>
        </h3>
        {subtitle && <p className="text-xs mt-0.5 font-medium" style={mutedStyle}>{subtitle}</p>}
      </div>
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
  <div className="rounded-2xl border-2 p-3.5 flex flex-col sm:flex-row gap-3 sm:items-center" style={cardStyle}>
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
      className={`w-12 h-6 rounded-full transition-colors relative p-1 shrink-0 cursor-pointer ${checked ? 'bg-[#1677ff] shadow-md shadow-blue-600/30' : 'bg-slate-400/40'}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

const ModalShell = ({ onClose, title, subtitle, icon: Icon, children, maxWidth = 'max-w-lg', footer }) => (
  <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div className={`w-full ${maxWidth} rounded-t-3xl sm:rounded-3xl border-2 p-5 sm:p-6 space-y-4 relative shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden`} style={cardStyle}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#3b8cff] via-[#1677ff] to-[#0b5ed7]" />
      <div className="flex items-center justify-between pb-3 border-b shrink-0" style={{ borderColor: 'var(--adm-border)' }}>
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-[#1677ff] flex items-center justify-center text-white shadow-md shadow-blue-600/25 shrink-0">
              <Icon className="w-5 h-5" />
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

// Fallback when R2 is unreachable: shrink the picture so the embedded data-URL stays small
// (webp keeps transparency for PNG posters).
const compressImageToDataUrl = (file, maxSide = 900) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const keepsAlpha = /png|webp|gif/.test(file.type);
    resolve(keepsAlpha ? canvas.toDataURL('image/webp', 0.85) : canvas.toDataURL('image/jpeg', 0.82));
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not decode image')); };
  img.src = url;
});

const AreaChart = ({ data, color = '#1677ff', height = 88, showDots = true }) => {
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
      {showDots && points.map((p, i) => (
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

const StatCard = ({ icon: Icon, label, value, valueCls = '', sub, subCls = '', tint = 'bg-red-500/15 text-red-500', action, span = '' }) => (
  <div className={`relative rounded-2xl border-2 p-5 overflow-hidden group transition-all hover:-translate-y-0.5 hover:shadow-lg ${span}`} style={cardStyle}>
    <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#1677ff]/5 group-hover:bg-[#1677ff]/10 transition-colors pointer-events-none" />
    <div className="relative flex items-start justify-between gap-3">
      <div className="min-w-0">
        <span className="text-[10px] font-black uppercase tracking-wider block" style={mutedStyle}>{label}</span>
        <h4 className={`text-2xl font-black font-heading mt-1.5 ${valueCls}`} style={valueCls ? undefined : { color: 'var(--adm-text)' }}>{value}</h4>
        {sub && <span className={`text-[10px] font-bold mt-1.5 inline-block ${subCls}`} style={subCls ? undefined : faintStyle}>{sub}</span>}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tint}`}><Icon className="w-5 h-5" /></div>
        {action}
      </div>
    </div>
  </div>
);

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
    <div className="rounded-2xl border-2 overflow-hidden min-w-0" style={cardStyle}>
      {/* Phones: one card per row (no sideways scrolling) */}
      <div className="md:hidden divide-y" style={{ borderColor: 'var(--adm-border)' }}>
        {pageRows.length === 0 ? (
          <div className="p-8 text-center text-xs font-semibold" style={faintStyle}>{emptyMessage}</div>
        ) : pageRows.map(row => (
          <div key={row[rowKey]} className="p-4 space-y-2.5">
            {columns.filter(col => col.key !== 'actions').map(col => (
              <div key={col.key} className="flex items-start justify-between gap-3 text-xs">
                <span className="text-[10px] font-black uppercase tracking-wider font-mono pt-0.5 shrink-0 max-w-[40%]" style={faintStyle}>{col.label}</span>
                <div className="min-w-0 text-right break-words font-medium">{col.render ? col.render(row) : row[col.key]}</div>
              </div>
            ))}
            {columns.filter(col => col.key === 'actions').map(col => (
              <div key={col.key} className="pt-2.5 border-t flex justify-end" style={{ borderColor: 'var(--adm-border)' }}>
                {col.render ? col.render(row) : row[col.key]}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto -mx-px">
        <table className="w-full text-left text-xs">
          <thead style={{ background: 'var(--adm-surface-2)' }} className="uppercase font-mono text-[10px] tracking-wider">
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
        <div className="flex flex-col min-[420px]:flex-row items-center justify-between gap-2 px-4 py-3 border-t text-[11px] font-mono" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}>
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
    { id: 'profit', label: 'Daily Profit', icon: TrendingUp },
    { id: 'deposits', label: 'Deposit Verifier', icon: FileCheck, badgeKey: 'payments' },
    { id: 'ezcash', label: 'EZ Cash Logs', icon: Smartphone, badgeKey: 'ezcash' },
    { id: 'vouchers', label: 'Promo Vouchers', icon: Ticket }
  ]},
  { label: 'Customers', items: [
    { id: 'users', label: 'User Accounts', icon: Users },
    { id: 'credit', label: 'Wallet Credit', icon: DollarSign },
    { id: 'resellers', label: 'Reseller Network', icon: Crown, badgeKey: 'resellers' },
    { id: 'support', label: 'Support Desk', icon: Headset, badgeKey: 'tickets' },
    { id: 'reviews', label: 'Reviews', icon: Star }
  ]},
  { label: 'Catalog & Marketing', items: [
    { id: 'games', label: 'Game Prices', icon: Gamepad2 },
    { id: 'popupAd', label: 'Popup Banner', icon: Sparkles },
    { id: 'gameStrip', label: 'Games Bar', icon: LayoutGrid },
    { id: 'ffAccounts', label: 'FF Accounts', icon: UserCheck },
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
  profit: ['Daily Profit', 'Completed top-ups each day: sale price against MooGold cost'],
  deposits: ['Deposit Verifier', 'Check each deposit, then credit the wallet or reject it'],
  ezcash: ['Dialog EZ Cash Webhook Logs', 'Live SMS records received from the phone forwarder gateway'],
  vouchers: ['Promo Vouchers', 'Create codes, watch how they are used, pause or change them'],
  users: ['Customers', 'Find a customer, see their orders and wallet, verify or block them'],
  credit: ['Wallet Credit', "Add to, deduct from or set a customer's wallet, with a reason for every change"],
  resellers: ['Reseller Network', 'Check the joining deposit, then approve, reject or suspend resellers'],
  support: ['Support Desk', 'Live customer support tickets & chat'],
  reviews: ['Customer Reviews', 'Read and delete the feedback shown on the Reviews page'],
  games: ['Game Catalog & Live Price Manager', 'Edit retail prices — publish instantly to web & Telegram bot'],
  popupAd: ['Popup Banner Ad Manager', 'Configure the promotional popup shown to visitors'],
  gameStrip: ['Discover Games Bar', 'Choose the game icons shown in the scrolling bar on the home page'],
  ffAccounts: ['Free Fire Accounts for Sale', 'List, edit and remove the FF accounts shown under Other Services'],
  announcement: ['Ticker Notice Banner', 'Update the marquee text shown across the website header'],
  moongold: ['Moongold Supplier Gateway', 'Configure live API credentials and automated dispatch'],
  r2: ['Cloudflare R2 Object Storage', 'Configure the bucket endpoint used for receipts & assets']
};

export const AdminDashboard = () => {
  const {
    isAdminOpen, setIsAdminOpen, orders, updateOrderStatus, moongoldConfig, updateMoongoldConfig,
    r2Config, updateR2Config, formatPrice,
    formatLkr, showToast, userProfile, vouchers, addVoucher, updateVoucher, deleteVoucher, fetchVoucherLog,
    tickerNotice, updateTickerNotice, usersList, verifyUserAccount, toggleBlockUser, adjustUserWallet,
    fetchAdminWalletLog, manualPayments, approveManualPayment, rejectManualPayment, recordOfflinePayment,
    supportTickets, sendTicketMessage, updateTicketStatus, updateTicketPriority, resellerApplications,
    updateResellerApplicationStatus, resendResellerEmail, gamesCatalog, updateGamePrices, popupAdConfig, updatePopupAdConfig,
    gameStripConfig, updateGameStripConfig, ffAccounts, userReviews, deleteReview,
    isAdminAuthenticated, setIsAdminAuthenticated, setResellerTier, fetchResellerDeposit
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
  const [revenueDays, setRevenueDays] = useState(7);
  const [theme, setTheme] = useState(() => {
    // Saved admin choice first; otherwise follow the device, like the storefront.
    try {
      const saved = localStorage.getItem('mads_admin_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch { return 'light'; }
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== 'undefined' && localStorage.getItem('mads_admin_sidebar_collapsed') === 'true');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  const [selectedReceiptPay, setSelectedReceiptPay] = useState(null);

  const [editedPricesMap, setEditedPricesMap] = useState({});
  const [selectedGameCatalogId, setSelectedGameCatalogId] = useState('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [isSavingPrices, setIsSavingPrices] = useState(false);

  const [adEnabled, setAdEnabled] = useState(popupAdConfig?.enabled ?? true);
  const [adBanners, setAdBanners] = useState(() => {
    const list = getAllPopupBanners(popupAdConfig);
    return list.length ? list : [{ ...emptyPopupBanner(), badge: 'LIMITED TIME DEAL' }];
  });
  const [adShowOncePerSession, setAdShowOncePerSession] = useState(popupAdConfig?.showOncePerSession ?? false);
  const [isSavingAd, setIsSavingAd] = useState(false);
  const [uploadingAdIdx, setUploadingAdIdx] = useState(null);

  const [stripEnabled, setStripEnabled] = useState(gameStripConfig?.enabled ?? true);
  const [stripTitle, setStripTitle] = useState(gameStripConfig?.title || 'Discover More Games');
  const [stripItems, setStripItems] = useState(gameStripConfig?.items || []);
  const [isSavingStrip, setIsSavingStrip] = useState(false);
  const [uploadingStripIdx, setUploadingStripIdx] = useState(null);
  const [stripAddGameId, setStripAddGameId] = useState('');

  const [supportSearch, setSupportSearch] = useState('');
  const [supportStatusFilter, setSupportStatusFilter] = useState('ALL');

  const [orderSearch, setOrderSearch] = useState('');
  const [selectedInspectOrder, setSelectedInspectOrder] = useState(null);

  const [userSearch, setUserSearch] = useState('');
  const [userSortOrder, setUserSortOrder] = useState('newest');
  const [selectedInspectUser, setSelectedInspectUser] = useState(null);

  const [paymentSearch, setPaymentSearch] = useState('');

  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

  const [apiKeyInput, setApiKeyInput] = useState(moongoldConfig.apiKey);
  const [secretKeyInput, setSecretKeyInput] = useState(moongoldConfig.secretKey);
  const [baseUrlInput, setBaseUrlInput] = useState(moongoldConfig.baseUrl);
  const [autoFulfillInput, setAutoFulfillInput] = useState(moongoldConfig.autoFulfill);
  const [simModeInput, setSimModeInput] = useState(moongoldConfig.simulationMode);
  const [showSecret, setShowSecret] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  const [r2UrlInput, setR2UrlInput] = useState(r2Config?.bucketUrl || 'https://bfda3f43ac31b00be80bcb82772eb8fa.r2.cloudflarestorage.com/mads-topup');
  const [r2BucketName, setR2BucketName] = useState(r2Config?.bucketName || 'mads-topup');
  const [isTestingR2, setIsTestingR2] = useState(false);


  const [selectedVoucherCode, setSelectedVoucherCode] = useState(null);
  const [reviewSearch, setReviewSearch] = useState('');
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  const [tickerNoticeInput, setTickerNoticeInput] = useState(tickerNotice);

  const [ezcashLogs, setEzcashLogs] = useState([]);
  const [isEzcashLogsLoading, setIsEzcashLogsLoading] = useState(false);
  const [ezcashSearch, setEzcashSearch] = useState('');
  const [ezcashStatusFilter, setEzcashStatusFilter] = useState('ALL');

  const [resellerSearch, setResellerSearch] = useState('');
  const [selectedResellerAppId, setSelectedResellerAppId] = useState(null);

  const fetchEzcashLogs = async () => {
    try {
      setIsEzcashLogsLoading(true);
      const res = await fetch('/api/ezcash/webhook-logs');
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
      const list = getAllPopupBanners(popupAdConfig);
      setAdBanners(list.length ? list : [{ ...emptyPopupBanner(), badge: 'LIMITED TIME DEAL' }]);
      setAdShowOncePerSession(popupAdConfig.showOncePerSession ?? false);
    }
  }, [popupAdConfig]);

  useEffect(() => {
    if (gameStripConfig) {
      setStripEnabled(gameStripConfig.enabled ?? true);
      setStripTitle(gameStripConfig.title || 'Discover More Games');
      setStripItems(gameStripConfig.items || []);
    }
  }, [gameStripConfig]);

  // On every open: ask the server whether the HttpOnly admin session cookie
  // is still valid. The page itself never sees the token.
  useEffect(() => {
    if (!isAdminOpen) return;
    // Tokens from before the cookie login are useless now; remove them.
    try {
      localStorage.removeItem('mads_admin_session_token');
      localStorage.removeItem('mads_admin_session_expires');
    } catch (_) {}
    setIsVerifyingSession(true);
    fetch('/api/admin/verify-session')
      .then(r => r.ok ? r.json() : { valid: false })
      .then(data => setIsAdminAuthenticated(Boolean(data?.valid)))
      // Server unreachable — deny access.
      .catch(() => setIsAdminAuthenticated(false))
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
    try {
      // The server sets the session as an HttpOnly cookie on this site, so
      // the login must go to this same origin.
      const data = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: loginPayload
      }).then(r => r.json().catch(() => ({})).then(d => (r.ok ? d : Promise.reject(new Error(d?.error || 'Server is not reachable right now. Please try again.')))));

      if (data?.success) {
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
        setAdminAuthError(`${err?.message || 'Invalid Admin Email, Password, or 2FA Security Code!'} Attempt ${nextFailures}/3.`);
        showToast('Invalid Admin Security Credentials', 'error');
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setIsAdminOpen(false);
    showToast('Logged out from Admin Portal.');
    // The server revokes the session and clears the cookie.
    fetch('/api/admin/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } }).catch(() => {});
  };

  if (isVerifyingSession) {
    return (
      <div className={`mads-admin ${themeClass} fixed inset-0 z-50 w-screen h-screen flex items-center justify-center`} style={{ background: 'var(--adm-bg)', color: 'var(--adm-text)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#1677ff] to-[#5aa8ff] flex items-center justify-center shadow-xl shadow-blue-600/40">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div className="w-6 h-6 border-2 border-[#1677ff] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono" style={{ color: 'var(--adm-text-muted)' }}>Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return (
      <div className={`mads-admin adm-login ${themeClass} fixed inset-0 z-50 w-screen h-screen overflow-y-auto overflow-x-hidden`}>
        <div className="adm-login-wrap">
          <div className="adm-login-card">
            <button
              type="button"
              onClick={() => setIsAdminOpen(false)}
              className="adm-login-exit"
              title="Return to Main Website"
            >
              <X className="w-4 h-4" />
              <span>Exit</span>
            </button>

            <div className="adm-login-head">
              <div className="adm-login-logo"><img src="/mads-icon-192.png" alt="MADS TOPUP" /></div>
              <span className="adm-login-pill"><span className="adm-login-dot" />Secure admin</span>
              <h2 className="adm-login-title">MADS <span>TOPUP</span> Admin</h2>
              <p className="adm-login-sub">Sign in with your admin email, password and Authenticator code.</p>
            </div>

            {adminAuthError && (
              <div className="adm-login-error" role="alert">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{adminAuthError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLoginSubmit} className="adm-login-form">
              <label className="adm-login-field">
                <span className="adm-login-label">Email</span>
                <span className="adm-login-input">
                  <Mail />
                  <input type="email" required autoComplete="username" value={adminAuthEmail} onChange={(e) => setAdminAuthEmail(e.target.value)} placeholder="admin@email.com" />
                </span>
              </label>

              <label className="adm-login-field">
                <span className="adm-login-label">Password</span>
                <span className="adm-login-input">
                  <Lock />
                  <input type={showAdminAuthPassword ? 'text' : 'password'} required autoComplete="current-password" value={adminAuthPassword} onChange={(e) => setAdminAuthPassword(e.target.value)} placeholder="Enter password" />
                  <button type="button" onClick={() => setShowAdminAuthPassword(!showAdminAuthPassword)} className="adm-login-eye" aria-label={showAdminAuthPassword ? 'Hide password' : 'Show password'}>
                    {showAdminAuthPassword ? <EyeOff /> : <Eye />}
                  </button>
                </span>
              </label>

              <label className="adm-login-field">
                <span className="adm-login-label">
                  Authenticator code
                  <em>Google / Microsoft Authenticator</em>
                </span>
                <span className="adm-login-input is-code">
                  <Smartphone />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoComplete="one-time-code"
                    value={adminAuthSecurityCode}
                    onChange={(e) => setAdminAuthSecurityCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                  />
                </span>
              </label>

              <button type="submit" disabled={isLoginLoading} className="adm-login-btn">
                {isLoginLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying…</span></>
                  : <><span>Log in</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <div className="adm-login-foot">
              <Lock className="w-3.5 h-3.5" />
              <span>Protected by 2-step verification</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Lists can hold stray null / non-object entries from the database; skip them.
  const objList = (v) => (Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : []);
  // Newest first: order ids are random, so database order buries new orders.
  const safeOrders = sortOrdersNewestFirst(objList(orders));
  const safeUsers = objList(usersList);
  const safePayments = objList(manualPayments);
  const safeTickets = objList(supportTickets);
  const safeResellerApps = objList(resellerApplications);
  const safeVouchers = objList(vouchers);

  const completedOrders = safeOrders.filter(o => o.status === 'COMPLETED');
  const totalRevenueLkr = completedOrders.reduce((sum, o) => sum + (o.priceLkr || 0), 0);
  // Includes bank / EZ Cash orders waiting for their payment slip to be checked.
  const pendingCount = safeOrders.filter(orderNeedsAction).length;
  const pendingPaymentsCount = safePayments.filter(d => d.status === 'PENDING').length;
  const openTicketsCount = safeTickets.filter(t => t && t.status === 'OPEN').length;
  const pendingResellersCount = safeResellerApps.filter(a => a.status === 'PENDING').length;

  // Today's new registrations (Sri Lanka day, one entry per person)
  const todayNewUsers = newUsersToday(safeUsers);

  const badges = {
    pending: pendingCount,
    payments: pendingPaymentsCount,
    ezcash: ezcashLogs.length,
    resellers: pendingResellersCount,
    tickets: openTicketsCount
  };

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

  const updateAdBanner = (idx, patch) => setAdBanners(prev => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  const moveAdBanner = (idx, dir) => {
    setAdBanners(prev => {
      const to = idx + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  };
  const removeAdBanner = (idx) => setAdBanners(prev => prev.filter((_, i) => i !== idx));
  const addAdBanner = () => {
    if (adBanners.length >= MAX_POPUP_BANNERS) return;
    setAdBanners(prev => [...prev, emptyPopupBanner()]);
  };

  const handleAdImageFileUpload = async (idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP)!', 'error');
      return;
    }
    setUploadingAdIdx(idx);
    try {
      // Store the picture in R2 and keep only its URL in the popup config — never the raw file.
      let uploaded = null;
      try { uploaded = await uploadToR2Storage(file, 'popup_ads'); } catch (r2Err) { uploaded = null; }

      if (uploaded?.success && uploaded.url) {
        updateAdBanner(idx, { imageUrl: uploaded.url });
        showToast('Image uploaded to storage & applied! ☁️');
      } else {
        // R2 unreachable: embed a compressed copy so the popup still works, but say so.
        try {
          const dataUrl = await compressImageToDataUrl(file);
          if (dataUrl.length > 700000) throw new Error('too large');
          updateAdBanner(idx, { imageUrl: dataUrl });
          showToast('Storage upload unavailable — applied a compressed copy instead. Re-upload later for best results.');
        } catch (cErr) {
          showToast(uploaded?.error || 'Image upload failed. Try a smaller image or paste a direct URL.', 'error');
        }
      }
    } catch (err) {
      console.error('Image upload error:', err);
      showToast('Failed to upload image file.', 'error');
    } finally {
      setUploadingAdIdx(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleSavePopupAd = async (e) => {
    if (e) e.preventDefault();
    const filled = (b) => b.imageUrl.trim() || b.title.trim() || b.description.trim();
    const emptyIdx = adBanners.findIndex(b => b.enabled && !filled(b));
    if (emptyIdx !== -1) {
      showToast(`Banner ${emptyIdx + 1}: upload an image (or hide the banner).`, 'error');
      return;
    }
    if (adEnabled && !adBanners.some(b => b.enabled)) {
      showToast('Switch on at least one banner before publishing the popup.', 'error');
      return;
    }
    const bigIdx = adBanners.findIndex(b => b.imageUrl.startsWith('data:') && b.imageUrl.length > 700000);
    if (bigIdx !== -1) {
      showToast(`Banner ${bigIdx + 1}: image is too large to publish. Upload it again (it is stored as a URL) or use a smaller file.`, 'error');
      return;
    }
    setIsSavingAd(true);
    const success = await updatePopupAdConfig({
      enabled: adEnabled, showOncePerSession: adShowOncePerSession,
      banners: adBanners.map(b => ({ ...b, imageUrl: b.imageUrl.trim() })),
    });
    setIsSavingAd(false);
    if (success) showToast('🎉 POPUP BANNER AD UPDATED & PUBLISHED LIVE TO WEBSITE!');
    else showToast('Failed to save Popup Ad configuration.', 'error');
  };

  // ── Games Bar (home page "Discover more games" strip) ──
  const STRIP_PAGE_LINKS = [
    { value: '#catalog', label: 'Open Game Catalog' },
    { value: '#wallet', label: 'Open Deposit Wallet' },
    { value: '#referral', label: 'Open Referral Page' },
    { value: '#reseller', label: 'Open Reseller Program' },
    { value: '#support', label: 'Open Live Support Chat' },
  ];
  const stripGameItem = (game) => ({ name: game.name, imageUrl: game.logo || game.banner || '', link: `#game:${game.id}` });
  const updateStripItem = (idx, patch) => setStripItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const moveStripItem = (idx, dir) => setStripItems(prev => {
    const next = [...prev];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return prev;
    [next[idx], next[j]] = [next[j], next[idx]];
    return next;
  });

  const handleStripImageUpload = async (idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please select a valid image file (PNG, JPG, WEBP)!', 'error'); return; }
    setUploadingStripIdx(idx);
    try {
      let uploaded = null;
      try { uploaded = await uploadToR2Storage(file, 'game_strip'); } catch (r2Err) { uploaded = null; }
      if (uploaded?.success && uploaded.url) {
        updateStripItem(idx, { imageUrl: uploaded.url });
        showToast('Icon uploaded ☁️');
      } else {
        const dataUrl = await compressImageToDataUrl(file, 200);
        updateStripItem(idx, { imageUrl: dataUrl });
        showToast('Storage upload unavailable — applied a small compressed copy instead.');
      }
    } catch (err) {
      showToast(err?.message || 'Icon upload failed.', 'error');
    } finally {
      setUploadingStripIdx(null);
      if (e.target) e.target.value = '';
    }
  };

  // FF account screenshots: R2 first, a compressed copy if storage is down.
  const uploadFfAccountImage = async (file) => {
    let uploaded = null;
    try { uploaded = await uploadToR2Storage(file, 'ff_accounts'); } catch { uploaded = null; }
    if (uploaded?.success && uploaded.url) return uploaded.url;
    showToast('Storage upload unavailable — applied a compressed copy instead.');
    return compressImageToDataUrl(file, 1000);
  };

  const handleSaveGameStrip = async () => {
    const items = stripItems.filter(it => String(it.imageUrl || '').trim());
    if (items.length !== stripItems.length) { showToast('Every game in the bar needs an icon image.', 'error'); return; }
    if (items.some(it => !/^(#|\/(?![\/\\])|https:\/\/)/i.test(String(it.link || '')))) { showToast('Each link must start with #, / or https://', 'error'); return; }
    if (items.length > 40) { showToast('Max 40 games in the bar.', 'error'); return; }
    setIsSavingStrip(true);
    const ok = await updateGameStripConfig({ enabled: stripEnabled, title: stripTitle, items });
    setIsSavingStrip(false);
    if (ok) showToast('🎮 GAMES BAR UPDATED & PUBLISHED LIVE!');
    else showToast('Failed to publish the games bar. Check your admin session and try again.', 'error');
  };

  const handleSaveMoongoldSettings = () => {
    updateMoongoldConfig({ ...moongoldConfig, apiKey: apiKeyInput, secretKey: secretKeyInput, baseUrl: baseUrlInput, autoFulfill: autoFulfillInput, simulationMode: simModeInput });
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

  const handleSaveNoticeSubmit = async (e) => {
    e.preventDefault();
    const ok = await updateTickerNotice(tickerNoticeInput);
    if (ok) showToast('Ticker notice updated live across the website!');
    else showToast('Ticker notice was not saved. Please log in to admin again and retry.', 'error');
  };

  const revenueTrend = (() => {
    const days = revenueDays;
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
  const revenueDailyAvg = revenueTrendTotal / Math.max(1, revenueTrend.length);
  const revenueBestDay = revenueTrend.reduce((best, b) => (b.total > best.total ? b : best), revenueTrend[0] || { total: 0, date: new Date() });
  const revenueLabelStep = Math.max(1, Math.ceil(revenueTrend.length / 8));

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
  // Each row says whose account it is and opens its details when tapped.
  safeOrders.slice(0, 25).forEach(o => activityFeed.push({ id: `ord-${o.id || o.key}`, ts: o.createdAt, icon: ShoppingCart, color: '#38bdf8', title: `Order ${o.id || '(no ID)'} — ${o.gameName || 'Top-up'}`, sub: `${o.userEmail || o.userId || 'Unknown account'} • ${o.paymentMethod || 'Unknown payment'} • ${o.status || 'NO STATUS'} • ${formatLkr(o.priceLkr)}`, onOpen: () => setSelectedInspectOrder(o) }));
  safePayments.slice(0, 25).forEach(p => activityFeed.push({ id: `pay-${p.id}`, ts: p.createdAt, icon: FileCheck, color: '#34d399', title: `Deposit ${p.id} — ${p.userName || p.userEmail || 'Customer'}`, sub: `${p.userEmail || p.userId || 'Unknown account'} • ${p.method} • ${p.amount} ${p.currency} • ${p.status}`, onOpen: () => setSelectedReceiptPay(p) }));
  safeTickets.slice(0, 25).forEach(t => activityFeed.push({ id: `tck-${t.id}`, ts: t.updatedAt || t.createdAt, icon: Headset, color: '#fb7185', title: `Ticket ${t.id} — ${t.subject}`, sub: `${t.userEmail || t.userName || ''}${t.userEmail || t.userName ? ' • ' : ''}${t.status} • Priority ${t.priority}`, onOpen: () => setAdminTab('support') }));
  safeResellerApps.slice(0, 25).forEach(a => activityFeed.push({ id: `app-${a.id || a.firestoreId}`, ts: a.submittedAt, icon: Crown, color: '#fbbf24', title: `Reseller Application — ${a.storeName}`, sub: `${a.emailAddress || a.email || ''}${a.emailAddress || a.email ? ' • ' : ''}${a.status}`, onOpen: () => setAdminTab('resellers') }));
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
      <div className="px-3 sm:px-5 py-3 border-b flex items-center justify-between gap-3 shrink-0 relative" style={{ background: 'var(--adm-surface)', borderColor: 'var(--adm-border)' }}>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#3b8cff] via-[#1677ff]/60 to-transparent pointer-events-none" />
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} className="lg:hidden p-2 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }} title="Toggle Menu">
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden lg:flex p-2 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }} title="Toggle Sidebar">
            {sidebarCollapsed ? <PanelLeftOpen className="w-4.5 h-4.5" /> : <PanelLeftClose className="w-4.5 h-4.5" />}
          </button>
          <img src="/mads-icon-192.png" alt="MADS TOPUP" width="40" height="40" className="w-10 h-10 shrink-0 drop-shadow-[0_6px_14px_rgba(22,119,255,0.35)]" />
          <div className="min-w-0 hidden sm:block">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-black font-heading tracking-tight truncate" style={{ color: 'var(--adm-text)' }}>MADS ADMIN</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#1677ff] text-white text-[9px] font-mono font-bold shrink-0">v4.0</span>
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
            <div className="absolute top-full mt-2 left-0 right-0 rounded-2xl border-2 shadow-2xl overflow-hidden z-20" style={cardStyle}>
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
              <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 rounded-2xl border-2 shadow-2xl overflow-hidden z-30" style={cardStyle}>
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
          className={`${sidebarCollapsed ? 'w-[72px]' : 'w-64'} border-r p-3 pt-4 overflow-y-auto shrink-0 transition-all duration-200 z-50 lg:z-auto ${isMobileSidebarOpen ? 'fixed inset-y-0 left-0 top-0 shadow-2xl block w-64' : 'hidden lg:block'}`}
          style={{ background: 'var(--adm-surface)', borderColor: 'var(--adm-border)' }}
        >
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-3">
              {!sidebarCollapsed && <div className="px-2.5 mb-1.5 text-[10px] font-black uppercase tracking-widest font-mono flex items-center gap-2" style={faintStyle}><span className="w-3 h-0.5 rounded-full bg-[#1677ff]" />{group.label}</div>}
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
                      className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${active ? 'bg-gradient-to-r from-[#1677ff] to-[#3b8cff] text-white shadow-lg shadow-blue-600/30' : 'hover:bg-[var(--adm-surface-hover)] hover:translate-x-0.5'}`}
                      style={!active ? mutedStyle : undefined}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </span>
                      {!sidebarCollapsed && badge > 0 && (
                        <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full shrink-0 ${active ? 'bg-white/25 text-white' : 'bg-[#1677ff] text-white'}`}>{badge}</span>
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

              {/* Welcome banner — summarises the live counters already computed above */}
              <div className="relative rounded-3xl border-2 p-5 sm:p-7 overflow-hidden" style={cardStyle}>
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#3b8cff] via-[#1677ff] to-[#0b5ed7]" />
                <div className="absolute -top-20 -right-12 w-72 h-72 rounded-full bg-[#1677ff]/5 pointer-events-none" />
                <div className="absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-[#1677ff]/5 pointer-events-none" />
                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1677ff]/10 border border-[#1677ff]/20 text-[#1677ff] text-[10px] font-black uppercase tracking-widest font-mono mb-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black font-heading tracking-tight" style={{ color: 'var(--adm-text)' }}>Welcome back, Admin</h3>
                    <p className="text-sm font-medium mt-1" style={mutedStyle}>
                      {(pendingCount + pendingPaymentsCount + openTicketsCount + pendingResellersCount) > 0
                        ? `${pendingCount + pendingPaymentsCount + openTicketsCount + pendingResellersCount} items need your attention right now.`
                        : 'Everything is up to date — nothing is waiting on you.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { label: 'Orders', count: pendingCount, tab: 'orders' },
                      { label: 'Deposits', count: pendingPaymentsCount, tab: 'deposits' },
                      { label: 'Tickets', count: openTicketsCount, tab: 'support' },
                      { label: 'Resellers', count: pendingResellersCount, tab: 'resellers' }
                    ].map(q => (
                      <button key={q.tab} onClick={() => setAdminTab(q.tab)} className="text-left px-4 py-3 rounded-2xl border-2 hover:border-[#1677ff]/50 hover:-translate-y-0.5 transition-all cursor-pointer" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}>
                        <div className={`text-2xl font-black font-heading leading-none ${q.count > 0 ? 'text-[#1677ff]' : ''}`} style={q.count > 0 ? undefined : { color: 'var(--adm-text)' }}>{q.count}</div>
                        <div className="text-[10px] font-black uppercase tracking-wider mt-1" style={mutedStyle}>{q.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard icon={DollarSign} label="Gross Revenue" value={formatLkr(totalRevenueLkr)} valueCls="text-emerald-400" sub={`${completedOrders.length} completed orders`} tint="bg-emerald-500/15 text-emerald-500" />
                <StatCard icon={Users} label="Total User Accounts" value={safeUsers.length} sub={`${safeUsers.filter(u => u.isVerified).length} verified accounts`} subCls="text-blue-400" tint="bg-blue-500/15 text-blue-500" />
                <StatCard icon={FileCheck} label="Manual Verifications Queue" value={`${pendingPaymentsCount} Pending`} valueCls="text-amber-400" sub="EZ Cash RN / Binance Order IDs" subCls="text-amber-500" tint="bg-amber-500/15 text-amber-500" />
                <StatCard
                  icon={Zap}
                  label={liveMoongoldBalance.isRealtime ? 'Moongold Live Balance' : 'Total System Wallet Balance'}
                  value={liveMoongoldBalance.isRealtime ? `Rs. ${liveMoongoldBalance.balanceLkr.toLocaleString()}` : `Rs. ${safeUsers.reduce((sum, u) => sum + (parseFloat(u.walletBalance) || 0), 0).toLocaleString()}`}
                  valueCls="text-sky-400"
                  sub={liveMoongoldBalance.isRealtime ? `$${liveMoongoldBalance.balanceUsd} USDT ${liveMoongoldBalance.lastFetched ? `• Updated ${liveMoongoldBalance.lastFetched}` : '• Auto-Synced'}` : 'Total balance across all users'}
                  subCls="text-sky-500"
                  tint="bg-sky-500/15 text-sky-500"
                  action={
                    <button onClick={fetchLiveBalance} style={mutedStyle} title="Refresh Live Balance" className="p-1 rounded-lg hover:bg-[var(--adm-surface-hover)] cursor-pointer">
                      <RefreshCw className={`w-3.5 h-3.5 ${liveMoongoldBalance.isLoading ? 'animate-spin text-amber-400' : ''}`} />
                    </button>
                  }
                />
                <StatCard icon={Headset} label="Open Support Tickets" value={openTicketsCount} valueCls="text-rose-400" sub={`${safeTickets.length} total tickets`} tint="bg-rose-500/15 text-rose-500" />
                <StatCard icon={Crown} label="Reseller Applications" value={`${pendingResellersCount} Pending`} valueCls="text-amber-400" sub={`${safeResellerApps.length} total applications`} tint="bg-amber-500/15 text-amber-500" />

                {/* Today's New Registrations Card */}
                <div className="rounded-2xl border-2 p-5 sm:col-span-2 lg:col-span-3" style={cardStyle}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider block" style={mutedStyle}>Today's New Registrations</span>
                      <h4 className="text-2xl font-black text-violet-400 font-heading mt-1">{todayNewUsers.length} <span className="text-sm font-normal" style={mutedStyle}>new users today</span></h4>
                    </div>
                    <button onClick={() => { setAdminTab('users'); setUserSortOrder('newest'); }} className="text-[10px] px-3 py-1.5 rounded-lg border font-bold cursor-pointer" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}>View All</button>
                  </div>
                  {todayNewUsers.length === 0 ? (
                    <p className="text-[11px] text-center py-4" style={faintStyle}>No new registrations today yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                      {todayNewUsers.map(u => (
                        <div key={u.uid || u.email} className="flex items-center gap-2.5 p-2.5 rounded-xl border" style={{ borderColor: 'var(--adm-border)', background: 'var(--adm-input-bg)' }}>
                          <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                            <span className="text-xs font-black text-violet-400">{String(u.name || u.email || '?').charAt(0).toUpperCase() || '?'}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate" style={{ color: 'var(--adm-text)' }}>{u.name || 'New User'}</div>
                            <div className="text-[10px] truncate" style={faintStyle}>{u.email}</div>
                            <div className="text-[9px] font-mono" style={faintStyle}>{signupTime(u) ? sriLankaTime(signupTime(u)) : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-2xl border-2 p-5" style={cardStyle}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider font-mono" style={mutedStyle}>Revenue — Last {revenueDays} Day{revenueDays === 1 ? '' : 's'}</h4>
                      <span className="text-2xl font-black text-emerald-400 font-heading block mt-1">{formatLkr(revenueTrendTotal)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[7, 14, 30, 90].map(d => (
                        <button
                          key={d}
                          onClick={() => setRevenueDays(d)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-black font-mono transition-all cursor-pointer border ${revenueDays === d ? 'bg-[#1677ff] border-[#1677ff] text-white shadow-md shadow-blue-600/25' : 'hover:border-red-500/50'}`}
                          style={revenueDays === d ? undefined : { borderColor: 'var(--adm-border)', ...mutedStyle }}
                        >
                          {d}d
                        </button>
                      ))}
                      <label className="flex items-center gap-1.5 pl-2 text-[10px] font-black uppercase tracking-wider font-mono" style={faintStyle}>
                        Days
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={revenueDays}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            if (!isNaN(n)) setRevenueDays(Math.min(365, Math.max(1, n)));
                          }}
                          className="w-16 px-2 py-1.5 rounded-lg border-2 text-xs font-black text-center focus:outline-none"
                          style={fieldStyle}
                        />
                      </label>
                    </div>
                  </div>
                  <AreaChart data={revenueTrend.map(b => b.total)} color="#1677ff" height={130} showDots={revenueTrend.length <= 31} />
                  <div className="flex justify-between mt-1.5 text-[9px] font-mono" style={faintStyle}>
                    {revenueTrend.map((b, i) => (
                      (i % revenueLabelStep === 0 || i === revenueTrend.length - 1)
                        ? <span key={i}>{revenueDays <= 7 ? b.date.toLocaleDateString(undefined, { weekday: 'short' }) : b.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        : null
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
                    {[
                      ['Total', formatLkr(revenueTrendTotal)],
                      ['Daily avg', formatLkr(Math.round(revenueDailyAvg))],
                      ['Best day', revenueBestDay.total > 0 ? `${formatLkr(revenueBestDay.total)} · ${revenueBestDay.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : '—']
                    ].map(([k, v]) => (
                      <div key={k} className={`rounded-xl border px-3 py-2.5 ${k === 'Best day' ? 'col-span-2 sm:col-span-1' : ''}`} style={{ borderColor: 'var(--adm-border)', background: 'var(--adm-surface-2)' }}>
                        <div className="text-[9px] font-black uppercase tracking-wider font-mono" style={faintStyle}>{k}</div>
                        <div className="text-xs font-black font-heading mt-0.5 truncate" style={{ color: 'var(--adm-text)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border-2 p-5 flex flex-col items-center" style={cardStyle}>
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
                <div className="lg:col-span-2 rounded-2xl border-2 p-5" style={cardStyle}>
                  <h4 className="text-xs font-black uppercase tracking-wider font-mono mb-3 flex items-center gap-2" style={mutedStyle}><Inbox className="w-3.5 h-3.5" /><span>Recent Activity</span></h4>
                  {sortedActivity.length === 0 ? (
                    <div className="py-6 text-xs text-center" style={faintStyle}>No recent activity to show yet.</div>
                  ) : (
                    <div className="space-y-1">
                      {sortedActivity.map(item => {
                        const Icon = item.icon;
                        return (
                          <div key={item.id} role="button" tabIndex={0} onClick={item.onOpen} onKeyDown={(e) => { if (e.key === 'Enter') item.onOpen?.(); }} className="flex items-center gap-3 py-2 border-b last:border-0 cursor-pointer hover:opacity-80" style={{ borderColor: 'var(--adm-border)' }}>
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

                <div className="rounded-2xl border-2 p-5 space-y-3" style={cardStyle}>
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
            <OrdersDesk
              orders={safeOrders}
              gamesCatalog={gamesCatalog}
              search={orderSearch}
              onSearch={setOrderSearch}
              onOpenOrder={setSelectedInspectOrder}
              showToast={showToast}
            />
          )}

          {adminTab === 'profit' && <ProfitReport />}

          {adminTab === 'deposits' && (
            <DepositsDesk
              payments={safePayments}
              users={safeUsers}
              smsLogs={ezcashLogs}
              search={paymentSearch}
              onSearch={setPaymentSearch}
              onOpen={setSelectedReceiptPay}
              onOpenSmsLogs={() => handleTabSelect('ezcash')}
              onRecord={() => setIsAddPaymentOpen(true)}
            />
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
                <select value={ezcashStatusFilter} onChange={(e) => setEzcashStatusFilter(e.target.value)} className={`${fieldCls} sm:max-w-[220px]`} style={fieldStyle}>
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
            <VouchersDesk vouchers={safeVouchers} onCreate={addVoucher} onOpen={(v) => setSelectedVoucherCode(v.code)} />
          )}

          {adminTab === 'reviews' && (() => {
            const reviewTime = (r) => Number(String(r.id || '').replace(/^rev-/, '')) || new Date(r.date || 0).getTime() || 0;
            const q = reviewSearch.trim().toLowerCase();
            const rows = (Array.isArray(userReviews) ? userReviews : [])
              .filter(r => r && r.id)
              .filter(r => !q || [r.name, r.text, r.location].some(v => String(v || '').toLowerCase().includes(q)))
              .sort((a, b) => reviewTime(b) - reviewTime(a));
            const onDelete = async (r) => {
              if (!window.confirm(`Delete the review by "${r.name || 'Unknown'}"? This can't be undone.`)) return;
              setDeletingReviewId(r.id);
              await deleteReview(r);
              setDeletingReviewId(null);
            };
            return (
              <div className="space-y-4">
                <SearchInput value={reviewSearch} onChange={setReviewSearch} placeholder="Search name or review text..." />
                <DataTable
                  emptyMessage="No customer reviews yet."
                  columns={[
                    { key: 'name', label: 'Customer', sortable: true, sortValue: r => r.name || '', render: r => (
                      <div>
                        <div className="font-bold" style={{ color: 'var(--adm-text)' }}>{r.flag ? `${r.flag} ` : ''}{r.name || 'Unknown'}</div>
                        <div className="text-[10px] font-mono" style={mutedStyle}>{r.location || ''}{r.date ? ` · ${r.date}` : ''}</div>
                      </div>
                    )},
                    { key: 'rating', label: 'Rating', sortable: true, sortValue: r => Number(r.rating) || 0, render: r => <span className="font-black text-amber-400 whitespace-nowrap">{'★'.repeat(Math.max(0, Math.min(5, Number(r.rating) || 0)))}</span> },
                    { key: 'text', label: 'Review', render: r => <span className="text-xs break-words" style={{ color: 'var(--adm-text)' }}>{r.text}</span> },
                    { key: 'actions', label: 'Actions', align: 'right', render: r => (
                      <button onClick={() => onDelete(r)} disabled={deletingReviewId === r.id} className="px-2.5 py-1 bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 disabled:opacity-60"><Trash2 className="w-3 h-3" /><span>{deletingReviewId === r.id ? 'Deleting...' : 'Delete'}</span></button>
                    )}
                  ]}
                  rows={rows}
                />
              </div>
            );
          })()}

          {adminTab === 'users' && (
            <UsersDesk
              users={safeUsers}
              orders={safeOrders}
              search={userSearch}
              onSearch={setUserSearch}
              sort={userSortOrder}
              onSort={setUserSortOrder}
              onOpen={setSelectedInspectUser}
            />
          )}

          {adminTab === 'credit' && (
            <WalletCreditPage
              users={safeUsers}
              onAdjust={adjustUserWallet}
              fetchLog={fetchAdminWalletLog}
              onOpenUser={setSelectedInspectUser}
            />
          )}

          {adminTab === 'resellers' && (
            <ResellersDesk
              applications={safeResellerApps}
              users={safeUsers}
              search={resellerSearch}
              onSearch={setResellerSearch}
              onOpen={(a) => setSelectedResellerAppId(a.id)}
              fetchDeposit={fetchResellerDeposit}
            />
          )}

          {adminTab === 'support' && (
            <div className="space-y-4">
              <SupportDeskStats tickets={safeTickets.filter(Boolean)} />
              <SupportDesk
                tickets={safeTickets.filter(Boolean)}
                search={supportSearch}
                setSearch={setSupportSearch}
                statusFilter={supportStatusFilter}
                setStatusFilter={setSupportStatusFilter}
                sendTicketMessage={sendTicketMessage}
                updateTicketStatus={updateTicketStatus}
                updateTicketPriority={updateTicketPriority}
                showToast={showToast}
                onOpenOrder={(orderId) => { setAdminTab('orders'); setOrderSearch(orderId); }}
              />
            </div>
          )}

          {adminTab === 'games' && (
            <div className="space-y-6">
              <div className="rounded-3xl border-2 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4" style={cardStyle}>
                <p className="text-xs" style={mutedStyle}>Edit retail prices for any package. Click Save & Publish to instantly update prices on the Website & Telegram Bot in real-time.</p>
                <button onClick={handleSaveAllPrices} disabled={isSavingPrices} className="px-6 py-3 bg-[#1677ff] hover:bg-[#0b5ed7] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer shrink-0">
                  <Save className={`w-4 h-4 ${isSavingPrices ? 'animate-spin' : ''}`} /><span>{isSavingPrices ? 'Saving...' : 'Save & Publish All Prices'}</span>
                </button>
              </div>

              <FilterBar>
                <SearchInput value={catalogSearch} onChange={setCatalogSearch} placeholder="Search package name, diamond amount, or game title..." />
                <select value={selectedGameCatalogId} onChange={(e) => setSelectedGameCatalogId(e.target.value)} className={`${fieldCls} font-mono sm:max-w-[240px]`} style={fieldStyle}>
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
                    <div key={game.id} className="rounded-3xl border-2 overflow-hidden" style={cardStyle}>
                      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-3xl">{game.currencyIcon || '🎮'}</span>
                          <div>
                            <h4 className="font-black text-lg" style={{ color: 'var(--adm-text)' }}>{game.name}</h4>
                            <span className="text-xs font-mono uppercase" style={mutedStyle}>{game.publisher} • {game.category} • {game.packages?.length || 0} Packages</span>
                          </div>
                        </div>
                        <button onClick={handleSaveAllPrices} disabled={isSavingPrices} className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-extrabold rounded-xl cursor-pointer shrink-0">Save Prices</button>
                      </div>
                      <div className="md:hidden p-3 space-y-3">
                        {matchingPackages.map(pkg => {
                          const currentPrice = editedPricesMap[pkg.id] !== undefined ? editedPricesMap[pkg.id] : pkg.priceLkr;
                          const isChanged = editedPricesMap[pkg.id] !== undefined && editedPricesMap[pkg.id] !== pkg.priceLkr;
                          const wholesalePrice = Math.round(currentPrice * (1 - 0.05));
                          const usdPrice = (currentPrice / 340).toFixed(2);
                          return (
                            <div key={pkg.id} className={`rounded-2xl border-2 p-3.5 space-y-3 ${isChanged ? 'border-amber-500/50' : ''}`} style={isChanged ? { background: 'var(--adm-surface-2)' } : { background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}>
                              <div className="flex items-center gap-2 flex-wrap">
                                {pkg.image && <img src={pkg.image} alt="" className="w-7 h-7 object-contain" />}
                                <span className="text-sm font-black" style={{ color: 'var(--adm-text)' }}>{pkg.name}</span>
                                {pkg.bonus && <span className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono">{pkg.bonus}</span>}
                                {isChanged && <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">EDITED</span>}
                              </div>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs" style={faintStyle}>Rs.</span>
                                <input type="number" value={currentPrice} onChange={(e) => handlePriceInputChange(pkg.id, e.target.value)} className={`w-full pl-10 pr-3 py-2.5 rounded-xl font-mono font-black text-sm focus:outline-none border-2 ${isChanged ? 'text-amber-400 border-amber-500/50' : ''}`} style={!isChanged ? { ...fieldStyle } : { background: 'var(--adm-input-bg)' }} />
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-xl border px-2 py-2" style={{ borderColor: 'var(--adm-border)' }}>
                                  <div className="text-[9px] font-black uppercase tracking-wider font-mono" style={faintStyle}>Wholesale</div>
                                  <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">Rs. {wholesalePrice.toLocaleString()}</div>
                                </div>
                                <div className="rounded-xl border px-2 py-2" style={{ borderColor: 'var(--adm-border)' }}>
                                  <div className="text-[9px] font-black uppercase tracking-wider font-mono" style={faintStyle}>USD</div>
                                  <div className="text-xs font-mono font-bold mt-0.5" style={mutedStyle}>${usdPrice}</div>
                                </div>
                                <div className="rounded-xl border px-2 py-2 min-w-0" style={{ borderColor: 'var(--adm-border)' }}>
                                  <div className="text-[9px] font-black uppercase tracking-wider font-mono" style={faintStyle}>Code</div>
                                  <div className="text-[10px] font-mono font-bold mt-0.5 truncate" style={mutedStyle}>{pkg.id}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="hidden md:block p-4 sm:p-6 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="font-mono text-[10px] uppercase border-b" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}>
                            <tr><th className="p-3">Package</th><th className="p-3">Retail (LKR)</th><th className="p-3">Silver (5% Off)</th><th className="p-3">USD</th><th className="p-3 text-right">Code</th></tr>
                          </thead>
                          <tbody className="divide-y font-medium" style={{ borderColor: 'var(--adm-border)' }}>
                            {matchingPackages.map(pkg => {
                              const currentPrice = editedPricesMap[pkg.id] !== undefined ? editedPricesMap[pkg.id] : pkg.priceLkr;
                              const isChanged = editedPricesMap[pkg.id] !== undefined && editedPricesMap[pkg.id] !== pkg.priceLkr;
                              const wholesalePrice = Math.round(currentPrice * (1 - 0.05));
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
                <button onClick={handleSaveAllPrices} disabled={isSavingPrices} className="px-8 py-3.5 bg-[#1677ff] hover:bg-[#0b5ed7] disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-xl shadow-blue-600/30 cursor-pointer">
                  <Save className={`w-5 h-5 ${isSavingPrices ? 'animate-spin' : ''}`} /><span>{isSavingPrices ? 'Saving...' : 'Save & Publish All Prices Live'}</span>
                </button>
              </div>
            </div>
          )}

          {adminTab === 'popupAd' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border-2 p-5 sm:p-6" style={cardStyle}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono border ${adEnabled ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'border'}`} style={!adEnabled ? { borderColor: 'var(--adm-border)', ...mutedStyle } : undefined}>{adEnabled ? 'LIVE ON WEB' : 'DISABLED'}</span>
                  <span className="text-xs" style={mutedStyle}>{adBanners.filter(b => b.enabled).length} of {adBanners.length} banner{adBanners.length === 1 ? '' : 's'} on{adBanners.filter(b => b.enabled).length > 1 ? ' · shown as a slider' : ''}</span>
                </div>
                <button onClick={handleSavePopupAd} disabled={isSavingAd} className="px-6 py-3 bg-[#1677ff] hover:bg-[#0b5ed7] disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer flex items-center justify-center gap-2 shrink-0">
                  {isSavingAd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}<span>Save & Publish Live</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ToggleSwitch checked={adEnabled} onChange={setAdEnabled} label="Show Popup" description="Pop up the banners when visitors open the site" />
                <ToggleSwitch checked={adShowOncePerSession} onChange={setAdShowOncePerSession} label="Show Once Per Session" description="Don't show again on refresh after it is closed" />
              </div>

              <div className="rounded-3xl border-2 p-5 sm:p-6 space-y-5" style={cardStyle}>
                <div>
                  <h3 className="text-sm font-black" style={{ color: 'var(--adm-text)' }}>Banners <span className="font-mono text-xs" style={faintStyle}>{adBanners.length}/{MAX_POPUP_BANNERS}</span></h3>
                  <p className="text-[11px] mt-0.5" style={mutedStyle}>Upload an image for each banner. A transparent PNG (about 900×1100) looks best. Use the arrows to change the order.</p>
                </div>

                <div className="pbn-grid">
                  {adBanners.map((b, idx) => (
                    <div key={b.id} className={`pbn-card ${b.enabled ? '' : 'is-off'}`}>
                      <label className="pbn-media" title={b.imageUrl ? 'Change image' : 'Upload image'}>
                        {uploadingAdIdx === idx ? (
                          <span className="pbn-empty"><Loader2 className="w-7 h-7 animate-spin" /><span>Uploading…</span></span>
                        ) : b.imageUrl ? (
                          <>
                            <img src={b.imageUrl} alt={`Banner ${idx + 1}`} />
                            <span className="pbn-change"><UploadCloud className="w-4 h-4" />Change image</span>
                          </>
                        ) : (
                          <span className="pbn-empty"><span className="pbn-empty-icon"><UploadCloud className="w-6 h-6" /></span><span>Upload image</span><span className="pbn-empty-sub">PNG, JPG or WEBP</span></span>
                        )}
                        <input type="file" accept="image/*" disabled={uploadingAdIdx !== null} onChange={(e) => handleAdImageFileUpload(idx, e)} className="hidden" />
                        <span className="pbn-num">{idx + 1}</span>
                        {!b.enabled && <span className="pbn-off-tag">Hidden</span>}
                      </label>

                      <div className="pbn-body">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black" style={{ color: 'var(--adm-text)' }}>{b.enabled ? 'Showing' : 'Hidden'}</span>
                          <button type="button" onClick={() => updateAdBanner(idx, { enabled: !b.enabled })} aria-label={b.enabled ? 'Hide banner' : 'Show banner'} className={`w-11 h-6 rounded-full transition-colors relative p-1 cursor-pointer shrink-0 ${b.enabled ? 'bg-[#1677ff]' : 'bg-slate-400/40'}`}><div className={`w-4 h-4 rounded-full bg-white transition-transform ${b.enabled ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold block mb-1" style={mutedStyle}>Tap opens</label>
                          <select value={b.buttonLink} onChange={(e) => updateAdBanner(idx, { buttonLink: e.target.value })} className={fieldCls} style={fieldStyle}>
                            <option value="#catalog">Game Catalog</option>
                            <option value="#wallet">Deposit Wallet</option>
                            <option value="#referral">Referral Page</option>
                            <option value="#reseller">Reseller Program</option>
                            <option value="#support">Live Support Chat</option>
                            <option value="#ff-accounts">Free Fire Accounts</option>
                            <option value="https://wa.me/94740436276">Support WhatsApp</option>
                            {(gamesCatalog || []).map(g => <option key={g.id} value={`#game:${g.id}`}>Top up: {g.name}</option>)}
                            {!['#catalog', '#wallet', '#referral', '#reseller', '#support', '#ff-accounts', 'https://wa.me/94740436276'].includes(b.buttonLink) && !(gamesCatalog || []).some(g => `#game:${g.id}` === b.buttonLink) && (
                              <option value={b.buttonLink}>{b.buttonLink}</option>
                            )}
                          </select>
                        </div>

                        <details className="pbn-more">
                          <summary>Text & button <span style={faintStyle}>(optional)</span></summary>
                          <div className="space-y-2.5 pt-2.5">
                            <input type="text" maxLength={200} placeholder="Title" value={b.title} onChange={(e) => updateAdBanner(idx, { title: e.target.value })} className={fieldCls} style={fieldStyle} />
                            <textarea rows={2} maxLength={1000} placeholder="Description" value={b.description} onChange={(e) => updateAdBanner(idx, { description: e.target.value })} className={`${fieldCls} resize-none`} style={fieldStyle} />
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" maxLength={60} placeholder="Button text" value={b.buttonText} onChange={(e) => updateAdBanner(idx, { buttonText: e.target.value })} className={fieldCls} style={fieldStyle} />
                              <input type="text" maxLength={60} placeholder="Badge" value={b.badge} onChange={(e) => updateAdBanner(idx, { badge: e.target.value })} className={fieldCls} style={fieldStyle} />
                            </div>
                          </div>
                        </details>

                        <div className="pbn-actions">
                          <button type="button" onClick={() => moveAdBanner(idx, -1)} disabled={idx === 0} aria-label="Move earlier"><ArrowUp className="w-4 h-4 -rotate-90" /></button>
                          <button type="button" onClick={() => moveAdBanner(idx, 1)} disabled={idx === adBanners.length - 1} aria-label="Move later"><ArrowDown className="w-4 h-4 -rotate-90" /></button>
                          <button type="button" onClick={() => removeAdBanner(idx)} className="pbn-del" aria-label="Delete banner"><Trash2 className="w-4 h-4" /><span>Delete</span></button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {adBanners.length < MAX_POPUP_BANNERS && (
                    <button type="button" onClick={addAdBanner} className="pbn-add">
                      <span className="pbn-empty-icon"><Plus className="w-6 h-6" /></span>
                      <span className="text-sm font-black">Add banner</span>
                      <span className="text-[11px]" style={mutedStyle}>Up to {MAX_POPUP_BANNERS} banners</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {adminTab === 'ffAccounts' && (
            <FfAccountsAdmin listings={ffAccounts} uploadImage={uploadFfAccountImage} showToast={showToast} />
          )}

          {adminTab === 'gameStrip' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border-2 p-6" style={cardStyle}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono border ${stripEnabled ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'border'}`} style={!stripEnabled ? { borderColor: 'var(--adm-border)', ...mutedStyle } : undefined}>{stripEnabled ? 'LIVE ON WEB' : 'HIDDEN'}</span>
                  <span className="text-xs" style={mutedStyle}>{stripItems.length ? `${stripItems.length} game${stripItems.length === 1 ? '' : 's'} in the bar` : 'No games picked — the bar shows every catalog game'}</span>
                </div>
                <button onClick={handleSaveGameStrip} disabled={isSavingStrip} className="px-6 py-3 bg-[#1677ff] hover:bg-[#0b5ed7] disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer flex items-center gap-2 shrink-0">
                  {isSavingStrip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}<span>Save & Publish Live</span>
                </button>
              </div>

              <div className="rounded-3xl border-2 p-6 space-y-5" style={cardStyle}>
                <ToggleSwitch checked={stripEnabled} onChange={setStripEnabled} label="Show Games Bar" description="Scrolling row of game icons under All Games on the home page" />
                <div><label className="text-xs font-bold block mb-1" style={mutedStyle}>Bar Title</label><input type="text" maxLength={80} placeholder="e.g. Discover More Games" value={stripTitle} onChange={(e) => setStripTitle(e.target.value)} className={fieldCls} style={fieldStyle} /></div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select value={stripAddGameId} onChange={(e) => setStripAddGameId(e.target.value)} className={`${fieldCls} sm:flex-1`} style={fieldStyle}>
                    <option value="">Pick a game to add…</option>
                    {(gamesCatalog || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <button type="button" onClick={() => { const g = (gamesCatalog || []).find(x => x.id === stripAddGameId); if (g) { setStripItems(prev => [...prev, stripGameItem(g)]); setStripAddGameId(''); } }} disabled={!stripAddGameId} className="px-4 py-2.5 rounded-xl border-2 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text)' }}><Plus className="w-4 h-4" />Add Game</button>
                  <button type="button" onClick={() => setStripItems(prev => [...prev, { name: '', imageUrl: '', link: '#catalog' }])} className="px-4 py-2.5 rounded-xl border-2 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer" style={{ borderColor: 'var(--adm-border)', color: 'var(--adm-text)' }}><UploadCloud className="w-4 h-4" />Custom Icon</button>
                  <button type="button" onClick={() => setStripItems((gamesCatalog || []).map(stripGameItem))} className="px-4 py-2.5 rounded-xl border-2 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}><RefreshCw className="w-4 h-4" />Load All Games</button>
                </div>

                {stripItems.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed p-8 text-center text-xs" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}>
                    Nothing picked yet, so the website shows every game in the catalog. Add games above to choose your own list and order.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stripItems.map((it, idx) => {
                      const link = String(it.link || '');
                      const known = link.startsWith('#game:') || STRIP_PAGE_LINKS.some(o => o.value === link);
                      return (
                        <div key={idx} className="rounded-2xl border p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center" style={{ borderColor: 'var(--adm-border)', background: 'var(--adm-surface-2)' }}>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex flex-col">
                              <button type="button" onClick={() => moveStripItem(idx, -1)} disabled={idx === 0} className="p-1 rounded cursor-pointer disabled:opacity-30" style={mutedStyle} aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => moveStripItem(idx, 1)} disabled={idx === stripItems.length - 1} className="p-1 rounded cursor-pointer disabled:opacity-30" style={mutedStyle} aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                            </div>
                            <label className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-dashed flex items-center justify-center cursor-pointer shrink-0" style={{ borderColor: 'var(--adm-border)' }} title="Upload icon">
                              {uploadingStripIdx === idx ? <Loader2 className="w-5 h-5 animate-spin text-red-500" /> : it.imageUrl ? <img src={it.imageUrl} alt="" className="w-full h-full object-cover" /> : <UploadCloud className="w-5 h-5 text-red-500" />}
                              <input type="file" accept="image/*" className="hidden" disabled={uploadingStripIdx !== null} onChange={(e) => handleStripImageUpload(idx, e)} />
                            </label>
                          </div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 min-w-0">
                            <input type="text" maxLength={60} placeholder="Name (shown on hover)" value={it.name || ''} onChange={(e) => updateStripItem(idx, { name: e.target.value })} className={fieldCls} style={fieldStyle} />
                            <input type="text" placeholder="Icon URL (https://…) or upload" value={it.imageUrl || ''} onChange={(e) => updateStripItem(idx, { imageUrl: e.target.value })} className={`${fieldCls} font-mono`} style={fieldStyle} />
                            <div className="flex flex-col gap-2">
                              <select value={known ? link : '__custom'} onChange={(e) => updateStripItem(idx, { link: e.target.value === '__custom' ? 'https://' : e.target.value })} className={fieldCls} style={fieldStyle}>
                                {(gamesCatalog || []).map(g => <option key={g.id} value={`#game:${g.id}`}>Top up: {g.name}</option>)}
                                {STRIP_PAGE_LINKS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                <option value="__custom">Custom link…</option>
                              </select>
                              {!known && <input type="text" placeholder="https://…" value={link} onChange={(e) => updateStripItem(idx, { link: e.target.value })} className={`${fieldCls} font-mono`} style={fieldStyle} />}
                            </div>
                          </div>
                          <button type="button" onClick={() => setStripItems(prev => prev.filter((_, i) => i !== idx))} className="self-end sm:self-center p-2.5 rounded-xl border cursor-pointer text-red-400 hover:bg-red-500/10" style={{ borderColor: 'var(--adm-border)' }} aria-label="Remove"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {adminTab === 'announcement' && (
            <div className="max-w-2xl rounded-3xl border-2 p-6 space-y-4" style={cardStyle}>
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
              <div className="rounded-3xl border-2 p-6 space-y-4" style={cardStyle}>
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
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={autoFulfillInput} onChange={(e) => setAutoFulfillInput(e.target.checked)} className="w-4 h-4 accent-blue-600 rounded" /><span className="font-bold" style={{ color: 'var(--adm-text)' }}>Auto-fulfill top-ups on checkout</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={simModeInput} onChange={(e) => setSimModeInput(e.target.checked)} className="w-4 h-4 accent-blue-600 rounded" /><span className="font-bold text-amber-400">Simulation Mode (Demo without real money)</span></label>
                  </div>
                </div>
                <button onClick={handleSaveMoongoldSettings} className="px-6 py-2.5 bg-[#1677ff] hover:bg-[#0b5ed7] text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"><Save className="w-4 h-4" /><span>Save Moongold Settings</span></button>
              </div>
            </div>
          )}

          {adminTab === 'r2' && (
            <div className="space-y-6 max-w-3xl">
              <div className="rounded-3xl border-2 p-6 space-y-4" style={cardStyle}>
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
        <OrderDetail
          order={selectedInspectOrder}
          owner={(() => {
            const o = selectedInspectOrder;
            return safeUsers.find(u => (o.userId && (u.uid === o.userId || u.resellerCode === o.userId)) || (o.userEmail && String(u.email || '').toLowerCase() === String(o.userEmail).toLowerCase()));
          })()}
          gamesCatalog={gamesCatalog}
          onClose={() => setSelectedInspectOrder(null)}
          onSetStatus={updateOrderStatus}
          onOpenUser={(owner) => { setSelectedInspectOrder(null); setSelectedInspectUser(owner); }}
          showToast={showToast}
        />
      )}

      {selectedInspectUser && (
        <UserDetail
          user={safeUsers.find(u => u.uid === selectedInspectUser.uid) || selectedInspectUser}
          orders={safeOrders}
          onClose={() => setSelectedInspectUser(null)}
          onVerify={verifyUserAccount}
          onToggleBlock={toggleBlockUser}
          onAdjust={adjustUserWallet}
          fetchLog={fetchAdminWalletLog}
          onSetTier={async (u, tier) => {
            if (await setResellerTier(u.uid, tier)) showToast(`Tier set to ${tier === 'AUTO' ? 'automatic (by sales)' : tier}`);
          }}
          onOpenOrders={(u) => { setSelectedInspectUser(null); setAdminTab('orders'); setOrderSearch(u.email || u.uid); }}
          showToast={showToast}
        />
      )}

      {selectedVoucherCode && safeVouchers.some(v => v.code === selectedVoucherCode) && (
        <VoucherDetail
          voucher={safeVouchers.find(v => v.code === selectedVoucherCode)}
          onClose={() => setSelectedVoucherCode(null)}
          onUpdate={updateVoucher}
          onDelete={deleteVoucher}
          fetchLog={fetchVoucherLog}
          showToast={showToast}
        />
      )}

      {selectedResellerAppId && safeResellerApps.some(a => a.id === selectedResellerAppId) && (
        <ResellerDetail
          app={safeResellerApps.find(a => a.id === selectedResellerAppId)}
          users={safeUsers}
          onClose={() => setSelectedResellerAppId(null)}
          onSetStatus={updateResellerApplicationStatus}
          onResendEmail={resendResellerEmail}
          fetchDeposit={fetchResellerDeposit}
          onOpenUser={(u) => { setSelectedResellerAppId(null); setSelectedInspectUser(u); }}
          showToast={showToast}
        />
      )}

      {isAddPaymentOpen && (
        <RecordDepositSheet
          users={safeUsers}
          onClose={() => setIsAddPaymentOpen(false)}
          onSubmit={recordOfflinePayment}
        />
      )}

      {selectedReceiptPay && (
        <DepositDetail
          pay={safePayments.find(p => p.id === selectedReceiptPay.id) || selectedReceiptPay}
          payments={safePayments}
          users={safeUsers}
          smsLogs={ezcashLogs}
          onClose={() => setSelectedReceiptPay(null)}
          onApprove={approveManualPayment}
          onReject={rejectManualPayment}
          onOpenUser={(owner) => { setSelectedReceiptPay(null); setSelectedInspectUser(owner); }}
          showToast={showToast}
        />
      )}

    </div>
  );
};
