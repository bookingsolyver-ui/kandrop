-- A store may have only ONE pending payout at a time. The application checks this too, but a check in code is not
-- atomic: two simultaneous requests (a double click, two tabs) could both pass it. This partial unique index makes
-- the database itself refuse the second one (error 23505), which the app turns into "already in progress".
create unique index if not exists payouts_one_pending_per_store on payouts (store_id) where status = 'pending';
