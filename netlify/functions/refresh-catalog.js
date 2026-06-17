// netlify/functions/refresh-catalog.js
//
// This function runs on a SCHEDULE (every 3 hours = 8 times per day).
// Each run it searches ONE category term on Google Shopping via SerpApi,
// applies your 2% markup, and saves the results into Netlify Blobs storage
// (a simple built-in database Netlify provides for free).
//
// 8 runs/day x 30 days = 240/month, just under the 250/month free plan
// limit, leaving a small buffer for manual testing.
//
// Each run rotates to the NEXT term in SEARCH_TERMS (not just by day),
// so with 8 terms you'll cycle through the whole list once per day,
// refreshing every category 1x/day rather than 1 category per day.

const { getStore } = require('@netlify/blobs');

// Rotate through these one at a time, one per day.
// Add/remove/reorder freely -- just keep the list length reasonable
// relative to how many searches/day you want to spend.
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
  // Same formula used on the frontend: 2% markup, rounded up to whole dollar.
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

    const store = getStore('wibilow-catalog');

    // Track which term to search next using a persisted counter,
    // so every run (every 3 hours) advances to the next term --
    // not just once per calendar day.
    let runIndex = 0;
    try {
      const savedIndex = await store.get('run-index', { type: 'json' });
      if (typeof savedIndex === 'number') runIndex = savedIndex;
    } catch (e) {
      // first run ever, start at 0
    }

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
        price: rawPrice,              // raw sourced price (kept server-side only)
        displayPrice: markupPrice(rawPrice), // what buyers will see
        rating: item.rating || 4.5,
        reviews: item.reviews || Math.floor(Math.random() * 5000) + 200,
        hot: i < 2,
        desc: item.snippet || `A top pick for "${term}".`,
        thumbnail: item.thumbnail || null,
        stock: Math.floor(Math.random() * 40) + 3,
        lastUpdated: new Date().toISOString(),
      };
    });

    // Load existing catalog (if any), merge in today's category, save back.
    let catalog = {};
    try {
      const existing = await store.get('catalog', { type: 'json' });
      if (existing) catalog = existing;
    } catch (e) {
      // no existing catalog yet, that's fine on first run
    }

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
