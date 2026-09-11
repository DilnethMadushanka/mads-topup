import crypto from 'crypto';

const apiKey = 'Xnb0ilde52krk5m9GdDSgSrOOPrVjATLcobvi6z54MDADGTe687ODna2buprP6wd';
const secrets = [
  'Hr53pY9BfQ8VLCwtLYC5RtYQrCIAwUtzXz3EYLIHxifaj8wLr49PzcsuACblvlhr',
  'Hr53pY9BfQ8VLCwtLYC5RtYQrCIAwUtzXZ3EYLIHxifaj8wLr49PzcsuACblvlhr',
  'Hr53pY9BfQ8VLCwtLYC5RtYQrCIAwUtzXz3EYLIHxifaj8wLr49PzcsuACbIvIhr',
  'Hr53pY9BfQ8VLCwtLYC5RtYQrCIAwUtzXz3EYLIHxifaj8wLr49PzcsuACblvIhr'
];

async function check() {
  for (let i = 0; i < secrets.length; i++) {
    const sec = secrets[i];
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const sig = crypto.createHmac('sha256', sec).update(query).digest('hex');
    const url = `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${query}&signature=${sig}`;

    const res = await fetch(url, {
      headers: { 'X-MBX-APIKEY': apiKey }
    });
    const data = await res.json();
    console.log(`Secret variant ${i}:`, res.status, data);
  }
}

check();
