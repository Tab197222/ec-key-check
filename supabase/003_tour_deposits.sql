-- iLoveLatins: $250 tour deposits paid by card.
-- Run this once in the Supabase SQL Editor, after 002_dating_features.sql.
-- Rows are written only by the server functions; the owner can read them on admin.html.

create table public.deposits (
  id                 bigint generated always as identity primary key,
  tour_id            text not null check (char_length(tour_id) <= 80),
  tour_label         text not null check (char_length(tour_label) <= 160),
  name               text not null check (char_length(name) <= 120),
  email              text not null check (char_length(email) <= 200),
  phone              text not null default '' check (char_length(phone) <= 60),
  message            text not null default '' check (char_length(message) <= 2000),
  amount_cents       int not null,
  status             text not null default 'pending' check (status in ('pending', 'paid')),
  stripe_session_id  text unique,
  stripe_payment_id  text,
  created_at         timestamptz not null default now(),
  paid_at            timestamptz
);
create index deposits_status_idx on public.deposits (status, created_at desc);

alter table public.deposits enable row level security;

create policy deposits_admin_select on public.deposits for select to authenticated
  using (public.is_admin());

grant select on public.deposits to authenticated;
