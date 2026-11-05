-- The keeper can delete a time capsule once it has opened, and make a new one (founder, Nov 2026).
--
-- Before: one capsule per house, ever. Once it had opened, the house could never have another.
--
-- Still locked means still locked: until its day, the database refuses this too. Otherwise "nobody
-- can touch it before that day" would stop being true, and a keeper could quietly undo what was
-- sealed for someone's future.
--
-- Deleting its row frees the house for a new capsule (the items go with it, by "on delete cascade").
-- The photo files have no row left pointing to them, so the nightly backup run removes them from the
-- site after 7 days (Q7), and they leave the backups as those age out, like any deleted photo.
-- Until then nobody can download them: the storage rule asks whether the house's capsule is open.

create function public.delete_opened_capsule(house_code text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target uuid := public.editable_house(house_code);
begin
  if not public.is_house_keeper(target) then
    raise exception 'Only the keeper can delete the time capsule';
  end if;
  -- Already gone (a second phone, or a double tap): the keeper got what they asked for.
  if not public.capsule_is_sealed(target) then
    return;
  end if;
  if not public.capsule_is_open(target) then
    raise exception 'The time capsule is still locked';
  end if;

  delete from public.capsules where house_id = target;
end;
$$;

revoke execute on function public.delete_opened_capsule(text) from public, anon;
grant execute on function public.delete_opened_capsule(text) to authenticated;
