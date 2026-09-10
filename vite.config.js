import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import crypto from 'crypto';

function moogoldApiPlugin() {
  return {
    name: 'moogold-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/moogold', async (req, res, next) => {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader(
          'Access-Control-Allow-Headers',
          'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
        );

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          next();
          return;
        }

        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk; });
        req.on('end', async () => {
          try {
            const body = JSON.parse(bodyStr || '{}');
            const { path, bodyObj } = body;
            if (!path || !bodyObj) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing path or bodyObj' }));
              return;
            }

            const partnerId = process.env.VITE_MOONGOLD_PARTNER_ID || 'f27cabc8d2c2122bbedacabce632db68';
            const secretKey = process.env.VITE_MOONGOLD_SECRET_KEY || 'PM67SGqyed';
            const baseUrl = 'https://moogold.com/wp-json/v1/api';

            const timestamp = Math.floor(Date.now() / 1000);
            const payloadStr = JSON.stringify(bodyObj);
            const stringToSign = payloadStr + timestamp + path;

            const hmac = crypto.createHmac('sha256', secretKey);
            hmac.update(stringToSign);
            const authSignature = hmac.digest('hex');
            const basicAuth = 'Basic ' + Buffer.from(`${partnerId}:${secretKey}`).toString('base64');

            const apiRes = await fetch(`${baseUrl}/${path}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': basicAuth,
                'auth': authSignature,
                'timestamp': timestamp.toString(),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              },
              body: payloadStr
            });

            const text = await apiRes.text();
            res.statusCode = apiRes.status;
            res.setHeader('Content-Type', 'application/json');
            try {
              const json = JSON.parse(text);
              res.end(JSON.stringify(json));
            } catch (e) {
              res.end(text);
            }
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    moogoldApiPlugin()
  ],
  server: {
    port: 5173,
    host: true
  }
});

