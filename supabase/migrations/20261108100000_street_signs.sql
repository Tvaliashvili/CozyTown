-- The living street, first step: small calm signs of what's happening in a house.
--
--   Mailbox flag up  - a letter the keeper hasn't looked at yet (not one they wrote themselves).
--   Gift box         - the time capsule's day has come and the keeper hasn't looked inside yet.
--   Big gift bow     - nobody has claimed this gift yet.
--
-- Who sees what:
--   * The flag and the gift box only come with get_house(), so only someone holding that house's
--     link sees them. Strangers on the street don't: they must not be able to read who gets letters.
--   * The bow comes with get_street(), so it shows on neighbouring houses too. It says nothing private.
--
-- Memorial houses: "quiet" turns off the cheerful signs (bow and gift box). Nothing ever tells a
-- visitor that a house is quiet: the function only answers "no bow", the same as a claimed house.


alter table public.houses add column quiet boolean not null default false;

-- When the keeper last opened the mailbox. Anything newer raises the flag.
alter table public.houses add column letters_seen_at timestamptz;

-- Houses already claimed start with the flag down, so old letters don't all look new.
-- Unclaimed houses keep it up: the buyer's first letter is waiting for the person who receives the gift.
update public.houses set letters_seen_at = now() where keeper_id is not null;


-- ---------- The street ----------

drop function public.get_street(text);

create function public.get_street(street_slug text)
returns table (plot int, design jsonb, gift_bow boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select h.plot, h.design, h.keeper_id is null and not h.quiet
  from public.houses h
  join public.streets s on s.id = h.street_id
  where s.slug = street_slug
$$;

grant execute on function public.get_street(text) to anon, authenticated;


-- ---------- One house ----------

-- Same as before (see 20261104200000_helpers.sql), plus new_letter and capsule_gift at the end.
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
  is_helper boolean,
  new_letter boolean,
  capsule_gift boolean
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
    exists (select 1 from public.house_helpers hh where hh.house_id = h.id and hh.user_id = (select auth.uid())),
    -- Any letter not written by the keeper. With no keeper yet, every letter counts, even one
    -- with no writer on record ("is distinct from" alone would call two empties the same person).
    exists (
      select 1 from public.letters l
      where l.house_id = h.id
        and (h.keeper_id is null or l.created_by is distinct from h.keeper_id)
        and (h.letters_seen_at is null or l.created_at > h.letters_seen_at)
    ),
    not h.quiet and exists (
      select 1 from public.capsules c
      where c.house_id = h.id and c.keeper_opened_at is null and public.capsule_is_open(h.id)
    )
  from public.houses h
  join public.streets s on s.id = h.street_id
  where h.code = house_code
$$;

grant execute on function public.get_house(text) to anon, authenticated;


-- ---------- The keeper opens the mailbox ----------

-- Puts the flag down. Keeper only: a helper can't read every letter, so opening the mailbox
-- doesn't mean the new ones have been read.
create function public.mark_letters_seen(house_code text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.houses
  set letters_seen_at = now()
  where code = house_code and keeper_id = (select auth.uid());

  if not found then
    raise exception 'Only the keeper can do this';
  end if;
end;
$$;

revoke execute on function public.mark_letters_seen(text) from public, anon;
grant execute on function public.mark_letters_seen(text) to authenticated;


-- ---------- The admin page ----------

-- Marks a house as a memorial, or takes the mark off (a house can become a memorial later).
create function public.admin_set_quiet(house_code text, make_quiet boolean)
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

  update public.houses set quiet = coalesce(make_quiet, false) where code = house_code;
  if not found then
    raise exception 'No such house';
  end if;
end;
$$;

revoke execute on function public.admin_set_quiet(text, boolean) from public, anon;
grant execute on function public.admin_set_quiet(text, boolean) to authenticated;


-- Same as before (see 20261104000000_admin_orders.sql), plus quiet at the end.
drop function public.admin_list_houses();

create function public.admin_list_houses()
returns table (
  code text,
  gift_code text,
  street_slug text,
  plot int,
  title text,
  created_at timestamptz,
  claimed_at timestamptz,
  keeper_email text,
  design_final boolean,
  photo_count int,
  lantern_count int,
  buyer_name text,
  buyer_contact text,
  price_gel numeric,
  paid boolean,
  note text,
  quiet boolean
)
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
    select
      h.code,
      case when h.keeper_id is null then h.gift_code end,
      s.slug,
      h.plot,
      h.title,
      h.created_at,
      h.claimed_at,
      u.email::text,
      h.design_submitted_at is not null,
      (select count(*)::int from public.photos p where p.house_id = h.id),
      (select count(*)::int from public.lanterns l where l.house_id = h.id),
      o.buyer_name,
      o.buyer_contact,
      o.price_gel,
      coalesce(o.paid, false),
      o.note,
      h.quiet
    from public.houses h
    join public.streets s on s.id = h.street_id
    left join auth.users u on u.id = h.keeper_id
    left join public.orders o on o.house_id = h.id
    order by h.created_at desc;
end;
$$;

revoke execute on function public.admin_list_houses() from public, anon;
grant execute on function public.admin_list_houses() to authenticated;


-- Same as before (see 20261104000000_admin_orders.sql), plus the memorial switch at the end.
drop function public.admin_create_order(text, int, text, jsonb, text, text, numeric, boolean, text, text, text);

create function public.admin_create_order(
  street_slug text,
  plot_number int,
  house_title text default null,
  start_design jsonb default '{}',
  buyer text default null,
  contact text default null,
  price numeric default null,
  is_paid boolean default false,
  order_note text default null,
  letter_from text default null,
  letter_body text default null,
  quiet_house boolean default false
)
returns table (code text, gift_code text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  street public.streets;
  new_house public.houses;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  select * into street from public.streets s where s.slug = street_slug;
  if street.id is null then
    raise exception 'No such street';
  end if;
  if plot_number < 0 or plot_number >= street.plot_count then
    raise exception 'That street has only % plots', street.plot_count;
  end if;
  if exists (select 1 from public.houses h where h.street_id = street.id and h.plot = plot_number) then
    raise exception 'That plot is taken';
  end if;

  insert into public.houses (street_id, plot, design, title, quiet)
  values (street.id, plot_number, coalesce(start_design, '{}'), nullif(trim(house_title), ''), coalesce(quiet_house, false))
  returning * into new_house;

  insert into public.orders (house_id, buyer_name, buyer_contact, price_gel, paid, note)
  values (
    new_house.id,
    nullif(trim(buyer), ''),
    nullif(trim(contact), ''),
    price,
    coalesce(is_paid, false),
    nullif(trim(order_note), '')
  );

  if nullif(trim(letter_body), '') is not null then
    insert into public.letters (house_id, from_name, body)
    values (new_house.id, nullif(trim(letter_from), ''), trim(letter_body));
  end if;

  return query select new_house.code, new_house.gift_code;
end;
$$;

revoke execute on function public.admin_create_order(text, int, text, jsonb, text, text, numeric, boolean, text, text, text, boolean) from public, anon;
grant execute on function public.admin_create_order(text, int, text, jsonb, text, text, numeric, boolean, text, text, text, boolean) to authenticated;
