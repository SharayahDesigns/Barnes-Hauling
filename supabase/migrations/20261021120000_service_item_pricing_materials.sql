-- Move rental pricing, weight limit, materials rules, and duration options
-- from the physical dumpster record to the service_item (catalog listing)
-- record.
--
-- Price/weight/materials describe what is being rented (e.g. 15-Yard
-- Residential Waste vs 15-Yard Heavy Materials), not the physical steel box.
-- Storing them on dumpsters forced staff to create a second inventory row to
-- express a second price tier for the same physical container. The scheduler
-- (auto_assign_dumpster) matches containers by dumpster_size_id alone, so it
-- treated the two rows as two independently bookable 15-yard containers when
-- only one physically exists -- a double-booking risk.
--
-- After this migration a single physical dumpster can back multiple catalog
-- listings of the same size, each with its own price/materials/weight, and
-- the scheduler correctly treats them as sharing one pool of physical
-- capacity per dumpster_size_id.

alter table public.service_items
  add column rental_price_cents bigint,
  add column max_weight_tons numeric(6,2),
  add column materials_allowed text[] not null default '{}'::text[],
  add column materials_not_allowed text[] not null default '{}'::text[],
  add column rental_duration_days smallint[] not null default array[5]::smallint[];

alter table public.service_items
  add constraint service_items_rental_price_cents_check
    check (rental_price_cents is null or rental_price_cents >= 0),
  add constraint service_items_max_weight_tons_check
    check (max_weight_tons is null or max_weight_tons > 0),
  add constraint service_items_materials_allowed_check
    check (not (materials_allowed @> array['']::text[])),
  add constraint service_items_materials_not_allowed_check
    check (not (materials_not_allowed @> array['']::text[])),
  add constraint service_items_rental_duration_days_check
    check (
      array_length(rental_duration_days, 1) >= 1
      and not (rental_duration_days @> array[0]::smallint[])
      and not (rental_duration_days @> array[-1]::smallint[])
    );

-- Backfill from whichever dumpster is currently tagged to each service item.
update public.service_items si
set
  rental_price_cents = d.rental_price_cents,
  max_weight_tons = d.max_weight_tons,
  materials_allowed = coalesce(d.materials_allowed, '{}'::text[]),
  materials_not_allowed = coalesce(d.materials_not_allowed, '{}'::text[]),
  rental_duration_days = coalesce(d.rental_duration_days, array[5]::smallint[])
from public.dumpsters d
where d.service_item_id = si.id;

-- Business correction, confirmed with the owner: BHD2-7-14-4 and
-- BHD-0-7-14-4 are the same physical 15-yard container, entered twice to
-- express the Residential ($275) and Heavy Materials ($350) price tiers.
-- BHD-0-7-14-4 is the real asset tag. Retire the duplicate row rather than
-- delete it, preserving its assignment/status history, and detach it from
-- the catalog so it no longer counts as separate physical capacity.
update public.dumpsters
set
  status = 'retired',
  service_item_id = null,
  condition_notes = trim(both ' ' from coalesce(condition_notes, '')
    || ' Duplicate inventory record -- same physical container as BHD-0-7-14-4. Retired when pricing moved to service_items.')
where asset_number = 'BHD2-7-14-4';

-- Pricing/materials/weight/duration now live on service_items; dumpsters is
-- physical-inventory-only (asset number, size, status, location, condition,
-- image). Drop the now-superseded columns and the per-dumpster catalog link.
drop index if exists public.dumpsters_service_item_id_idx;

alter table public.dumpsters
  drop constraint if exists dumpsters_rental_price_cents_check,
  drop constraint if exists dumpsters_max_weight_tons_check,
  drop constraint if exists dumpsters_materials_allowed_check,
  drop constraint if exists dumpsters_materials_not_allowed_check,
  drop constraint if exists dumpsters_rental_duration_days_check;

alter table public.dumpsters
  drop column if exists service_item_id,
  drop column if exists rental_price_cents,
  drop column if exists max_weight_tons,
  drop column if exists materials_allowed,
  drop column if exists materials_not_allowed,
  drop column if exists rental_duration_days;
