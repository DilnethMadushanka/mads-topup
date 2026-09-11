import crypto from 'crypto';

const apiKeyRaw = 'Xnb0ilde52krk5m9GdDSgSrOOPrVjATLcobvi6z54MDADGTe687ODna2buprP6wd';
const secretKey = 'Hr53pY9BfQ8VLCwtLYC5RtYQrCIAwUtzXz3EYLIHxifaj8wLr49PzcsuACblvlhr';

// Let's generate variations of API Key for 0/O, l/1/I
function getApiKeyVariations() {
  const vars = new Set();
  vars.add(apiKeyRaw);
  vars.add(apiKeyRaw.replace('OOP', '00P'));
  vars.add(apiKeyRaw.replace('OOP', '0OP'));
  vars.add(apiKeyRaw.replace('OOP', 'O0P'));
  vars.add(apiKeyRaw.replace('ODna', '0Dna'));
  vars.add(apiKeyRaw.replace('687ODna', '6870Dna'));
  vars.add(apiKeyRaw.replace('0ilde', 'Oilde'));
  vars.add(apiKeyRaw.replace('OOP', '00P').replace('ODna', '0Dna'));
  vars.add(apiKeyRaw.replace('OOP', '00P').replace('0ilde', 'Oilde'));
  vars.add(apiKeyRaw.replace('OOP', '00P').replace('ODna', '0Dna').replace('0ilde', 'Oilde'));
  return Array.from(vars);
}

async function findExactKey() {
  const timeRes = await fetch('https://api.binance.com/api/v3/time');
  const timeData = await timeRes.json();
  const serverTime = timeData.serverTime;
  const recvWindow = 60000;
  const query = `recvWindow=${recvWindow}&timestamp=${serverTime}`;
  const signature = crypto.createHmac('sha256', secretKey).update(query).digest('hex');

  const keys = getApiKeyVariations();
  console.log('Testing', keys.length, 'key variations...');

  for (const k of keys) {
    const url = `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${query}&signature=${signature}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'X-MBX-APIKEY': k, 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await res.json();
    console.log('Key:', k.substring(0, 30) + '...', 'Status:', res.status, data);
    if (res.status === 200) {
      console.log('\n🎉 SUCCESS! PERFECT MATCH FOUND!');
      console.log('API Key:', k);
      console.log('Secret Key:', secretKey);
      return k;
    }
  }
}

findExactKey();
