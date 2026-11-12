// Emails the owner when a member submits a profile for approval.
// Optional. Without RESEND_API_KEY it does nothing and approvals still work from admin.html.
// Turn OFF "Verify JWT" for this function: it checks the member's login itself.
// Secrets needed: RESEND_API_KEY, ADMIN_EMAIL, SITE_URL. Optional: EMAIL_FROM
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


const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serverKey());
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: { user } } = token ? await admin.auth.getUser(token) : { data: { user: null } };
    if (!user) return json({ error: 'Please log in first.' }, 401);

    const key = setting('RESEND_API_KEY');
    const to = setting('ADMIN_EMAIL');
    if (!key || !to) return json({ sent: false });

    const { data: p } = await admin.from('profiles')
      .select('first_name, gender, city, country, status').eq('id', user.id).maybeSingle();
    if (!p || p.status !== 'pending') return json({ sent: false });

    const site = (setting('SITE_URL')).replace(/\/$/, '');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('EMAIL_FROM') ?? 'iLoveLatins <onboarding@resend.dev>',
        to: [to],
        subject: `New profile to approve: ${p.first_name}`,
        html: `<p>${esc(p.first_name)} (${esc(p.gender)}, ${esc(p.city)}, ${esc(p.country)}) has submitted a profile.</p>
               <p><a href="${site}/admin.html">Open the approvals page</a> to approve or reject it.</p>`,
      }),
    });
    return json({ sent: res.ok });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
