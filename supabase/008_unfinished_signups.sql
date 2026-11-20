-- iLoveLatins: let owners see people who signed up but never made a profile
-- (email not confirmed, or confirmed and then stopped). Shown on the approvals page.
-- Only owners get rows back; everyone else gets an empty list.
-- Run once in the Supabase SQL Editor, after 007.

create or replace function public.admin_unfinished_signups()
returns table (email text, signed_up timestamptz, confirmed boolean, last_login timestamptz)
language sql stable security definer set search_path = public as $$
  select u.email::text, u.created_at, u.email_confirmed_at is not null, u.last_sign_in_at
  from auth.users u
  where public.is_admin()
    and not exists (select 1 from public.profiles p where p.id = u.id)
  order by u.created_at desc
  limit 200;
$$;
revoke all on function public.admin_unfinished_signups() from public, anon;
grant execute on function public.admin_unfinished_signups() to authenticated;
