alter table public.dumpsters
  add column service_item_id uuid references public.service_items(id) on delete restrict;

create index dumpsters_service_item_id_idx
  on public.dumpsters(service_item_id)
  where service_item_id is not null;
