import crypto from 'crypto';

const apiKey = 'Xnb0ilde52krk5m9GdDSgSrOOPrVjATLcobvi6z54MDADGTe687ODna2buprP6wd';
const secretKey = 'Hr53pY9BfQ8VLCwtLYC5RtYQrCIAwUtzXz3EYLIHxifaj8wLr49PzcsuACblvlhr';

async function testWithServerTime() {
  try {
    const timeRes = await fetch('https://api.binance.com/api/v3/time');
    const timeData = await timeRes.json();
    const serverTime = timeData.serverTime;

    console.log('Local time:', Date.now());
    console.log('Binance Server time:', serverTime);
    console.log('Time difference:', Date.now() - serverTime, 'ms');

    const recvWindow = 60000;
    const query = `recvWindow=${recvWindow}&timestamp=${serverTime}`;
    const signature = crypto.createHmac('sha256', secretKey).update(query).digest('hex');

    const url = `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${query}&signature=${signature}`;
    console.log('\nRequest URL:', url);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const data = await res.json();
    console.log('\n====================================');
    console.log('HTTP STATUS:', res.status);
    console.log('RESPONSE DATA:', JSON.stringify(data, null, 2));
    console.log('====================================');
  } catch (e) {
    console.error('Error:', e);
  }
}

testWithServerTime();
