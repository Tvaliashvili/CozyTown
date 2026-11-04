-- A small copy of each photo on the wall, for the frames.
--
-- Why: Supabase's free plan allows about 5 GB of downloads a month, and a visit to a room downloaded
-- all 5 full-size photos even though the frames are tiny. That runs out long before storage does.
-- Now the frames show the small copy (about 30 KB) and the full photo downloads only when tapped.
--
-- small_path is empty for photos hung before this change: the app then shows the full photo, as before.
-- Like path, it must sit in the house's own folder, so nobody can point a frame at another house's file.

alter table public.photos
  add column small_path text
  check (small_path is null or split_part(small_path, '/', 1) = house_id::text);

grant insert (small_path) on public.photos to authenticated;


-- Same as before (see 20261103200000_inside_the_house.sql), plus small_path at the end.
drop function public.get_house_photos(text);

create function public.get_house_photos(house_code text)
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
  order by p.slot
$$;

grant execute on function public.get_house_photos(text) to anon, authenticated;
