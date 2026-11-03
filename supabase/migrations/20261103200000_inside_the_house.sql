-- Phase 2, step 3: the room inside the house.
--
-- Who sees what inside:
--   * Anyone with the house link (family, friends) sees the photos on the walls.
--   * Letters stay private: only the keeper reads and writes them (co-decorators in Phase 3).
--
-- Photo files: the "photos" bucket becomes public, so a browser can show a photo straight from
-- its address. Each file name is long and random (<house id>/<random>.webp), and nobody but the
-- keeper can list the folder, so a photo's address is as hard to guess as the house link itself.
-- Only someone who already opened the house ever learns it.


-- ---------- Frames on the wall ----------

-- The room has 5 frames (slots 0–4, see FRAMES in src/inside/frames.js).
-- Every photo hangs in exactly one frame, and each frame holds one photo
-- (the "unique (house_id, slot)" rule from the first migration).
alter table public.photos alter column slot set not null;
alter table public.photos add constraint photos_slot_in_room check (slot between 0 and 4);


-- ---------- Photo files ----------

update storage.buckets set public = true where id = 'photos';


-- ---------- Actions the app can call ----------

-- The photos on the walls of one house. Anyone with the link may call it; the code is the secret.
create function public.get_house_photos(house_code text)
returns table (id uuid, path text, caption text, slot int, width int, height int)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.path, p.caption, p.slot, p.width, p.height
  from public.photos p
  join public.houses h on h.id = p.house_id
  where h.code = house_code
  order by p.slot
$$;
