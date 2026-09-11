import crypto from 'crypto';
import fs from 'fs';

// Load .env
if (fs.existsSync('.env')) {
  const lines = fs.readFileSync('.env', 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

const apiKey = process.env.BINANCE_API_KEY;
const secretKey = process.env.BINANCE_API_SECRET;

console.log('Testing Binance API Credentials...');

async function testDepositHistory() {
  try {
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', secretKey).update(query).digest('hex');

    const url = `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${query}&signature=${signature}`;
    console.log('Testing Deposit History URL:', url);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const text = await res.text();
    console.log('HTTP Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Err:', err);
  }
}

async function testPayHistory() {
  try {
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', secretKey).update(query).digest('hex');

    const url = `https://api.binance.com/sapi/v1/pay/transactions?${query}&signature=${signature}`;
    console.log('\nTesting Pay Transactions URL:', url);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const text = await res.text();
    console.log('HTTP Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Err:', err);
  }
}

async function run() {
  await testDepositHistory();
  await testPayHistory();
}

run();
