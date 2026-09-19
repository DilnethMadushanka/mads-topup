// Shared Dialog Genie Business IPG wallet-crediting logic for the Vercel
// serverless functions (api/genie.js, api/genie/webhook.js,
// api/genie/verify-status.js). Mirrors server.js's implementation so a
// successful payment is credited the same, idempotent, server-authoritative
// way regardless of which deployment target actually receives the request.

export const GENIE_DEFAULT_APP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6ImM5OWI0NTBkLTM4ZTktNDU1Ny04OWYxLTVjZGM5MWZkN2EwZiIsImNvbXBhbnlJZCI6IjY5OWMyOTRiZWM5YWFlMDAwMjA2NjAxNiIsImlhdCI6MTc3MTg0MjE0OSwiZXhwIjo0OTI3NTE1NzQ5fQ.LutDa2obyzXY6MsCGtrK3bPZHMrNpxI-T8Q4cCtKZo4';
export const GENIE_DEFAULT_BASE_URL = 'https://api.geniebiz.lk';

export const FIREBASE_RTDB_URL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || "https://mads-topup-76445-default-rtdb.asia-southeast1.firebasedatabase.app";

export function getGenieAppKey() {
  let appKey = (process.env.GENIE_APP_KEY || process.env.VITE_GENIE_APP_KEY || GENIE_DEFAULT_APP_KEY).replace(/[\r\n\s]/g, '');
  if (!appKey.includes('699c294bec9aae0002066016')) appKey = GENIE_DEFAULT_APP_KEY;
  return appKey;
}

export function getGenieBaseUrl() {
  return (process.env.GENIE_BASE_URL || process.env.VITE_GENIE_BASE_URL || GENIE_DEFAULT_BASE_URL).replace(/[\r\n\s\/]+$/, '');
}

async function resolveUserWalletKey(uid, email) {
  if (uid) {
    try {
      const res = await fetch(`${FIREBASE_RTDB_URL}/users/${encodeURIComponent(uid)}.json`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          return { rtdbKey: uid, walletBalance: parseFloat(data.walletBalance || 0), walletUsdt: parseFloat(data.walletUsdt || 0) };
        }
      }
    } catch (e) { console.warn('[Genie RTDB UID Read Warning]:', e.message); }
  }

  const lookupEmail = email || (uid && uid.includes('@') ? uid : null);
  if (lookupEmail) {
    try {
      const allRes = await fetch(`${FIREBASE_RTDB_URL}/users.json`);
      if (allRes.ok) {
        const allUsers = await allRes.json();
        if (allUsers && typeof allUsers === 'object') {
          for (const [key, userData] of Object.entries(allUsers)) {
            if (!userData) continue;
            const emailMatch = userData.email && userData.email.toLowerCase() === lookupEmail.toLowerCase();
            const uidMatch = userData.uid && (userData.uid === uid || userData.uid === lookupEmail);
            if (emailMatch || uidMatch) {
              return { rtdbKey: key, walletBalance: parseFloat(userData.walletBalance || 0), walletUsdt: parseFloat(userData.walletUsdt || 0) };
            }
          }
        }
      }
    } catch (e) { console.warn('[Genie RTDB Scan Warning]:', e.message); }
  }

  if (uid) return { rtdbKey: uid, walletBalance: 0, walletUsdt: 0 };
  return null;
}

async function creditUserWalletServer(uid, amountLkr, email) {
  if (!uid || !(amountLkr > 0)) return { success: false, reason: 'Invalid amount' };
  const resolved = await resolveUserWalletKey(uid, email);
  if (!resolved) return { success: false, reason: 'User wallet not found' };

  const newLkr = parseFloat((resolved.walletBalance + amountLkr).toFixed(2));
  try {
    await fetch(`${FIREBASE_RTDB_URL}/users/${encodeURIComponent(resolved.rtdbKey)}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletBalance: newLkr, walletUsdt: resolved.walletUsdt, updatedAt: new Date().toISOString() })
    });
  } catch (e) {
    console.error('[Genie Wallet Credit Error]:', e.message);
    return { success: false, reason: 'Database update failed' };
  }
  return { success: true, newBalanceLkr: newLkr, newBalanceUsdt: resolved.walletUsdt };
}

export async function saveGenieTransactionRecord(transactionId, record) {
  try {
    await fetch(`${FIREBASE_RTDB_URL}/genieTransactions/${encodeURIComponent(transactionId)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (record.localId) {
      await fetch(`${FIREBASE_RTDB_URL}/genieLocalIdIndex/${encodeURIComponent(record.localId)}.json`, {
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
    const res = await fetch(`${FIREBASE_RTDB_URL}/genieTransactions/${encodeURIComponent(transactionId)}.json`);
    if (res.ok) return (await res.json()) || null;
  } catch (e) { console.warn('[Genie Transaction Read Warning]:', e.message); }
  return null;
}

export async function resolveGenieTransactionIdByLocalId(localId) {
  try {
    const res = await fetch(`${FIREBASE_RTDB_URL}/genieLocalIdIndex/${encodeURIComponent(localId)}.json`);
    if (res.ok) return (await res.json()) || null;
  } catch (e) { /* not found */ }
  return null;
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
  const creditResult = await creditUserWalletServer(record.uid, record.amountLkr, record.email);
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

  console.log(`[Genie Wallet Credited] txn=${transactionId} user=${record.uid || record.email} amount=Rs.${record.amountLkr} newBalance=Rs.${creditResult.newBalanceLkr}`);
  return { success: true, isPaid: true, credited: true, amount: record.amountLkr, newBalanceLkr: creditResult.newBalanceLkr, newBalanceUsdt: creditResult.newBalanceUsdt };
}
