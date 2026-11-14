-- iLoveLatins: a private hit counter. Counts page views and visits per page per day.
-- No names, emails, IP addresses or cookies are stored: just a number per page per day.
-- Run once in the Supabase SQL Editor, after 006.

create table public.page_views (
  day     date not null default current_date,
  path    text not null check (char_length(path) <= 80),
  views   int not null default 0,
  visits  int not null default 0,   -- first page of a browser session
  primary key (day, path)
);
alter table public.page_views enable row level security;
create policy page_views_admin on public.page_views for select to authenticated using (public.is_admin());
grant select on public.page_views to authenticated;

-- Called by every page once per load. Only page names like "tours.html" are accepted.
create function public.count_view(p text, new_visit boolean default false) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p is null or p !~ '^[a-z0-9-]{1,40}\.html$' then return; end if;
  insert into page_views (day, path, views, visits)
  values ((now() at time zone 'America/Bogota')::date, p, 1, case when new_visit then 1 else 0 end)
  on conflict (day, path) do update
    set views = page_views.views + 1,
        visits = page_views.visits + case when new_visit then 1 else 0 end;
end;
$$;
grant execute on function public.count_view(text, boolean) to anon, authenticated;
