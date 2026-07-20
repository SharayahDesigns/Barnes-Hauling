alter table public.dumpsters
  drop constraint if exists dumpsters_rental_duration_days_check,
  drop column if exists rental_duration_days;
