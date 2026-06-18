const Stripe = require('stripe');
const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';

async function getCJToken(apiKey){
  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({apiKey})});
  const data = await res.json();
  if(!data.result) throw new Error(`CJ auth failed: ${data.message}`);
  return data.data.accessToken;
}
async function createCJOrder(token,{buyerName,address,items}){
  const res = await fetch(`${CJ_BASE}/shopping/order/createOrderV2`,{
    method:'POST',
    headers:{'CJ-Access-Token':token,'Content-Type':'application/json'},
    body:JSON.stringify({
      orderNumber:`WB-${Date.now()}`,
      shippingName:buyerName,
      shippingCountry:address.country||'US',
      shippingState:address.state||'',
      shippingCity:address.city||'',
      shippingAddress:address.line1||'',
      shippingAddress2:address.line2||'',
      shippingZip:address.postal_code||'',
      shippingPhone:'0000000000',
      products:items.map(i=>({vid:i.cjPid,quantity:1})),
    })});
  return res.json();
}
exports.handler = async function(event){
  if(event.httpMethod!=='POST') return {statusCode:405,body:'Method Not Allowed'};
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  let stripeEvent;
  try{
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,event.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET);
  }catch(err){
    return {statusCode:400,body:`Webhook Error: ${err.message}`};
  }
  if(stripeEvent.type!=='checkout.session.completed')
    return {statusCode:200,body:'Event received but not processed'};
  try{
    const session = stripeEvent.data.object;
    const fullSession = await stripe.checkout.sessions.retrieve(session.id,
      {expand:['line_items','shipping_details']});
    const shipping = fullSession.shipping_details;
    const lineItems = fullSession.line_items?.data || [];
    if(!shipping||!lineItems.length) return {statusCode:200,body:'No shipping info'};
    const token = await getCJToken(process.env.CJ_API_KEY);
    const items = lineItems.map(i=>({name:i.description,cjPid:i.price?.metadata?.cjPid||null}));
    const fulfillable = items.filter(i=>i.cjPid);
    if(fulfillable.length){
      const result = await createCJOrder(token,{buyerName:shipping.name,
        address:shipping.address,items:fulfillable});
      console.log('CJ order result:',JSON.stringify(result));
    }
    return {statusCode:200,body:'Fulfillment processed'};
  }catch(err){
    console.error(err);
    return {statusCode:500,body:JSON.stringify({error:err.message})};
  }
};