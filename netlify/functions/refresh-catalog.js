const SEARCH_TERMS = [
  'wireless earbuds','bluetooth speaker','smartwatch','laptop stand',
  'phone case','usb hub','webcam','mechanical keyboard','gaming mouse',
  'portable charger','led desk lamp','smart plug','ring light','tablet stand',
  'wireless charger','hdmi cable','monitor light bar','cable organizer',
  'air fryer','coffee maker','robot vacuum','instant pot','blender',
  'mattress topper','throw pillow','scented candle','storage organizer',
  'shower curtain','bath towel set','kitchen knife set','cast iron pan',
  'ice cube tray','dish drying rack','silicone spatula','electric kettle',
  'running shoes','gym leggings','baseball cap','sunglasses','leather wallet',
  'tote bag','winter scarf','compression socks','sports bra','hoodie',
  'minimalist watch','canvas sneakers','crossbody bag',
  'skincare lotion','face serum','vitamin c cream','hair mask','electric toothbrush',
  'jade roller','sunscreen','lip gloss','eyelash curler','nail kit',
  'facial cleanser','eye cream','hair growth oil','makeup brush set',
  'resistance bands','yoga mat','water bottle','jump rope','foam roller',
  'gym gloves','protein shaker','ankle weights','pull up bar','knee sleeve',
  'dog collar','cat toy','pet bed','dog harness','cat scratcher',
  'fidget toy','building blocks','art supplies for kids','kids headphones',
  'garden gloves','plant pot','watering can','led grow light','pruning shears',
];

const GITHUB_OWNER = '999666333HIM';
const GITHUB_REPO = '-wibilow-site';
const GITHUB_FILE_PATH = 'catalog.json';
const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';

function markupPrice(p){
  if(p === 0) return 0;
  return Math.ceil((p + 6) * 1.40);
}

function cleanDesc(raw){
  if(!raw) return '';
  return raw.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim().slice(0,150);
}

function pickEmoji(term){
  const map = {
    'wireless earbuds':'🎧','bluetooth speaker':'🔊','smartwatch':'⌚',
    'laptop stand':'💻','phone case':'📱','usb hub':'🔌','webcam':'📷',
    'mechanical keyboard':'⌨️','gaming mouse':'🖱️','portable charger':'🔋',
    'led desk lamp':'💡','smart plug':'🔌','ring light':'💡','tablet stand':'📱',
    'wireless charger':'🔋','hdmi cable':'📺','monitor light bar':'💡',
    'cable organizer':'🔌','air fryer':'🍳','coffee maker':'☕',
    'robot vacuum':'🤖','instant pot':'🍲','blender':'🥤',
    'mattress topper':'🛏️','throw pillow':'🛋️','scented candle':'🕯️',
    'storage organizer':'📦','shower curtain':'🚿','bath towel set':'🛁',
    'kitchen knife set':'🔪','cast iron pan':'🍳','ice cube tray':'🧊',
    'dish drying rack':'🍽️','silicone spatula':'🥄','electric kettle':'☕',
    'running shoes':'👟','gym leggings':'🏃','baseball cap':'🧢',
    'sunglasses':'🕶️','leather wallet':'👜','tote bag':'👜',
    'winter scarf':'🧣','compression socks':'🧦','sports bra':'👙',
    'hoodie':'👕','minimalist watch':'⌚','canvas sneakers':'👟',
    'crossbody bag':'👜','skincare lotion':'🧴','face serum':'💆',
    'vitamin c cream':'🧴','hair mask':'💇','electric toothbrush':'🪥',
    'jade roller':'💆','sunscreen':'🧴','lip gloss':'💄',
    'eyelash curler':'👁️','nail kit':'💅','facial cleanser':'🧴',
    'eye cream':'💆','hair growth oil':'💇','makeup brush set':'💄',
    'resistance bands':'💪','yoga mat':'🧘','water bottle':'🫗',
    'jump rope':'🏃','foam roller':'💪','gym gloves':'🥊',
    'protein shaker':'🥤','ankle weights':'💪','pull up bar':'💪',
    'knee sleeve':'🦵','dog collar':'🐕','cat toy':'🐈',
    'pet bed':'🐾','dog harness':'🐕','cat scratcher':'🐈',
    'fidget toy':'🎯','building blocks':'🧱','art supplies for kids':'🎨',
    'kids headphones':'🎧','garden gloves':'🌱','plant pot':'🪴',
    'watering can':'🌿','led grow light':'💡','pruning shears':'✂️',
  };
  return map[term] || '🛍️';
}

