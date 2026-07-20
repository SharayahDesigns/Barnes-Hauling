alter table public.dumpsters
  drop constraint if exists dumpsters_materials_allowed_check,
  drop constraint if exists dumpsters_max_weight_tons_check,
  drop constraint if exists dumpsters_rental_price_cents_check,
  drop column if exists max_weight_tons,
  drop column if exists materials_allowed,
  drop column if exists image_url,
  drop column if exists rental_price_cents;
