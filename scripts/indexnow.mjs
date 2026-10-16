// Tells Bing (and other IndexNow search engines) about every URL in the sitemap,
// so new or changed pages get crawled within hours instead of weeks.
// Run after a deploy: npm run indexnow
// The key is public by design: search engines check it at https://madstopup.com/<key>.txt
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const KEY = '6158b5ed0b6fcf979a470e7dd13836f0';
const HOST = 'madstopup.com';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sitemap = fs.readFileSync(path.join(root, 'dist', 'sitemap.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
});
console.log(`IndexNow: sent ${urlList.length} URLs, status ${res.status}`);
if (!res.ok && res.status !== 202) {
  console.error(await res.text());
  process.exitCode = 1;
}
