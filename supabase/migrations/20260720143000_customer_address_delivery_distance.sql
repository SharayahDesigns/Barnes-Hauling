alter table public.customer_addresses
  add column if not exists delivery_distance_miles numeric(8, 2),
  add column if not exists delivery_surcharge_cents integer;

alter table public.customer_addresses
  drop constraint if exists customer_addresses_delivery_surcharge_cents_nonnegative;

alter table public.customer_addresses
  add constraint customer_addresses_delivery_surcharge_cents_nonnegative
  check (
    delivery_surcharge_cents is null
    or delivery_surcharge_cents >= 0
  );
