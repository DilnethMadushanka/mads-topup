const crypto = require('crypto');

module.exports = async (req, res) => {
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

  const { path, bodyObj } = req.body || {};
  if (!path || !bodyObj) {
    res.status(400).json({ error: 'Missing path or bodyObj' });
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

  try {
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
    try {
      const json = JSON.parse(text);
      res.status(apiRes.status).json(json);
    } catch (e) {
      res.status(apiRes.status).send(text);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
