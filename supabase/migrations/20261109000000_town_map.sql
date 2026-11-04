-- The town map: neighbourhoods on top of streets (town -> neighbourhood -> street -> house).
--
-- Rules this adds:
--   * Streets open one at a time, by hand. A new street starts closed, so the town never looks empty.
--   * The map only shows counts and names. It never gives a house's code, name or keeper.
--   * Everything in a quiet neighbourhood (the Garden Quarter) is quiet: no gift bow, no gift box.
--   * A house can move to another street. Its code doesn't change, so printed QR codes keep working.


-- ---------- Neighbourhoods ----------

create table public.neighbourhoods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, -- short name used in code; src/map/places.js says where each sits on the map
  name_ka text not null,
  name_en text not null,
  map_order int not null,
  -- For memorial houses. Every house here gets houses.quiet, see the trigger below.
  quiet boolean not null default false,
  created_at timestamptz not null default now()
);

-- Nobody reads this table directly: the map comes from get_town_map().
alter table public.neighbourhoods enable row level security;
revoke all on public.neighbourhoods from anon, authenticated;

-- The Georgian names except the Garden Quarter's are placeholders for the founder to check.
insert into public.neighbourhoods (slug, name_ka, name_en, map_order, quiet) values
  ('old-town', 'ძველი ქალაქი', 'Old Town', 1, false),
  ('riverside', 'მდინარისპირა', 'Riverside', 2, false),
  ('snowy-hills', 'თოვლიანი გორები', 'Snowy Hills', 3, false),
  ('garden-quarter', 'ბაღების უბანი', 'The Garden Quarter', 4, true);


-- ---------- Streets belong to a neighbourhood and open by hand ----------

alter table public.streets
  add column neighbourhood_id uuid references public.neighbourhoods (id),
  add column is_open boolean not null default false;

-- The street we already have is open, and it starts the Old Town.
update public.streets
set neighbourhood_id = (select id from public.neighbourhoods where slug = 'old-town'),
    is_open = true;

alter table public.streets alter column neighbourhood_id set not null;


-- ---------- A quiet neighbourhood keeps its houses quiet ----------

-- A trigger, so it holds however a house gets there: a new order, a move, or the admin's switch.
-- Moving out again leaves the house quiet; the admin can then turn that off if it's right.
create function public.keep_quiet_neighbourhood_quiet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.streets s
    join public.neighbourhoods n on n.id = s.neighbourhood_id
    where s.id = new.street_id and n.quiet
  ) then
    if tg_op = 'UPDATE' and new.street_id = old.street_id and old.quiet and not new.quiet then
      raise exception 'Houses in a quiet neighbourhood stay quiet';
    end if;
    new.quiet := true;
  end if;
  return new;
end;
$$;

create trigger quiet_neighbourhood_keeps_houses_quiet
  before insert or update of street_id, quiet on public.houses
  for each row execute function public.keep_quiet_neighbourhood_quiet();

revoke execute on function public.keep_quiet_neighbourhood_quiet() from public, anon, authenticated;


-- ---------- The map ----------

-- One row per street, and one row with an empty street for a neighbourhood that has none yet.
-- Closed streets are included for the admin page; the map itself shows only the open ones.
-- Names and counts only: get_street() already shows which plots are taken.
create function public.get_town_map()
returns table (
  neighbourhood_slug text,
  neighbourhood_ka text,
  neighbourhood_en text,
  street_slug text,
  street_ka text,
  street_en text,
  street_open boolean,
  plot_count int,
  taken_plots int
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    n.slug, n.name_ka, n.name_en,
    s.slug, s.name_ka, s.name_en, s.is_open, s.plot_count,
    (select count(*)::int from public.houses h where h.street_id = s.id)
  from public.neighbourhoods n
  left join public.streets s on s.neighbourhood_id = n.id
  order by n.map_order, s.created_at
$$;

revoke execute on function public.get_town_map() from public;
grant execute on function public.get_town_map() to anon, authenticated;


-- ---------- What the admin can do ----------

-- A new street starts closed. The 3D street always has 8 plots, so the size isn't a choice.
create function public.admin_add_street(neighbourhood text, english_name text, georgian_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  hood_id uuid;
  new_slug text;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  select n.id into hood_id from public.neighbourhoods n where n.slug = neighbourhood;
  if hood_id is null then
    raise exception 'No such neighbourhood';
  end if;

  english_name := trim(english_name);
  georgian_name := trim(georgian_name);
  if coalesce(english_name, '') = '' or coalesce(georgian_name, '') = '' then
    raise exception 'A street needs both an English and a Georgian name';
  end if;
  if char_length(english_name) > 60 or char_length(georgian_name) > 60 then
    raise exception 'Street names can be at most 60 letters';
  end if;

  -- "Rose Street" becomes "rose-street", used in the address /map/rose-street.
  new_slug := trim(both '-' from regexp_replace(lower(english_name), '[^a-z0-9]+', '-', 'g'));
  if new_slug = '' then
    raise exception 'The English name needs some English letters';
  end if;
  if exists (select 1 from public.streets s where s.slug = new_slug) then
    raise exception 'There is already a street with that name';
  end if;

  insert into public.streets (slug, name_ka, name_en, neighbourhood_id)
  values (new_slug, georgian_name, english_name, hood_id);

  return new_slug;
end;
$$;

revoke execute on function public.admin_add_street(text, text, text) from public, anon;
grant execute on function public.admin_add_street(text, text, text) to authenticated;


-- Open: the street appears on the map. Closing only hides it from the map:
-- its houses and their links keep working.
create function public.admin_set_street_open(street_slug text, make_open boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  update public.streets s set is_open = coalesce(make_open, false) where s.slug = street_slug;
  if not found then
    raise exception 'No such street';
  end if;
end;
$$;

revoke execute on function public.admin_set_street_open(text, boolean) from public, anon;
grant execute on function public.admin_set_street_open(text, boolean) to authenticated;


-- For example a house moving to the Garden Quarter. Only its place changes.
create function public.admin_move_house(house_code text, street_slug text, plot_number int)
returns void
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

  select * into street from public.streets s where s.slug = street_slug;
  if street.id is null then
    raise exception 'No such street';
  end if;
  if plot_number is null or plot_number < 0 or plot_number >= street.plot_count then
    raise exception 'That street has only % plots', street.plot_count;
  end if;
  if exists (select 1 from public.houses h where h.street_id = street.id and h.plot = plot_number) then
    raise exception 'That plot is taken';
  end if;

  update public.houses h set street_id = street.id, plot = plot_number where h.code = house_code;
  if not found then
    raise exception 'No such house';
  end if;
end;
$$;

revoke execute on function public.admin_move_house(text, text, int) from public, anon;
grant execute on function public.admin_move_house(text, text, int) to authenticated;
