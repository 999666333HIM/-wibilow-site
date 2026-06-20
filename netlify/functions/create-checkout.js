const Stripe = require('stripe');
exports.handler = async function(event){
  if(event.httpMethod!=='POST') return {statusCode:405,body:'Method Not Allowed'};
  try{
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const {cart} = JSON.parse(event.body);
    if(!Array.isArray(cart)||!cart.length)
      return {statusCode:400,body:JSON.stringify({error:'Cart is empty.'})};
    const line_items = cart.map(item=>({
      price_data:{
        currency:'usd',
        product_data:{
          name:item.name,
          metadata:{
            cjPid:item.cjPid||'',
            aliUrl:item.aliUrl||'',
          }
        },
        unit_amount:Math.round((item.displayPrice||item.price)*100),
      },
      quantity:1,
    }));
    const siteUrl = process.env.URL||'https://wibilow.com';
    const session = await stripe.checkout.sessions.create({
      payment_method_types:['card'],
      mode:'payment',
      line_items,
      shipping_address_collection:{allowed_countries:['US','CA','GB','AU']},
      automatic_tax:{enabled:process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')},
      success_url:`${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${siteUrl}/`,
    });
    return {statusCode:200,body:JSON.stringify({url:session.url})};
  }catch(err){
    console.error(err);
    return {statusCode:500,body:JSON.stringify({error:err.message})};
  }
};