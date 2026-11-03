-- The time capsule is now made in one go (founder, Nov 2026).
--
-- Before: the keeper chose a day, then the keeper and helpers could keep putting things in, and the
-- day could be moved later. That felt odd: a time capsule you keep reopening.
--
-- Now: the keeper writes the letter, picks the photos and the day on one page, and seals it.
-- After that nothing can be added and the day can't change. It opens on its day, as before.
-- Only the keeper makes it (they choose the day); helpers see it from outside, and can open it
-- with the keeper once the day comes.
--
-- The tables stay the same: a sealed capsule is a row in capsules plus its items. Capsules made
-- the old way are simply treated as sealed.


-- ---------- Out with the step-by-step functions ----------

drop function public.set_capsule_date(text, date);
drop function public.add_to_capsule(text, text, text, text, int, int);


-- ---------- Helpers ----------

-- True once the house has a sealed capsule (open or not). The storage rule below runs as the
-- signed-in person, who can't read the capsules table, so it asks through this function.
create function public.capsule_is_sealed(house uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.capsules where house_id = house)
$$;


-- ---------- Sealing ----------

-- Puts the letter and the photos in and locks it until open_date, all at once.
-- photos: a list like [{"path": "<house id>/<name>.webp", "width": 800, "height": 600}], up to 10.
-- The photo files must already be uploaded to the "capsule" bucket.
create function public.seal_capsule(
  house_code text,
  open_date date,
  letter_from text default null,
  letter_body text default null,
  photos jsonb default '[]'
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target uuid := public.editable_house(house_code);
  sender text := nullif(trim(letter_from), '');
  letter text := nullif(trim(letter_body), '');
  photo jsonb;
begin
  if not public.is_house_keeper(target) then
    raise exception 'Only the keeper can seal the time capsule';
  end if;
  if open_date is null or open_date <= public.tbilisi_today() then
    raise exception 'The date must be in the future';
  end if;
  if open_date > public.tbilisi_today() + interval '100 years' then
    raise exception 'The date is too far away';
  end if;
  if jsonb_typeof(photos) is distinct from 'array' then
    raise exception 'Photos must be a list';
  end if;
  if jsonb_array_length(photos) > 10 then
    raise exception 'Up to 10 photos';
  end if;
  if letter is null and jsonb_array_length(photos) = 0 then
    raise exception 'Add a letter or a photo';
  end if;

  -- Only one capsule per house. If two phones tap "Lock" at once, the second one gets this error.
  insert into public.capsules (house_id, opens_on) values (target, open_date)
  on conflict (house_id) do nothing;
  if not found then
    raise exception 'The time capsule is already sealed';
  end if;

  -- The letter first, then the photos in the order they were chosen. clock_timestamp() moves on
  -- with each row (now() wouldn't), so open_capsule() gives them back in this order.
  -- The sender's name goes on the first thing inside, which is the letter if there is one.
  if letter is not null then
    insert into public.capsule_items (house_id, from_name, body, created_at)
    values (target, sender, letter, clock_timestamp());
    sender := null;
  end if;
  for photo in select * from jsonb_array_elements(photos) loop
    insert into public.capsule_items (house_id, from_name, photo_path, photo_width, photo_height, created_at)
    values (target, sender, photo ->> 'path', (photo ->> 'width')::int, (photo ->> 'height')::int, clock_timestamp());
    sender := null;
  end loop;
end;
$$;


-- ---------- Photo storage for the chest ----------

-- Before: any decorator could upload while the chest was locked. Now only the keeper, and only
-- before sealing, so nothing can be slipped in afterwards. Downloading is unchanged (once open).
drop policy "Decorators put photos in the capsule" on storage.objects;
create policy "The keeper uploads capsule photos before sealing" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'capsule'
    and public.is_house_keeper(public.house_of_path(name))
    and not public.capsule_is_sealed(public.house_of_path(name))
  );


-- ---------- Who may call what ----------

-- capsule_is_sealed stays callable by signed-in people: the storage rule runs as them.
-- It only answers yes or no about a house id, like capsule_is_open.
revoke execute on function public.capsule_is_sealed(uuid) from public, anon;
grant execute on function public.capsule_is_sealed(uuid) to authenticated;
revoke execute on function public.seal_capsule(text, date, text, text, jsonb) from public, anon;
grant execute on function public.seal_capsule(text, date, text, text, jsonb) to authenticated;
