-- Expand dumpster inventory with operational merchandising fields used by the
-- admin inventory screen. These live on the physical dumpster record because
-- the current admin flow manages each container directly.

alter table public.dumpsters
  add column rental_price_cents bigint,
  add column image_url text,
  add column materials_allowed text[] not null default '{}'::text[],
  add column max_weight_tons numeric(6,2);

alter table public.dumpsters
  add constraint dumpsters_rental_price_cents_check
    check (rental_price_cents is null or rental_price_cents >= 0),
  add constraint dumpsters_max_weight_tons_check
    check (max_weight_tons is null or max_weight_tons > 0),
  add constraint dumpsters_materials_allowed_check
    check (not (materials_allowed @> array['']));
