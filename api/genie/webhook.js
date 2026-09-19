import { resolveGenieTransactionIdByLocalId, verifyAndCreditGenieTransaction } from '../_genieWallet.js';

// Dialog Genie Business IPG Webhook (IPN callback) — server-to-server, does
// NOT depend on the customer's browser, so this is what guarantees a
// successful payment always credits the wallet even if the customer closes
// the tab or loses connection right after paying. Field names for the
// transaction id aren't guaranteed by Dialog's docs, so common shapes are
// checked defensively; if none match we still ack (so Genie doesn't
// retry-storm us) but log loudly for manual follow-up.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  console.log('[Genie Business IPG Webhook Received]:', body);

  let transactionId = body.id || body.transactionId || body.data?.id || null;
  if (!transactionId && body.localId) {
    transactionId = await resolveGenieTransactionIdByLocalId(body.localId);
  }

  if (!transactionId) {
    console.error('[Genie Webhook Error] Could not determine transaction id from webhook payload:', JSON.stringify(body).substring(0, 500));
    res.json({ success: true, message: 'Webhook received (no matching transaction id — logged for manual follow-up)' });
    return;
  }

  try {
    const result = await verifyAndCreditGenieTransaction(transactionId);
    if (!result.success) {
      console.error(`[Genie Webhook Credit Failed] txn=${transactionId}:`, result.error);
    }
    res.json({ success: true, message: 'Webhook processed', result });
  } catch (e) {
    console.error(`[Genie Webhook Error] txn=${transactionId}:`, e.message);
    res.json({ success: true, message: 'Webhook received (processing error logged)' });
  }
}
