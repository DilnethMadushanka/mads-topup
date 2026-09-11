import crypto from 'crypto';

const partnerId = 'f27cabc8d2c2122bbedacabce632db68';
const secretKey = 'PM67SGqyed';
const baseUrl = 'https://moogold.com/wp-json/v1/api';

async function testLiveOrder() {
  const path = 'order/create_order';
  const partnerOrderId = 'MG-TEST-' + Date.now();
  const bodyObj = {
    path,
    data: {
      category: '1',
      'product-id': '11011929',
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

  console.log('Sending Live Order Test to MooGold API...');
  console.log('Product ID:', '11011929 (25 Diamonds)');
  console.log('Target Player ID:', '2940496819');
  console.log('Partner Order ID:', partnerOrderId);

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

    console.log('HTTP Status Code:', res.status);
    const text = await res.text();
    console.log('MooGold Raw Response:', text);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testLiveOrder();
