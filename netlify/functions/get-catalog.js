const GITHUB_OWNER = '999666333HIM';
const GITHUB_REPO = '-wibilow-site';
const GITHUB_BRANCH = 'main';
const GITHUB_FILE_PATH = 'catalog.json';

exports.handler = async function () {
  try {
    const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/refs/heads/${GITHUB_BRANCH}/${GITHUB_FILE_PATH}`;
    const res = await fetch(url);

    if (!res.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({ products: [] }),
      };
    }

    const catalog = await res.json();

    const allProducts = [];
    Object.entries(catalog).forEach(([key, items]) => {
      if (key === '__runIndex') return;
      if (!Array.isArray(items)) return;
     items.forEach((item) => {
  allProducts.push({
    id: item.id,
    name: item.name,
    cat: item.cat,
    icon: item.icon,
    price: item.displayPrice,
    rating: item.rating,
    reviews: item.reviews,
    hot: item.hot,
    desc: item.desc,
    thumbnail: item.thumbnail,
    stock: item.stock,
   cjPid: item.cjPid || null,
aliUrl: item.aliUrl || null,
  });
});
    });

    return {
      statusCode: 200,
      headers: { 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify({ products: allProducts }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};