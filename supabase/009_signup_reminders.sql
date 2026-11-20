-- iLoveLatins: one automatic reminder email to people who signed up but never made a profile.
-- The remind-unfinished function sends it once, 24 hours after sign-up, and records it here
-- so nobody is written to twice. Run once in the Supabase SQL Editor, after 008.

-- One row per person who has been reminded (or deliberately skipped: see note).
create table if not exists public.signup_reminders (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  sent_at  timestamptz not null default now(),
  note     text not null default 'sent'   -- 'sent', or 'held' = an owner chose not to email this person
);
alter table public.signup_reminders enable row level security;  -- no policies: only the server can read or write

-- Who is due a reminder now: signed up 1 to 14 days ago, no profile, not reminded yet.
-- lang is the language they signed up in ('en' or 'es'), or null for older sign-ups.
drop function if exists public.unfinished_to_remind();
create function public.unfinished_to_remind()
returns table (id uuid, email text, confirmed boolean, lang text)
language sql stable security definer set search_path = public as $$
  select u.id, u.email::text, u.email_confirmed_at is not null, u.raw_user_meta_data->>'lang'
  from auth.users u
  where u.created_at < now() - interval '24 hours'
    and u.created_at > now() - interval '14 days'
    and not exists (select 1 from public.profiles p where p.id = u.id)
    and not exists (select 1 from public.signup_reminders r where r.user_id = u.id)
  order by u.created_at
  limit 20;
$$;
revoke all on function public.unfinished_to_remind() from public, anon, authenticated;
grant execute on function public.unfinished_to_remind() to service_role;

-- The owners' list (approvals page) now also says whether a reminder went out.
drop function if exists public.admin_unfinished_signups();
create function public.admin_unfinished_signups()
returns table (email text, signed_up timestamptz, confirmed boolean, last_login timestamptz, reminded_at timestamptz, reminder_note text)
language sql stable security definer set search_path = public as $$
  select u.email::text, u.created_at, u.email_confirmed_at is not null, u.last_sign_in_at, r.sent_at, r.note
  from auth.users u
  left join public.signup_reminders r on r.user_id = u.id
  where public.is_admin()
    and not exists (select 1 from public.profiles p where p.id = u.id)
  order by u.created_at desc
  limit 200;
$$;
revoke all on function public.admin_unfinished_signups() from public, anon;
grant execute on function public.admin_unfinished_signups() to authenticated;

-- Run the reminder function once a day at 15:00 UTC (10am in Colombia).
-- Replace YOUR-CRON-SECRET with the value of the CRON_SECRET function secret.
--
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--   select cron.schedule('remind-unfinished', '0 15 * * *', $job$
--     select net.http_post(
--       url := 'https://fdhntvzctkdojldxduan.supabase.co/functions/v1/remind-unfinished',
--       headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR-CRON-SECRET'),
--       body := '{}'::jsonb);
--   $job$);
--
-- To stop the reminders:  select cron.unschedule('remind-unfinished');
