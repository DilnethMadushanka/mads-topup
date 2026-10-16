// Payment reference helpers. A deposit reference (EZ Cash RN, Binance
// order/pay id) can be credited only once, so each one is reduced to a key
// that stays the same however the customer typed it.

// Last 9 digits of a Sri Lankan mobile number, '' when it isn't one.
export const phoneTail = (v) => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 9 ? d.slice(-9) : ''; };

// Mobile numbers in a Dialog EZ Cash SMS, except the store's own number.
export function phonesInSms(text, merchantTail = '') {
  const found = [...String(text || '').matchAll(/(?<!\d)(?:\+?94|0)7\d{8}(?!\d)/g)].map(m => phoneTail(m[0]));
  return [...new Set(found)].filter(p => p && p !== merchantTail);
}

export function paymentRefKey(method, ref) {
  const m = String(method || '').toLowerCase();
  if (m.includes('ez')) {
    const rn = String(ref || '').replace(/\D/g, '');
    return rn.length >= 10 ? `ezcash_${rn.slice(0, 20)}` : null;
  }
  if (m.includes('binance')) {
    // "Order: <id> | PayID: <id>" — only the Binance order id identifies the payment.
    const order = String(ref || '').match(/order[:\s]*([a-z0-9]+)/i);
    const clean = String(order ? order[1] : ref || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean.length >= 8 ? `binance_${clean.slice(0, 120)}` : null;
  }
  return null;
}
