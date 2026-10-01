-- Central payment model: the shopper pays KANDROP (cash / bank transfer, slip sent on WhatsApp) and the
-- team verifies it. The state lives on the order; the supplier's line follows it. RLS stays ON, no policies.

alter table orders add column if not exists payment_status   text  not null default 'paid_verified'
  check (payment_status in ('pending_payment', 'proof_submitted', 'paid_verified'));
alter table orders add column if not exists payment_provider text  not null default 'multicaixa_express_api'
  check (payment_provider in ('manual_whatsapp_transfer', 'multicaixa_express_api'));
-- { reference?, note?, proofAt?, proofBy?, verifiedAt?, verifiedBy? }
alter table orders add column if not exists payment_evidence jsonb;
-- Orders that already exist were paid through the old (sandbox Multicaixa) flow: they stay verified.
-- From now on a new order starts unpaid and goes through the manual WhatsApp verification.
alter table orders alter column payment_status   set default 'pending_payment';
alter table orders alter column payment_provider set default 'manual_whatsapp_transfer';

-- The supplier's line carries a copy of the order's payment state: its money becomes available only when
-- the order is paid_verified AND delivered. Existing lines follow their order.
alter table supplier_orders add column if not exists payment_status text not null default 'pending_payment'
  check (payment_status in ('pending_payment', 'proof_submitted', 'paid_verified'));
update supplier_orders so set payment_status = o.payment_status from orders o where o.id = so.order_id;

create index if not exists orders_payment_status_idx on orders (payment_status, created_at desc);
