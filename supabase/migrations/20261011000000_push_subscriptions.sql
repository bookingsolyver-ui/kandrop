-- Web Push subscriptions (one row per browser/device). `scope` says who it belongs to: a merchant's device is tied to
-- its store, an administrator's device is not. The endpoint is unique, so subscribing twice from the same device only
-- refreshes the row. RLS ON, no policies: only the server (service role) reaches this table.
create table if not exists push_subscriptions (
  endpoint     text primary key,
  scope        text not null check (scope in ('merchant', 'admin')),
  store_id     text,
  user_id      text not null,
  subscription jsonb not null,              -- the PushSubscription JSON: { endpoint, keys: { p256dh, auth } }
  created_at   bigint not null default ((extract(epoch from now()) * 1000)::bigint)
);
create index if not exists push_subscriptions_scope_idx on push_subscriptions (scope, store_id);
alter table push_subscriptions enable row level security;
