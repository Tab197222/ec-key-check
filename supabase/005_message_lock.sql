-- iLoveLatins: men must pay to read messages; instant delivery signal.
-- Run this once in the Supabase SQL Editor, after 004_contact_messages.sql.
--
-- Free men can still send (one message a week, as before) but every message
-- they RECEIVE is locked: they see who wrote and when, not what was said,
-- until they have an active membership. Women and paying men read everything.
-- This is enforced in the database, not just hidden on the page.

-- ---------------------------------------------------------------------------
-- 1. Nobody reads the message text straight from the table any more
-- ---------------------------------------------------------------------------
revoke select on public.messages from authenticated;
grant select (id, sender, recipient, created_at, read_at) on public.messages to authenticated;

-- Is the signed-in member a man without an active membership?
create function public.messages_locked() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select gender = 'man' and not is_admin and not has_paid(id)
                   from profiles where id = auth.uid()), false);
$$;

-- One conversation, with received messages blanked out for free men.
create function public.get_thread(other uuid)
returns table (id bigint, sender uuid, recipient uuid, body text, locked boolean,
               created_at timestamptz, read_at timestamptz)
language sql stable security definer set search_path = public as $$
  with v as (select auth.uid() as me, messages_locked() as lock)
  select m.id, m.sender, m.recipient,
         case when v.lock and m.recipient = v.me then null else m.body end,
         (v.lock and m.recipient = v.me),
         m.created_at, m.read_at
  from messages m, v
  where (m.sender = v.me and m.recipient = other)
     or (m.sender = other and m.recipient = v.me)
  order by m.created_at
  limit 300;
$$;

-- Conversation list: the preview text is hidden the same way.
create or replace function public.my_conversations()
returns table (other uuid, first_name text, last_body text, last_at timestamptz, unread bigint)
language sql stable security definer set search_path = public as $$
  with v as (select auth.uid() as me, messages_locked() as lock),
  m as (
    select case when sender = v.me then recipient else sender end as other,
           case when v.lock and recipient = v.me then null else body end as body,
           created_at,
           (recipient = v.me and read_at is null) as is_unread
    from messages, v
    where sender = v.me or recipient = v.me
  )
  select m.other, p.first_name,
         (array_agg(m.body order by m.created_at desc))[1],
         max(m.created_at),
         count(*) filter (where m.is_unread)
  from m join profiles p on p.id = m.other
  group by m.other, p.first_name
  order by max(m.created_at) desc;
$$;

-- Opening a locked conversation does not count as reading it.
create or replace function public.mark_read(other uuid) returns void
language sql security definer set search_path = public as $$
  update messages set read_at = now()
  where recipient = auth.uid() and sender = other and read_at is null
    and not messages_locked();
$$;

create function public.my_unread_count() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from messages where recipient = auth.uid() and read_at is null;
$$;

grant execute on function public.messages_locked(), public.get_thread(uuid), public.my_unread_count()
  to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Instant delivery: a "you have mail" signal with no message text in it
-- ---------------------------------------------------------------------------
create table public.inbox_pings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  at      timestamptz not null default now()
);
alter table public.inbox_pings enable row level security;
create policy inbox_pings_own on public.inbox_pings for select to authenticated
  using (user_id = auth.uid());
grant select on public.inbox_pings to authenticated;

create function public.ping_recipient() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into inbox_pings (user_id, at) values (new.recipient, now())
  on conflict (user_id) do update set at = excluded.at;
  return new;
end;
$$;
create trigger ping_recipient after insert on public.messages
  for each row execute function public.ping_recipient();

alter publication supabase_realtime add table public.inbox_pings;
