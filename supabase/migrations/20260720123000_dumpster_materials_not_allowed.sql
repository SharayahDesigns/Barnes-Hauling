alter table public.dumpsters
  add column materials_not_allowed text[] not null default '{}'::text[];

alter table public.dumpsters
  add constraint dumpsters_materials_not_allowed_check
    check (not (materials_not_allowed @> array['']));
