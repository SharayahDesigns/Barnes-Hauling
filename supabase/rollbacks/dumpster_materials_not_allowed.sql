alter table public.dumpsters
  drop constraint if exists dumpsters_materials_not_allowed_check,
  drop column if exists materials_not_allowed;
