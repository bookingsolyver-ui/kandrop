-- Two production fixes found in the logs.
--
-- 1. `orders` already existed in the project, so the initial migration's `create table if not exists`
--    skipped it and the table never got `unique (store_id, number)`. The app relies on that rule (the demo
--    seeding is `ON CONFLICT (store_id, number)`, and order numbers are allocated per store), and without it
--    Postgres answers 42P10 "no unique or exclusion constraint matching the ON CONFLICT specification".
--    A unique index is what ON CONFLICT infers; it also makes a duplicate order number impossible.
create unique index if not exists orders_store_number_key on orders (store_id, number);

-- 2. One subscription had the plan "starter\n" (a stray line break), which is not a plan key, so
--    PLANS[plan] was undefined and /api/plan crashed. Clean the stored values, then forbid anything else.
-- (btrim alone only trims spaces, not line breaks: strip every whitespace character)
update subscriptions set plan = lower(regexp_replace(plan, '\s', '', 'g')) where plan <> lower(regexp_replace(plan, '\s', '', 'g'));
alter table subscriptions drop constraint if exists subscriptions_plan_check;
alter table subscriptions add constraint subscriptions_plan_check check (plan in ('starter', 'pro'));
