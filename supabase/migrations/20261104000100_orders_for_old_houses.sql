-- Houses made before the orders table (20261104000000_admin_orders.sql) have no order row,
-- so the admin page couldn't mark them paid. Give each one an empty order.
-- New houses always get one from admin_create_order().
insert into public.orders (house_id)
select h.id from public.houses h
where not exists (select 1 from public.orders o where o.house_id = h.id);
