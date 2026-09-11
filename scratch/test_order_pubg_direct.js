import crypto from 'crypto';

const partnerId = 'f27cabc8d2c2122bbedacabce632db68';
const secretKey = 'PM67SGqyed';
const baseUrl = 'https://moogold.com/wp-json/v1/api';

async function dispatchPubgOrder() {
  const path = 'order/create_order';
  const partnerOrderId = 'ORD-PUBG-' + Date.now();
  const bodyObj = {
    path,
    data: {
      category: '1',
      'product-id': '215570',
      product_id: '215570',
      quantity: '1',
      'User ID': '52247852395',
      user_id: '52247852395',
      Server: '',
      server: ''
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

  console.log('Sending PUBG 60 UC Order to MooGold API...');
  console.log('Partner Order ID:', partnerOrderId);
  console.log('Target Player ID:', '52247852395');

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

    console.log('Order Dispatch HTTP Status:', res.status);
    const text = await res.text();
    console.log('MooGold Response Body:', text);
  } catch (err) {
    console.error('Error dispatching order:', err.message);
  }
}

dispatchPubgOrder();
