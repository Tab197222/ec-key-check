// Sends ONE reminder email to people who signed up but never made a profile.
// Run once a day by the database (see supabase/009_signup_reminders.sql). Each person is
// written to once only, 24 hours after signing up, and never again.
// Turn OFF "Verify JWT" for this function: it checks the x-cron-secret header itself.
// Secrets needed: CRON_SECRET, SITE_URL, and either GMAIL_USER + GMAIL_APP_PASSWORD,
// or RESEND_API_KEY + EMAIL_FROM.
// Add ?dry=1 to the address to see who would be emailed without sending anything.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { mailReady, sendMail } from '../_shared/mail.ts';

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
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  try {
    const secret = setting('CRON_SECRET');
    if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'Not allowed.' }, 401);
    const dry = new URL(req.url).searchParams.get('dry') === '1';

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serverKey());
    const { data: due, error } = await admin.rpc('unfinished_to_remind');
    if (error) return json({ error: error.message }, 500);
    const people = (due ?? []) as { id: string; email: string; confirmed: boolean }[];
    if (dry) return json({ dry: true, would_email: people.map((p) => p.email) });
    if (!mailReady()) return json({ sent: 0, reason: 'No email sender is set up.' });

    const site = setting('SITE_URL').replace(/\/$/, '');
    let sent = 0;
    const failed: string[] = [];
    for (const p of people) {
      try {
        // A one-time link that confirms the email, logs them in and opens their account page.
        let link = `${site}/join.html`;
        const { data: l } = await admin.auth.admin.generateLink({
          type: 'magiclink', email: p.email, options: { redirectTo: `${site}/account.html` },
        });
        if (l?.properties?.action_link) link = l.properties.action_link;

        const ok = await sendMail([p.email], 'Termina tu perfil en iLoveLatins / Finish your iLoveLatins profile',
          `<p>¡Hola! Empezaste a crear tu cuenta en iLoveLatins, pero todavía falta tu perfil.</p>
           <p><a href="${link}"><strong>Pulsa aquí para terminar tu perfil</strong></a>. Solo toma unos minutos: tu nombre, tu ciudad y una foto. Para las mujeres es gratis, siempre.</p>
           <p>Si no creaste esta cuenta, ignora este correo. No volveremos a escribirte.</p>
           <hr>
           <p>Hi! You started an account on iLoveLatins, but your profile isn't finished yet.</p>
           <p><a href="${link}"><strong>Click here to finish your profile</strong></a>. It only takes a few minutes: your name, your city and a photo.</p>
           <p>If you didn't create this account, ignore this email. We won't write to you again.</p>
           <p>iLoveLatins · Sam Smith · +1 832-385-4161</p>`);
        if (!ok) { failed.push(p.email); continue; }
        // Recorded only after the email went out, so a failed send is tried again tomorrow.
        await admin.from('signup_reminders').insert({ user_id: p.id, note: 'sent' });
        sent++;
      } catch (_) {
        failed.push(p.email);
      }
    }
    return json({ sent, failed });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
