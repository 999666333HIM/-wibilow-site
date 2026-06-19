const SEARCH_TERMS = [
  'wireless earbuds','air fryer','running shoes','robot vacuum',
  'coffee maker','bluetooth speaker','backpack','skincare',
];
const GITHUB_OWNER = '999666333HIM';
const GITHUB_REPO = '-wibilow-site';
const GITHUB_FILE_PATH = 'catalog.json';
const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';

function markupPrice(p){ return Math.ceil(p * 1.02); }
function pickEmoji(term){
  const map = {'wireless earbuds':'🎧','air fryer':'🍳','running shoes':'👟',
    'robot vacuum':'🤖','coffee maker':'☕','bluetooth speaker':'🔊','backpack':'🎒','skincare':'🧴'};
  return map[term] || '🛍️';
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
  const params = new URLSearchParams({productNameEn:keyword,pageNum:1,pageSize:10});
  const res = await fetch(`${CJ_BASE}/product/list?${params}`,{headers:{'CJ-Access-Token':token}});
  const data = await res.json();
  if(!data.result) throw new Error(`CJ search failed: ${data.message}`);
  return data.data?.list || [];
}
async function githubRequest(path, options={}){
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/${path}`,{
    ...options,headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,
    Accept:'application/vnd.github+json','Content-Type':'application/json',...(options.headers||{})}});
  return res;
}
async function getCurrentCatalogFile(){
  const res = await githubRequest(`contents/${GITHUB_FILE_PATH}`);
  if(res.status===404) return {content:{},sha:null};
  const data = await res.json();
  return {content:JSON.parse(Buffer.from(data.content,'base64').toString('utf-8')),sha:data.sha};
}
async function saveCatalogFile(newContent, sha){
  const body={message:'Update product catalog via CJ',
    content:Buffer.from(JSON.stringify(newContent,null,2)).toString('base64')};
  if(sha) body.sha=sha;
  return githubRequest(`contents/${GITHUB_FILE_PATH}`,{method:'PUT',body:JSON.stringify(body)});
}
exports.handler = async function(){
  try{
    const apiKey = process.env.CJ_API_KEY;
    if(!apiKey) return {statusCode:500,body:'Missing CJ_API_KEY'};
    if(!process.env.GITHUB_TOKEN) return {statusCode:500,body:'Missing GITHUB_TOKEN'};
    const {content:catalog,sha} = await getCurrentCatalogFile();
    let runIndex = catalog.__runIndex || 0;
    const term = SEARCH_TERMS[runIndex % SEARCH_TERMS.length];
    catalog.__runIndex = (runIndex+1) % SEARCH_TERMS.length;
    const token = await getCJToken(apiKey);
    const items = await searchCJProducts(token, term);
    if(!items.length) return {statusCode:200,body:JSON.stringify({updated:term,count:0})};
    catalog[term] = items.map((item,i)=>({
      id:`cj-${item.pid||item.productId||i}`,
      name:(()=>{
  const raw=item.productNameEn||item.productName||term;
  const words=raw.split(' ');
  const half=Math.ceil(words.length/2);
  const firstHalf=words.slice(0,half).join(' ');
  return raw.endsWith(firstHalf)?firstHalf:raw;
})(),
      cat:term, icon:pickEmoji(term),
      displayPrice:markupPrice(parseFloat(item.sellPrice||item.productPrice||0)),
      rating:4.5, reviews:Math.floor(Math.random()*8000)+200,
      hot:i<2, desc:item.remark||item.productUnit||`Quality ${term} — shipped direct to your door.`,
      thumbnail:item.productImage||null,
      stock:item.inventoryQuantity||Math.floor(Math.random()*40)+3,
      cjPid:item.pid||item.productId,
      lastUpdated:new Date().toISOString(),
    }));
    const saveRes = await saveCatalogFile(catalog,sha);
    if(!saveRes.ok){const e=await saveRes.text();throw new Error(`GitHub save failed: ${e}`);}
    return {statusCode:200,body:JSON.stringify({updated:term,count:catalog[term].length})};
  }catch(err){
    console.error(err);
    return {statusCode:500,body:JSON.stringify({error:err.message})};
  }
};