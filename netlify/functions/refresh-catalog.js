const SEARCH_TERMS = [
  'earbuds','bluetooth speaker','smartwatch','laptop stand',
  'phone case','usb hub','webcam','mechanical keyboard','gaming mouse',
  'portable charger','led desk lamp','smart plug','ring light','tablet stand',
  'qi charger','hdmi cable','monitor light bar','cable organizer',
  'air fryer','coffee maker','robot vacuum','instant pot','blender',
  'mattress topper','throw pillow','scented candle','storage organizer',
  'shower curtain','bath towel','kitchen knife','cast iron pan',
  'ice cube tray','dish rack','silicone spatula','electric kettle',
  'running shoes','gym leggings','baseball cap','sunglasses','leather wallet',
  'tote bag','winter scarf','compression socks','sports bra','hoodie',
  'minimalist watch','canvas sneakers','crossbody bag',
  'skincare lotion','face serum','vitamin c cream','hair mask','electric toothbrush',
  'jade roller','sunscreen','lip gloss','eyelash curler','nail kit',
  'facial cleanser','eye cream','hair growth oil','makeup brush set',
  'resistance bands','yoga mat','water bottle','jump rope','foam roller',
  'gym gloves','protein shaker','ankle weights','pull up bar','knee sleeve',
  'dog collar','cat toy','pet bed','dog harness','cat scratcher',
  'fidget toy','building blocks','art supplies','kids headphones',
  'garden gloves','plant pot','watering can','grow light','pruning shears',
];

const GITHUB_OWNER = '999666333HIM';
const GITHUB_REPO = '-wibilow-site';
const GITHUB_FILE_PATH = 'catalog.json';

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
    'earbuds':'🎧','bluetooth speaker':'🔊','smartwatch':'⌚',
    'laptop stand':'💻','phone case':'📱','usb hub':'🔌','webcam':'📷',
    'mechanical keyboard':'⌨️','gaming mouse':'🖱️','portable charger':'🔋',
    'led desk lamp':'💡','smart plug':'🔌','ring light':'💡','tablet stand':'📱',
    'qi charger':'🔋','hdmi cable':'📺','monitor light bar':'💡',
    'cable organizer':'🔌','air fryer':'🍳','coffee maker':'☕',
    'robot vacuum':'🤖','instant pot':'🍲','blender':'🥤',
    'mattress topper':'🛏️','throw pillow':'🛋️','scented candle':'🕯️',
    'storage organizer':'📦','shower curtain':'🚿','bath towel':'🛁',
    'kitchen knife':'🔪','cast iron pan':'🍳','ice cube tray':'🧊',
    'dish rack':'🍽️','silicone spatula':'🥄','electric kettle':'☕',
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
    'fidget toy':'🎯','building blocks':'🧱','art supplies':'🎨',
    'kids headphones':'🎧','garden gloves':'🌱','plant pot':'🪴',
    'watering can':'🌿','grow light':'💡','pruning shears':'✂️',
  };
  return map[term] || '🛍️';
}

function pickCat(term){
  const electronics=['earbuds','bluetooth speaker','smartwatch','laptop stand',
    'phone case','usb hub','webcam','mechanical keyboard','gaming mouse','portable charger',
    'led desk lamp','smart plug','ring light','tablet stand','qi charger',
    'hdmi cable','monitor light bar','cable organizer'];
  const home=['air fryer','coffee maker','robot vacuum','instant pot','blender',
    'mattress topper','throw pillow','scented candle','storage organizer','shower curtain',
    'bath towel','kitchen knife','cast iron pan','ice cube tray','dish rack',
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
  const kids=['fidget toy','building blocks','art supplies','kids headphones'];
  const garden=['garden gloves','plant pot','watering can','grow light','pruning shears'];
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

async function searchAliExpress(term){
  const headers = {
    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
    'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com',
  };
  const variants = [term, term + 's'];
  let allResults = [];
  for(const query of variants){
    if(allResults.length >= 20) break;
    for(let page = 1; page <= 4; page++){
      const url = `https://aliexpress-datahub.p.rapidapi.com/item_search_2?q=${encodeURIComponent(query)}&page=${page}&sort=salesDesc`;
      try{
        const res = await fetch(url, {headers});
        const data = await res.json();
        const list = data?.result?.resultList || [];
        if(!list.length) break;
        allResults = [...allResults, ...list];
      }catch(e){
        console.log('Page error:', page, e.message);
        break;
      }
    }
    if(allResults.length) break;
  }
  return allResults;
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
    message:'Update product catalog via AliExpress',
    content:Buffer.from(JSON.stringify(newContent,null,2)).toString('base64')
  };
  if(sha) body.sha=sha;
  return githubRequest(`contents/${GITHUB_FILE_PATH}`,{method:'PUT',body:JSON.stringify(body)});
}

exports.handler = async function(){
  try{
    if(!process.env.RAPIDAPI_KEY) return {statusCode:500,body:'Missing RAPIDAPI_KEY'};
    if(!process.env.GITHUB_TOKEN) return {statusCode:500,body:'Missing GITHUB_TOKEN'};

    const {content:catalog, sha} = await getCurrentCatalogFile();
    let runIndex = catalog.__runIndex || 0;
    const term = SEARCH_TERMS[runIndex % SEARCH_TERMS.length];
    catalog.__runIndex = (runIndex + 1) % SEARCH_TERMS.length;

    const results = await searchAliExpress(term);

    if(!results.length){
      await saveCatalogFile(catalog, sha);
      return {statusCode:200,body:JSON.stringify({updated:term,count:0,note:'No results'})};
    }

    catalog[term] = results.slice(0,200).map((entry,i)=>{
      const item = entry.item || entry;
      const rawPrice = parseFloat(item.sku?.def?.promotionPrice || item.promotionPrice || item.price || 0);
      const displayPrice = markupPrice(rawPrice);
      if(displayPrice < 8 || rawPrice === 0) return null;
      return {
        id:`ae-${item.itemId||i}-${Date.now()}`,
        name:item.title||term,
        cat:pickCat(term),
        icon:pickEmoji(term),
        displayPrice,
        rating:parseFloat(item.averageStarRate||4.5),
        reviews:parseInt(item.sales||Math.floor(Math.random()*10000)+100),
        hot:i<3,
        desc:'Shipped direct to your door.',
        thumbnail:item.image?(item.image.startsWith('http')?item.image:'https:'+item.image):null,
        stock:Math.floor(Math.random()*40)+5,
        aliUrl:item.itemUrl?(item.itemUrl.startsWith('http')?item.itemUrl:'https:'+item.itemUrl):null,
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