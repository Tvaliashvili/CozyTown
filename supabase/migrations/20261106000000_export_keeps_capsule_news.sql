-- QA Q8: "Download everything" reads the opened time capsule too, and that used to count as the
-- keeper looking inside, so the "Your time capsule has opened!" notice on the street went away
-- before they had seen it. open_capsule() gets a mark_seen switch; the zip passes false.
-- Same function as in 20261104100000_time_capsule.sql otherwise.

drop function public.open_capsule(text);

create function public.open_capsule(house_code text, mark_seen boolean default true)
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

  if mark_seen then
    update public.capsules c set keeper_opened_at = now()
    where c.house_id = target and c.keeper_opened_at is null
      and exists (select 1 from public.houses h where h.id = target and h.keeper_id = auth.uid());
  end if;

  return query
    select i.id, i.from_name, i.body, i.photo_path, i.photo_width, i.photo_height, i.created_at
    from public.capsule_items i
    where i.house_id = target
    order by i.created_at;
end;
$$;

revoke execute on function public.open_capsule(text, boolean) from public, anon;
grant execute on function public.open_capsule(text, boolean) to authenticated;
