-- Phase 3: the session kill switch. A signed token is only honoured if it was issued after
-- `sessions_valid_after` and the account is not banned (see src/server/auth/session.ts).
-- Until this runs the app keeps working: a missing column reads as "never revoked, not banned".
alter table users add column if not exists sessions_valid_after bigint not null default 0;
alter table users add column if not exists banned boolean not null default false;
