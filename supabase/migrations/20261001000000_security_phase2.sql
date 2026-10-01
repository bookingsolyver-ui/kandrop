-- Security phase 2: the admin audit trail and atomic stock operations.
-- Same rules as the initial schema: RLS on and NO policies (only the service role reaches the data).

-- Who did what in /admin. Append-only by convention: the app only ever inserts and reads.
create table if not exists audit_logs (
  id          text primary key,
  at          bigint not null,                  -- epoch milliseconds, like the rest of the schema
  actor_id    text not null,
  actor_email text,
  action      text not null,
  target      text not null,
  before      jsonb,
  after       jsonb,
  ip          text
);
create index if not exists audit_logs_at_idx on audit_logs (at desc);
alter table audit_logs enable row level security;

-- Stock is changed ONLY by one conditional UPDATE, so two simultaneous sales of the last unit cannot
-- both succeed: Postgres locks the row, the second statement re-checks `stock >= qty` and gets none.
-- `stock is null` means "unlimited" (the product does not track stock) and is left untouched.
-- Returns the remaining stock, or NULL when there is not enough (or the product does not exist).
create or replace function reserve_stock(p_product_id text, p_qty integer) returns integer
language plpgsql as $$
declare
  remaining integer;
begin
  if p_qty is null or p_qty < 1 then
    raise exception 'quantity must be positive';
  end if;
  if exists (select 1 from products where id = p_product_id and stock is null) then
    return 2147483647;
  end if;
  update products
     set stock = stock - p_qty, updated_at = (extract(epoch from now()) * 1000)::bigint
   where id = p_product_id and stock is not null and stock >= p_qty
  returning stock into remaining;
  return remaining;
end;
$$;

-- Gives units back (a payment failed or an order was cancelled). Never touches unlimited stock.
create or replace function release_stock(p_product_id text, p_qty integer) returns void
language sql as $$
  update products
     set stock = stock + greatest(p_qty, 0), updated_at = (extract(epoch from now()) * 1000)::bigint
   where id = p_product_id and stock is not null;
$$;

revoke execute on function reserve_stock(text, integer) from public, anon, authenticated;
revoke execute on function release_stock(text, integer)  from public, anon, authenticated;
