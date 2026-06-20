const Stripe = require('stripe');
exports.handler = async function(event){
  const sessionId = event.queryStringParameters?.session_id;
  if(!sessionId) return {statusCode:400,body:'Missing session_id'};
  try{
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId,{
      expand:['line_items','customer_details'],
    });
    const items = (session.line_items?.data||[]).map(i=>({
      name:i.description||'Product',
      quantity:i.quantity||1,
      total:(i.amount_total/100).toFixed(2),
    }));
    const subtotal=(session.amount_subtotal/100).toFixed(2);
    const tax=session.total_details?.amount_tax?(session.total_details.amount_tax/100).toFixed(2):null;
    const total=(session.amount_total/100).toFixed(2);
    return {statusCode:200,body:JSON.stringify({
      orderId:session.id.slice(-12).toUpperCase(),
      items,subtotal,tax,total,
      shipping:session.shipping_details,
      email:session.customer_details?.email||null,
    })};
  }catch(err){
    console.error(err);
    return {statusCode:500,body:JSON.stringify({error:err.message})};
  }
};