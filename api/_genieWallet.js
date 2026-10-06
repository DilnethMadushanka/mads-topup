// Shared Dialog Genie Business IPG wallet-crediting logic for the Vercel
// serverless functions (api/genie.js, api/genie/webhook.js,
// api/genie/verify-status.js). Mirrors server.js's implementation so a
// successful payment is credited the same, idempotent, server-authoritative
// way regardless of which deployment target actually receives the request.

export const GENIE_DEFAULT_APP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6ImM5OWI0NTBkLTM4ZTktNDU1Ny04OWYxLTVjZGM5MWZkN2EwZiIsImNvbXBhbnlJZCI6IjY5OWMyOTRiZWM5YWFlMDAwMjA2NjAxNiIsImlhdCI6MTc3MTg0MjE0OSwiZXhwIjo0OTI3NTE1NzQ5fQ.LutDa2obyzXY6MsCGtrK3bPZHMrNpxI-T8Q4cCtKZo4';
export const GENIE_DEFAULT_BASE_URL = 'https://api.geniebiz.lk';

import { rtdbUrl, rtdbGet, findUserKey, adjustWallet } from '../lib/rtdbAdmin.js';

export function getGenieAppKey() {
  let appKey = (process.env.GENIE_APP_KEY || process.env.VITE_GENIE_APP_KEY || GENIE_DEFAULT_APP_KEY).replace(/[\r\n\s]/g, '');
  if (!appKey.includes('699c294bec9aae0002066016')) appKey = GENIE_DEFAULT_APP_KEY;
  return appKey;
}

export function getGenieBaseUrl() {
  return (process.env.GENIE_BASE_URL || process.env.VITE_GENIE_BASE_URL || GENIE_DEFAULT_BASE_URL).replace(/[\r\n\s\/]+$/, '');
}

async function creditUserWalletServer(uid, amountLkr, email) {
  if (!uid || !(amountLkr > 0)) return { success: false, reason: 'Invalid amount' };
  try {
    let key = null;
    try {
      const own = await rtdbGet(`users/${uid}`);
      if (own && typeof own === 'object') key = uid;
    } catch (_) {}
    if (!key) key = (await findUserKey(email || uid)) || uid;
    const result = await adjustWallet(key, amountLkr, 0);
    return { success: true, ...result };
  } catch (e) {
    console.error('[Genie Wallet Credit Error]:', e.message);
    return { success: false, reason: 'Database update failed' };
  }
}

// Genie card recharge bonus — mirrors getGenieBonus in WalletPage.jsx.
function genieRechargeBonus(amountLkr) {
  const n = parseFloat(amountLkr) || 0;
  if (n >= 10000) return 200;
  if (n >= 5000) return 100;
  return 0;
}

export async function saveGenieTransactionRecord(transactionId, record) {
  try {
    await fetch(rtdbUrl(`genieTransactions/${transactionId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (record.localId) {
      await fetch(rtdbUrl(`genieLocalIdIndex/${record.localId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionId)
      });
    }
  } catch (e) {
    console.error('[Genie Transaction Save Error]:', e.message);
  }
}

export async function getGenieTransactionRecord(transactionId) {
  try {
    const res = await fetch(rtdbUrl(`genieTransactions/${transactionId}`));
    if (res.ok) return (await res.json()) || null;
  } catch (e) { console.warn('[Genie Transaction Read Warning]:', e.message); }
  return null;
}

export async function resolveGenieTransactionIdByLocalId(localId) {
  try {
    const res = await fetch(rtdbUrl(`genieLocalIdIndex/${localId}`));
    if (res.ok) return (await res.json()) || null;
  } catch (e) { /* not found */ }
  return null;
}

