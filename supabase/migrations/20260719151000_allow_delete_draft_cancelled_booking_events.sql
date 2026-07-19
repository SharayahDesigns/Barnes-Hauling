-- Allow deletion of booking events only when the parent booking is draft or
-- cancelled, so admin cleanup can remove test/non-production bookings.

create or replace function private.guard_booking_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_booking_status public.booking_status;
begin
  if tg_op = 'DELETE' then
    select status into parent_booking_status
    from public.bookings
    where id = old.booking_id;

    if parent_booking_status in ('draft', 'cancelled') then
      return old;
    end if;
  end if;

  raise exception '% is append-only', tg_table_name;
end;
$$;

drop trigger if exists booking_events_append_only on public.booking_events;

create trigger booking_events_append_only
before update or delete on public.booking_events
for each row execute function private.guard_booking_event_mutation();
