import crypto from 'crypto';

const partnerId = 'f27cabc8d2c2122bbedacabce632db68';
const secretKey = 'PM67SGqyed';
const baseUrl = 'https://moogold.com/wp-json/v1/api';

async function testDirectBalance() {
  const path = 'user/balance';
  const bodyObj = { path };
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadStr = JSON.stringify(bodyObj);
  const stringToSign = payloadStr + timestamp + path;

  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(stringToSign);
  const authSignature = hmac.digest('hex');
  const basicAuth = 'Basic ' + Buffer.from(`${partnerId}:${secretKey}`).toString('base64');

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

    console.log('Direct Balance HTTP Status:', res.status);
    const text = await res.text();
    console.log('Direct Response:', text);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testDirectBalance();