export async function recordGenieManualPaymentToRtdb(transactionId, record) {
  try {
    const payId = 'PAY-GENIE-' + String(transactionId).slice(-6).toUpperCase();
    const payload = {
      id: payId,
      userId: record.uid || '',
      userEmail: record.email || '',
      userName: record.userName || 'Gamer',
      method: 'Online Card / eZ Cash',
      referenceNumber: `Txn: ${transactionId}`,
      amount: record.amountLkr,
      currency: 'LKR',
      slipUrl: '',
      status: 'VERIFIED',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      timestamp: new Date().toISOString()
    };
    await fetch(rtdbUrl(`manual_payments/${payId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error('[Genie Manual Payment Save Error]:', e.message);
  }
}

/**
 * Idempotently verify (against Genie's own status API) and credit a Genie
 * transaction's wallet. Serverless functions are stateless between
 * invocations, so the RTDB `status` field on the transaction record (not an
 * in-memory lock) is what prevents a double credit if the webhook and the
 * client's verify-status poll both land around the same time.
 */
export async function verifyAndCreditGenieTransaction(transactionId) {
  if (!transactionId) return { success: false, error: 'Missing transactionId' };

  const record = await getGenieTransactionRecord(transactionId);
  if (!record) {
    console.error(`[Genie Credit Error] No transaction record found for txn=${transactionId} — cannot identify which user to credit.`);
    return { success: false, error: 'Unknown transaction (no pending record on file)' };
  }
  if (record.status === 'CREDITED') {
    return { success: true, isPaid: true, alreadyCredited: true, amount: record.amountLkr, newBalanceLkr: record.newBalanceLkr, newBalanceUsdt: record.newBalanceUsdt };
  }

  let state = '';
  try {
    const apiRes = await fetch(`${getGenieBaseUrl()}/public/transactions/${transactionId}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': getGenieAppKey() }
    });
    const resText = await apiRes.text();
    let resJson = null;
    try { resJson = JSON.parse(resText); } catch (e) {}
    if (apiRes.ok && resJson) {
      state = String(resJson.state || '').toUpperCase();
    } else {
      console.warn(`[Genie Status Re-check Failed] txn=${transactionId} HTTP ${apiRes.status}: ${resText.substring(0, 200)}`);
    }
  } catch (e) {
    console.error(`[Genie Status Re-check Error] txn=${transactionId}:`, e.message);
    return { success: false, error: 'Could not verify transaction with Dialog Genie' };
  }

  const isPaid = state === 'SUCCESS' || state === 'COMPLETED' || state === 'CONFIRMED' || state === 'CAPTURED';
  if (!isPaid) return { success: true, isPaid: false, state };

  // Re-read immediately before crediting to shrink the race window against a
  // concurrent request (e.g. webhook + client poll landing together).
  const freshRecord = await getGenieTransactionRecord(transactionId);
  if (freshRecord && freshRecord.status === 'CREDITED') {
    return { success: true, isPaid: true, alreadyCredited: true, amount: freshRecord.amountLkr, newBalanceLkr: freshRecord.newBalanceLkr, newBalanceUsdt: freshRecord.newBalanceUsdt };
  }

  // Credit using the amount stored at transaction-creation time, never a
  // value read back from Genie/webhook — same anti-tampering principle as
  // the MooGold order-price check in api/moogold.js.
  const creditResult = await creditUserWalletServer(record.uid, record.amountLkr + genieRechargeBonus(record.amountLkr), record.email);
  if (!creditResult.success) {
    console.error(`[Genie Credit Failed] txn=${transactionId} user=${record.uid || record.email} reason=${creditResult.reason}`);
    return { success: false, error: creditResult.reason || 'Wallet credit failed', isPaid: true };
  }

  await saveGenieTransactionRecord(transactionId, {
    ...record,
    status: 'CREDITED',
    creditedAt: new Date().toISOString(),
    newBalanceLkr: creditResult.newBalanceLkr,
    newBalanceUsdt: creditResult.newBalanceUsdt
  });

  await recordGenieManualPaymentToRtdb(transactionId, record);

  console.log(`[Genie Wallet Credited] txn=${transactionId} user=${record.uid || record.email} amount=Rs.${record.amountLkr} newBalance=Rs.${creditResult.newBalanceLkr}`);
  return { success: true, isPaid: true, credited: true, amount: record.amountLkr, newBalanceLkr: creditResult.newBalanceLkr, newBalanceUsdt: creditResult.newBalanceUsdt };
}

