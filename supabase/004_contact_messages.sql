-- iLoveLatins: messages sent through the website's contact form.
-- Run this once in the Supabase SQL Editor, after 003_tour_deposits.sql.
-- Rows are written only by the contact-message function; the owner can read them.
-- A copy is kept so a message is never lost if the email doesn't arrive.

create table public.contact_messages (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) <= 120),
  email       text not null check (char_length(email) <= 200),
  topic       text not null default '' check (char_length(topic) <= 120),
  message     text not null check (char_length(message) between 1 and 5000),
  emailed     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index contact_messages_email_idx on public.contact_messages (email, created_at desc);

alter table public.contact_messages enable row level security;

create policy contact_admin_select on public.contact_messages for select to authenticated
  using (public.is_admin());

grant select on public.contact_messages to authenticated;
