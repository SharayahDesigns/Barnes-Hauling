-- Option (service_item) photos come from the physical dumpsters of that size
-- instead of a separate upload. photo_dumpster_id records which dumpster's
-- photo an option shows; NULL means "automatic": the first dumpster of the
-- option's size that has a photo.
--
-- service_items.image_path is left in place (no data loss) but is no longer
-- read by the app.

alter table public.service_items
  add column photo_dumpster_id uuid references public.dumpsters(id) on delete set null;

create index service_items_photo_dumpster_id_idx
  on public.service_items (photo_dumpster_id);

comment on column public.service_items.photo_dumpster_id is
  'Dumpster whose photo this option shows. NULL = first dumpster of the same size with a photo.';
