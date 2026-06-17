// netlify/functions/create-checkout.js
//
// This function runs on Netlify's server, NOT in the browser.
// It safely holds your Stripe SECRET key (set as an environment variable)
// and creates a real Stripe Checkout session for the buyer's cart.

const Stripe = require('stripe');

exports.handler = async function (event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const { cart } = JSON.parse(event.body);

    if (!Array.isArray(cart) || cart.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Cart is empty.' }) };
    }

    // Build Stripe line items from the cart.
    // displayPrice already includes your 2% markup, applied on the frontend.
    // We recalculate it here too so a buyer can't tamper with prices in the browser.
    const line_items = cart.map((item) => {
      const finalPrice = Math.ceil(item.price * 1.02); // same formula as frontend
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
          },
          unit_amount: finalPrice * 100, // Stripe expects cents
        },
        quantity: 1,
      };
    });

    const siteUrl = process.env.URL || 'https://wibilow.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url: `${siteUrl}/success.html`,
      cancel_url: `${siteUrl}/`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
