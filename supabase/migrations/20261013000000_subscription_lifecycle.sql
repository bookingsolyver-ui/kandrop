-- Subscription lifecycle: an account can be switched off (by the daily job when the paid period ran out, or by an
-- administrator) and only an administrator switches it back on. `renewal_notice_for` is the period end the 3-day
-- reminder was already sent for, so each period is warned once.
alter table subscriptions add column if not exists suspended boolean not null default false;
alter table subscriptions add column if not exists suspended_reason text;
alter table subscriptions add column if not exists suspended_at bigint;
alter table subscriptions add column if not exists renewal_notice_for bigint;
