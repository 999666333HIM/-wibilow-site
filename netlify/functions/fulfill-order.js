const GITHUB_OWNER = '999666333HIM';
const GITHUB_REPO = '-wibilow-site';
const ORDERS_FILE = 'orders.json';

async function githubRequest(path, options={}){
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/${path}`,{
    ...options,headers:{
      Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,
      Accept:'application/vnd.github+json',
      'Content-Type':'application/json',
      ...(options.headers||{})}});
  return res;
}

async function getOrdersFile(){
  const res = await githubRequest(`contents/${ORDERS_FILE}`);
  if(res.status===404) return {content:[],sha:null};
  const data = await res.json();
  return {content:JSON.parse(Buffer.from(data.content,'base64').toString('utf-8')),sha:data.sha};
}

async function saveOrdersFile(orders, sha){
  const body={
    message:'New order received',
    content:Buffer.from(JSON.stringify(orders,null,2)).toString('base64')
  };
  if(sha) body.sha=sha;
  return githubRequest(`contents/${ORDERS_FILE}`,{method:'PUT',body:JSON.stringify(body)});
}

exports.handler = async function(event){
  if(event.httpMethod !== 'POST') return {statusCode:405,body:'Method Not Allowed'};
  try{
    const Stripe = require('stripe');
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const payload = JSON.parse(event.body);
    console.log('Function invoked, event type:', payload.type);
    if(payload.type !== 'checkout.session.completed'){
      return {statusCode:200,body:'Event received but not processed'};
    }
    const session = payload.data.object;
    const shipping = session.shipping_details || session.customer_details;
    const fullSession = await stripe.checkout.sessions.retrieve(session.id,{
      expand:['line_items'],
    });
    const lineItems = fullSession.line_items?.data || [];
    const order = {
      id:`WB-${Date.now()}`,
      stripeSessionId:session.id,
      status:'pending',
      createdAt:new Date().toISOString(),
      buyer:{
        name:shipping?.name||'Unknown',
        email:session.customer_details?.email||'',
        address:{
          line1:shipping?.address?.line1||'',
          line2:shipping?.address?.line2||'',
          city:shipping?.address?.city||'',
          state:shipping?.address?.state||'',
          zip:shipping?.address?.postal_code||'',
          country:shipping?.address?.country||'US',
        }
      },
      items:lineItems.map(i=>({
        name:i.description||'Unknown product',
        quantity:i.quantity||1,
        price:(i.amount_total/100).toFixed(2),
        cjPid:i.price?.product_data?.metadata?.cjPid||null,
        aliUrl:i.price?.product_data?.metadata?.aliUrl||null,
      })),
      total:(session.amount_total/100).toFixed(2),
      currency:session.currency||'usd',
    };
    const {content:orders, sha} = await getOrdersFile();
    orders.unshift(order);
    if(orders.length > 500) orders.length = 500;
    await saveOrdersFile(orders, sha);
    console.log('Order saved:', order.id);
    return {statusCode:200,body:JSON.stringify({received:true,orderId:order.id})};
  }catch(err){
    console.error('Error:', err.message);
    return {statusCode:500,body:JSON.stringify({error:err.message})};
  }
};