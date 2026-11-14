-- iLoveLatins: a payment can be a $250 deposit, the full package price paid today,
-- or monthly English classes. Run once in the Supabase SQL Editor, after 005.
alter table public.deposits
  add column kind text not null default 'deposit' check (kind in ('deposit', 'full', 'english'));
