-- Kandrop — initial schema.
--
-- Kandrop uses its own login (a signed JWT session), not Supabase Auth, so every table has Row Level
-- Security ENABLED and NO policies: the anon/authenticated roles can touch nothing. The server reaches
-- the data with the service-role key (src/lib/supabase/server.ts → createAdminClient) and every
-- repository filters by store_id itself.
--
-- Money is stored in minor units (bigint); instants are epoch milliseconds (bigint), as in the code.

create table if not exists users (
  id            text primary key,
  email         text not null,
  password_hash text not null,
  full_name     text not null,
  store_id      text not null,
  store_name    text not null,
  role          text not null default 'owner' check (role in ('owner', 'staff')),
  locale        text not null default 'pt' check (locale in ('pt', 'en', 'fr')),
  created_at    timestamptz not null default now()
);
create unique index if not exists users_email_key on users (lower(email));
create index if not exists users_store_idx on users (store_id);

-- `stores` already existed in the project as (id, name, slug, owner_id, settings jsonb, created_at bigint),
-- so it is not redefined here: the app keeps the tax number and status inside `settings`.
create table if not exists stores (
  id         text primary key,
  name       text not null,
  slug       text not null,
  owner_id   text not null,
  settings   jsonb not null default '{}',
  created_at bigint not null
);

create table if not exists products (
  id               text primary key,
  store_id         text not null,
  title            text not null,
  description      text not null default '',
  category         text not null,
  status           text not null,
  cost_price       bigint not null,
  sale_price       bigint not null,
  images           jsonb not null default '[]',   -- [{id, mime}] in display order; bytes live in product_images
  slug             text not null unique,
  stock            integer,
  compare_at_price bigint,
  offer_ends_at    bigint,
  views            integer not null default 0,
  created_at       bigint not null,
  updated_at       bigint not null
);
create index if not exists products_store_idx on products (store_id);

create table if not exists product_images (
  id         text primary key,
  product_id text not null references products (id) on delete cascade,
  store_id   text not null,
  mime       text not null check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  data       text not null                        -- base64
);
create index if not exists product_images_product_idx on product_images (product_id);

create table if not exists orders (
  id              text primary key,
  store_id        text not null,
  number          integer not null,
  status          text not null,
  customer        jsonb not null,
  address         jsonb not null,
  items           jsonb not null,
  shipping_amount bigint not null,
  total           bigint not null,
  currency        text not null default 'AOA',
  payment         jsonb not null,
  tracking_code   text,
  history         jsonb not null,
  created_at      bigint not null,
  updated_at      bigint not null,
  unique (store_id, number)
);
create index if not exists orders_store_created_idx on orders (store_id, created_at desc);

create table if not exists deliveries (
  id            text primary key,
  store_id      text not null,
  order_id      text not null unique,
  order_number  integer not null,
  code          text not null,
  zone          text not null,
  street        text not null,
  reference     text,
  customer_name text not null,
  courier_id    text not null,
  created_at    bigint not null,
  duration_ms   bigint not null,
  outcome       text not null,
  return_reason text,
  order_synced  boolean not null default false
);
create index if not exists deliveries_store_created_idx on deliveries (store_id, created_at desc);

create table if not exists checkout_sessions (
  id              text primary key,
  store_id        text not null,
  store_name      text not null,
  store_nif       text,
  currency        text not null default 'AOA',
  items           jsonb not null,
  shipping_amount bigint not null,
  total           bigint not null,
  paid            boolean not null default false,
  subscription    jsonb,                          -- {storeId, plan} when a store pays for its plan
  created_at      bigint not null,
  expires_at      bigint not null
);
create index if not exists checkout_sessions_expires_idx on checkout_sessions (expires_at);

