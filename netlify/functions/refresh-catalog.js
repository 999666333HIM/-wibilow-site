const { getStore } = require('@netlify/blobs');

const SEARCH_TERMS = [
  'wireless earbuds',
  'air fryer',
  'running shoes',
  'robot vacuum',
  'coffee maker',
  '4k tv',
  'backpack',
  'skincare moisturizer',
];

function markupPrice(rawPrice) {
  return Math.ceil(rawPrice * 1.02);
}

function pickEmoji(term) {
  const map = {
    'wireless earbuds': '🎧',
    'air fryer': '🍳',
    'running shoes': '👟',
    'robot vacuum': '🤖',
    'coffee maker': '☕',
    '4k tv': '📺',
    'backpack': '🎒',
    'skincare moisturizer': '🧴',
  };
  return map[term] || '🛍️';
}

exports.handler = async function () {
  try {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: 'Missing SERPAPI_KEY environment variable.' };
    }

    console.log('DEBUG siteID present:', !!process.env.NETLIFY_SITE_ID);
    console.log('DEBUG token present:', !!process.env.NETLIFY_BLOBS_TOKEN);
    console.log('DEBUG siteID value (first 6 chars):', (process.env.NETLIFY_SITE_ID || '').slice(0, 6));

    const store = getStore({
      name: 'wibilow-catalog',
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN,
    });

    let runIndex = 0;
    try {
      const savedIndex = await store.get('run-index', { type: 'json' });
      if (typeof savedIndex === 'number') runIndex = savedIndex;
    } catch (e) {}

    const term = SEARCH_TERMS[runIndex % SEARCH_TERMS.length];
    const nextIndex = (runIndex + 1) % SEARCH_TERMS.length;
    await store.setJSON('run-index', nextIndex);

    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(term)}&api_key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    const results = (data.shopping_results || []).slice(0, 10).map((item, i) => {
      const rawPrice = item.extracted_price || 0;
      return {
        id: `${term.replace(/\s+/g, '-')}-${i}`,
        name: item.title || term,
        cat: term,
        icon: pickEmoji(term),
        price: rawPrice,
        displayPrice: markupPrice(rawPrice),
        rating: item.rating || 4.5,
        reviews: item.reviews || Math.floor(Math.random() * 5000) + 200,
        hot: i < 2,
        desc: item.snippet || `A top pick for "${term}".`,
        thumbnail: item.thumbnail || null,
        stock: Math.floor(Math.random() * 40) + 3,
        lastUpdated: new Date().toISOString(),
      };
    });

    let catalog = {};
    try {
      const existing = await store.get('catalog', { type: 'json' });
      if (existing) catalog = existing;
    } catch (e) {}

    catalog[term] = results;
    await store.setJSON('catalog', catalog);

    return {
      statusCode: 200,
      body: JSON.stringify({ updated: term, count: results.length }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};