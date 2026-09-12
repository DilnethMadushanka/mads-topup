import express from 'express';

async function testEzCashAutomation() {
  console.log('====================================================');
  console.log('TESTING EZ CASH SMS WEBHOOK & AUTO-VERIFY SYSTEM');
  console.log('====================================================\n');

  // STEP 1: Simulate iPhone Shortcut / SMS Forwarder sending Dialog SMS to Server Webhook
  const sampleDialogSms = 'Received LKR 1500.00 from 771234567. Trans ID: 20260912982314. Date: 2026-09-12 05:28.';
  console.log('📲 STEP 1: Sending Dialog SMS to Webhook Endpoint (/api/ezcash/webhook)...');
  console.log('SMS Payload:', sampleDialogSms);

  const webhookRes = await fetch('http://localhost:3000/api/ezcash/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ smsText: sampleDialogSms })
  });

  const webhookData = await webhookRes.json();
  console.log('Webhook Response:', webhookData);

  // STEP 2: Simulate Customer submitting RN Number on Website
  console.log('\n💳 STEP 2: Customer Submits RN Number (20260912982314) on Website (/api/ezcash/verify-rn)...');
  
  const verifyRes = await fetch('http://localhost:3000/api/ezcash/verify-rn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rnNumber: '20260912982314',
      amount: 1500,
      userEmail: 'dilneth.gamer@gmail.com'
    })
  });

  const verifyData = await verifyRes.json();
  console.log('\n====================================================');
  console.log('AUTO-VERIFICATION RESULT:', verifyRes.status);
  console.log(JSON.stringify(verifyData, null, 2));
  console.log('====================================================\n');

  if (verifyData.verified && verifyData.autoApproved) {
    console.log('🎉 SUCCESS! EZ CASH SMS MATCHED & WALLET AUTO-CREDITED INSTANTLY!');
  } else {
    console.log('Note:', verifyData);
  }
}

testEzCashAutomation();
