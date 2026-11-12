// Stripe calls this whenever a membership starts, renews, changes or ends.
// It keeps the subscriptions table in step with Stripe.
// Turn OFF "Verify JWT" for this function: Stripe does not send a Supabase login.
// Secrets needed: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY
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
    throw new Error('STRIPE_SECRET_KEY in Supabase is not a complete Stripe secret key. Copy it again from Stripe (Developers > API keys > Secret key > Reveal) and save it again.');
  }
  return k;
}

const admin = createClient(Deno.env.get('SUPABASE_URL')!, serverKey());

function hex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Stripe signs "<timestamp>.<body>" with the webhook secret (HMAC SHA-256).
async function signatureIsValid(body: string, header: string | null) {
  if (!header) return false;
  const parts = header.split(',').map((p) => p.split('='));
  const t = parts.find((p) => p[0] === 't')?.[1];
  const sent = parts.filter((p) => p[0] === 'v1').map((p) => p[1]);
  if (!t || !sent.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(setting('STRIPE_WEBHOOK_SECRET')),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const expected = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)));
  return sent.some((s) => {
    if (s.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < s.length; i++) diff |= s.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${stripeKey()}` },
  });
  if (!res.ok) throw new Error(`Stripe ${path}: ${res.status}`);
  return res.json();
}

// deno-lint-ignore no-explicit-any
async function saveSubscription(sub: any, userId?: string) {
  let uid = userId ?? sub.metadata?.user_id;
  if (!uid) {
    const { data } = await admin.from('subscriptions')
      .select('user_id').eq('stripe_subscription_id', sub.id).maybeSingle();
    uid = data?.user_id;
  }
  if (!uid) throw new Error(`No member found for subscription ${sub.id}`);

  const item = sub.items?.data?.[0];
  const end = sub.current_period_end ?? item?.current_period_end;
  // The settings may hold either a price ID (price_…) or a product ID (prod_…).
  const ids = [item?.price?.id, typeof item?.price?.product === 'string' ? item.price.product : item?.price?.product?.id];
  const plan = ids.includes(setting('STRIPE_PRICE_YEARLY')) ? 'yearly'
    : ids.includes(setting('STRIPE_PRICE_MONTHLY')) ? 'monthly' : null;

  const { error } = await admin.from('subscriptions').upsert({
    user_id: uid,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
    stripe_subscription_id: sub.id,
    plan,
    status: sub.status,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

Deno.serve(async (req) => {
  const body = await req.text();
  if (!(await signatureIsValid(body, req.headers.get('stripe-signature')))) {
    return new Response('Bad signature', { status: 400 });
  }
  try {
    const event = JSON.parse(body);
    const obj = event.data.object;
    if (event.type === 'checkout.session.completed' && obj.mode === 'subscription' && obj.subscription) {
      await saveSubscription(await stripeGet(`subscriptions/${obj.subscription}`), obj.client_reference_id);
    } else if (['customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
      // Fetch the current state so an old, late event cannot overwrite a newer one.
      await saveSubscription(await stripeGet(`subscriptions/${obj.id}`));
    }
    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
