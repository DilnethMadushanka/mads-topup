import fs from 'fs';

const lines = fs.readFileSync('.env', 'utf8').split('\n');
for (const l of lines) {
  if (l.startsWith('BINANCE_API_')) {
    const [k, v] = l.split('=');
    console.log(k, 'length:', v.trim().length, 'raw:', v.trim());
  }
}
