-- Phase 2 database: streets, houses, gift codes, photos, letters, lanterns.
--
-- How privacy works, in short:
--   * Visitors (no account) can't read any table directly. They see a street's outsides through
--     get_street(), light lanterns through light_lantern(), and open a house's inside through a
--     small server function (built with the /h/<code> page) that checks the house code.
--   * Keepers sign in with Google and can read and change only their own house and its content.
--   * Admins (the founder) create houses and gift codes, but can't read anyone's photos or letters.
--
-- Security-definer functions run with full rights, so each one checks who's asking itself.
-- They use "set search_path = ''" and write every name in full (public.houses) so nobody can
-- trick them with a look-alike table.

create extension if not exists pgcrypto with schema extensions;


-- ---------- Helpers ----------

-- Random codes from letters and digits that can't be mixed up when read aloud or typed
-- (no 0/O, no 1/I/L). Used for house links (printed in QR codes) and gift codes.
create function public.random_code(code_length int)
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + get_byte(bytes, i) % 31, 1), '')
  from extensions.gen_random_bytes(code_length) as bytes, generate_series(0, code_length - 1) as i
$$;


-- ---------- Admins ----------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
-- No rules on this table, so nobody can read it through the app.
-- Add yourself once in the Supabase SQL editor after your first Google sign-in.
alter table public.admins enable row level security;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
$$;


-- ---------- Streets ----------

create table public.streets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, -- short name used in code, e.g. 'first-street'
  name_ka text not null,
  name_en text not null,
  plot_count int not null default 8 check (plot_count > 0),
  created_at timestamptz not null default now()
);


-- ---------- Houses ----------

create table public.houses (
  id uuid primary key default gen_random_uuid(),
  -- The code in https://cozytown.ge/h/<code>. Printed in QR codes, so it never changes.
  code text not null unique default public.random_code(10),
  -- Given to the person receiving the gift. Using it makes them the keeper; it works for one person only.
  gift_code text not null unique default public.random_code(12),
  street_id uuid not null references public.streets (id),
  plot int not null check (plot >= 0),
  -- Same shape as DEFAULT_DESIGN in src/data/design.js. Missing fields fall back to the defaults.
  design jsonb not null default '{}'
    check (jsonb_typeof(design) = 'object' and pg_column_size(design) < 2000),
  -- e.g. "Nino's house". Shown inside only, never on the street.
  title text check (char_length(title) <= 60),
  keeper_id uuid references auth.users (id) on delete set null,
  claimed_at timestamptz,
  -- When the keeper last opened the house. Anything newer (like lanterns) is shown as "new".
  keeper_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (street_id, plot)
);
create index on public.houses (keeper_id);

-- True when the signed-in person may change this house and its content.
-- Phase 3 adds co-decorators here, and every rule below picks that up automatically.
create function public.can_edit_house(house uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.houses where id = house and keeper_id = (select auth.uid())
  )
$$;


