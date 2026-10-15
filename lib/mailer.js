// Sends site emails (OTP codes, reseller approval). Server-only.
// Tries Zoho SMTP first, then Resend. Credentials come from the VPS .env:
//   ZOHO_EMAIL + ZOHO_PASSWORD   (Zoho app password)
//   RESEND_API_KEY (+ RESEND_FROM_EMAIL on a domain verified in Resend)
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const zohoUser = () => process.env.ZOHO_EMAIL || 'info@trivexit.com';
const zohoPass = () => process.env.ZOHO_PASSWORD || '';
const resendKey = () => process.env.RESEND_API_KEY || '';
const resendFrom = () => process.env.RESEND_FROM_EMAIL || 'MADS TOPUP <onboarding@madstopup.com>';

export function mailProvidersConfigured() {
  const list = [];
  if (zohoPass()) list.push(`Zoho (${zohoUser()})`);
  if (resendKey()) list.push(`Resend (${resendFrom()})`);
  return list;
}

async function sendViaZoho({ to, subject, html, text, replyTo }) {
  const user = zohoUser();
  const transporter = nodemailer.createTransport({
    host: process.env.ZOHO_SMTP_HOST || 'smtppro.zoho.com',
    port: 465,
    secure: true,
    auth: { user, pass: zohoPass() },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 15000
  });
  const info = await transporter.sendMail({ from: `"MADS TOPUP" <${user}>`, replyTo, to, subject, text, html });
  return info?.messageId;
}

async function sendViaResend({ to, subject, html, text, replyTo }) {
  // resend v6 does not throw: it returns { data, error }.
  const { data, error } = await new Resend(resendKey()).emails.send({
    from: resendFrom(), to: [to], subject, html, text, replyTo
  });
  if (error || !data?.id) throw new Error(error?.message || error?.name || 'Resend returned no id');
  return data.id;
}

// Returns { success, provider?, messageId?, errors: string[] }.
export async function sendMail(msg) {
  const errors = [];
  if (zohoPass()) {
    try {
      const messageId = await sendViaZoho(msg);
      console.log(`[Mail] Sent "${msg.subject}" to ${msg.to} via Zoho`, messageId);
      return { success: true, provider: 'Zoho', messageId, errors };
    } catch (e) {
      errors.push(`Zoho: ${e.message}`);
    }
  } else {
    errors.push('Zoho: ZOHO_PASSWORD is not set in .env');
  }
  if (resendKey()) {
    try {
      const messageId = await sendViaResend(msg);
      console.log(`[Mail] Sent "${msg.subject}" to ${msg.to} via Resend`, messageId);
      return { success: true, provider: 'Resend', messageId, errors };
    } catch (e) {
      errors.push(`Resend: ${e.message}`);
    }
  } else {
    errors.push('Resend: RESEND_API_KEY is not set in .env');
  }
  console.error(`[Mail] Could not send "${msg.subject}" to ${msg.to}:`, errors.join(' | '));
  return { success: false, errors };
}
