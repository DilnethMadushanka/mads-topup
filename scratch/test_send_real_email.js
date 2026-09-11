import nodemailer from 'nodemailer';

async function sendTestOtp() {
  const targetEmail = 'gamingmads0103@gmail.com';
  const testOtp = '884920';

  console.log(`Sending real Zoho OTP test email to ${targetEmail}...`);

  const mailTransporter = nodemailer.createTransport({
    host: 'smtppro.zoho.com',
    port: 465,
    secure: true,
    auth: {
      user: 'info@trivexit.com',
      pass: 'jXi8hF56aCYb'
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  const mailOptions = {
    from: '"MADS TOPUP" <info@trivexit.com>',
    to: targetEmail,
    subject: `Your Verification Code: ${testOtp}`,
    text: `Your MADS TOPUP Verification Code is: ${testOtp}. Valid for 15 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 24px; border-radius: 16px; max-width: 500px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #ef4444; font-size: 24px; font-weight: 900; margin: 0;">MADS TOPUP</h2>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Email Verification Code</p>
        </div>
        <p style="font-size: 14px; color: #e2e8f0;">Hello Gamer,</p>
        <p style="font-size: 14px; color: #cbd5e1;">Please use the following 6-digit verification code to complete your account setup:</p>
        <div style="background-color: #1e293b; border: 2px dashed #ef4444; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #f87171; font-family: monospace;">${testOtp}</span>
        </div>
        <p style="font-size: 12px; color: #64748b; text-align: center;">This code is valid for 15 minutes. Do not share this code with anyone.</p>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
        <p style="font-size: 10px; color: #475569; text-align: center;">© 2026 MADS TOPUP • All rights reserved</p>
      </div>
    `
  };

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    console.log('✅ SUCCESS! Email accepted by Zoho SMTP server.');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('Accepted Recipients:', info.accepted);
    console.log('Rejected Recipients:', info.rejected);
  } catch (err) {
    console.error('❌ ERROR sending email via Zoho Mail:', err);
  }
}

sendTestOtp();