-- ---------- Photos, letters, lanterns ----------

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  -- Where the file sits in storage: <house id>/<random name>.webp
  path text not null unique check (split_part(path, '/', 1) = house_id::text),
  caption text check (char_length(caption) <= 200),
  slot int, -- which frame on the wall it hangs in; empty = not hung yet
  width int,
  height int,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (house_id, slot)
);

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  from_name text check (char_length(from_name) <= 60),
  body text not null check (char_length(body) between 1 and 5000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Lit by visitors, who have no account. Only light_lantern() below can add one.
create table public.lanterns (
  id bigint generated always as identity primary key,
  house_id uuid not null references public.houses (id) on delete cascade,
  from_name text check (char_length(from_name) <= 40),
  message text check (char_length(message) <= 280),
  created_at timestamptz not null default now()
);
create index on public.lanterns (house_id, created_at);


-- ---------- Who may do what ----------

alter table public.streets enable row level security;
alter table public.houses enable row level security;
alter table public.photos enable row level security;
alter table public.letters enable row level security;
alter table public.lanterns enable row level security;

-- Start from "nobody may do anything", then allow exactly what's needed.
revoke all on public.streets, public.houses, public.photos, public.letters, public.lanterns, public.admins
  from anon, authenticated;

grant select on public.streets to anon, authenticated;
create policy "Anyone can see streets" on public.streets
  for select using (true);

-- Keepers see their own house and may change only its design, title and "last seen" time.
-- Admins see every house (to print gift codes), but not what's inside.
grant select on public.houses to authenticated;
grant update (design, title, keeper_seen_at) on public.houses to authenticated;
create policy "Keepers and admins see houses" on public.houses
  for select to authenticated
  using (keeper_id = (select auth.uid()) or public.is_admin());
create policy "Keepers change their house" on public.houses
  for update to authenticated
  using (keeper_id = (select auth.uid()))
  with check (keeper_id = (select auth.uid()));

grant select, delete on public.photos to authenticated;
grant insert (house_id, path, caption, slot, width, height) on public.photos to authenticated;
grant update (caption, slot) on public.photos to authenticated;
create policy "Keepers manage their photos" on public.photos
  for all to authenticated
  using (public.can_edit_house(house_id))
  with check (public.can_edit_house(house_id));

grant select, delete on public.letters to authenticated;
grant insert (house_id, from_name, body) on public.letters to authenticated;
grant update (from_name, body) on public.letters to authenticated;
create policy "Keepers manage their letters" on public.letters
  for all to authenticated
  using (public.can_edit_house(house_id))
  with check (public.can_edit_house(house_id));

-- Keepers can read lanterns and remove unwanted ones.
grant select, delete on public.lanterns to authenticated;
create policy "Keepers see their lanterns" on public.lanterns
  for select to authenticated
  using (public.can_edit_house(house_id));
create policy "Keepers remove lanterns" on public.lanterns
  for delete to authenticated
  using (public.can_edit_house(house_id));


-- ---------- Actions the app can call ----------

-- The street as strangers see it: which plots are taken and what each house looks like outside.
create function public.get_street(street_slug text)
returns table (plot int, design jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select h.plot, h.design
  from public.houses h
  join public.streets s on s.id = h.street_id
  where s.slug = street_slug
$$;

-- The gift's recipient enters their gift code and becomes the keeper.
-- Dashes and spaces are ignored, so "ABCD-EFGH-JKMN" works too.
-- Returns the house code so the app can open https://cozytown.ge/h/<code>.
create function public.claim_house(gift text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  house_row public.houses;
begin
  if me is null then
    raise exception 'Sign in first';
  end if;

  select * into house_row
  from public.houses
  where gift_code = upper(regexp_replace(gift, '[^A-Za-z0-9]', '', 'g'))
  for update;

  if house_row.id is null then
    raise exception 'No house has this gift code';
  end if;
  if house_row.keeper_id is not null and house_row.keeper_id <> me then
    raise exception 'This gift was already claimed';
  end if;

  update public.houses
  set keeper_id = me, claimed_at = coalesce(claimed_at, now())
  where id = house_row.id;

  return house_row.code;
end;
$$;

-- A visitor lights a lantern. No account needed, so we brake spam per house instead.
create function public.light_lantern(house_code text, from_name text default null, message text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_house uuid;
begin
  select id into target_house from public.houses where code = house_code;
  if target_house is null then
    raise exception 'No such house';
  end if;

  if (
    select count(*) from public.lanterns
    where house_id = target_house and created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Too many lanterns right now, please try again later';
  end if;

  insert into public.lanterns (house_id, from_name, message)
  values (target_house, nullif(trim(from_name), ''), nullif(trim(message), ''));
end;
$$;

-- The admin page creates a house for a manual order and gets back the two codes to print.
create function public.admin_create_house(
  street_slug text,
  plot_number int,
  start_design jsonb default '{}',
  house_title text default null
)
returns table (code text, gift_code text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  street public.streets;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  select * into street from public.streets where slug = street_slug;
  if street.id is null then
    raise exception 'No such street';
  end if;
  if plot_number >= street.plot_count then
    raise exception 'That street has only % plots', street.plot_count;
  end if;

  return query
    insert into public.houses as h (street_id, plot, design, title)
    values (street.id, plot_number, start_design, house_title)
    returning h.code, h.gift_code;
end;
$$;

-- Functions can be called by anyone unless we say otherwise. Lock down the internal helpers
-- and the signed-in-only actions; leave get_street and light_lantern open to visitors.
revoke execute on function public.random_code(int) from public, anon, authenticated;
revoke execute on function public.claim_house(text) from public, anon;
revoke execute on function public.admin_create_house(text, int, jsonb, text) from public, anon;
grant execute on function public.claim_house(text) to authenticated;
grant execute on function public.admin_create_house(text, int, jsonb, text) to authenticated;


-- ---------- Photo storage ----------

-- Private bucket: files can only be fetched with a short-lived signed link.
-- Photos are shrunk on the phone first, so 2 MB is plenty.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 2097152, array['image/webp', 'image/jpeg']);

-- Turns "<house id>/photo.webp" into the house id, or nothing if the folder isn't a valid id.
create function public.house_of_path(path text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(path, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(path, '/', 1)::uuid
  end
$$;

create policy "Keepers read their photo files" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and public.can_edit_house(public.house_of_path(name)));
create policy "Keepers upload photo files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and public.can_edit_house(public.house_of_path(name)));
create policy "Keepers delete photo files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and public.can_edit_house(public.house_of_path(name)));


-- ---------- First street ----------

-- Georgian name is a placeholder for the founder to replace.
insert into public.streets (slug, name_ka, name_en)
values ('first-street', 'პირველი ქუჩა', 'First Street');
