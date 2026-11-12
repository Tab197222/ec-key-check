-- iLoveLatins member system.
-- Paste this whole file into the Supabase SQL Editor and press Run. Run it once.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  gender      text not null check (gender in ('man', 'woman')),
  first_name  text not null check (char_length(first_name) between 1 and 40),
  birthdate   date not null,
  city        text not null check (char_length(city) between 1 and 80),
  country     text not null check (char_length(country) between 1 and 80),
  about       text not null default '' check (char_length(about) <= 2000),
  status      text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected')),
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.media (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references public.profiles (id) on delete cascade,
  path        text not null unique,
  kind        text not null check (kind in ('photo', 'video')),
  is_main     boolean not null default false,
  approved    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index media_owner_idx on public.media (owner);
create unique index media_one_main_idx on public.media (owner) where is_main;

-- Written only by the Stripe webhook (service role). Members can read their own row.
create table public.subscriptions (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan                    text,
  status                  text,
  current_period_end      timestamptz,
  updated_at              timestamptz not null default now()
);

create table public.messages (
  id          bigint generated always as identity primary key,
  sender      uuid not null references public.profiles (id) on delete cascade,
  recipient   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index messages_sender_idx on public.messages (sender, created_at desc);
create index messages_recipient_idx on public.messages (recipient, created_at desc);

create table public.blocks (
  blocker  uuid not null references public.profiles (id) on delete cascade,
  blocked  uuid not null references public.profiles (id) on delete cascade,
  primary key (blocker, blocked)
);

create table public.reports (
  id          bigint generated always as identity primary key,
  reporter    uuid not null references public.profiles (id) on delete cascade,
  reported    uuid not null references public.profiles (id) on delete cascade,
  reason      text not null check (char_length(reason) between 1 and 1000),
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper functions (run with the owner's rights so they can read past the row rules)
-- ---------------------------------------------------------------------------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create function public.viewer_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'approved' or is_admin from profiles where id = auth.uid()), false);
$$;

create function public.has_paid(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions
    where user_id = uid
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
  );
$$;

-- Why the signed-in member may not message this person, or null when they may.
create function public.message_block_reason(to_id uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  me profiles;
  them profiles;
begin
  select * into me from profiles where id = auth.uid();
  select * into them from profiles where id = to_id;
  if me.id is null or me.status <> 'approved' then return 'not_approved'; end if;
  if them.id is null or them.status <> 'approved' or them.id = me.id then return 'unavailable'; end if;
  if exists (select 1 from blocks
             where (blocker = me.id and blocked = them.id) or (blocker = them.id and blocked = me.id)) then
    return 'unavailable';
  end if;
  if me.gender = 'woman' or me.is_admin or has_paid(me.id) then return null; end if;
  -- Free members: one message a week.
  if (select count(*) from messages where sender = me.id and created_at > now() - interval '7 days') >= 1 then
    return 'limit';
  end if;
  return null;
end;
$$;

-- Who may fetch a stored photo or video.
create function public.can_view_object(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from media m join profiles pr on pr.id = m.owner
    where m.path = p
      and (
        m.owner = auth.uid()
        or is_admin()
        or (m.approved and pr.status = 'approved'
            and (viewer_approved() or (m.kind = 'photo' and m.is_main)))
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Guards: members cannot approve themselves, become admins or approve their own uploads
-- ---------------------------------------------------------------------------

create function public.guard_profile() returns trigger
language plpgsql as $$
begin
  if new.birthdate > (current_date - interval '18 years') then
    raise exception 'You must be 18 or over to join.';
  end if;
  if current_user in ('postgres', 'service_role', 'supabase_admin') or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.is_admin := false;
    return new;
  end if;
  new.is_admin := old.is_admin;
  if old.status <> 'draft' then
    new.gender := old.gender;
    new.birthdate := old.birthdate;
  end if;
  if old.status in ('draft', 'rejected') and new.status = 'pending' then
    if not exists (select 1 from public.media where owner = new.id and kind = 'photo') then
      raise exception 'Add at least one photo before you submit your profile.';
    end if;
  else
    new.status := old.status;
  end if;
  return new;
end;
$$;
create trigger guard_profile before insert or update on public.profiles
  for each row execute function public.guard_profile();

create function public.guard_media() returns trigger
language plpgsql as $$
declare
  n int;
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.approved := false;
    if new.path not like (auth.uid()::text || '/%') then
      raise exception 'Invalid file path.';
    end if;
    select count(*) into n from public.media where owner = new.owner and kind = new.kind;
    if new.kind = 'photo' and n >= 8 then raise exception 'You can have up to 8 photos.'; end if;
    if new.kind = 'video' and n >= 2 then raise exception 'You can have up to 2 videos.'; end if;
    if new.kind = 'photo' and not exists (select 1 from public.media where owner = new.owner and is_main) then
      new.is_main := true;
    elsif new.kind = 'video' then
      new.is_main := false;
    end if;
    return new;
  end if;
  new.approved := old.approved;
  new.owner := old.owner;
  new.path := old.path;
  new.kind := old.kind;
  if new.kind = 'video' then new.is_main := false; end if;
  return new;
end;
$$;
create trigger guard_media before insert or update on public.media
  for each row execute function public.guard_media();

-- When the main photo is deleted, the oldest remaining photo takes its place.
create function public.promote_main() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.is_main then
    update media set is_main = true
    where id = (select id from media where owner = old.owner and kind = 'photo'
                order by approved desc, created_at limit 1);
  end if;
  return null;
end;
$$;
create trigger promote_main after delete on public.media
  for each row execute function public.promote_main();

-- ---------------------------------------------------------------------------
-- What other people can see
-- ---------------------------------------------------------------------------

-- Anyone, signed in or not: first name, age, city and the main photo of approved members.
create view public.public_cards as
  select p.id, p.gender, p.first_name,
         date_part('year', age(p.birthdate))::int as age,
         p.city, p.country, p.created_at,
         (select m.path from public.media m
          where m.owner = p.id and m.kind = 'photo' and m.is_main and m.approved limit 1) as photo
  from public.profiles p
  where p.status = 'approved';

-- Approved members only: the full profile text.
create view public.member_details as
  select p.id, p.gender, p.first_name,
         date_part('year', age(p.birthdate))::int as age,
         p.city, p.country, p.about
  from public.profiles p
  where p.status = 'approved' and public.viewer_approved();

create function public.my_conversations()
returns table (other uuid, first_name text, last_body text, last_at timestamptz, unread bigint)
language sql stable security definer set search_path = public as $$
  with m as (
    select case when sender = auth.uid() then recipient else sender end as other,
           body, created_at,
           (recipient = auth.uid() and read_at is null) as is_unread
    from messages
    where sender = auth.uid() or recipient = auth.uid()
  )
  select m.other, p.first_name,
         (array_agg(m.body order by m.created_at desc))[1],
         max(m.created_at),
         count(*) filter (where m.is_unread)
  from m join profiles p on p.id = m.other
  group by m.other, p.first_name
  order by max(m.created_at) desc;
$$;

create function public.mark_read(other uuid) returns void
language sql security definer set search_path = public as $$
  update messages set read_at = now()
  where recipient = auth.uid() and sender = other and read_at is null;
$$;

create function public.delete_my_account() returns void
language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Row rules
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.media enable row level security;
alter table public.subscriptions enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy media_select on public.media for select to authenticated
  using (
    owner = auth.uid() or public.is_admin()
    or (approved and public.viewer_approved()
        and exists (select 1 from public.public_cards c where c.id = owner))
  );
create policy media_insert on public.media for insert to authenticated
  with check (owner = auth.uid());
create policy media_update on public.media for update to authenticated
  using (owner = auth.uid() or public.is_admin())
  with check (owner = auth.uid() or public.is_admin());
create policy media_delete on public.media for delete to authenticated
  using (owner = auth.uid() or public.is_admin());

create policy subscriptions_select on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy messages_select on public.messages for select to authenticated
  using (sender = auth.uid() or recipient = auth.uid());
create policy messages_insert on public.messages for insert to authenticated
  with check (sender = auth.uid() and public.message_block_reason(recipient) is null);

create policy blocks_all on public.blocks for all to authenticated
  using (blocker = auth.uid()) with check (blocker = auth.uid());

create policy reports_insert on public.reports for insert to authenticated
  with check (reporter = auth.uid());
create policy reports_admin_select on public.reports for select to authenticated
  using (public.is_admin());
create policy reports_admin_update on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.media to authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select on public.public_cards to anon, authenticated;
grant select on public.member_details to authenticated;
grant execute on function public.is_admin(), public.viewer_approved(), public.has_paid(uuid),
  public.message_block_reason(uuid), public.can_view_object(text) to anon, authenticated;
grant execute on function public.my_conversations(), public.mark_read(uuid),
  public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- File storage: one private bucket, files kept under a folder named after the member
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']);

create policy media_files_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy media_files_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'media'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.can_view_object(name)));
create policy media_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
