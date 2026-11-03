-- Phase 3, step 1: the admin page (/admin) for manual orders.
--
-- Orders come in by Instagram, Facebook or the form and are paid by bank transfer, so the admin
-- types each one in by hand. One step creates the house, remembers who bought it, and puts the
-- buyer's first letter in the mailbox (the landing page promises that letter).
--
-- What admins can and can't do stays the same as before: they see every house (to print cards and
-- help keepers), but can't read anyone's photos or letters. They can put a letter in, not take one out.


-- ---------- Orders ----------

-- Who bought a house and what they paid. One row per house.
-- Kept apart from public.houses on purpose: keepers can read their own house row, and the
-- recipient shouldn't see the buyer's phone number or what the gift cost.
create table public.orders (
  house_id uuid primary key references public.houses (id) on delete cascade,
  buyer_name text check (char_length(buyer_name) <= 100),
  -- Instagram name, phone, Facebook link — however they reached us.
  buyer_contact text check (char_length(buyer_contact) <= 200),
  price_gel numeric(8, 2) check (price_gel >= 0),
  paid boolean not null default false,
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;

-- Admins read orders and fix them (mark paid, add a note). New ones are made by admin_create_order().
grant select on public.orders to authenticated;
grant update (buyer_name, buyer_contact, price_gel, paid, note) on public.orders to authenticated;
create policy "Admins manage orders" on public.orders
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ---------- Actions the admin page can call ----------

-- Every house with what the admin needs to look after it. Newest first.
-- The gift code is only shown while nobody has claimed the house (after that it's used up).
-- keeper_email is there so the admin can find a keeper who forgot their password.
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
  note text
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
      o.note
    from public.houses h
    join public.streets s on s.id = h.street_id
    left join auth.users u on u.id = h.keeper_id
    left join public.orders o on o.house_id = h.id
    order by h.created_at desc;
end;
$$;

-- A new manual order: the house, the order details and (if the buyer wrote one) the first letter,
-- all at once, so a half-made order can't be left behind.
-- Returns the two codes to print: the house link code and the gift code.
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
  letter_body text default null
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

  insert into public.houses (street_id, plot, design, title)
  values (street.id, plot_number, coalesce(start_design, '{}'), nullif(trim(house_title), ''))
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

-- Puts a letter in a house's mailbox, e.g. when the buyer sends their letter after ordering.
-- Write-only: the admin can't read letters back, the keeper reads them inside the house.
create function public.admin_add_letter(house_code text, letter_from text, letter_body text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_house uuid;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  select h.id into target_house from public.houses h where h.code = house_code;
  if target_house is null then
    raise exception 'No such house';
  end if;
  if nullif(trim(letter_body), '') is null then
    raise exception 'The letter is empty';
  end if;

  insert into public.letters (house_id, from_name, body)
  values (target_house, nullif(trim(letter_from), ''), trim(letter_body));
end;
$$;

-- Replaced by admin_create_order(), which also saves the order and the first letter.
drop function public.admin_create_house(text, int, jsonb, text);

revoke execute on function public.admin_list_houses() from public, anon;
revoke execute on function public.admin_create_order(text, int, text, jsonb, text, text, numeric, boolean, text, text, text) from public, anon;
revoke execute on function public.admin_add_letter(text, text, text) from public, anon;
grant execute on function public.admin_list_houses() to authenticated;
grant execute on function public.admin_create_order(text, int, text, jsonb, text, text, numeric, boolean, text, text, text) to authenticated;
grant execute on function public.admin_add_letter(text, text, text) to authenticated;
