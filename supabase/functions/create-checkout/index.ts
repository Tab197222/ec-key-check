// Starts a Stripe Checkout page for the signed-in member and returns its address.
// Secrets needed: STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY, SITE_URL
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: 'Please log in first.' }, 401);

    const { plan } = await req.json();
    let price = plan === 'yearly' ? Deno.env.get('STRIPE_PRICE_YEARLY') : Deno.env.get('STRIPE_PRICE_MONTHLY');
    const site = (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '');
    if (!price || !site) return json({ error: 'Payments are not set up yet.' }, 500);
    // A product ID (prod_…) also works: use that product's default price.
    if (price.startsWith('prod_')) {
      const r = await fetch(`https://api.stripe.com/v1/products/${price}`, {
        headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}` },
      });
      const product = await r.json();
      price = typeof product.default_price === 'string' ? product.default_price : product.default_price?.id;
      if (!price) return json({ error: 'The membership product in Stripe has no default price.' }, 500);
    }

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: sub } = await admin.from('subscriptions')
      .select('stripe_customer_id, status').eq('user_id', user.id).maybeSingle();
    if (sub && ['active', 'trialing'].includes(sub.status ?? '')) {
      return json({ error: 'You already have an active membership.' }, 400);
    }

    const params = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': price,
      'line_items[0][quantity]': '1',
      client_reference_id: user.id,
      'subscription_data[metadata][user_id]': user.id,
      success_url: `${site}/account.html?paid=1`,
      cancel_url: `${site}/membership.html`,
    });
    if (sub?.stripe_customer_id) params.set('customer', sub.stripe_customer_id);
    else if (user.email) params.set('customer_email', user.email);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const session = await res.json();
    if (!res.ok) return json({ error: session.error?.message ?? 'Stripe refused the request.' }, 502);
    return json({ url: session.url });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
