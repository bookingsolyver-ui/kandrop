-- A merchant importing a supplier's product into their own store. The row records which supplier
-- product became which store product, so the same one cannot be imported twice by the same store and
-- the Vitrine can show "already in your store". RLS ON and NO policies; the server filters by store_id.
create table if not exists supplier_imports (
  store_id            text not null,
  supplier_product_id uuid not null references supplier_products (id) on delete cascade,
  product_id          text not null,
  created_at          bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  primary key (store_id, supplier_product_id)
);
create index if not exists supplier_imports_store_idx on supplier_imports (store_id);
alter table supplier_imports enable row level security;
