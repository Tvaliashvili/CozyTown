-- Phase 2, step 2: open a house by its link, and "the outside is designed once".
--
-- The keeper (the person who claimed the gift) decorates the outside, then submits it.
-- After that the database refuses design changes. A redesign is a paid extra (15 ₾):
-- after payment the admin calls admin_unlock_design() and the keeper can decorate again.
-- Photos, letters and lanterns live in their own tables, so the lock never touches them.


-- When the keeper submitted the outside. Empty = still decorating.
-- Keepers can't write this column directly (it isn't in their update grant);
-- only submit_design() and admin_unlock_design() below change it.
alter table public.houses add column design_submitted_at timestamptz;


-- ---------- The lock ----------

-- Runs before every change to a house. Keepers may still change the title and "last seen" time,
-- but once the design is submitted, any change to the design itself is refused.
create function public.refuse_locked_design()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.design_submitted_at is not null
     and new.design_submitted_at is not null
     and new.design is distinct from old.design then
    raise exception 'This house design is final';
  end if;
  return new;
end;
$$;

create trigger lock_submitted_design
  before update on public.houses
  for each row execute function public.refuse_locked_design();


-- ---------- Actions the app can call ----------

-- Everything the /h/<code> page needs. Anyone with the link may call it (visitors have no account);
-- the code itself is the secret. Says whether the person asking is the keeper, so the app knows
-- whether to show the decorating panel. Never returns who the keeper is.
create function public.get_house(house_code text)
returns table (
  street_slug text,
  plot int,
  design jsonb,
  title text,
  claimed boolean,
  is_keeper boolean,
  design_final boolean
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
    h.design_submitted_at is not null
  from public.houses h
  join public.streets s on s.id = h.street_id
  where h.code = house_code
$$;

-- The keeper saves the finished outside and locks it in one step,
-- so the locked design is exactly the one they saw on screen.
create function public.submit_design(house_code text, final_design jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  house_row public.houses;
begin
  select * into house_row from public.houses where code = house_code for update;

  if house_row.id is null or house_row.keeper_id is distinct from auth.uid() then
    raise exception 'Only the keeper can finish this house';
  end if;
  if house_row.design_submitted_at is not null then
    raise exception 'This house design is final';
  end if;

  update public.houses
  set design = final_design, design_submitted_at = now()
  where id = house_row.id;
end;
$$;

-- After a paid redesign, the admin opens the outside for changes again.
-- The keeper then decorates and submits once more.
create function public.admin_unlock_design(house_code text)
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

  update public.houses set design_submitted_at = null where code = house_code;
  if not found then
    raise exception 'No such house';
  end if;
end;
$$;

-- get_house stays open to visitors. The other two need a signed-in person.
revoke execute on function public.refuse_locked_design() from public, anon, authenticated;
revoke execute on function public.submit_design(text, jsonb) from public, anon;
revoke execute on function public.admin_unlock_design(text) from public, anon;
grant execute on function public.submit_design(text, jsonb) to authenticated;
grant execute on function public.admin_unlock_design(text) to authenticated;
