alter table public.customer_addresses
  drop constraint if exists customer_addresses_delivery_surcharge_cents_nonnegative;

alter table public.customer_addresses
  drop column if exists delivery_distance_miles,
  drop column if exists delivery_surcharge_cents;
