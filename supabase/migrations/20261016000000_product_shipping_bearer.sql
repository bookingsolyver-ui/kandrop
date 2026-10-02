-- Who pays the delivery of a product: the customer (worked out at checkout from the zone) or the merchant.
alter table products
  add column if not exists shipping_bearer text not null default 'customer'
  check (shipping_bearer in ('customer', 'merchant'));