function pickCat(term){
  const electronics=['wireless earbuds','bluetooth speaker','smartwatch','laptop stand',
    'phone case','usb hub','webcam','mechanical keyboard','gaming mouse','portable charger',
    'led desk lamp','smart plug','ring light','tablet stand','wireless charger',
    'hdmi cable','monitor light bar','cable organizer'];
  const home=['air fryer','coffee maker','robot vacuum','instant pot','blender',
    'mattress topper','throw pillow','scented candle','storage organizer','shower curtain',
    'bath towel set','kitchen knife set','cast iron pan','ice cube tray','dish drying rack',
    'silicone spatula','electric kettle'];
  const fashion=['running shoes','gym leggings','baseball cap','sunglasses','leather wallet',
    'tote bag','winter scarf','compression socks','sports bra','hoodie',
    'minimalist watch','canvas sneakers','crossbody bag'];
  const beauty=['skincare lotion','face serum','vitamin c cream','hair mask','electric toothbrush',
    'jade roller','sunscreen','lip gloss','eyelash curler','nail kit',
    'facial cleanser','eye cream','hair growth oil','makeup brush set'];
  const sports=['resistance bands','yoga mat','water bottle','jump rope','foam roller',
    'gym gloves','protein shaker','ankle weights','pull up bar','knee sleeve'];
  const pets=['dog collar','cat toy','pet bed','dog harness','cat scratcher'];
  const kids=['fidget toy','building blocks','art supplies for kids','kids headphones'];
  const garden=['garden gloves','plant pot','watering can','led grow light','pruning shears'];
  if(electronics.includes(term)) return 'Electronics';
  if(home.includes(term)) return 'Home';
  if(fashion.includes(term)) return 'Fashion';
  if(beauty.includes(term)) return 'Beauty';
  if(sports.includes(term)) return 'Sports';
  if(pets.includes(term)) return 'Pets';
  if(kids.includes(term)) return 'Kids';
  if(garden.includes(term)) return 'Garden';
  return 'General';
}

async function getCJToken(apiKey){
  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({apiKey})});
  const data = await res.json();
  if(!data.result) throw new Error(`CJ auth failed: ${data.message}`);
  return data.data.accessToken;
}

async function searchCJProducts(token, keyword){
  const params = new URLSearchParams({productNameEn:keyword,pageNum:1,pageSize:50});
  const res = await fetch(`${CJ_BASE}/product/list?${params}`,{
    headers:{'CJ-Access-Token':token}});
  const data = await res.json();
  if(!data.result) throw new Error(`CJ search failed: ${data.message}`);
  return data.data?.list || [];
}

async function githubRequest(path, options={}){
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/${path}`,{
    ...options,headers:{
      Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,
      Accept:'application/vnd.github+json',
      'Content-Type':'application/json',
      ...(options.headers||{})}});
  return res;
}

async function getCurrentCatalogFile(){
  const res = await githubRequest(`contents/${GITHUB_FILE_PATH}`);
  if(res.status===404) return {content:{},sha:null};
  const data = await res.json();
  return {content:JSON.parse(Buffer.from(data.content,'base64').toString('utf-8')),sha:data.sha};
}

async function saveCatalogFile(newContent, sha){
  const body={
    message:'Update product catalog via CJ',
    content:Buffer.from(JSON.stringify(newContent,null,2)).toString('base64')
  };
  if(sha) body.sha=sha;
  return githubRequest(`contents/${GITHUB_FILE_PATH}`,{method:'PUT',body:JSON.stringify(body)});
}

exports.handler = async function(){
  try{
    const apiKey = process.env.CJ_API_KEY;
    if(!apiKey) return {statusCode:500,body:'Missing CJ_API_KEY'};
    if(!process.env.GITHUB_TOKEN) return {statusCode:500,body:'Missing GITHUB_TOKEN'};

    const {content:catalog, sha} = await getCurrentCatalogFile();
    let runIndex = catalog.__runIndex || 0;
    const term = SEARCH_TERMS[runIndex % SEARCH_TERMS.length];
    catalog.__runIndex = (runIndex + 1) % SEARCH_TERMS.length;

    const token = await getCJToken(apiKey);
    const allItems = await searchCJProducts(token, term);

    // Filter: product name must contain at least one keyword from the search term
    // Excludes common stopwords to avoid false matches like "wireless bra" matching "wireless earbuds"
    const stopwords = ['and','for','the','with','set','kids','supplies','plus','size'];
    const keywords = term.toLowerCase().split(' ').filter(w => !stopwords.includes(w) && w.length > 3);
    const items = allItems.filter(item => {
      const name = (item.productNameEn || item.productName || '').toLowerCase();
      return keywords.some(kw => name.includes(kw));
    });

    if(!items.length){
      await saveCatalogFile(catalog, sha);
      return {statusCode:200,body:JSON.stringify({updated:term,count:0,note:'No relevant results'})};
    }

    catalog[term] = items.slice(0,50).map((item,i)=>{
      const rawPrice = parseFloat(item.sellPrice||item.productPrice||0);
      const displayPrice = markupPrice(rawPrice);
      if(displayPrice < 10 || rawPrice === 0) return null;
      const rawName = item.productNameEn||item.productName||term;
      const words = rawName.split(' ');
      const half = Math.ceil(words.length/2);
      const firstHalf = words.slice(0,half).join(' ');
      const cleanName = rawName.toLowerCase().endsWith(firstHalf.toLowerCase()) ? firstHalf : rawName;
      return {
        id:`cj-${item.pid||item.productId||i}-${Date.now()}`,
        name:cleanName,
        cat:pickCat(term),
        icon:pickEmoji(term),
        displayPrice,
        rating:4.5,
        reviews:Math.floor(Math.random()*20000)+200,
        hot:i<3,
        desc:cleanDesc(item.remark)||'Shipped direct to your door.',
        thumbnail:item.productImage||null,
        stock:item.inventoryQuantity||Math.floor(Math.random()*40)+3,
        cjPid:item.pid||item.productId,
        lastUpdated:new Date().toISOString(),
      };
    }).filter(Boolean);

    const saveRes = await saveCatalogFile(catalog, sha);
    if(!saveRes.ok){
      const e = await saveRes.text();
      throw new Error(`GitHub save failed: ${e}`);
    }

    return {statusCode:200,body:JSON.stringify({updated:term,count:catalog[term].length})};
  }catch(err){
    console.error(err);
    return {statusCode:500,body:JSON.stringify({error:err.message})};
  }
};