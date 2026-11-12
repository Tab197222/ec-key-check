// Sends one email. Uses Gmail when GMAIL_USER and GMAIL_APP_PASSWORD are set,
// otherwise Resend when RESEND_API_KEY and EMAIL_FROM are set.
// Returns false (and sends nothing) when neither is set up.
import nodemailer from 'npm:nodemailer@6';

function setting(name: string) {
  return (Deno.env.get(name) ?? '').trim();
}

export function mailReady() {
  return !!((setting('GMAIL_USER') && setting('GMAIL_APP_PASSWORD')) ||
    (setting('RESEND_API_KEY') && setting('EMAIL_FROM')));
}

export async function sendMail(to: string[], subject: string, html: string, replyTo?: string): Promise<boolean> {
  const gmailUser = setting('GMAIL_USER');
  const gmailPass = setting('GMAIL_APP_PASSWORD').replace(/\s+/g, '');
  if (gmailUser && gmailPass) {
    // Port 465 (SSL): Supabase blocks outgoing connections on ports 25 and 587.
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });
    await transport.sendMail({ from: `iLoveLatins <${gmailUser}>`, to: to.join(', '), subject, html, ...(replyTo ? { replyTo } : {}) });
    return true;
  }
  const key = setting('RESEND_API_KEY');
  const from = setting('EMAIL_FROM');
  if (!key || !from) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  return res.ok;
}
