-- Subscription cycle state: when the store first paid and how many 30-day periods it has paid.
-- The first paid period is the launch price; from the second on the regular price applies
-- (`modules/plan/limits.ts`). Backfilled from the charges that already activated a plan.
alter table subscriptions add column if not exists started_at bigint;
alter table subscriptions add column if not exists periods_paid integer not null default 0;

update subscriptions s
set periods_paid = c.n,
    started_at = c.first_at
from (
  select store_id, count(*)::integer as n, min(created_at) as first_at
  from charges
  where activated
  group by store_id
) c
where c.store_id = s.store_id;
