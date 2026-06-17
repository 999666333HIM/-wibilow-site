// netlify/functions/get-catalog.js
//
// This is what your storefront calls to load real products.
// It reads the catalog that refresh-catalog.js builds up over time,
// and strips out anything that would reveal your sourcing/markup
// (raw price, source name) before sending it to the browser.

const { getStore } = require('@netlify/blobs');

exports.handler = async function () {
  try {
    const store = getStore('wibilow-catalog');
    const catalog = await store.get('catalog', { type: 'json' });

    if (!catalog) {
      return {
        statusCode: 200,
        body: JSON.stringify({ products: [] }),
      };
    }

    // Flatten all categories into one product list, and only send
    // buyer-safe fields (no raw source price, no source store name).
    const allProducts = [];
    Object.values(catalog).forEach((items) => {
      items.forEach((item) => {
        allProducts.push({
          id: item.id,
          name: item.name,
          cat: item.cat,
          icon: item.icon,
          price: item.displayPrice, // already marked up -- safe to show
          rating: item.rating,
          reviews: item.reviews,
          hot: item.hot,
          desc: item.desc,
          thumbnail: item.thumbnail,
          stock: item.stock,
        });
      });
    });

    return {
      statusCode: 200,
      headers: { 'Cache-Control': 'public, max-age=300' }, // cache 5 min in browser
      body: JSON.stringify({ products: allProducts }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
