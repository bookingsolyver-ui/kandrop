-- Withdrawal fee: a fixed 200 Kz kept by Kandrop on every withdrawal request (merchant payouts and supplier
-- withdrawals). `amount` stays what leaves the balance; what is transferred to the bank is `amount - fee`.
-- Rows that already exist keep fee = 0 (they were requested before the fee); new rows default to 200 Kz
-- (20 000 minor units), so even the supplier RPC, which does not name the column, records it.
alter table payouts add column if not exists fee bigint not null default 0 check (fee >= 0);
alter table payouts alter column fee set default 20000;
alter table supplier_withdrawals add column if not exists fee bigint not null default 0 check (fee >= 0);
alter table supplier_withdrawals alter column fee set default 20000;
