-- The commercial loop: a shopper pays, the merchant gets an order, the supplier gets a line to prepare,
-- Kandrop takes its commission and everyone gets a financial record; Kandrop moves the parcel.
-- RLS ON and NO policies everywhere (only the server, with the service role, reaches these tables).

-- 1. The checkout session now remembers WHAT is bought and WHO buys, so a paid session can become an order.
alter table checkout_sessions add column if not exists product_id text;   -- the store product being bought
alter table checkout_sessions add column if not exists buyer jsonb;       -- { customer, address }

-- 2. One row per supplier's share of a paid order: what to prepare, what it is worth, where it is.
create table if not exists supplier_orders (
  id                  uuid primary key default gen_random_uuid(),
  order_id            text not null,                 -- orders.id (the merchant's order)
  order_number        integer not null,
  store_id            text not null,
  store_name          text not null,
  supplier_id         uuid not null references suppliers (id),
  supplier_product_id uuid references supplier_products (id) on delete set null,
  product_title       text not null,
  quantity            integer not null check (quantity > 0),
  -- All money in minor units, FIXED at the time of the sale (a later price change does not rewrite history).
  unit_cost           bigint not null check (unit_cost >= 0),    -- what the supplier charges
  unit_price          bigint not null check (unit_price >= 0),   -- what the shopper paid per unit
  sale_total          bigint not null,                            -- unit_price × quantity
  cost_total          bigint not null,                            -- unit_cost × quantity = due to the supplier
  margin              bigint not null,                            -- sale_total − cost_total (the merchant's gross margin)
  commission_bps      integer not null check (commission_bps between 0 and 10000),
  commission          bigint not null check (commission >= 0),    -- Kandrop's share of the margin
  merchant_net        bigint not null,                            -- margin − commission
  logistics_status    text not null default 'pending'
                      check (logistics_status in ('pending', 'preparing', 'picked_up', 'in_transit', 'delivered')),
  history             jsonb not null default '[]',                -- [{ status, at }]
  created_at          bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  updated_at          bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  -- One paid order creates each supplier line once, however many times the confirmation arrives.
  unique (order_id, supplier_product_id)
);
create index if not exists supplier_orders_supplier_idx on supplier_orders (supplier_id, created_at desc);
create index if not exists supplier_orders_status_idx on supplier_orders (logistics_status, created_at desc);
create index if not exists supplier_orders_store_idx on supplier_orders (store_id);
alter table supplier_orders enable row level security;

-- 3. The financial record of each supplier order, one for each side: the merchant's statement and the
--    supplier's remittance note. Numbered gap-free per year (next_sequence).
create table if not exists order_invoices (
  id                text primary key,
  number            text not null unique,                         -- e.g. FT 2026/000001
  party             text not null check (party in ('merchant', 'supplier')),
  supplier_order_id uuid not null references supplier_orders (id) on delete cascade,
  order_id          text not null,
  order_number      integer not null,
  store_id          text not null,
  supplier_id       uuid not null references suppliers (id),
  lines             jsonb not null,                               -- what is itemised
  sale_total        bigint not null,
  cost_total        bigint not null,
  commission        bigint not null,
  net               bigint not null,                              -- the merchant's net, or the supplier's due
  currency          text not null default 'AOA',
  created_at        bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  unique (supplier_order_id, party)
);
create index if not exists order_invoices_store_idx on order_invoices (store_id, created_at desc);
create index if not exists order_invoices_supplier_idx on order_invoices (supplier_id, created_at desc);
alter table order_invoices enable row level security;

-- 4. The supplier's stock moves with the sale, in ONE conditional UPDATE (two simultaneous sales of the
--    last unit cannot both win). Returns the remaining stock, or NULL when there is not enough.
create or replace function reserve_supplier_stock(p_supplier_product_id uuid, p_qty integer) returns integer
language plpgsql as $$
declare
  remaining integer;
begin
  if p_qty is null or p_qty < 1 then
    raise exception 'quantity must be positive';
  end if;
  update supplier_products
     set stock = stock - p_qty, updated_at = (extract(epoch from now()) * 1000)::bigint
   where id = p_supplier_product_id and stock >= p_qty
  returning stock into remaining;
  return remaining;
end;
$$;
revoke execute on function reserve_supplier_stock(uuid, integer) from public, anon, authenticated;
