drop index if exists public.service_items_photo_dumpster_id_idx;
alter table public.service_items drop column if exists photo_dumpster_id;
