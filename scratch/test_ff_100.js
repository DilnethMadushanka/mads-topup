import crypto from 'crypto';

const partnerId = 'f27cabc8d2c2122bbedacabce632db68';
const secretKey = 'PM67SGqyed';
const baseUrl = 'https://moogold.com/wp-json/v1/api';

async function test100DiamondsOrder() {
  const path = 'order/create_order';
  const partnerOrderId = crypto.randomUUID();
  const bodyObj = {
    path,
    data: {
      category: '50',
      'product-id': '215570',
      quantity: '1',
      'User ID': '2940496819'
    },
    partnerOrderId
  };

  const timestamp = Math.floor(Date.now() / 1000);
  const payloadStr = JSON.stringify(bodyObj);
  const stringToSign = payloadStr + timestamp + path;

  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(stringToSign);
  const authSignature = hmac.digest('hex');
  const basicAuth = 'Basic ' + Buffer.from(`${partnerId}:${secretKey}`).toString('base64');

  console.log('--- MOONGOLD LIVE TEST ---');
  console.log('Partner Order ID (UUID):', partnerOrderId);
  console.log('Category:', '50');
  console.log('Product ID:', '215570 (100+10 Diamonds)');
  console.log('User ID:', '2940496819');

  try {
    const res = await fetch(`${baseUrl}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': basicAuth,
        'auth': authSignature,
        'timestamp': timestamp.toString(),
        'User-Agent': 'Mozilla/5.0'
      },
      body: payloadStr
    });

    console.log('HTTP Status:', res.status);
    const text = await res.text();
    console.log('Raw Response:', text);
  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
}

test100DiamondsOrder();
