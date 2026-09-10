import crypto from 'crypto';

export default async function handler(req, res) {
  try {
    // CORS headers for frontend
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const { path, bodyObj } = body || {};

    if (!path || !bodyObj) {
      res.status(400).json({ error: 'Missing path or bodyObj', received: req.body });
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
        'Accept': 'application/json',
        'Authorization': basicAuth,
        'auth': authSignature,
        'timestamp': timestamp.toString(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      body: payloadStr
    });

    let outgoingIp = 'unknown';
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      outgoingIp = ipData.ip;
    } catch (e) {}

    const text = await apiRes.text();
    res.status(apiRes.status);
    try {
      const json = JSON.parse(text);
      res.json({ ...json, vercel_outgoing_ip: outgoingIp });
    } catch (e) {
      if (apiRes.status !== 200) {
        res.json({
          status: apiRes.status,
          vercel_outgoing_ip: outgoingIp,
          moogold_raw_response: text.substring(0, 300)
        });
      } else {
        res.send(text);
      }
    }
  } catch (err) {
    console.error('Serverless function error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
}
