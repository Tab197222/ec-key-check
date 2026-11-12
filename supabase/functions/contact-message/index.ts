// Receives the website's contact form and emails it to the owners.
// Pressing Reply in the email answers the visitor directly.
// No login needed. Turn OFF "Verify JWT" for this function.
// Secrets needed: ADMIN_EMAIL (comma-separated) and an email sender (see _shared/mail.ts)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendMail } from '../_shared/mail.ts';

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

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    // The site sends a normal form (FormData); JSON is accepted too.
    let f: Record<string, unknown> = {};
    const type = req.headers.get('content-type') ?? '';
    if (type.includes('application/json')) f = await req.json();
    else (await req.formData()).forEach((v, k) => { f[k] = v; });

    if (clean(f.website, 200)) return json({ ok: true }); // spam trap: pretend it worked
    const name = clean(f.name, 120);
    const email = clean(f.email, 200);
    const topic = clean(f.topic, 120);
    const message = String(f.message ?? '').trim().slice(0, 5000);
    if (!name || !message) return json({ error: 'Please fill in your name and message.' }, 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Please enter a valid email address.' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serverKey());
    // At most 5 messages an hour from the same address.
    const { count } = await admin.from('contact_messages').select('id', { count: 'exact', head: true })
      .eq('email', email).gt('created_at', new Date(Date.now() - 3600 * 1000).toISOString());
    if ((count ?? 0) >= 5) return json({ error: 'You have sent several messages already. Sam will reply soon.' }, 429);

    const { data: row, error } = await admin.from('contact_messages')
      .insert({ name, email, topic, message }).select('id').single();
    if (error) throw error;

    const to = setting('ADMIN_EMAIL').split(',').map((x) => x.trim()).filter(Boolean);
    const sent = to.length ? await sendMail(to, `Website message: ${topic || 'General'} (${name})`,
      `<p><strong>${esc(name)}</strong> &lt;${esc(email)}&gt; wrote through the website.</p>
<p><strong>About:</strong> ${esc(topic || 'Not chosen')}</p>
<p style="white-space:pre-line;border-left:3px solid #c81e82;padding-left:12px">${esc(message)}</p>
<p style="color:#666;font-size:13px">Press Reply to answer ${esc(name)} directly.</p>`, email) : false;
    if (sent) await admin.from('contact_messages').update({ emailed: true }).eq('id', row.id);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: 'Something went wrong.' }, 500);
  }
});
