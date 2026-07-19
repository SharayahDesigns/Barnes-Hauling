create or replace function private.reject_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

drop trigger if exists booking_events_append_only on public.booking_events;

create trigger booking_events_append_only
before update or delete on public.booking_events
for each row execute function private.reject_mutation();
