-- The photo album: a house can now hold 30 photos, and up to 5 of them hang in the frames.
--
-- A photo with a slot hangs in that frame. A photo with no slot is only in the album.
-- The rule "one photo per frame" (unique (house_id, slot)) and "frames 0-4" stay as they are:
-- Postgres doesn't count empty slots as equal, so any number of photos can have none.
--
-- Why a limit at all: storage is the real cost. A photo is about 280 KB with its small copy, so a full
-- house is about 8.4 MB, and Supabase's free plan holds about 1 GB. Selling more room later is a new migration.

alter table public.photos alter column slot drop not null;


-- The limit lives in the database, so no app or browser trick can go past it.
create function public.keep_to_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Holding the house's row makes two uploads at the same moment wait for each other,
  -- so they can't both count 29 and both slip in.
  perform 1 from public.houses where id = new.house_id for update;

  if (select count(*) from public.photos where house_id = new.house_id) >= 30 then
    raise exception 'This house has room for 30 photos';
  end if;
  return new;
end;
$$;

create trigger photos_keep_to_limit
  before insert on public.photos
  for each row execute function public.keep_to_photo_limit();

revoke execute on function public.keep_to_photo_limit() from public, anon, authenticated;


-- Same as before (see 20261108000000_small_photos.sql), in the order the album shows them:
-- the frames first, then the rest, oldest first. Empty slots used to be impossible.
create or replace function public.get_house_photos(house_code text)
returns table (id uuid, path text, caption text, slot int, width int, height int, small_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.path, p.caption, p.slot, p.width, p.height, p.small_path
  from public.photos p
  join public.houses h on h.id = p.house_id
  where h.code = house_code
  order by p.slot nulls last, p.created_at, p.id
$$;


-- How much of Supabase's storage the photos take, for the line at the top of /admin.
-- The free plan's limit is about 1 GB, and bigger houses reach it sooner, so the founder should see it coming.
create function public.admin_storage_use()
returns table (bytes bigint, files int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  return query
    select coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint, count(*)::int
    from storage.objects o;
end;
$$;

revoke execute on function public.admin_storage_use() from public, anon;
grant execute on function public.admin_storage_use() to authenticated;
