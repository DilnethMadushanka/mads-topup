import { verifyAndCreditGenieTransaction, resolveGenieTransactionIdByLocalId } from '../_genieWallet.js';

// Called by the customer's browser right after the redirect back from Genie
// checkout. Performs the same idempotent server-side credit as the webhook —
// this gives instant feedback without waiting for Dialog's async IPN, but it
// is NOT the only path that can credit the wallet (see api/genie/webhook.js),
// so a dropped connection here doesn't lose the deposit.
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

  let { transactionId, orderRef, localId } = body || {};
  if (!transactionId && (orderRef || localId)) {
    transactionId = await resolveGenieTransactionIdByLocalId(orderRef || localId);
  }
  if (!transactionId) {
    res.status(400).json({ error: 'Missing transactionId or orderRef' });
    return;
  }

  try {
    const result = await verifyAndCreditGenieTransaction(transactionId);
    if (!result.success) {
      console.error(`[Genie Verify-Status Error] txn=${transactionId}:`, result.error);
      res.status(400).json(result);
      return;
    }
    res.json({ ...result, transactionId });
  } catch (err) {
    console.error('[Geniebiz Verify Error]:', err);
    res.status(500).json({ error: err.message });
  }
}
