-- Phase 3, step 3: co-decorators ("helpers").
--
-- The keeper can invite family and friends to help fill the house. The keeper makes an invite code
-- (one-time, good for 14 days) and sends the link. The friend signs in, enters the code on /signin
-- (the link fills it in) and becomes a helper.
--
-- Helpers can: hang and take down photos, write letters, put things in the time capsule.
-- Helpers can't: change the outside, pick or move the capsule's day, see lanterns, invite others,
-- or read letters other people wrote. The keeper's mailbox stays the keeper's.


-- ---------- Tables ----------

create table public.house_helpers (
  house_id uuid not null references public.houses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (house_id, user_id)
);
create index on public.house_helpers (user_id);

create table public.helper_invites (
  -- 14 characters, so it can never be mistaken for a 12-character gift code.
  code text primary key default public.random_code(14),
  house_id uuid not null references public.houses (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz
);
create index on public.helper_invites (house_id);

-- Only the functions below touch these tables.
alter table public.house_helpers enable row level security;
alter table public.helper_invites enable row level security;
revoke all on public.house_helpers, public.helper_invites from anon, authenticated;


-- ---------- Who may do what ----------

-- True only for the house's keeper (not helpers).
create function public.is_house_keeper(house uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.houses where id = house and keeper_id = (select auth.uid()))
$$;

-- The keeper or a helper. Every rule that used this before (photos, photo files, the time capsule)
-- now lets helpers in too, as the first migration planned.
create or replace function public.can_edit_house(house uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_house_keeper(house)
      or exists (select 1 from public.house_helpers where house_id = house and user_id = (select auth.uid()))
$$;

-- Helpers can see the house row too (the app looks up the house's id to store photos).
-- Only the keeper may change it: "Keepers change their house" stays as it was.
drop policy "Keepers and admins see houses" on public.houses;
create policy "Keepers, helpers and admins see houses" on public.houses
  for select to authenticated
  using (public.can_edit_house(id) or public.is_admin());

-- Letters: the keeper reads every letter in their mailbox. A helper reads, changes and deletes only
-- the letters they wrote themselves. Anyone who decorates can write one.
drop policy "Keepers manage their letters" on public.letters;
create policy "Keepers read all letters, helpers their own" on public.letters
  for select to authenticated
  using (public.is_house_keeper(house_id) or (created_by = (select auth.uid()) and public.can_edit_house(house_id)));
create policy "Decorators write letters" on public.letters
  for insert to authenticated
  with check (public.can_edit_house(house_id));
create policy "Keepers change all letters, helpers their own" on public.letters
  for update to authenticated
  using (public.is_house_keeper(house_id) or (created_by = (select auth.uid()) and public.can_edit_house(house_id)))
  with check (public.can_edit_house(house_id));
create policy "Keepers delete all letters, helpers their own" on public.letters
  for delete to authenticated
  using (public.is_house_keeper(house_id) or (created_by = (select auth.uid()) and public.can_edit_house(house_id)));

-- Lanterns stay the keeper's: they're messages to the keeper.
drop policy "Keepers see their lanterns" on public.lanterns;
drop policy "Keepers remove lanterns" on public.lanterns;
create policy "Keepers see their lanterns" on public.lanterns
  for select to authenticated
  using (public.is_house_keeper(house_id));
create policy "Keepers remove lanterns" on public.lanterns
  for delete to authenticated
  using (public.is_house_keeper(house_id));


-- ---------- Actions the app can call ----------

-- The keeper makes a new one-time invite code. Returns the code.
create function public.create_helper_invite(house_code text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target uuid;
  new_code text;
begin
  select h.id into target from public.houses h where h.code = house_code;
  if target is null or not public.is_house_keeper(target) then
    raise exception 'Only the keeper can invite helpers';
  end if;
  if (select count(*) from public.house_helpers where house_id = target) >= 10 then
    raise exception 'A house can have up to 10 helpers';
  end if;
  if (select count(*) from public.helper_invites
      where house_id = target and used_at is null and expires_at > now()) >= 10 then
    raise exception 'Too many open invitations';
  end if;

  insert into public.helper_invites (house_id) values (target) returning code into new_code;
  return new_code;
end;
$$;

-- The keeper's list of helpers, oldest first. Shows each helper's email so the keeper knows who's who.
create function public.get_helpers(house_code text)
returns table (user_id uuid, email text, added_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  select h.id into target from public.houses h where h.code = house_code;
  if target is null or not public.is_house_keeper(target) then
    raise exception 'Only the keeper can see helpers';
  end if;

  return query
    select hh.user_id, u.email::text, hh.added_at
    from public.house_helpers hh
    join auth.users u on u.id = hh.user_id
    where hh.house_id = target
    order by hh.added_at;
end;
$$;

-- The keeper takes someone off the helper list. What they already added stays in the house.
create function public.remove_helper(house_code text, helper uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  select h.id into target from public.houses h where h.code = house_code;
  if target is null or not public.is_house_keeper(target) then
    raise exception 'Only the keeper can remove helpers';
  end if;
  delete from public.house_helpers where house_id = target and user_id = helper;
end;
$$;

-- The houses the signed-in person looks after, for the sign-in page: their own and the ones they help with.
create function public.my_houses()
returns table (code text, title text, is_keeper boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select h.code, h.title, h.keeper_id = (select auth.uid())
  from public.houses h
  where h.keeper_id = (select auth.uid())
     or exists (select 1 from public.house_helpers hh where hh.house_id = h.id and hh.user_id = (select auth.uid()))
  order by h.keeper_id = (select auth.uid()) desc, h.claimed_at
$$;

-- The code box on /signin takes both kinds of code:
--   a gift code   → you become the keeper (as before, see 20261103000000_phase2_houses.sql)
--   an invite code → you become a helper
-- Returns the house code so the app can open https://cozytown.ge/h/<code>.
create or replace function public.claim_house(gift text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  typed text := upper(regexp_replace(gift, '[^A-Za-z0-9]', '', 'g'));
  house_row public.houses;
  invite public.helper_invites;
begin
  if me is null then
    raise exception 'Sign in first';
  end if;

  select * into house_row from public.houses where gift_code = typed for update;
  if house_row.id is not null then
    if house_row.keeper_id is not null and house_row.keeper_id <> me then
      raise exception 'This gift was already claimed';
    end if;
    update public.houses
    set keeper_id = me, claimed_at = coalesce(claimed_at, now())
    where id = house_row.id;
    return house_row.code;
  end if;

  select * into invite from public.helper_invites where code = typed for update;
  if invite.code is null then
    raise exception 'No house has this gift code';
  end if;
  select * into house_row from public.houses where id = invite.house_id;

  -- Opening the same invite twice is fine; someone else's used invite is not.
  if invite.used_by = me then
    return house_row.code;
  end if;
  if invite.used_at is not null then
    raise exception 'This invitation was already used';
  end if;
  if invite.expires_at <= now() then
    raise exception 'This invitation has expired';
  end if;
  if house_row.keeper_id = me then
    raise exception 'You are already the keeper of this house';
  end if;

  insert into public.house_helpers (house_id, user_id) values (house_row.id, me) on conflict do nothing;
  update public.helper_invites set used_by = me, used_at = now() where code = invite.code;
  return house_row.code;
end;
$$;


-- ---------- get_house: say whether the person is a helper ----------

-- Same as before (see 20261104100000_time_capsule.sql), plus is_helper at the end.
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
  lantern_count int,
  capsule_news boolean,
  is_helper boolean
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
    (select count(*)::int from public.lanterns l where l.house_id = h.id),
    coalesce(h.keeper_id = (select auth.uid()), false) and exists (
      select 1 from public.capsules c
      where c.house_id = h.id and c.keeper_opened_at is null and public.capsule_is_open(h.id)
    ),
    exists (select 1 from public.house_helpers hh where hh.house_id = h.id and hh.user_id = (select auth.uid()))
  from public.houses h
  join public.streets s on s.id = h.street_id
  where h.code = house_code
$$;


-- ---------- Who may call what ----------

-- is_house_keeper is used inside the table rules, which run as the signed-in person.
revoke execute on function public.is_house_keeper(uuid) from public, anon;
grant execute on function public.is_house_keeper(uuid) to authenticated;
revoke execute on function public.create_helper_invite(text) from public, anon;
revoke execute on function public.get_helpers(text) from public, anon;
revoke execute on function public.remove_helper(text, uuid) from public, anon;
revoke execute on function public.my_houses() from public, anon;
grant execute on function public.create_helper_invite(text) to authenticated;
grant execute on function public.get_helpers(text) to authenticated;
grant execute on function public.remove_helper(text, uuid) to authenticated;
grant execute on function public.my_houses() to authenticated;
grant execute on function public.get_house(text) to anon, authenticated;
