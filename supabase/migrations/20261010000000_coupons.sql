-- Merchant coupons. A coupon belongs to ONE store; the code is unique per store (upper case). The discount is paid
-- entirely out of the merchant's margin: Kandrop's commission (on the ORIGINAL price) and the supplier's cost never
-- change (enforced in the application, see server/modules/coupons/math.ts). RLS ON, no policies: only the server
-- (service role) reaches this table.
create table if not exists coupons (
  id         uuid primary key default gen_random_uuid(),
  store_id   text not null,
  code       text not null check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,32}$'),
  type       text not null check (type in ('percent', 'fixed')),
  -- percent: whole percent 1..99; fixed: minor units (Kz x 100)
  value      bigint not null check (value > 0),
  is_active  boolean not null default true,
  created_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  unique (store_id, code)
);
create index if not exists coupons_store_idx on coupons (store_id, created_at desc);
alter table coupons enable row level security;
