-- iLoveLatins: profile details, verified badge, last active, likes.
-- Run this once in the Supabase SQL Editor, after schema.sql.

-- ---------------------------------------------------------------------------
-- New profile fields
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column height_cm      smallint check (height_cm between 120 and 230),
  add column has_children   text check (has_children in ('no', 'yes_home', 'yes_away')),
  add column wants_children text check (wants_children in ('yes', 'no', 'maybe')),
  add column religion       text check (religion in ('catholic', 'christian', 'other', 'none')),
  add column english        text check (english in ('none', 'basic', 'conversational', 'fluent', 'native')),
  add column looking_for    text check (looking_for in ('dating', 'serious', 'marriage', 'friendship')),
  add column verified       boolean not null default false,
  add column last_seen      timestamptz;

-- Members cannot mark themselves verified or set their own "last active" time.
create or replace function public.guard_profile() returns trigger
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
    new.verified := false;
    new.last_seen := null;
    return new;
  end if;
  new.is_admin := old.is_admin;
  new.verified := old.verified;
  new.last_seen := old.last_seen;
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

-- Records that the signed-in member is on the site right now.
create function public.touch_last_seen() returns void
language sql security definer set search_path = public as $$
  update profiles set last_seen = now() where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- What others see: the new fields, plus a rough "active" label (never the exact time)
-- ---------------------------------------------------------------------------

create or replace view public.public_cards as
  select p.id, p.gender, p.first_name,
         date_part('year', age(p.birthdate))::int as age,
         p.city, p.country, p.created_at,
         (select m.path from public.media m
          where m.owner = p.id and m.kind = 'photo' and m.is_main and m.approved limit 1) as photo,
         p.verified, p.looking_for, p.english, p.has_children, p.wants_children, p.height_cm,
         case when p.last_seen > now() - interval '5 minutes' then 'online'
              when p.last_seen > now() - interval '24 hours' then 'today'
              when p.last_seen > now() - interval '7 days' then 'week' end as activity
  from public.profiles p
  where p.status = 'approved';

create or replace view public.member_details as
  select p.id, p.gender, p.first_name,
         date_part('year', age(p.birthdate))::int as age,
         p.city, p.country, p.about,
         p.verified, p.looking_for, p.english, p.has_children, p.wants_children, p.height_cm, p.religion,
         case when p.last_seen > now() - interval '5 minutes' then 'online'
              when p.last_seen > now() - interval '24 hours' then 'today'
              when p.last_seen > now() - interval '7 days' then 'week' end as activity
  from public.profiles p
  where p.status = 'approved' and public.viewer_approved();

-- ---------------------------------------------------------------------------
-- Likes ("I'm interested")
-- ---------------------------------------------------------------------------

create table public.likes (
  liker      uuid not null references public.profiles (id) on delete cascade,
  liked      uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (liker, liked),
  check (liker <> liked)
);
create index likes_liked_idx on public.likes (liked, created_at desc);

alter table public.likes enable row level security;

create policy likes_select_own on public.likes for select to authenticated
  using (liker = auth.uid());
create policy likes_insert on public.likes for insert to authenticated
  with check (
    liker = auth.uid() and public.viewer_approved()
    and exists (select 1 from public.profiles where id = liked and status = 'approved')
  );
create policy likes_delete_own on public.likes for delete to authenticated
  using (liker = auth.uid());

grant select, insert, delete on public.likes to authenticated;

-- How many approved members like me (anyone can see the number).
create function public.likes_me_count() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from likes l join profiles p on p.id = l.liker
  where l.liked = auth.uid() and p.status = 'approved'
    and not exists (select 1 from blocks b
                    where (b.blocker = auth.uid() and b.blocked = l.liker)
                       or (b.blocker = l.liker and b.blocked = auth.uid()));
$$;

-- Who likes me: women, paying men and the owner see the names.
create function public.who_likes_me()
returns table (id uuid, first_name text, age int, city text, country text, photo text,
               verified boolean, activity text, liked_at timestamptz, mutual boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  me profiles;
begin
  select * into me from profiles where profiles.id = auth.uid();
  if me.id is null or me.status <> 'approved' then return; end if;
  if not (me.gender = 'woman' or me.is_admin or has_paid(me.id)) then
    raise exception 'upgrade';
  end if;
  return query
    select c.id, c.first_name, c.age, c.city, c.country, c.photo, c.verified, c.activity,
           l.created_at,
           exists (select 1 from likes x where x.liker = me.id and x.liked = c.id)
    from likes l join public_cards c on c.id = l.liker
    where l.liked = me.id
      and not exists (select 1 from blocks b
                      where (b.blocker = me.id and b.blocked = l.liker)
                         or (b.blocker = l.liker and b.blocked = me.id))
    order by l.created_at desc;
end;
$$;

grant execute on function public.touch_last_seen(), public.likes_me_count(), public.who_likes_me()
  to authenticated;
