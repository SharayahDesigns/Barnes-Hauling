alter table public.service_items
  add column if not exists image_path text;

update public.service_items
set image_path = (
  select d.image_path
  from public.dumpsters d
  where d.asset_number = 'BHD1-7-14-4'
  limit 1
)
where code = 'dumpster_15_residential';

update public.service_items
set image_path = (
  select d.image_path
  from public.dumpsters d
  where d.asset_number = 'BHD2-7-14-4'
  limit 1
)
where code = 'dumpster_15_heavy_materials';

update public.service_items
set image_path = (
  select d.image_path
  from public.dumpsters d
  where d.asset_number = 'BHD1-7-14-6'
  limit 1
)
where code = 'dumpster_22_residential';
