/**
 * /api/mlbb-ign — Server-side Mobile Legends IGN Lookup
 * Proxies SmileOne checkrole API from the server to bypass CORS restrictions.
 * No auth required — public IGN lookup endpoint.
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  const { user_id, zone_id } = body || {};

  if (!user_id) {
    return res.status(400).json({ success: false, error: 'Missing user_id' });
  }

  const params = new URLSearchParams();
  params.append('user_id', String(user_id).trim());
  params.append('zone_id', String(zone_id || '').trim());
  params.append('pid', '13');
  params.append('checkrole', '1');

  const endpoints = [
    'https://www.smile.one/merchant/mobilelegends/checkrole',
    'https://www.smile.one/br/merchant/mobilelegends/checkrole'
  ];

  for (const url of endpoints) {
    try {
      const smileRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://www.smile.one/',
          'Origin': 'https://www.smile.one'
        },
        body: params.toString(),
        signal: AbortSignal.timeout(7000)
      });

      if (smileRes.ok) {
        const data = await smileRes.json();

        // SmileOne returns code 200 with username/username_decode on success
        if (data && (data.code === 200 || data.code === '200' || data.username || data.username_decode)) {
          const rawName = data.username_decode || data.username || data.role_name || data.nickname;
          if (rawName && String(rawName).trim()) {
            let finalName = String(rawName).trim();
            try { finalName = decodeURIComponent(finalName); } catch (e) {}
            return res.status(200).json({
              success: true,
              ign: finalName,
              source: url.includes('/br/') ? 'SMILEONE_BR' : 'SMILEONE',
              raw: data
            });
          }
        }

        // SmileOne error codes
        if (data && (data.code === 400 || data.code === '400' || data.status === 'failed')) {
          return res.status(200).json({
            success: false,
            error: 'Invalid User ID or Zone ID',
            code: data.code,
            raw: data
          });
        }
      }
    } catch (err) {
      console.warn(`[mlbb-ign] ${url} error:`, err.message);
    }
  }

  return res.status(200).json({ success: false, error: 'Could not retrieve IGN. Check your User ID and Zone ID.' });
}
