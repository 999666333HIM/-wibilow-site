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

const GITHUB_OWNER = '999666333HIM';
const GITHUB_REPO = '-wibilow-site';
const GITHUB_FILE_PATH = 'catalog.json';

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

async function githubRequest(path, options = {}) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return res;
}

async function getCurrentCatalogFile() {
  const res = await githubRequest(`contents/${GITHUB_FILE_PATH}`);
  if (res.status === 404) {
    return { content: {}, sha: null };
  }
  const data = await res.json();
  const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
  return { content: JSON.parse(decoded), sha: data.sha };
}

async function saveCatalogFile(newContent, sha) {
  const encoded = Buffer.from(JSON.stringify(newContent, null, 2)).toString('base64');
  const body = {
    message: 'Update product catalog',
    content: encoded,
  };
  if (sha) body.sha = sha;

  const res = await githubRequest(`contents/${GITHUB_FILE_PATH}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res;
}

exports.handler = async function () {
  try {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: 'Missing SERPAPI_KEY environment variable.' };
    }
    if (!process.env.GITHUB_TOKEN) {
      return { statusCode: 500, body: 'Missing GITHUB_TOKEN environment variable.' };
    }

    const { content: catalog, sha } = await getCurrentCatalogFile();

    let runIndex = catalog.__runIndex || 0;
    const term = SEARCH_TERMS[runIndex % SEARCH_TERMS.length];
    const nextIndex = (runIndex + 1) % SEARCH_TERMS.length;

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

    catalog[term] = results;
    catalog.__runIndex = nextIndex;

    const saveRes = await saveCatalogFile(catalog, sha);
    if (!saveRes.ok) {
      const errBody = await saveRes.text();
      throw new Error(`GitHub save failed: ${saveRes.status} ${errBody}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ updated: term, count: results.length }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};