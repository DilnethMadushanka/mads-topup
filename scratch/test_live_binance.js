import crypto from 'crypto';

const apiKey = 'Xnb0ilde52krk5m9GdDSgSrOOPrVjATLcobvi6z54MDADGTe687ODna2buprP6wd';
const secretKey = 'Hr53pY9BfQ8VLCwtLYC5RtYQrClAwUtzXz3EYLIHxifaj8wLr49PzcsuACbIvIhr';

async function testLiveBinance() {
  try {
    const timeRes = await fetch('https://api.binance.com/api/v3/time');
    const timeData = await timeRes.json();
    const serverTime = timeData.serverTime;
    const recvWindow = 60000;
    const query = `recvWindow=${recvWindow}&timestamp=${serverTime}`;
    const signature = crypto.createHmac('sha256', secretKey).update(query).digest('hex');

    const url = `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${query}&signature=${signature}`;
    console.log('Testing Binance API Endpoint:', url);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const data = await res.json();
    console.log('\n========================================');
    console.log('BINANCE API RESPONSE STATUS:', res.status);
    console.log('BINANCE API RESPONSE BODY:', JSON.stringify(data, null, 2));
    console.log('========================================\n');

    if (res.status === 200) {
      console.log('🎉 SUCCESS! BINANCE API IS 100% WORKING AND CONNECTED SUCCESSFULLY!');
    }
  } catch (err) {
    console.error('Error testing Binance API:', err);
  }
}

testLiveBinance();
