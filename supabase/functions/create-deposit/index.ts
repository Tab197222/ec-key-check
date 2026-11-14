// Starts a Stripe Checkout page for a $250 tour deposit and returns its address.
// No login needed: men can reserve a tour without a site account.
// The amount is set here on the server, never taken from the visitor's browser.
// Turn OFF "Verify JWT" for this function.
// Secrets needed: STRIPE_SECRET_KEY, SITE_URL. Optional: DEPOSIT_CENTS (default 25000 = $250)
import { createClient } from 'npm:@supabase/supabase-js@2';

function serverKey() {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    const k = keys.default ?? Object.values(keys)[0];
    if (typeof k === 'string' && k.trim()) return k.trim();
  } catch (_) { /* fall through */ }
  return (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
}
function setting(name: string) {
  return (Deno.env.get(name) ?? '').trim();
}
function stripeKey() {
  const k = setting('STRIPE_SECRET_KEY');
  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(k)) throw new Error('Payments are not set up yet.');
  return k;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const b = await req.json();
    const tourId = clean(b.tour_id, 80);
    const tourLabel = clean(b.tour_label, 160);
    const name = clean(b.name, 120);
    const email = clean(b.email, 200);
    const phone = clean(b.phone, 60);
    const message = String(b.message ?? '').trim().slice(0, 2000);
    if (!tourId || !tourLabel) return json({ error: 'Choose a tour first.' }, 400);
    if (!name) return json({ error: 'Enter your name.' }, 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400);

    const amount = parseInt(setting('DEPOSIT_CENTS') || '25000', 10);
    const site = setting('SITE_URL').replace(/\/$/, '');
    if (!site) return json({ error: 'Payments are not set up yet.' }, 500);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serverKey());
    const { data: row, error } = await admin.from('deposits').insert({
      tour_id: tourId, tour_label: tourLabel, name, email, phone, message, amount_cents: amount,
    }).select('id').single();
    if (error) throw error;

    const params = new URLSearchParams({
      mode: 'payment',
      customer_email: email,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(amount),
      'line_items[0][price_data][product_data][name]': `Tour deposit: ${tourLabel}`,
      'line_items[0][price_data][product_data][description]': 'Holds your place on the tour. Non-refundable, but can be used on a future tour within 12 months. Balance due 30 days before the tour.',
      'payment_intent_data[description]': `iLoveLatins deposit, ${tourLabel}, ${name}`,
      'payment_intent_data[metadata][deposit_id]': String(row.id),
      'metadata[kind]': 'deposit',
      'metadata[deposit_id]': String(row.id),
      'custom_text[submit][message]': 'Your $' + (amount / 100) + ' deposit holds your place. It is non-refundable, but you can use it on a future tour within 12 months of paying. The balance is due 30 days before the tour. Hotel and airfare are separate.',
      success_url: `${site}/tours.html?deposit=paid#reserve`,
      cancel_url: `${site}/tours.html?deposit=cancelled&tour=${encodeURIComponent(tourId)}#reserve`,
    });
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stripeKey()}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const session = await res.json();
    if (!res.ok) return json({ error: session.error?.message ?? 'Stripe refused the request.' }, 502);
    await admin.from('deposits').update({ stripe_session_id: session.id }).eq('id', row.id);
    return json({ url: session.url });
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
