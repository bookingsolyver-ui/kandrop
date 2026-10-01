-- Admin-only order cancellation that GIVES THE RESERVED STOCK BACK, in one transaction.
-- RLS stays ON and there are no policies: only the server (service role) reaches these objects.

-- 1. A supplier line can now be `cancelled`, and remembers how many units it really reserved (an oversold
--    sale reserved none: cancelling it must not invent stock) and when they went back (only ever once).
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.supplier_orders'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%logistics_status%'
  loop
    execute format('alter table supplier_orders drop constraint %I', c);
  end loop;
end $$;
alter table supplier_orders add constraint supplier_orders_logistics_status_check
  check (logistics_status in ('pending', 'preparing', 'picked_up', 'in_transit', 'delivered', 'cancelled'));

alter table supplier_orders add column if not exists stock_reserved    integer not null default 0 check (stock_reserved >= 0);
alter table supplier_orders add column if not exists stock_restored_at bigint;
-- Lines that exist already reserved their whole quantity when they were created.
update supplier_orders set stock_reserved = quantity where stock_reserved = 0 and stock_restored_at is null and logistics_status <> 'cancelled';

-- 2. THE cancellation. One function = one transaction: the order's status, the supplier lines and the stock
--    move together or not at all (any error rolls everything back). The order row is locked first, so two
--    admins clicking at once cannot restore the stock twice.
--    Allowed only while nothing has left the warehouse: order `pending`/`processing` and no line collected yet.
create or replace function cancel_order(p_order_id text, p_now bigint) returns jsonb
language plpgsql as $$
declare
  o record;
  l record;
  restored integer := 0;
  stamp jsonb := jsonb_build_array(jsonb_build_object('status', 'cancelled', 'at', p_now));
begin
  select id, status, payment_status into o from orders where id = p_order_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if o.status not in ('pending', 'processing') then
    raise exception 'invalid_transition';
  end if;
  if exists (
    select 1 from supplier_orders
     where order_id = p_order_id and logistics_status in ('picked_up', 'in_transit', 'delivered')
  ) then
    raise exception 'invalid_transition';
  end if;

  for l in
    select id, supplier_product_id, stock_reserved from supplier_orders
     where order_id = p_order_id and logistics_status <> 'cancelled' and stock_restored_at is null
     for update
  loop
    if l.supplier_product_id is not null and l.stock_reserved > 0 then
      update supplier_products
         set stock = stock + l.stock_reserved, updated_at = p_now
       where id = l.supplier_product_id;
      restored := restored + l.stock_reserved;
    end if;
    update supplier_orders
       set logistics_status = 'cancelled', stock_restored_at = p_now,
           history = history || stamp, updated_at = p_now
     where id = l.id;
  end loop;

  update orders set status = 'cancelled', history = history || stamp, updated_at = p_now where id = p_order_id;
  return jsonb_build_object('before', o.status, 'paymentStatus', o.payment_status, 'restored', restored);
end;
$$;
revoke execute on function cancel_order(text, bigint) from public, anon, authenticated;
