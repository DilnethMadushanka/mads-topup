async function testRealDialogSmsFormat() {
  console.log('====================================================');
  console.log('TESTING REAL DIALOG EZ CASH SMS MATCH FOR RN 20260912004778');
  console.log('====================================================\n');

  // Exact Dialog SMS string from user screenshot
  const realSms = 'Customer Account Recharge Your eZ Cash Account is recharged 12/09/2026 05:44 by CEFT via DAP a/c at Dialog Finance Rs.100.00 Current Bal: Rs.302.00 Service Charge: Rs.0.00 Net Received: Rs.100.00 RN:20260912004778';

  console.log('📲 STEP 1: Sending Real Dialog SMS to Webhook (/api/ezcash/webhook)...');
  console.log('SMS Body:', realSms);

  const webhookRes = await fetch('http://localhost:3000/api/ezcash/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ smsText: realSms })
  });

  const webhookData = await webhookRes.json();
  console.log('Webhook Response:', webhookData);

  console.log('\n💳 STEP 2: Customer Submits RN (20260912004778) on Website (/api/ezcash/verify-rn)...');

  const verifyRes = await fetch('http://localhost:3000/api/ezcash/verify-rn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rnNumber: '20260912004778',
      amount: 100,
      userEmail: 'madsruzza@gmail.com'
    })
  });

  const verifyData = await verifyRes.json();
  console.log('\n====================================================');
  console.log('VERIFICATION HTTP STATUS:', verifyRes.status);
  console.log(JSON.stringify(verifyData, null, 2));
  console.log('====================================================\n');
}

testRealDialogSmsFormat();
