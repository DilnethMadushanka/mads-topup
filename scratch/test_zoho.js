import nodemailer from 'nodemailer';

async function testZohoAppPassword() {
  const password = 'jXi8hF56aCYb';
  const hosts = [
    'smtppro.zoho.com',
    'smtp.zoho.com',
    'smtppro.zoho.eu',
    'smtp.zoho.eu',
    'smtppro.zoho.in',
    'smtp.zoho.in'
  ];

  console.log(`Testing Zoho App Password (${password}) for info@trivexit.com...\n`);

  for (const host of hosts) {
    const transporter = nodemailer.createTransport({
      host,
      port: 465,
      secure: true,
      auth: {
        user: 'info@trivexit.com',
        pass: password
      }
    });

    try {
      await transporter.verify();
      console.log(`🎉 SUCCESS! Verified Zoho SMTP connection on host: ${host}`);
      return host;
    } catch (err) {
      console.log(`❌ ${host}: ${err.message}`);
    }
  }
}

testZohoAppPassword();
