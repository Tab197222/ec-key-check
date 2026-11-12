// Emails a member when someone sends them a message, so conversations don't die.
// Skips the email when the member is on the site right now, or when they already
// have an unread message from the same person in the last hour (one alert, not ten).
// Turn OFF "Verify JWT" for this function: it checks the member's login itself.
// Secrets needed: RESEND_API_KEY, SITE_URL, EMAIL_FROM (an address on a domain verified in Resend)
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
    const from = setting('EMAIL_FROM');
    if (!key || !from) return json({ sent: false, reason: 'email not set up' });

    const { message_id } = await req.json();
    const { data: msg } = await admin.from('messages').select('*').eq('id', message_id).maybeSingle();
    if (!msg || msg.sender !== user.id) return json({ sent: false, reason: 'not your message' });

    const { data: to } = await admin.from('profiles').select('first_name, last_seen').eq('id', msg.recipient).maybeSingle();
    const { data: me } = await admin.from('profiles').select('first_name').eq('id', user.id).maybeSingle();
    if (!to || !me) return json({ sent: false });

    // On the site in the last 5 minutes: they'll see it without an email.
    if (to.last_seen && Date.now() - new Date(to.last_seen).getTime() < 5 * 60 * 1000) {
      return json({ sent: false, reason: 'recipient online' });
    }
    // Already has an unread message from this person in the last hour: they were emailed then.
    const { count } = await admin.from('messages').select('id', { count: 'exact', head: true })
      .eq('sender', user.id).eq('recipient', msg.recipient).is('read_at', null)
      .neq('id', msg.id).gt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if ((count ?? 0) > 0) return json({ sent: false, reason: 'recently alerted' });

    const { data: { user: recipient } } = await admin.auth.admin.getUserById(msg.recipient);
    if (!recipient?.email) return json({ sent: false });

    const site = setting('SITE_URL').replace(/\/$/, '');
    const link = `${site}/messages.html?to=${encodeURIComponent(user.id)}`;
    const name = esc(me.first_name);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [recipient.email],
        subject: `${me.first_name} te envió un mensaje / sent you a message`,
        html: `<p>Hola ${esc(to.first_name)},</p>
<p><strong>${name}</strong> te envió un mensaje en iLoveLatins.<br>
<strong>${name}</strong> sent you a message on iLoveLatins.</p>
<p><a href="${link}" style="display:inline-block;background:#c81e82;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Leer y responder / Read and reply</a></p>
<p style="color:#666;font-size:13px">iLoveLatins nunca te pedirá dinero por correo. / iLoveLatins will never ask you for money by email.</p>`,
      }),
    });
    return json({ sent: res.ok });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
