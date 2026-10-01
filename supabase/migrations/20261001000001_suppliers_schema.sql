-- Multi-vendor: the supplier companies. A supplier signs in with Supabase Auth (the login is checked
-- against `auth.users`; Kandrop then issues its own session cookie with role `supplier`), and this
-- table holds the company data. Same rules as the rest of the schema: RLS ON and NO policies, so
-- anon/authenticated can touch nothing; the server reaches it with the service-role key only.
create table if not exists suppliers (
  id           uuid primary key references auth.users (id) on delete cascade,
  company_name text not null,
  -- The tax number is encrypted by the API (AES-256-GCM, src/server/crypto/field.ts) before it is stored.
  nif          text,
  phone        text,
  -- "<municipality>, <province>" of the warehouse.
  address      text,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at   bigint not null default ((extract(epoch from now()) * 1000)::bigint)
);
create index if not exists suppliers_status_idx on suppliers (status);

alter table suppliers enable row level security;
