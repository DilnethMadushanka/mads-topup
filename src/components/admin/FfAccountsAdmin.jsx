import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Save, Loader2, Trash2, Pencil, UploadCloud, X, ArrowLeft, ArrowRight, MessageCircle, Star, UserCheck
} from 'lucide-react';
import { saveFfAccount, deleteFfAccount, fetchFfAccountSales, FF_ACCOUNT_STATUSES } from '../../services/ffAccountsService';

// Admin "FF Accounts" tab: Free Fire accounts sold under Other Services.
const fieldCls = "w-full px-4 py-2.5 rounded-xl border-2 text-xs font-bold focus:outline-none focus:border-[#1677ff] transition-all disabled:opacity-50";
const fieldStyle = { background: 'var(--adm-input-bg)', borderColor: 'var(--adm-border)', color: 'var(--adm-text)' };
const cardStyle = { background: 'var(--adm-surface)', borderColor: 'var(--adm-border)', boxShadow: 'var(--adm-shadow)' };
const mutedStyle = { color: 'var(--adm-text-muted)' };
const textStyle = { color: 'var(--adm-text)' };

const EMPTY = {
  id: '', title: '', priceLkr: '', oldPriceLkr: '', level: '', rank: '', region: 'SG / MY', loginType: 'Facebook',
  highlights: '', description: '', images: [], status: 'AVAILABLE', featured: false,
};
const LOGIN_TYPES = ['Facebook', 'Google', 'VK', 'X (Twitter)', 'Apple', 'Huawei', 'Guest'];
const STATUS_STYLE = {
  AVAILABLE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  RESERVED: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  SOLD: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};
const lkr = (v) => `Rs. ${Math.round(Number(v) || 0).toLocaleString('en-US')}`;
const Label = ({ children }) => <label className="text-xs font-bold block mb-1" style={mutedStyle}>{children}</label>;

