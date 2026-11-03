-- Phase 3, step 2: the time capsule.
--
-- Each house has one chest with one opening date. The keeper picks the date. Until that day,
-- the keeper (and later, helpers) can put letters and photos in, but nobody can take anything out
-- or even look: not the keeper, not the admin. The database refuses, so no trick in the app can
-- get around it. Dates are days in Tbilisi time: the chest opens at midnight in Georgia.
--
-- The date can be moved later, never earlier (otherwise "locked" would mean nothing).
--
-- Photos for the chest go in their own private storage bucket, "capsule". Its files can only be
-- downloaded once the chest is open. (The normal "photos" bucket is public, so it can't be used.)


-- ---------- Tables ----------

create table public.capsules (
  house_id uuid primary key references public.houses (id) on delete cascade,
  opens_on date not null,
  created_at timestamptz not null default now(),
  -- When the keeper first looked inside after it opened. Until then the street says "it opened!".
  keeper_opened_at timestamptz
);

create table public.capsule_items (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.capsules (house_id) on delete cascade,
  from_name text check (char_length(from_name) <= 60),
  body text check (char_length(body) <= 5000),
  -- <house id>/<random name>.webp in the "capsule" bucket
  photo_path text unique check (split_part(photo_path, '/', 1) = house_id::text),
  photo_width int,
  photo_height int,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (body is not null or photo_path is not null)
);
create index on public.capsule_items (house_id);

-- Nobody reads or writes these tables directly. Only the functions below touch them,
-- and they check the date every time.
alter table public.capsules enable row level security;
alter table public.capsule_items enable row level security;
revoke all on public.capsules, public.capsule_items from anon, authenticated;


-- ---------- Helpers ----------

-- Today's date in Georgia, whatever the server's own clock zone is.
create function public.tbilisi_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Tbilisi')::date
$$;

-- True once the chest's day has come. False if the house has no chest.
create function public.capsule_is_open(house uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select opens_on <= public.tbilisi_today() from public.capsules where house_id = house), false)
$$;

