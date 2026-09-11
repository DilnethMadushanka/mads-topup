import crypto from 'crypto';

const partnerId = 'f27cabc8d2c2122bbedacabce632db68';
const secretKey = 'PM67SGqyed';
const baseUrl = 'https://moogold.com/wp-json/v1/api';

async function testPayload(dataFields, label) {
  const path = 'order/create_order';
  const partnerOrderId = crypto.randomUUID();
  const bodyObj = {
    path,
    data: dataFields,
    partnerOrderId
  };

  const timestamp = Math.floor(Date.now() / 1000);
  const payloadStr = JSON.stringify(bodyObj);
  const stringToSign = payloadStr + timestamp + path;

  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(stringToSign);
  const authSignature = hmac.digest('hex');
  const basicAuth = 'Basic ' + Buffer.from(`${partnerId}:${secretKey}`).toString('base64');

  console.log(`\n=== Testing Payload Variation [${label}] ===`);
  console.log('Payload:', JSON.stringify(bodyObj, null, 2));

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
    console.log('MooGold Response:', text);
  } catch (err) {
    console.error('Fetch Error:', err.message);
  }
}

async function runAllTests() {
  // Test 1: Standard User ID
  await testPayload({
    category: '50',
    'product-id': '215570',
    quantity: '1',
    'User ID': '2940496819'
  }, 'User ID');

  // Test 2: User ID + Server
  await testPayload({
    category: '50',
    'product-id': '215570',
    quantity: '1',
    'User ID': '2940496819',
    Server: ''
  }, 'User ID + Server');

  // Test 3: Player ID
  await testPayload({
    category: '50',
    'product-id': '215570',
    quantity: '1',
    'Player ID': '2940496819'
  }, 'Player ID');
}

runAllTests();
