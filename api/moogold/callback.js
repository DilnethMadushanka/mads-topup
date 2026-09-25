export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, auth, timestamp');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const payload = req.method === 'GET' ? req.query : req.body;
  console.log('[MooGold Serverless Callback Received]:', payload);

  const FIREBASE_RTDB_URL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || "https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app";
  const partnerOrderId = payload?.partnerOrderId || payload?.partner_order_id || payload?.data?.partnerOrderId;
  const orderId = payload?.order_id || payload?.orderId || payload?.data?.order_id;
  const rawStatus = payload?.status || payload?.data?.status;
  const status = String(rawStatus || '').toUpperCase();

  if (partnerOrderId) {
    try {
      const getRes = await fetch(`${FIREBASE_RTDB_URL}/moogoldProcessedOrders/${encodeURIComponent(partnerOrderId)}.json`);
      const existing = getRes.ok ? await getRes.json() : null;

      const isComplete = status.includes('COMPLET') || status === 'SUCCESS';
      const isFailed = status.includes('FAIL') || status.includes('CANCEL') || status.includes('REFUND');
      const normalizedStatus = isComplete ? 'COMPLETED' : (isFailed ? 'FAILED' : (status || 'PROCESSING'));

      await fetch(`${FIREBASE_RTDB_URL}/moogoldProcessedOrders/${encodeURIComponent(partnerOrderId)}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(existing || {}),
          status: normalizedStatus,
          moogoldOrderId: orderId || existing?.moogoldOrderId,
          callbackPayload: payload,
          callbackReceivedAt: new Date().toISOString()
        })
      });
      console.log(`[MooGold Serverless Callback Processed] partnerOrderId=${partnerOrderId} status=${normalizedStatus}`);
    } catch (e) {
      console.error('[MooGold Serverless Callback Save Error]:', e.message);
    }
  }

  return res.status(200).json({ success: true, message: 'MooGold callback processed successfully' });
}
