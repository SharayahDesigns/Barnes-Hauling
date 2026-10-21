-- Schema-only rollback. Does not restore BHD2-7-14-4 to active/available --
-- that was a deliberate data correction (duplicate inventory record), not a
-- side effect of the schema change.

alter table public.dumpsters
  add column service_item_id uuid references public.service_items(id) on delete restrict,
  add column rental_price_cents bigint,
  add column max_weight_tons numeric(6,2),
  add column materials_allowed text[] not null default '{}'::text[],
  add column materials_not_allowed text[] not null default '{}'::text[],
  add column rental_duration_days smallint[] not null default array[5]::smallint[];

alter table public.dumpsters
  add constraint dumpsters_rental_price_cents_check
    check (rental_price_cents is null or rental_price_cents >= 0),
  add constraint dumpsters_max_weight_tons_check
    check (max_weight_tons is null or max_weight_tons > 0),
  add constraint dumpsters_materials_allowed_check
    check (not (materials_allowed @> array['']::text[])),
  add constraint dumpsters_materials_not_allowed_check
    check (not (materials_not_allowed @> array['']::text[])),
  add constraint dumpsters_rental_duration_days_check
    check (
      array_length(rental_duration_days, 1) >= 1
      and not (rental_duration_days @> array[0]::smallint[])
      and not (rental_duration_days @> array[-1]::smallint[])
    );

create index dumpsters_service_item_id_idx
  on public.dumpsters(service_item_id)
  where service_item_id is not null;

alter table public.service_items
  drop constraint if exists service_items_rental_price_cents_check,
  drop constraint if exists service_items_max_weight_tons_check,
  drop constraint if exists service_items_materials_allowed_check,
  drop constraint if exists service_items_materials_not_allowed_check,
  drop constraint if exists service_items_rental_duration_days_check,
  drop column if exists rental_price_cents,
  drop column if exists max_weight_tons,
  drop column if exists materials_allowed,
  drop column if exists materials_not_allowed,
  drop column if exists rental_duration_days;
