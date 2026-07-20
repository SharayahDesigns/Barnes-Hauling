alter table public.dumpsters
  drop constraint if exists dumpsters_rental_duration_days_check;

alter table public.dumpsters
  add constraint dumpsters_rental_duration_days_check
    check (
      array_length(rental_duration_days, 1) >= 1
      and not (rental_duration_days @> array[0]::smallint[])
      and not (rental_duration_days @> array[-1]::smallint[])
    );
