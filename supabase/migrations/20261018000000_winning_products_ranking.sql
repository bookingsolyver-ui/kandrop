-- 1. "Winning Products": products of the shared (supplier) catalogue that the Kandrop team highlights to merchants.
alter table supplier_products add column if not exists is_winning_product boolean not null default false;
create index if not exists supplier_products_winning_idx on supplier_products (is_winning_product) where is_winning_product;

-- 2. Monthly sales ranking. Sales = the goods sold (order total minus the shipping the shopper paid) of orders whose
--    payment was verified and that were not cancelled, created in [p_from, p_to) (epoch milliseconds). One row per
--    store, best first. Only the server (service role) may call it: the app decides what each merchant gets to see.
create or replace function monthly_store_ranking(p_from bigint, p_to bigint)
returns table (store_id text, store_name text, sales bigint, orders bigint)
language sql stable as $$
  select o.store_id,
         coalesce(max(s.name), '') as store_name,
         sum(o.total - o.shipping_amount)::bigint as sales,
         count(*)::bigint as orders
    from orders o
    left join stores s on s.id = o.store_id
   where o.created_at >= p_from
     and o.created_at < p_to
     and o.status <> 'cancelled'
     and o.payment_status = 'paid_verified'
   group by o.store_id
   order by sales desc, orders desc, o.store_id
   limit 1000;
$$;
revoke execute on function monthly_store_ranking(bigint, bigint) from public, anon, authenticated;
