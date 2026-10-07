-- Who paid (as typed at the checkout) and what the provider told the payer to do.
--   payer_name / payer_email : personal data of the payer, optional (older payments and card payments have none).
--   instructions             : for a "pay by reference" payment, the displayable details the provider returned
--                              (flat string map). Shown to the payer on the pending screen; never holds secrets.
-- Apply this BEFORE deploying the code that writes these columns.
alter table payments add column if not exists payer_name  text;
alter table payments add column if not exists payer_email text;
alter table payments add column if not exists instructions jsonb;
