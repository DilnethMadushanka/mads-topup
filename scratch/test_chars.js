import crypto from 'crypto';

const apiKeyBase = 'Xnb0ilde52krk5m9GdDSgSr';
const apiKeyEnd = 'rVjATLcobvi6z54MDADGTe687ODna2buprP6wd';
const apiMiddleOpts = ['OOP', '00P', '0OP', 'O0P', 'ooP', '0oP', 'o0P'];

const secretBase = 'Hr53pY9BfQ8VLCwtLYC5RtYQrCIAwUtzX';
const secretEnd = 'EYLIHxifaj8wLr49PzcsuACblvlhr';
const secretMiddleOpts = ['z3', 'Z3', '23', 's3'];

async function testCombinations() {
  const timeRes = await fetch('https://api.binance.com/api/v3/time');
  const timeData = await timeRes.json();
  const serverTime = timeData.serverTime;
  const recvWindow = 60000;
  const query = `recvWindow=${recvWindow}&timestamp=${serverTime}`;

  for (const midKey of apiMiddleOpts) {
    const key = apiKeyBase + midKey + apiKeyEnd;
    for (const midSec of secretMiddleOpts) {
      const sec = secretBase + midSec + secretEnd;
      const signature = crypto.createHmac('sha256', sec).update(query).digest('hex');
      const url = `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${query}&signature=${signature}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: { 'X-MBX-APIKEY': key, 'User-Agent': 'Mozilla/5.0' }
      });
      const data = await res.json();
      if (res.status === 200 || data.code !== -1022) {
        console.log('🎯 FOUND WORKING KEYS MATCH!');
        console.log('API Key:', key);
        console.log('Secret Key:', sec);
        console.log('Status:', res.status, data);
        return;
      }
    }
  }
  console.log('No match in current combination batch.');
}

testCombinations();
