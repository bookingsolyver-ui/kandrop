-- Supplier portal: the catalogue a supplier offers and where its money goes.
-- RLS ON and NO policies, like the rest of the schema: only the server (service role) reaches these,
-- and every query filters by `supplier_id` itself.

-- Separate from the merchants' `products` (store_id, public storefront, slug): a supplier's product is
-- a catalogue entry that waits for the Kandrop team's approval before it can reach the Vitrine.
create table if not exists supplier_products (
  id           uuid primary key default gen_random_uuid(),
  supplier_id  uuid not null references suppliers (id) on delete cascade,
  name         text not null,
  description  text not null default '',
  category     text not null,
  cost_price   bigint not null check (cost_price > 0),   -- minor units
  stock        integer not null default 0 check (stock >= 0),
  status       text not null default 'in_review' check (status in ('in_review', 'approved', 'rejected')),
  image_mime   text check (image_mime in ('image/jpeg', 'image/png', 'image/webp')),
  image_data   text,                                      -- base64, at most 2 MB decoded
  created_at   bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  updated_at   bigint not null default ((extract(epoch from now()) * 1000)::bigint)
);
create index if not exists supplier_products_supplier_idx on supplier_products (supplier_id, created_at desc);
create index if not exists supplier_products_status_idx on supplier_products (status);
alter table supplier_products enable row level security;

-- Where a supplier is paid. The IBAN is stored ENCRYPTED (AES-256-GCM, src/server/crypto/field.ts).
create table if not exists supplier_bank_accounts (
  supplier_id uuid primary key references suppliers (id) on delete cascade,
  bank_name   text not null,
  holder_name text not null,
  iban        text not null,
  updated_at  bigint not null
);
alter table supplier_bank_accounts enable row level security;
