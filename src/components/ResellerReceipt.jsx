import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Copy, X, Printer, MessageCircle } from 'lucide-react';

// Receipt shown after a reseller top-up succeeds. The reseller can copy it,
// send it to the customer on WhatsApp, or print / save it as PDF.
// PIN codes (voucher games) appear here only; they are never saved with the order.
export const ResellerReceipt = ({ receipt, onClose, showToast }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!receipt) return null;
  const r = receipt;
  const when = new Date(r.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const rows = [
    ['Order ID', r.orderId],
    ['Date', when],
    ['Game', r.gameName],
    ['Package', r.packageName],
    ...(r.isVoucher ? [] : [['Player ID', r.zoneId ? `${r.playerId} (${r.zoneId})` : r.playerId]]),
    ...(r.ign ? [['Player name', r.ign]] : []),
    ...(r.moongoldRef ? [['Delivery ref', `#${r.moongoldRef}`]] : []),
  ];

  const text = [
    `MADS TOPUP · ${r.storeName}`,
    'Top-up receipt ✅',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(r.codes?.length ? ['', 'PIN code(s):', ...r.codes] : []),
    '',
    'Status: Delivered',
    'Thank you for your order!',
  ].join('\n');

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); showToast('Receipt copied!'); } catch (e) { showToast('Could not copy. Select the text instead.', 'error'); }
  };
  const whatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  // Rendered into <body>: the dashboard's page animation leaves a transform on
  // its wrapper, which would pin a fixed overlay to the page instead of the
  // screen. The wrapper copies the site's dark-mode class.
  const dark = !!document.querySelector('.home-dark');
  return createPortal(
    <div className={dark ? 'home-dark rr-portal' : 'rr-portal'}>
      <div className="rr-backdrop" role="dialog" aria-modal="true" aria-labelledby="rr-title" onClick={onClose}>
        <div className="rr-sheet" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="rr-close" aria-label="Close receipt" onClick={onClose}><X className="w-5 h-5" /></button>

          <div className="rr-paper" id="rr-print">
            <div className="rr-head">
              <span className="rr-ok"><CheckCircle2 className="w-7 h-7" /></span>
              <h2 id="rr-title">Top-up successful</h2>
              <p>{r.storeName} · MADS TOPUP reseller</p>
            </div>

            <dl className="rr-rows">
              {rows.map(([k, v]) => (
                <div key={k} className="rr-row"><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>

            {r.isVoucher && (
              <div className="rr-codes">
                <span>PIN code{r.codes?.length > 1 ? 's' : ''}</span>
                {r.codes?.length ? r.codes.map((code) => (
                  <div key={code} className="rd-copy">
                    <code>{code}</code>
                    <button type="button" aria-label="Copy PIN" onClick={() => { try { navigator.clipboard.writeText(code); showToast('PIN copied!'); } catch (e) {} }}>
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )) : <p>The PIN is being prepared by the supplier. It will appear under My Profile → My Codes in a few minutes.</p>}
              </div>
            )}

            <div className="rr-money">
              <div className="rr-row"><dt>Retail price</dt><dd className="rr-strike">Rs. {r.retailLkr.toLocaleString()}</dd></div>
              <div className="rr-row"><dt>Your price ({r.tierLabel})</dt><dd>Rs. {r.paidLkr.toLocaleString()}</dd></div>
              <div className="rr-row rr-profit"><dt>Your margin</dt><dd>+Rs. {(r.retailLkr - r.paidLkr).toLocaleString()}</dd></div>
              {r.balanceLkr !== undefined && <div className="rr-row"><dt>Wallet balance now</dt><dd>Rs. {Number(r.balanceLkr).toLocaleString()}</dd></div>}
            </div>
            <p className="rr-foot">Delivered · {r.resellerCode}</p>
          </div>

          <div className="rr-actions">
            <button type="button" className="rp-btn rp-btn-sm rr-wa" onClick={whatsapp}><MessageCircle className="w-4 h-4" /> Send on WhatsApp</button>
            <button type="button" className="rp-btn rp-btn-sm rp-btn-ghost" onClick={copy}><Copy className="w-4 h-4" /> Copy</button>
            <button type="button" className="rp-btn rp-btn-sm rp-btn-ghost" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print / PDF</button>
          </div>
          <p className="rr-note">The WhatsApp text leaves out your price and margin.</p>
        </div>
      </div>
    </div>,
    document.body
  );
};
