// Starts a Stripe Checkout page for the signed-in member and returns its address.
// Turn OFF "Verify JWT" for this function: it checks the member's login itself.
// Secrets needed: STRIPE_SECRET_KEY, SITE_URL, and STRIPE_PRODUCT (or STRIPE_PRICE_MONTHLY) holding the membership product's prod_ ID
import { createClient } from 'npm:@supabase/supabase-js@2';

// Server key: the new secret key if the project has one, otherwise the legacy service role key.
function serverKey() {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    const k = keys.default ?? Object.values(keys)[0];
    if (typeof k === 'string' && k.trim()) return k.trim();
  } catch (_) { /* fall through */ }
  return (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
}

// A setting, with stray spaces and line breaks removed.
function setting(name: string) {
  return (Deno.env.get(name) ?? '').trim();
}

// The Stripe secret key, checked for the usual copy-and-paste mistakes.
function stripeKey() {
  const k = setting('STRIPE_SECRET_KEY');
  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(k)) {
    throw new Error(`STRIPE_SECRET_KEY in Supabase is not a complete Stripe secret key (it is ${k.length} characters and starts "${k.slice(0, 8)}"). Copy it again with the copy icon in Stripe (Developers > API keys) and save it again.`);
  }
  return k;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serverKey());
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: { user } } = token ? await admin.auth.getUser(token) : { data: { user: null } };
    if (!user) return json({ error: 'Please log in first.' }, 401);

    const { plan } = await req.json();
    // Membership prices are set here, not in Stripe, so changing a price is a one-line edit.
    const PLANS: Record<string, { cents: number; interval: string; count: number }> = {
      monthly: { cents: 2999, interval: 'month', count: 1 },     // $29.99 a month
      semiannual: { cents: 15000, interval: 'month', count: 6 }, // $150 every 6 months
      yearly: { cents: 25000, interval: 'year', count: 1 },      // $250 a year
    };
    const chosen = PLANS[plan];
    if (!chosen) return json({ error: 'Choose a plan.' }, 400);
    const site = (setting('SITE_URL')).replace(/\/$/, '');
    // The Stripe product the plans are billed under (the membership product's prod_ ID).
    const product = setting('STRIPE_PRODUCT') || setting('STRIPE_PRICE_MONTHLY');
    if (!site || !product.startsWith('prod_')) return json({ error: 'Payments are not set up yet.' }, 500);

    const { data: sub } = await admin.from('subscriptions')
      .select('stripe_customer_id, status').eq('user_id', user.id).maybeSingle();
    if (sub && ['active', 'trialing'].includes(sub.status ?? '')) {
      return json({ error: 'You already have an active membership.' }, 400);
    }

    const params = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product]': product,
      'line_items[0][price_data][unit_amount]': String(chosen.cents),
      'line_items[0][price_data][recurring][interval]': chosen.interval,
      'line_items[0][price_data][recurring][interval_count]': String(chosen.count),
      'subscription_data[metadata][plan]': plan,
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
        Authorization: `Bearer ${stripeKey()}`,
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
