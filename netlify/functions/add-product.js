const GITHUB_OWNER = '999666333HIM';
const GITHUB_REPO = '-wibilow-site';
const GITHUB_FILE_PATH = 'catalog.json';

async function githubRequest(path, options={}){
  const res = await fetch('https://api.github.com/repos/'+GITHUB_OWNER+'/'+GITHUB_REPO+'/'+path,{
    ...options,headers:{
      Authorization:'Bearer '+process.env.GITHUB_TOKEN,
      Accept:'application/vnd.github+json',
      'Content-Type':'application/json',
      ...(options.headers||{})}});
  return res;
}

async function getCatalog(){
  const res = await githubRequest('contents/'+GITHUB_FILE_PATH);
  if(res.status===404) return {content:{},sha:null};
  const data = await res.json();
  return {content:JSON.parse(Buffer.from(data.content,'base64').toString('utf-8')),sha:data.sha};
}

async function saveCatalog(content, sha){
  const body={
    message:'Manual product update',
    content:Buffer.from(JSON.stringify(content,null,2)).toString('base64'),
  };
  if(sha) body.sha=sha;
  return githubRequest('contents/'+GITHUB_FILE_PATH,{method:'PUT',body:JSON.stringify(body)});
}

exports.handler = async function(event){
  if(!['POST', 'PUT' , 'DELETE'].includes(event.httpMethod))
    return {statusCode:405,body:'Method Not Allowed'};
  try{
    const body = JSON.parse(event.body);
    const {content:catalog, sha} = await getCatalog();
    if(!catalog.__manual) catalog.__manual = [];

    if(event.httpMethod==='POST'){
      catalog.__manual.unshift(body.product);
      await saveCatalog(catalog, sha);
      return {statusCode:200,body:JSON.stringify({ok:true})};
    }
if(event.httpMethod==='PUT'){
  const idx = catalog.__manual.findIndex(p=>p.id===body.product.id);
  if(idx>=0) catalog.__manual[idx]=body.product;
  await saveCatalog(catalog, sha);
  return {statusCode:200,body:JSON.stringify({ok:true})};
}
    if(event.httpMethod==='DELETE'){
      catalog.__manual = catalog.__manual.filter(p=>p.id!==body.productId);
      await saveCatalog(catalog, sha);
      return {statusCode:200,body:JSON.stringify({ok:true})};
    }
  }catch(err){
    console.error(err);
    return {statusCode:500,body:JSON.stringify({error:err.message})};
  }
};