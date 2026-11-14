// Starts a Stripe Checkout page for a tour package (the $250 deposit or the full price)
// or monthly English classes, and returns its address.
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
    // Every price is set here on the server. The browser only says which package and how to pay.
    const PACKAGES: Record<string, { label: string; cents: number; monthly?: boolean; noTour?: boolean }> = {
      first: { label: 'Romance tour, first time', cents: 149500 },
      repeat: { label: 'Romance tour, repeat client', cents: 99500 },
      buddy: { label: '2 for 1 Buddy plan', cents: 159500 },
      two_tours: { label: '2 tours for the price of 1', cents: 159500 },
      three_years: { label: '3 years of unlimited vacations', cents: 214500 },
      intro: { label: '1-on-1 personal introductions, 6 days', cents: 99500 },
      english: { label: 'English classes for your lady', cents: 25000, monthly: true, noTour: true },
    };
    const DEPOSIT = parseInt(setting('DEPOSIT_CENTS') || '25000', 10);
    const pkg = PACKAGES[clean(b.package, 40)];
    if (!pkg) return json({ error: 'Choose a package.' }, 400);
    const kind = pkg.monthly ? 'english' : (b.payment === 'full' ? 'full' : 'deposit');
    const amount = kind === 'deposit' ? DEPOSIT : pkg.cents;

    const tourId = pkg.noTour ? 'none' : clean(b.tour_id, 80);
    const tourName = pkg.noTour ? '' : clean(b.tour_label, 120);
    const name = clean(b.name, 120);
    const email = clean(b.email, 200);
    const phone = clean(b.phone, 60);
    const message = String(b.message ?? '').trim().slice(0, 2000);
    if (!pkg.noTour && (!tourId || !tourName)) return json({ error: 'Choose a tour date first.' }, 400);
    if (!name) return json({ error: 'Enter your name.' }, 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400);

    const dollars = (c: number) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0 });
    const what = kind === 'deposit' ? `Deposit: ${pkg.label}` : kind === 'full' ? `Paid in full: ${pkg.label}` : `${pkg.label}, monthly`;
    // A deposit books the package at the regular price ($250 more); paying in full today gets the lower price.
    const shownPrice = kind === 'deposit' ? pkg.cents + 25000 : pkg.cents;
    const label = (tourName ? `${tourName}, ` : '') + `${pkg.label} (${dollars(shownPrice)}${pkg.monthly ? ' a month' : ''}${kind === 'deposit' ? ', regular price' : ''})`;
    const note = kind === 'deposit'
      ? `Your ${dollars(amount)} deposit holds your place. It is non-refundable, but you can use it on a future tour within 12 months of paying. The balance is due 30 days before the tour. Hotel and airfare are separate.`
      : kind === 'full'
        ? `You are paying the full ${dollars(amount)} for this package. Hotel and airfare are separate.`
        : `${dollars(amount)} is billed every month until you ask Sam to stop the classes.`;

    const site = setting('SITE_URL').replace(/\/$/, '');
    if (!site) return json({ error: 'Payments are not set up yet.' }, 500);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serverKey());
    const { data: row, error } = await admin.from('deposits').insert({
      tour_id: tourId, tour_label: label.slice(0, 160), name, email, phone, message, amount_cents: amount, kind,
    }).select('id').single();
    if (error) throw error;

    const params = new URLSearchParams({
      mode: pkg.monthly ? 'subscription' : 'payment',
      customer_email: email,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(amount),
      'line_items[0][price_data][product_data][name]': `iLoveLatins ${what}`.slice(0, 250),
      'line_items[0][price_data][product_data][description]': (tourName ? tourName + '. ' : '') + note,
      'metadata[kind]': kind,
      'metadata[deposit_id]': String(row.id),
      'custom_text[submit][message]': note,
      success_url: `${site}/tours.html?deposit=paid&kind=${kind}#reserve`,
      cancel_url: `${site}/tours.html?deposit=cancelled#reserve`,
    });
    if (pkg.monthly) {
      params.set('line_items[0][price_data][recurring][interval]', 'month');
      params.set('subscription_data[metadata][deposit_id]', String(row.id));
      params.set('subscription_data[metadata][kind]', kind);
      params.set('subscription_data[description]', `iLoveLatins English classes, ${name}`);
    } else {
      params.set('payment_intent_data[description]', `iLoveLatins ${what}, ${tourName || 'no tour'}, ${name}`.slice(0, 900));
      params.set('payment_intent_data[metadata][deposit_id]', String(row.id));
    }
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
