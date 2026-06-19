exports.handler = async function(event) {
  console.log('Function invoked');
  console.log('Method:', event.httpMethod);

  if(event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const Stripe = require('stripe');
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const payload = JSON.parse(event.body);

    console.log('Event type:', payload.type);

    if(payload.type !== 'checkout.session.completed') {
      return { statusCode: 200, body: 'Not a checkout event' };
    }

    const session = payload.data.object;
    const shipping = session.shipping_details || session.customer_details;
    console.log('Shipping:', JSON.stringify(shipping));

    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items'],
    });
    const lineItems = fullSession.line_items?.data || [];
    console.log('Line items count:', lineItems.length);
    console.log('Line items:', JSON.stringify(lineItems.map(i => ({
      name: i.description,
      cjPid: i.price?.product_data?.metadata?.cjPid || null
    }))));

    const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
    const tokenRes = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: process.env.CJ_API_KEY }),
    });
    const tokenData = await tokenRes.json();
    console.log('CJ token result:', tokenData.result);

    if(tokenData.result && shipping) {
      const products = lineItems
        .map(i => ({ vid: i.price?.product_data?.metadata?.cjPid || '', quantity: 1 }))
        .filter(i => i.vid);

      console.log('CJ products to order:', JSON.stringify(products));

      if(products.length) {
        const orderRes = await fetch(`${CJ_BASE}/shopping/order/createOrderV2`, {
          method: 'POST',
          headers: { 'CJ-Access-Token': tokenData.data.accessToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: `WB-${Date.now()}`,
            shippingName: shipping.name || 'Customer',
            shippingCountry: shipping.address?.country || 'US',
            shippingState: shipping.address?.state || '',
            shippingCity: shipping.address?.city || '',
            shippingAddress: shipping.address?.line1 || '',
            shippingAddress2: shipping.address?.line2 || '',
            shippingZip: shipping.address?.postal_code || '',
            shippingPhone: '0000000000',
            products,
          }),
        });
        const orderData = await orderRes.json();
        console.log('CJ order result:', JSON.stringify(orderData));
      } else {
        console.log('No CJ product IDs found on line items');
      }
    }

    return { statusCode: 200, body: 'OK' };
  } catch(err) {
    console.error('Error:', err.message, err.stack);
    return { statusCode: 500, body: err.message };
  }
};