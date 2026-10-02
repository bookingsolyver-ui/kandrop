-- A merchant who chose a plan but has not paid yet: the subscription row exists with `pending = true`, the REQUESTED plan and
-- `period_end = 0` (no access). An administrator approves it after the payment arrives (plan, 30 days, `pending = false`).
alter table subscriptions add column if not exists pending boolean not null default false;
alter table subscriptions add column if not exists requested_at bigint;
