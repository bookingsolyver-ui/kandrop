-- Supplier withdrawals (replaces the browser-only simulation). The balance is what the supplier is owed for
-- DELIVERED, payment-VERIFIED lines minus withdrawals already asked for or paid. RLS ON, no policies:
-- only the server (service role) reaches this table.
create table if not exists supplier_withdrawals (
  id           uuid primary key default gen_random_uuid(),
  supplier_id  uuid not null references suppliers (id) on delete cascade,
  amount       bigint not null check (amount > 0),                 -- minor units
  status       text not null default 'requested' check (status in ('requested', 'paid', 'rejected')),
  created_at   bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  processed_at bigint,
  processed_by text                                                -- the administrator's e-mail or id
);
create index if not exists supplier_withdrawals_supplier_idx on supplier_withdrawals (supplier_id, created_at desc);
create index if not exists supplier_withdrawals_status_idx on supplier_withdrawals (status, created_at desc);
alter table supplier_withdrawals enable row level security;

-- The request, checked and written in ONE transaction. The supplier row is locked first, so two simultaneous
-- requests cannot both spend the same balance. The amount is validated here, against the real ledger, never
-- against anything the browser says.
create or replace function request_supplier_withdrawal(p_supplier_id uuid, p_amount bigint, p_min bigint) returns uuid
language plpgsql as $$
declare
  earned bigint;
  taken bigint;
  new_id uuid;
begin
  perform 1 from suppliers where id = p_supplier_id and status = 'approved' for update;
  if not found then
    raise exception 'not_found';
  end if;
  if not exists (select 1 from supplier_bank_accounts where supplier_id = p_supplier_id) then
    raise exception 'no_bank';
  end if;
  select coalesce(sum(cost_total), 0) into earned from supplier_orders
   where supplier_id = p_supplier_id and logistics_status = 'delivered' and payment_status = 'paid_verified';
  select coalesce(sum(amount), 0) into taken from supplier_withdrawals
   where supplier_id = p_supplier_id and status in ('requested', 'paid');
  if p_amount is null or p_amount < p_min or p_amount > earned - taken then
    raise exception 'invalid_amount';
  end if;
  insert into supplier_withdrawals (supplier_id, amount) values (p_supplier_id, p_amount) returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function request_supplier_withdrawal(uuid, bigint, bigint) from public, anon, authenticated;
