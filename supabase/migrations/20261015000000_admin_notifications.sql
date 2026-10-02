-- The administrators' notification centre (the bell in the operator console): one row per notice, shared by every administrator.
-- `type` says what it is about (e.g. 'plan_request'); `link` is where it leads. RLS ON, no policies: only the server (service role)
-- reaches this table. Web Push devices of administrators live in `push_subscriptions` (scope 'admin').
create table if not exists admin_notifications (
  id         text primary key,
  title      text not null,
  message    text not null,
  type       text not null,
  link       text,
  read       boolean not null default false,
  created_at bigint not null default ((extract(epoch from now()) * 1000)::bigint)
);
create index if not exists admin_notifications_created_idx on admin_notifications (created_at desc);
create index if not exists admin_notifications_unread_idx on admin_notifications (read) where read = false;
alter table admin_notifications enable row level security;