const Editor = ({ initial, onClose, uploadImage, showToast }) => {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  const addFiles = async (e) => {
    const files = Array.from(e.target.files || []).filter((x) => x.type.startsWith('image/'));
    if (e.target) e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (f.images.length >= 8) break;
        const url = await uploadImage(file);
        if (url) setF((p) => ({ ...p, images: [...p.images, url].slice(0, 8) }));
      }
    } catch (err) {
      showToast(err?.message || 'Picture upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };
  const move = (i, dir) => setF((p) => {
    const next = [...p.images];
    const j = i + dir;
    if (j < 0 || j >= next.length) return p;
    [next[i], next[j]] = [next[j], next[i]];
    return { ...p, images: next };
  });

  const save = async (e) => {
    e?.preventDefault();
    if (!f.title.trim()) { showToast('Give the account a title.', 'error'); return; }
    if (!(Number(f.priceLkr) > 0)) { showToast('Enter a price in LKR.', 'error'); return; }
    setSaving(true);
    const res = await saveFfAccount({
      ...f,
      priceLkr: Number(f.priceLkr),
      oldPriceLkr: Number(f.oldPriceLkr) || 0,
      level: Number(f.level) || 0,
      highlights: String(f.highlights).split('\n').map((s) => s.trim()).filter(Boolean),
    });
    setSaving(false);
    if (!res.success) { showToast(res.error, 'error'); return; }
    showToast(initial.id ? 'Listing updated live ✅' : 'Account listed live ✅');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <form onSubmit={save} className="w-full max-w-2xl rounded-t-3xl sm:rounded-3xl border-2 p-5 sm:p-6 relative shadow-2xl max-h-[92vh] flex flex-col overflow-hidden" style={cardStyle}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#3b8cff] via-[#1677ff] to-[#0b5ed7]" />
        <div className="flex items-center justify-between pb-3 border-b shrink-0" style={{ borderColor: 'var(--adm-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1677ff] flex items-center justify-center text-white shadow-md shadow-blue-600/25 shrink-0"><UserCheck className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-black font-heading" style={textStyle}>{initial.id ? 'Edit FF account' : 'List a new FF account'}</h3>
              <p className="text-xs font-mono" style={mutedStyle}>{initial.id || 'Shown live on /free-fire-accounts'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl cursor-pointer" style={mutedStyle}><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 py-4 pr-0.5">
          <div><Label>Title</Label><input maxLength={100} value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Lv 75 Heroic, 3 Evo guns, old Elite Pass" className={fieldCls} style={fieldStyle} /></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>Price (LKR)</Label><input type="number" min="1" value={f.priceLkr} onChange={(e) => set({ priceLkr: e.target.value })} className={fieldCls} style={fieldStyle} /></div>
            <div><Label>Old price</Label><input type="number" min="0" value={f.oldPriceLkr} onChange={(e) => set({ oldPriceLkr: e.target.value })} placeholder="optional" className={fieldCls} style={fieldStyle} /></div>
            <div><Label>Level</Label><input type="number" min="0" max="100" value={f.level} onChange={(e) => set({ level: e.target.value })} className={fieldCls} style={fieldStyle} /></div>
            <div><Label>Rank</Label><input maxLength={40} value={f.rank} onChange={(e) => set({ rank: e.target.value })} placeholder="e.g. Grandmaster" className={fieldCls} style={fieldStyle} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label>Region / server</Label><input maxLength={30} value={f.region} onChange={(e) => set({ region: e.target.value })} className={fieldCls} style={fieldStyle} /></div>
            <div>
              <Label>Login type</Label>
              <select value={f.loginType} onChange={(e) => set({ loginType: e.target.value })} className={fieldCls} style={fieldStyle}>
                {[...new Set([...LOGIN_TYPES, f.loginType].filter(Boolean))].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select value={f.status} onChange={(e) => set({ status: e.target.value })} className={fieldCls} style={fieldStyle}>
                {FF_ACCOUNT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><Label>Key items (one per line, shown as tags)</Label><textarea rows={4} value={f.highlights} onChange={(e) => set({ highlights: e.target.value })} placeholder={'Evo M1887 max\nCobra MP40\nOld Elite Pass S1'} className={`${fieldCls} resize-none`} style={fieldStyle} /></div>
          <div><Label>Description</Label><textarea rows={3} maxLength={1000} value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="Anything else the buyer should know" className={`${fieldCls} resize-none`} style={fieldStyle} /></div>

          <div>
            <Label>Pictures ({f.images.length}/8). The first one is the cover.</Label>
            {f.images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                {f.images.map((src, i) => (
                  <div key={src + i} className="relative rounded-xl overflow-hidden border aspect-[4/3]" style={{ borderColor: 'var(--adm-border)' }}>
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    {i === 0 && <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#1677ff] text-white text-[9px] font-black">COVER</span>}
                    <div className="absolute bottom-1 right-1 flex gap-1">
                      <button type="button" onClick={() => move(i, -1)} className="w-6 h-6 rounded-md bg-black/60 text-white flex items-center justify-center cursor-pointer" aria-label="Move left"><ArrowLeft className="w-3 h-3" /></button>
                      <button type="button" onClick={() => move(i, 1)} className="w-6 h-6 rounded-md bg-black/60 text-white flex items-center justify-center cursor-pointer" aria-label="Move right"><ArrowRight className="w-3 h-3" /></button>
                      <button type="button" onClick={() => set({ images: f.images.filter((_, k) => k !== i) })} className="w-6 h-6 rounded-md bg-red-600 text-white flex items-center justify-center cursor-pointer" aria-label="Remove"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {f.images.length < 8 && (
              <>
                <label className="w-full border-2 border-dashed border-[#1677ff]/40 hover:border-[#1677ff] p-3.5 rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer transition-colors text-xs mb-2" style={mutedStyle}>
                  {uploading ? <><Loader2 className="w-5 h-5 text-[#1677ff] animate-spin" /><span className="font-extrabold" style={textStyle}>Uploading…</span></> : <><UploadCloud className="w-5 h-5 text-[#1677ff]" /><span className="font-extrabold" style={textStyle}>Upload screenshots</span></>}
                  <input type="file" accept="image/*" multiple disabled={uploading} onChange={addFiles} className="hidden" />
                </label>
                <div className="flex gap-2">
                  <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Or paste an image link (https://...)" className={`${fieldCls} font-mono`} style={fieldStyle} />
                  <button type="button" onClick={() => { const u = urlInput.trim(); if (/^https:\/\//i.test(u)) { set({ images: [...f.images, u].slice(0, 8) }); setUrlInput(''); } else showToast('Image links must start with https://', 'error'); }} className="px-4 rounded-xl border-2 text-xs font-extrabold cursor-pointer" style={{ borderColor: 'var(--adm-border)', ...textStyle }}>Add</button>
                </div>
              </>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer" style={textStyle}>
            <input type="checkbox" checked={f.featured} onChange={(e) => set({ featured: e.target.checked })} className="w-4 h-4 accent-[#1677ff]" />
            Featured (shown first with a gold tag)
          </label>
        </div>

        <div className="pt-3 border-t shrink-0 flex items-center justify-end gap-2" style={{ borderColor: 'var(--adm-border)' }}>
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer" style={mutedStyle}>Cancel</button>
          <button type="submit" disabled={saving || uploading} className="px-6 py-2.5 bg-[#1677ff] hover:bg-[#0b5ed7] disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}<span>Save & Publish Live</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export const FfAccountsAdmin = ({ listings, uploadImage, showToast }) => {
  const [editing, setEditing] = useState(null);
  const [sales, setSales] = useState([]);
  const [busyId, setBusyId] = useState('');
  const list = listings || [];

  useEffect(() => {
    let alive = true;
    const load = () => fetchFfAccountSales().then((s) => { if (alive) setSales(s); });
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const saleFor = useMemo(() => {
    const byListing = {};
    for (const s of sales) {
      if (!s?.listingId) continue;
      if (!byListing[s.listingId] || String(s.createdAt) > String(byListing[s.listingId].createdAt)) byListing[s.listingId] = s;
    }
    return byListing;
  }, [sales]);

  const counts = FF_ACCOUNT_STATUSES.reduce((acc, s) => ({ ...acc, [s]: list.filter((a) => a.status === s).length }), {});

  const toForm = (a) => ({
    ...EMPTY, ...a,
    priceLkr: a.priceLkr || '', oldPriceLkr: a.oldPriceLkr || '', level: a.level || '',
    highlights: (a.highlights || []).join('\n'),
  });

  const quickStatus = async (a, status) => {
    setBusyId(a.id);
    const res = await saveFfAccount({ ...a, status });
    setBusyId('');
    if (!res.success) showToast(res.error, 'error');
  };
  const remove = async (a) => {
    if (!window.confirm(`Remove "${a.title}" from the store?`)) return;
    setBusyId(a.id);
    const res = await deleteFfAccount(a.id);
    setBusyId('');
    if (res.success) showToast('Listing removed.'); else showToast(res.error, 'error');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border-2 p-6" style={cardStyle}>
        <div className="flex flex-wrap items-center gap-2">
          {FF_ACCOUNT_STATUSES.map((s) => (
            <span key={s} className={`px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono border ${STATUS_STYLE[s]}`}>{counts[s]} {s}</span>
          ))}
          <span className="text-xs" style={mutedStyle}>Paid orders also appear in Orders. Hand over the login on WhatsApp, then mark the order Approved.</span>
        </div>
        <button type="button" onClick={() => setEditing({ ...EMPTY })} className="px-6 py-3 bg-[#1677ff] hover:bg-[#0b5ed7] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" /><span>List an account</span>
        </button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed p-10 text-center text-sm" style={{ borderColor: 'var(--adm-border)', ...mutedStyle }}>
          No Free Fire accounts listed yet. Tap "List an account" to add the first one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((a) => {
            const sale = saleFor[a.id];
            return (
              <div key={a.id} className="rounded-3xl border-2 overflow-hidden flex flex-col" style={cardStyle}>
                <div className="relative aspect-[16/9] bg-slate-800">
                  {a.images[0] ? <img src={a.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-white/50">No picture</div>}
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black font-mono border backdrop-blur ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                  {a.featured && <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center gap-1"><Star className="w-3 h-3 fill-white" />FEATURED</span>}
                </div>
                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  <div>
                    <div className="font-black font-heading text-sm leading-snug" style={textStyle}>{a.title}</div>
                    <div className="text-[11px] mt-0.5" style={mutedStyle}>{[a.level ? `Lv ${a.level}` : '', a.rank, a.region, a.loginType].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div className="font-black font-heading text-[#1677ff]">{lkr(a.priceLkr)}{a.oldPriceLkr > a.priceLkr && <s className="ml-2 text-xs font-bold" style={mutedStyle}>{lkr(a.oldPriceLkr)}</s>}</div>
                  {sale && a.status !== 'AVAILABLE' && (
                    <div className="rounded-2xl border p-3 text-[11px] space-y-1" style={{ background: 'var(--adm-surface-2)', borderColor: 'var(--adm-border)' }}>
                      <div className="font-black" style={textStyle}>Buyer: {sale.userName || sale.userEmail || sale.userId}</div>
                      <div className="font-mono" style={mutedStyle}>{sale.saleRef}</div>
                      {sale.userEmail && <div style={mutedStyle}>{sale.userEmail}</div>}
                      {sale.userPhone && (
                        <a href={`https://wa.me/${String(sale.userPhone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-emerald-400"><MessageCircle className="w-3 h-3" />{sale.userPhone}</a>
                      )}
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    <select value={a.status} disabled={busyId === a.id} onChange={(e) => quickStatus(a, e.target.value)} className={`${fieldCls} !w-auto flex-1`} style={fieldStyle} aria-label="Status">
                      {FF_ACCOUNT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button type="button" onClick={() => setEditing(toForm(a))} className="px-3 py-2.5 rounded-xl border-2 text-xs font-extrabold cursor-pointer flex items-center gap-1.5" style={{ borderColor: 'var(--adm-border)', ...textStyle }}><Pencil className="w-3.5 h-3.5" />Edit</button>
                    <button type="button" onClick={() => remove(a)} disabled={busyId === a.id} className="px-3 py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600/25 text-red-400 border-2 border-red-500/30 text-xs font-extrabold cursor-pointer flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <Editor initial={editing} onClose={() => setEditing(null)} uploadImage={uploadImage} showToast={showToast} />}
    </div>
  );
};