-- The house behind a code, but only for someone who may decorate it. Otherwise an error.
create function public.editable_house(house_code text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  select h.id into target from public.houses h where h.code = house_code;
  if target is null or not public.can_edit_house(target) then
    raise exception 'Only the keeper can do this';
  end if;
  return target;
end;
$$;


-- ---------- Actions the app can call ----------

-- What the chest looks like from outside: its date, how full it is, whether it's open.
-- No row = no chest yet. Only for people who may decorate the house.
create function public.get_capsule(house_code text)
returns table (opens_on date, item_count int, is_open boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target uuid := public.editable_house(house_code);
begin
  return query
    select c.opens_on,
           (select count(*)::int from public.capsule_items i where i.house_id = c.house_id),
           public.capsule_is_open(c.house_id)
    from public.capsules c
    where c.house_id = target;
end;
$$;

-- The keeper picks the day the chest opens (first time), or moves it later.
create function public.set_capsule_date(house_code text, open_date date)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target uuid := public.editable_house(house_code);
  chest public.capsules;
begin
  if not exists (select 1 from public.houses where id = target and keeper_id = auth.uid()) then
    raise exception 'Only the keeper can choose the date';
  end if;
  if open_date <= public.tbilisi_today() then
    raise exception 'The date must be in the future';
  end if;
  if open_date > public.tbilisi_today() + interval '100 years' then
    raise exception 'The date is too far away';
  end if;

  select * into chest from public.capsules where house_id = target for update;
  if chest.house_id is null then
    insert into public.capsules (house_id, opens_on) values (target, open_date);
  elsif public.capsule_is_open(target) then
    raise exception 'The time capsule is already open';
  elsif open_date < chest.opens_on then
    raise exception 'The date can only move later';
  else
    update public.capsules set opens_on = open_date where house_id = target;
  end if;
end;
$$;

-- Puts a letter and/or a photo in the chest. Once in, even the person who wrote it can't read it
-- until the day comes. The photo file must already be uploaded to the "capsule" bucket.
create function public.add_to_capsule(
  house_code text,
  letter_from text default null,
  letter_body text default null,
  photo_path text default null,
  photo_width int default null,
  photo_height int default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target uuid := public.editable_house(house_code);
begin
  if not exists (select 1 from public.capsules where house_id = target) then
    raise exception 'Choose the opening date first';
  end if;
  if public.capsule_is_open(target) then
    raise exception 'The time capsule is already open';
  end if;
  if nullif(trim(letter_body), '') is null and photo_path is null then
    raise exception 'Add a letter or a photo';
  end if;
  if (select count(*) from public.capsule_items where house_id = target) >= 100 then
    raise exception 'The time capsule is full';
  end if;

  insert into public.capsule_items (house_id, from_name, body, photo_path, photo_width, photo_height)
  values (target, nullif(trim(letter_from), ''), nullif(trim(letter_body), ''), photo_path, photo_width, photo_height);
end;
$$;

-- Everything in the chest, oldest first. Refuses until the day comes.
-- The first time the keeper looks, the "it opened!" notice on the street goes away.
create function public.open_capsule(house_code text)
returns table (id uuid, from_name text, body text, photo_path text, photo_width int, photo_height int, created_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target uuid := public.editable_house(house_code);
begin
  if not public.capsule_is_open(target) then
    raise exception 'The time capsule is still locked';
  end if;

  update public.capsules c set keeper_opened_at = now()
  where c.house_id = target and c.keeper_opened_at is null
    and exists (select 1 from public.houses h where h.id = target and h.keeper_id = auth.uid());

  return query
    select i.id, i.from_name, i.body, i.photo_path, i.photo_width, i.photo_height, i.created_at
    from public.capsule_items i
    where i.house_id = target
    order by i.created_at;
end;
$$;


-- ---------- get_house: tell the keeper when the chest has opened ----------

-- Same as before (see 20261103210000_visitor_lanterns.sql), plus capsule_news at the end:
-- true only for the keeper, only once the chest is open and they haven't looked inside yet.
drop function public.get_house(text);

create function public.get_house(house_code text)
returns table (
  street_slug text,
  plot int,
  design jsonb,
  title text,
  claimed boolean,
  is_keeper boolean,
  design_final boolean,
  lantern_count int,
  capsule_news boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.slug,
    h.plot,
    h.design,
    h.title,
    h.keeper_id is not null,
    -- coalesce: for visitors auth.uid() is empty, and "x = empty" is empty, not false
    coalesce(h.keeper_id = (select auth.uid()), false),
    h.design_submitted_at is not null,
    (select count(*)::int from public.lanterns l where l.house_id = h.id),
    coalesce(h.keeper_id = (select auth.uid()), false) and exists (
      select 1 from public.capsules c
      where c.house_id = h.id and c.keeper_opened_at is null and public.capsule_is_open(h.id)
    )
  from public.houses h
  join public.streets s on s.id = h.street_id
  where h.code = house_code
$$;


-- ---------- Photo storage for the chest ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('capsule', 'capsule', false, 2097152, array['image/webp', 'image/jpeg']);

-- Put photos in while it's locked; download them only once it's open. No deleting.
create policy "Decorators put photos in the capsule" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'capsule'
    and public.can_edit_house(public.house_of_path(name))
    and not public.capsule_is_open(public.house_of_path(name))
  );
create policy "Decorators see capsule photos once it opens" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'capsule'
    and public.can_edit_house(public.house_of_path(name))
    and public.capsule_is_open(public.house_of_path(name))
  );


-- ---------- Who may call what ----------

revoke execute on function public.tbilisi_today() from public, anon, authenticated;
-- capsule_is_open stays callable by signed-in people: the storage rules above run as them.
-- It only answers yes or no, so it gives nothing away.
revoke execute on function public.capsule_is_open(uuid) from public, anon;
grant execute on function public.capsule_is_open(uuid) to authenticated;
revoke execute on function public.editable_house(text) from public, anon, authenticated;
revoke execute on function public.get_capsule(text) from public, anon;
revoke execute on function public.set_capsule_date(text, date) from public, anon;
revoke execute on function public.add_to_capsule(text, text, text, text, int, int) from public, anon;
revoke execute on function public.open_capsule(text) from public, anon;
grant execute on function public.get_capsule(text) to authenticated;
grant execute on function public.set_capsule_date(text, date) to authenticated;
grant execute on function public.add_to_capsule(text, text, text, text, int, int) to authenticated;
grant execute on function public.open_capsule(text) to authenticated;
grant execute on function public.get_house(text) to anon, authenticated;
