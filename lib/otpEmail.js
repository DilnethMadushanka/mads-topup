// HTML for the 6-digit code email (signup and password reset).
// Table layout and inline styles so it renders in Gmail, Outlook and phones.
const SITE = 'https://madstopup.com';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function otpEmailHtml({ otp, displayName, purpose = 'signup' }) {
  const reset = purpose === 'reset';
  const title = reset ? 'Reset your password' : 'Verify your email';
  const lead = reset
    ? 'We got a request to reset your MADS TOPUP password. Enter this code on the reset page:'
    : 'Welcome to MADS TOPUP! Enter this code to verify your email and finish creating your account:';
  const digits = String(otp).split('').map(d =>
    `<td style="padding:0 3px;"><div style="width:44px;height:54px;line-height:54px;border-radius:12px;background:#eef5ff;border:1px solid #cfe0ff;font-family:'Courier New',monospace;font-size:28px;font-weight:800;color:#1677ff;text-align:center;">${esc(d)}</div></td>`
  ).join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#eef5ff;">
<div style="display:none;max-height:0;overflow:hidden;">Your MADS TOPUP code is ${esc(otp)}. It expires in 15 minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef5ff;padding:28px 12px;font-family:'Plus Jakarta Sans',Segoe UI,Helvetica,Arial,sans-serif;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e5ecf6;border-radius:24px;overflow:hidden;box-shadow:0 12px 32px rgba(22,119,255,.12);">
    <tr><td style="background:linear-gradient(135deg,#1677ff 0%,#4f9bff 100%);background-color:#1677ff;padding:26px 24px;text-align:center;">
      <img src="${SITE}/mads-logo.jpg" width="56" height="56" alt="MADS TOPUP" style="display:block;margin:0 auto 10px;border-radius:50%;border:3px solid rgba(255,255,255,.85);">
      <div style="font-size:20px;font-weight:900;letter-spacing:-.3px;color:#ffffff;">MADS TOPUP</div>
      <div style="font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,.8);margin-top:4px;">Game top-up store</div>
    </td></tr>
    <tr><td style="padding:28px 26px 8px;">
      <div style="font-size:22px;font-weight:900;letter-spacing:-.4px;color:#0f172a;">${title}</div>
      <p style="font-size:14px;line-height:1.6;color:#0f172a;margin:14px 0 4px;">Hi ${esc(displayName)},</p>
      <p style="font-size:14px;line-height:1.6;color:#64748b;margin:0;">${lead}</p>
    </td></tr>
    <tr><td align="center" style="padding:22px 16px 6px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
    </td></tr>
    <tr><td align="center" style="padding:10px 26px 0;">
      <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#fff7e6;color:#b45309;font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;">Expires in 15 minutes</span>
    </td></tr>
    <tr><td style="padding:22px 26px 6px;">
      <div style="background:#f6f9ff;border:1px solid #e5ecf6;border-radius:16px;padding:14px 16px;font-size:12.5px;line-height:1.6;color:#64748b;">
        🔒 Never share this code with anyone. MADS TOPUP staff will never ask for it.${reset ? ' If you did not ask to reset your password, you can ignore this email.' : ''}
      </div>
    </td></tr>
    <tr><td align="center" style="padding:20px 26px 26px;">
      <a href="${SITE}" style="display:inline-block;padding:12px 26px;border-radius:999px;background:#1677ff;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;">Go to MADS TOPUP</a>
    </td></tr>
  </table>
  <p style="max-width:480px;font-size:11px;line-height:1.6;color:#94a3b8;text-align:center;margin:18px auto 0;">
    Need help? Reply to this email or visit <a href="${SITE}" style="color:#1677ff;text-decoration:none;">madstopup.com</a><br>© ${new Date().getFullYear()} MADS TOPUP
  </p>
</td></tr>
</table>
</body></html>`;
}
