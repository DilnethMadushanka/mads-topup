// "Order complete" email to the customer, sent when a top-up goes through
// (MooGold accepted it, or the admin marked the order Completed).
// Table layout and inline styles so it renders in Gmail, Outlook and phones.
import { sendMail } from './mailer.js';

const SITE = 'https://madstopup.com';
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lkr = (n) => `Rs. ${(Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

// Order rows shown in the email, skipping empty ones.
export function orderEmailRows(order) {
  const player = order.playerId ? `${order.playerId}${order.zoneId ? ` (${order.zoneId})` : ''}` : '';
  return [
    ['Game', order.gameName],
    ['Package', order.packageName],
    ['Player ID', player],
    ['Paid', order.priceLkr ? lkr(order.priceLkr) : ''],
    ['Order ID', order.id]
  ].filter(([, v]) => String(v || '').trim());
}

export function orderEmailHtml(order) {
  const rows = orderEmailRows(order).map(([k, v], i, all) => `
        <tr><td style="padding:11px 16px;font-size:12.5px;color:#64748b;${i < all.length - 1 ? 'border-bottom:1px solid #e5ecf6;' : ''}">${esc(k)}</td>
        <td style="padding:11px 16px;font-size:13px;font-weight:800;color:#0f172a;text-align:right;${i < all.length - 1 ? 'border-bottom:1px solid #e5ecf6;' : ''}">${esc(v)}</td></tr>`).join('');
  const voucherNote = order.isVoucher
    ? `<p style="font-size:13px;line-height:1.6;color:#64748b;margin:14px 0 0;">Your voucher codes are saved in <b style="color:#0f172a;">My Vouchers</b> on your profile.</p>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Order complete</title></head>
<body style="margin:0;padding:0;background:#eef5ff;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(order.packageName)} for ${esc(order.gameName)} is on its way.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef5ff;padding:28px 12px;font-family:'Plus Jakarta Sans',Segoe UI,Helvetica,Arial,sans-serif;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e5ecf6;border-radius:24px;overflow:hidden;box-shadow:0 12px 32px rgba(22,119,255,.12);">
    <tr><td style="background:linear-gradient(135deg,#1677ff 0%,#4f9bff 100%);background-color:#1677ff;padding:26px 24px;text-align:center;">
      <img src="${SITE}/mads-logo.jpg" width="56" height="56" alt="MADS TOPUP" style="display:block;margin:0 auto 10px;border-radius:50%;border:3px solid rgba(255,255,255,.85);">
      <div style="font-size:20px;font-weight:900;letter-spacing:-.3px;color:#ffffff;">MADS TOPUP</div>
      <div style="font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,.8);margin-top:4px;">Game top-up store</div>
    </td></tr>
    <tr><td style="padding:28px 26px 8px;">
      <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#e7f8f1;color:#047857;font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;">&#10003; Order complete</span>
      <div style="font-size:22px;font-weight:900;letter-spacing:-.4px;color:#0f172a;margin-top:12px;">Your top-up is done</div>
      <p style="font-size:14px;line-height:1.6;color:#0f172a;margin:14px 0 4px;">Hi ${esc(order.displayName || 'there')},</p>
      <p style="font-size:14px;line-height:1.6;color:#64748b;margin:0;">Thanks for your order. It has been sent to your game account. Most top-ups show up within a few minutes.</p>
      ${voucherNote}
    </td></tr>
    <tr><td style="padding:18px 26px 6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9ff;border:1px solid #e5ecf6;border-radius:16px;">${rows}
      </table>
    </td></tr>
    <tr><td style="padding:14px 26px 0;font-size:12.5px;line-height:1.6;color:#64748b;">
      Not in your account after 30 minutes? Reply to this email with your Order ID and we will check it.
    </td></tr>
    <tr><td align="center" style="padding:22px 26px 26px;">
      <a href="${SITE}" style="display:inline-block;padding:12px 26px;border-radius:999px;background:#1677ff;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;">Top up again</a>
    </td></tr>
  </table>
  <p style="max-width:480px;font-size:11px;line-height:1.6;color:#94a3b8;text-align:center;margin:18px auto 0;">
    Need help? Reply to this email or visit <a href="${SITE}" style="color:#1677ff;text-decoration:none;">madstopup.com</a><br>&copy; ${new Date().getFullYear()} MADS TOPUP
  </p>
</td></tr>
</table>
</body></html>`;
}

// Never throws: a failed email must not affect the order.
export async function sendOrderCompleteEmail(order) {
  try {
    const to = String(order?.email || '').trim();
    if (!EMAIL_RE.test(to)) return { success: false, skipped: true };
    const text = ['Your MADS TOPUP order is complete.', '', ...orderEmailRows(order).map(([k, v]) => `${k}: ${v}`), '', SITE].join('\n');
    return await sendMail({
      to,
      replyTo: 'support@madstopup.com',
      subject: `Order complete: ${order.packageName || 'your top-up'}${order.gameName ? ` (${order.gameName})` : ''}`,
      text,
      html: orderEmailHtml(order)
    });
  } catch (e) {
    console.warn('[Order Email] Failed:', e.message);
    return { success: false, error: e.message };
  }
}