create table if not exists payments (
  id           text primary key,
  reference    text not null unique,
  session_id   text not null,
  method       text not null,
  status       text not null,
  amount       bigint not null,
  currency     text not null default 'AOA',
  failure_code text,
  target       text not null,
  created_at   bigint not null,
  paid_at      bigint,
  provider_ref text,
  settle       jsonb
);
create index if not exists payments_session_idx on payments (session_id, created_at desc);
create index if not exists payments_provider_ref_idx on payments (provider_ref);

create table if not exists receipts (
  payment_id text primary key,                    -- one receipt per payment
  number     text not null unique,
  receipt    jsonb not null
);

create table if not exists subscriptions (
  store_id   text primary key,
  plan       text not null,
  period_end bigint not null
);

create table if not exists charges (
  session_id text primary key,
  store_id   text not null,
  plan       text not null,
  amount     bigint not null,
  created_at bigint not null,
  activated  boolean not null default false
);
create index if not exists charges_store_idx on charges (store_id, created_at);

create table if not exists bank_accounts (
  store_id    text primary key,
  holder_name text not null,
  iban        text not null,
  updated_at  bigint not null
);

create table if not exists payouts (
  id           text primary key,
  store_id     text not null,
  reference    text not null unique,
  amount       bigint not null,
  currency     text not null default 'AOA',
  status       text not null,
  bank         jsonb not null,
  created_at   bigint not null,
  complete_at  bigint not null,
  completed_at bigint,
  historical   boolean not null default false
);
create index if not exists payouts_store_created_idx on payouts (store_id, created_at desc);

create table if not exists automation_states (
  store_id   text primary key,
  connection jsonb not null,
  flows      jsonb not null
);

create table if not exists academy_profiles (
  user_id text primary key,
  example boolean not null default false
);

create table if not exists lesson_progress (
  user_id      text not null,
  lesson_id    text not null,
  completed_at bigint not null,
  primary key (user_id, lesson_id)
);

create table if not exists affiliate_profiles (
  store_id text primary key,
  code     text not null unique,
  clicks   integer not null default 0,
  example  boolean not null default false
);

create table if not exists referrals (
  id            text primary key,
  store_id      text not null,
  email         text not null,
  registered_at bigint not null,
  plan          text not null,
  payment       text not null,
  paid_months   integer not null default 0
);
create index if not exists referrals_store_idx on referrals (store_id, registered_at desc);

-- Gap-free-per-name counters (receipt numbers per year, payout references per year).
create table if not exists sequences (
  name  text primary key,
  value bigint not null default 0
);

create or replace function next_sequence(seq_name text) returns bigint
language sql as $$
  insert into sequences (name, value) values (seq_name, 1)
  on conflict (name) do update set value = sequences.value + 1
  returning value;
$$;

create or replace function increment_product_views(product_slug text) returns void
language sql as $$
  update products set views = views + 1 where slug = product_slug and status = 'active';
$$;

create or replace function record_affiliate_click(affiliate_code text) returns boolean
language plpgsql as $$
begin
  update affiliate_profiles set clicks = clicks + 1 where code = affiliate_code;
  return found;
end;
$$;

-- Lock everything down: no policies = no access for anon/authenticated; service role bypasses RLS.
alter table users              enable row level security;
alter table stores             enable row level security;
alter table products           enable row level security;
alter table product_images     enable row level security;
alter table orders             enable row level security;
alter table deliveries         enable row level security;
alter table checkout_sessions  enable row level security;
alter table payments           enable row level security;
alter table receipts           enable row level security;
alter table subscriptions      enable row level security;
alter table charges            enable row level security;
alter table bank_accounts      enable row level security;
alter table payouts            enable row level security;
alter table automation_states  enable row level security;
alter table academy_profiles   enable row level security;
alter table lesson_progress    enable row level security;
alter table affiliate_profiles enable row level security;
alter table referrals          enable row level security;
alter table sequences          enable row level security;

revoke execute on function next_sequence(text)            from public, anon, authenticated;
revoke execute on function increment_product_views(text)  from public, anon, authenticated;
revoke execute on function record_affiliate_click(text)   from public, anon, authenticated;
