async function placePubgOrder() {
  const partnerOrderId = 'ORD-PUBG-' + Date.now();
  console.log('Sending PUBG Mobile 60 UC Order to MooGold API...');
  console.log('Target Player Character ID:', '52247852395');
  console.log('Variation ID:', '4085924');
  console.log('Partner Order ID:', partnerOrderId);

  try {
    const res = await fetch('https://madstopup.com/api/moogold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'order/create_order',
        bodyObj: {
          path: 'order/create_order',
          data: {
            category: '1',
            'product-id': 4085924,
            quantity: 1,
            'User ID': '52247852395'
          },
          partnerOrderId
        }
      })
    });

    console.log('HTTP Status Code:', res.status);
    const data = await res.json();
    console.log('MooGold API Response Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error sending order:', err.message);
  }
}

placePubgOrder();
