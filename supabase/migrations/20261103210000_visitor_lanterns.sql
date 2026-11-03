-- Phase 2, step 4: visitors light lanterns.
--
-- Lighting one already works through light_lantern() (first migration). What's new: get_house()
-- also says how many lanterns a house has, so the street can draw them glowing in the garden and
-- the "Light a lantern" screen can say how many are there.
-- Only the number is shared. Who lit them and what they wrote stays keeper-only.


-- A function's list of returned columns can't be changed in place, so drop it and create it again.
-- Same as before (see 20261103100000_open_house_and_design_lock.sql), plus lantern_count at the end.
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
  lantern_count int
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
    (select count(*)::int from public.lanterns l where l.house_id = h.id)
  from public.houses h
  join public.streets s on s.id = h.street_id
  where h.code = house_code
$$;

-- Visitors have no account, so it stays open to everyone, like before.
grant execute on function public.get_house(text) to anon, authenticated;
